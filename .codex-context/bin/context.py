#!/usr/bin/env python3
"""Read workspace/session metadata or create a uniquely scoped handoff note."""

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import uuid

SYSTEM = "codex-context"
VERSION = 1


def git(path, *args, required=False):
    try:
        process = subprocess.run(["git", "--no-optional-locks", "-C", str(path), *args],
                                 capture_output=True, text=True, timeout=10)
        if process.returncode == 0:
            return process.stdout.rstrip("\n")
        if required:
            raise ValueError(f"Git {' '.join(args)} failed: {process.stderr.strip()}")
        return None
    except FileNotFoundError as error:
        if required:
            raise ValueError("Git is unavailable for this Git workspace.") from error
        return None


def workspace(path):
    cwd = Path(path).expanduser().resolve(strict=True)
    if not cwd.is_dir():
        raise ValueError("The workspace must be a directory.")
    has_git_marker = any((parent / ".git").exists() or (parent / ".git").is_symlink()
                         for parent in [cwd, *cwd.parents])
    top = git(cwd, "rev-parse", "--show-toplevel", required=has_git_marker)
    root = Path(top).resolve() if top else next(
        (parent for parent in [cwd, *cwd.parents]
         if (parent / ".codex-context" / "system.json").is_file()), cwd)
    head = git(root, "rev-parse", "--verify", "HEAD") if top else None
    branch = git(root, "symbolic-ref", "--quiet", "--short", "HEAD") if top else None
    common = git(root, "rev-parse", "--git-common-dir", required=True) if top else None
    common_path = str((root / common).resolve()) if common else None
    return {"root": str(root), "focus": str(cwd.relative_to(root)),
            "git": bool(top), "branch": branch, "head": head,
            "git_common_dir": common_path,
            "worktree_id": hashlib.sha256(str(root).encode()).hexdigest()[:16],
            "working_changes": git(root, "status", "--short", required=True) if top else None}


def read_metadata(path):
    # We write JSON scalar values in YAML frontmatter, avoiding a YAML dependency.
    # Malformed/manual notes remain on disk and are reported instead of trusted.
    with path.open(encoding="utf-8") as stream:
        if stream.readline().strip() != "---":
            raise ValueError("missing frontmatter")
        result = {}
        for _ in range(40):
            line = stream.readline()
            if line.strip() == "---":
                return result
            key, separator, value = line.partition(":")
            key = key.strip()
            if not separator or not key or key in result:
                raise ValueError("invalid frontmatter")
            result[key] = json.loads(value.strip())
            if isinstance(result[key], (dict, list)):
                raise ValueError("frontmatter values must be JSON scalars")
    raise ValueError("frontmatter too long")


def validate_manifest(context):
    manifest = context / "system.json"
    if context.is_symlink() or manifest.is_symlink():
        raise ValueError("Refusing symlinked context metadata.")
    metadata = json.loads(manifest.read_text())
    if (not isinstance(metadata, dict) or metadata.get("system") != SYSTEM
            or type(metadata.get("version")) is not int or metadata["version"] != VERSION):
        raise ValueError("Existing context belongs to another system/version; manual migration required.")
    return metadata


def startup_context(context, metadata):
    if "startup_context" not in metadata:
        source = "legacy-default"
        configured = [".codex-context/workflow.md", ".codex-context/project.md"]
    else:
        source = "manifest"
        configured = metadata["startup_context"]
    if not isinstance(configured, list):
        raise ValueError("startup_context must be a list of project-relative files")
    root = context.parent
    for index, value in enumerate(configured):
        if not isinstance(value, str) or not value:
            raise ValueError(f"startup_context[{index}] must be a project-relative file")
        relative = Path(value)
        if relative.is_absolute() or not relative.parts or ".." in relative.parts:
            raise ValueError(f"startup_context[{index}] must be a project-relative file")
        target = root / relative
        for part in [target, *target.parents]:
            if part == root:
                break
            if part.is_symlink():
                raise ValueError(f"startup context file is symlinked: {value}")
        if not target.is_file():
            raise ValueError(f"startup context file is missing: {value}")
    if len(configured) != len(set(configured)):
        raise ValueError("startup_context contains duplicate files")
    return {"source": source, "files": configured}


def parse_timestamp(value, field):
    if not isinstance(value, str):
        raise ValueError(f"invalid session timestamp: {field}")
    try:
        timestamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if timestamp.tzinfo is None:
            raise ValueError(f"session {field} must include a timezone")
        return timestamp.astimezone(timezone.utc)
    except OverflowError as error:
        raise ValueError(f"invalid session timestamp: {field}") from error


def validate_note(note):
    if note.get("system") != SYSTEM:
        raise ValueError("unknown session format")
    for field in ("session_id", "created_utc", "status", "repo_root", "worktree_id"):
        if not isinstance(note.get(field), str) or not note[field]:
            raise ValueError(f"missing or invalid session field: {field}")
    if note["status"] not in {"active", "complete", "paused", "blocked"}:
        raise ValueError("invalid session status")
    if not Path(note["repo_root"]).is_absolute():
        raise ValueError("session repo_root must be absolute")
    if not re.fullmatch(r"[0-9a-f]{16}", note["worktree_id"]):
        raise ValueError("invalid session worktree_id")
    for field in ("branch", "head"):
        if field not in note or (note[field] is not None
                                 and (not isinstance(note[field], str) or not note[field])):
            raise ValueError(f"missing or invalid session field: {field}")
    if note.get("task") is not None and (not isinstance(note["task"], str) or not note["task"].strip()):
        raise ValueError("invalid session task label")
    created = parse_timestamp(note["created_utc"], "created_utc")
    return parse_timestamp(note["updated_utc"], "updated_utc") if "updated_utc" in note else created


