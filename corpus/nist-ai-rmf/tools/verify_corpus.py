#!/usr/bin/env python3
"""Verify corpus/nist-ai-rmf: every manifest file exists, matches its sha256/bytes and parses
(PDF opens and has pages, XLSX opens, JSON/CSV parse, PNG signature, HTML markup); every file on
disk is listed; the structured extractions point at the right source hashes and have the verified
counts. Missing files under .local/ are reported but not treated as errors (they are git-ignored).

Usage: python3 tools/verify_corpus.py      (exit status 1 on any error)
"""
import csv
import io
import json
import sys
import warnings

import openpyxl
import pymupdf

from common import ROOT, sha256

warnings.filterwarnings("ignore")


def check_file(path, media):
    b = path.read_bytes()
    if media == "application/pdf":
        assert b[:5] == b"%PDF-", "not a PDF"
        assert b"%%EOF" in b[-2048:], "no %%EOF near end (truncated?)"
        d = pymupdf.open(path)
        assert d.page_count > 0 and not d.is_encrypted
        return f"{d.page_count} pages"
    if media.endswith("spreadsheetml.sheet"):
        wb = openpyxl.load_workbook(path, read_only=True)
        return "sheets " + ", ".join(ws.title for ws in wb.worksheets)
    if media == "application/json":
        j = json.loads(b.decode("utf-8"))
        return f"JSON {type(j).__name__}"
    if media == "text/csv":
        rows = list(csv.reader(io.StringIO(b.decode("utf-8-sig"))))
        return f"{len(rows)} rows"
    if media == "image/png":
        assert b[:8] == b"\x89PNG\r\n\x1a\n"
        return "PNG"
    if media == "text/html":
        assert b"<html" in b[:4096].lower()
        return "HTML"
    raise AssertionError("unknown media type " + media)


def main():
    man = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    errors, listed = [], set()
    for d in man["documents"]:
        rel = d["path"].split("/", 1)[1]
        listed.add(rel)
        p = ROOT / rel
        if not p.exists():
            (print if "/.local/" in "/" + rel else errors.append)(f"MISSING {rel}")
            continue
        try:
            info = check_file(p, d["mediaType"])
        except Exception as e:  # noqa: BLE001
            errors.append(f"UNREADABLE {rel}: {e!r}")
            continue
        if p.stat().st_size != d["bytes"]:
            errors.append(f"SIZE {rel}")
        if sha256(p) != d["sha256"]:
            errors.append(f"SHA256 {rel}")
        print(f"ok  {d['bytes']:>9}  {rel}  ({info})")
    for p in ROOT.rglob("*"):
        rel = p.relative_to(ROOT).as_posix()
        if p.is_file() and not rel.startswith("tools/") and rel not in listed and rel not in (
                "manifest.json", "STRUCTURE.md", "ai-rmf-core.json", "ai-rmf-playbook.json", "genai-profile.json"):
            errors.append(f"UNLISTED {rel}")
    # structured extractions
    core = json.loads((ROOT / "ai-rmf-core.json").read_text(encoding="utf-8"))
    pb = json.loads((ROOT / "ai-rmf-playbook.json").read_text(encoding="utf-8"))
    gen = json.loads((ROOT / "genai-profile.json").read_text(encoding="utf-8"))
    by_id = {d["id"]: d for d in man["documents"]}
    for name, obj, doc_id in (("ai-rmf-core.json", core, "nist-ai-100-1"), ("ai-rmf-playbook.json", pb, "ai-rmf-playbook-json"),
                              ("genai-profile.json", gen, "nist-ai-600-1")):
        if obj["source"]["sha256"] != by_id[doc_id]["sha256"]:
            errors.append(f"{name}: source.sha256 does not match manifest {doc_id}")
    counts = (len(core["functions"]), len(core["categories"]), len(core["subcategories"]))
    if counts != (4, 19, 72):
        errors.append(f"ai-rmf-core.json counts {counts} != (4, 19, 72)")
    if len(pb["entries"]) != 72:
        errors.append("ai-rmf-playbook.json does not have 72 entries")
    if len(gen["risks"]) != 12 or len(gen["actions"]) != 212:
        errors.append(f"genai-profile.json: {len(gen['risks'])} risks / {len(gen['actions'])} actions (expected 12 / 212)")
    print(f"functions/categories/subcategories {counts}; playbook entries {len(pb['entries'])}; "
          f"GenAI risks {len(gen['risks'])}, actions {len(gen['actions'])}")
    for e in errors:
        print("ERROR", e)
    print("OK" if not errors else f"{len(errors)} error(s)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