def status(info, all_sessions=False, task=None):
    directory = Path(info["root"]) / ".codex-context" / "sessions"
    candidates, unreadable = [], []
    if directory.is_symlink():
        raise ValueError("Refusing a symlinked sessions directory.")
    if directory.exists():
        for path in directory.glob("*.md"):
            if path.is_symlink():
                unreadable.append({"path": str(path), "reason": "symlinked note"})
                continue
            try:
                note = read_metadata(path)
                updated = validate_note(note)
                same_worktree = note.get("worktree_id") == info["worktree_id"]
                same_branch = note.get("branch") == info["branch"]
                # Detached HEADs share a null branch; only an exact HEAD matches.
                if info["git"] and info["branch"] is None:
                    same_branch = same_branch and note.get("head") == info["head"]
                candidates.append({"path": str(path.relative_to(Path(info["root"]))),
                                   "created_utc": note.get("created_utc", ""),
                                   "updated_utc": note.get("updated_utc", note["created_utc"]),
                                   "task": note.get("task"),
                                   "_updated_sort": updated,
                                   "status": note.get("status"),
                                   "branch": note.get("branch"), "head": note.get("head"),
                                   "same_worktree": same_worktree,
                                   "same_branch": same_branch,
                                   "head_changed": note.get("head") != info["head"]})
            except (OSError, ValueError) as error:
                unreadable.append({"path": str(path), "reason": str(error)})
    candidates.sort(key=lambda n: (n["same_worktree"] and n["same_branch"],
                                  n["status"] != "complete", n["_updated_sort"]), reverse=True)
    for candidate in candidates:
        del candidate["_updated_sort"]
    matched = [note for note in candidates
               if task is None or task.casefold() in (note["task"] or "").casefold()]
    selected = matched if all_sessions else matched[:12]
    return {**info, "sessions": selected, "session_count": len(candidates),
            "matching_session_count": len(matched), "returned_session_count": len(selected),
            "omitted_session_count": len(matched) - len(selected),
            "unlabeled_session_count": sum(note["task"] is None for note in candidates),
            "unreadable_sessions": unreadable,
            "note": "Candidates are historical evidence; select by task and revalidate against current code."}


def new_session(info, task=None):
    root = Path(info["root"])
    context = root / ".codex-context"
    directory = context / "sessions"
    manifest = context / "system.json"
    template = context / "templates" / "session.md"
    for path in [context, directory, manifest, template.parent, template]:
        if path.is_symlink():
            raise ValueError(f"Refusing symlinked context path: {path}")
    validate_manifest(context)
    if task is not None and not task.strip():
        raise ValueError("The task label must not be empty.")
    body = template.read_text()
    now = datetime.now(timezone.utc)
    branch = info["branch"] or ("detached" if info["git"] else "folder")
    slug = re.sub(r"[^a-zA-Z0-9-]+", "-", branch).strip("-")[:40] or "session"
    session_id = f"{now:%Y%m%dT%H%M%SZ}-{slug}-{uuid.uuid4().hex[:12]}"
    metadata = {"system": "codex-context", "session_id": session_id,
                "created_utc": now.isoformat(timespec="seconds"),
                "updated_utc": now.isoformat(timespec="seconds"), "task": task,
                "status": "paused", "repo_root": info["root"],
                "worktree_id": info["worktree_id"],
                "branch": info["branch"], "head": info["head"]}
    header = "---\n" + "".join(f"{key}: {json.dumps(value)}\n"
                               for key, value in metadata.items()) + "---\n\n"
    directory.mkdir(exist_ok=True)
    destination = directory / (session_id + ".md")
    with destination.open("x", encoding="utf-8") as stream:
        stream.write(header + body)
    return {"path": str(destination), "metadata": metadata,
            "next": "Fill the handoff from this conversation's actual work and evidence."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["status", "new-session"])
    parser.add_argument("--repo", default=".")
    parser.add_argument("--task", help="Task label for new-session, or case-insensitive label filter for status.")
    parser.add_argument("--all", action="store_true", help="List all matching session metadata instead of the first 12 (status only).")
    args = parser.parse_args()
    if args.all and args.command != "status":
        parser.error("--all is only available with status")
    try:
        info = workspace(args.repo)
        context = Path(info["root"]) / ".codex-context"
        if context.is_symlink():
            raise ValueError("Refusing a symlinked .codex-context directory.")
        startup = None
        if args.command == "status" and context.exists():
            metadata = validate_manifest(context)
            startup = startup_context(context, metadata)
        result = status(info, args.all, args.task) if args.command == "status" else new_session(info, args.task)
        if startup is not None:
            result["startup_context"] = startup
        print(json.dumps(result, indent=2))
    except (OSError, ValueError, subprocess.TimeoutExpired) as error:
        print(f"Context operation stopped: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
