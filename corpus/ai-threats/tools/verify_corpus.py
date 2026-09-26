#!/usr/bin/env python3
"""Verify corpus/ai-threats: every manifest file exists, matches its sha256/bytes and parses (PDF opens and has
pages, YAML/JSON parse, text is UTF-8); every file on disk is listed; no file carries an embedded credential; the
structured extractions point at the right source hashes and have the verified counts; every mapping row names a
known authority and a known document. Missing files under .local/ are reported but not treated as errors
(they are git-ignored).

Usage: python3 tools/verify_corpus.py      (exit status 1 on any error)
"""
import json
import re
import sys
import warnings

import pymupdf
import yaml

from common import CORPUS, ROOT, sha256

warnings.filterwarnings("ignore")

DERIVED = {"manifest.json", "STRUCTURE.md", "atlas.json", "owasp-llm-top10.json", "owasp-agentic-top10.json",
           "nist-ai-100-2.json", "mappings.json", "mitre-safe-ai/.local/safe-ai-mappings.json"}
SECRET_RE = re.compile(rb"pk\.eyJ[A-Za-z0-9_-]{10,}|sk\.eyJ[A-Za-z0-9_-]{10,}|AIza[0-9A-Za-z_-]{30,}|AKIA[0-9A-Z]{16}|"
                       rb"gh[pousr]_[0-9A-Za-z]{30,}|xox[baprs]-[0-9A-Za-z-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----")


def check_file(path, media):
    b = path.read_bytes()
    if media == "application/pdf":
        assert b[:5] == b"%PDF-", "not a PDF"
        d = pymupdf.open(path)
        assert d.page_count > 0 and not d.is_encrypted
        return f"{d.page_count} pages"
    if media == "application/yaml":
        y = yaml.safe_load(b.decode("utf-8"))
        return f"YAML {type(y).__name__}"
    if media == "application/json":
        j = json.loads(b.decode("utf-8"))
        return f"JSON {type(j).__name__}"
    if media in ("text/markdown", "text/plain"):
        b.decode("utf-8")
        return "UTF-8 text"
    raise AssertionError("unknown media type " + media)


def main():
    man = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    errors, listed = [], set()
    by_id = {}
    for d in man["documents"]:
        rel = d["path"].split("/", 1)[1]
        listed.add(rel)
        by_id[d["id"]] = d
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
        if not p.is_file() or rel.startswith("tools/"):
            continue
        if rel not in listed and rel not in DERIVED:
            errors.append(f"UNLISTED {rel}")
        if p.suffix.lower() in (".md", ".json", ".yaml", ".yml", ".txt", ".html", ".htm", "") and SECRET_RE.search(p.read_bytes()):
            errors.append(f"POSSIBLE CREDENTIAL in {rel}")
    # ---------------------------------------------------------------- extractions
    atlas = json.loads((ROOT / "atlas.json").read_text(encoding="utf-8"))
    if atlas["source"]["sha256"] != by_id["mitre-atlas-2026-09-yaml"]["sha256"]:
        errors.append("atlas.json: source.sha256 does not match the manifest")
    c = atlas["counts"]
    got = (c["tactics"], c["techniques"], c["subTechniques"], c["mitigations"], c["caseStudies"])
    if got != (16, 120, 88, 40, 73):
        errors.append(f"atlas.json counts {got} != (16, 120, 88, 40, 73)")
    llm = json.loads((ROOT / "owasp-llm-top10.json").read_text(encoding="utf-8"))
    for ed in llm["source"]["editions"]:
        if ed["sha256"] != by_id[ed["documentId"]]["sha256"]:
            errors.append(f"owasp-llm-top10.json: edition {ed['edition']} sha256 does not match the manifest")
        n = sum(1 for r in llm["risks"] if r["edition"] == ed["edition"])
        if n != 10:
            errors.append(f"owasp-llm-top10.json: {n} risks in edition {ed['edition']}")
    asi = json.loads((ROOT / "owasp-agentic-top10.json").read_text(encoding="utf-8"))
    if asi["source"]["sha256"] != by_id["owasp-agentic-top10-2026-pdf"]["sha256"]:
        errors.append("owasp-agentic-top10.json: source.sha256 does not match the manifest")
    if [r["id"] for r in asi["risks"]] != [f"ASI{n:02d}" for n in range(1, 11)]:
        errors.append("owasp-agentic-top10.json: risks are not ASI01-ASI10")
    aml = json.loads((ROOT / "nist-ai-100-2.json").read_text(encoding="utf-8"))
    nist = {d["id"]: d for d in json.loads((CORPUS / "nist-ai-rmf" / "manifest.json").read_text(encoding="utf-8"))["documents"]}
    if aml["source"]["sha256"] != nist["cprt-ai-100-2e2025-export-json"]["sha256"]:
        errors.append("nist-ai-100-2.json: source.sha256 does not match nist-ai-rmf/manifest.json")
    if (len(aml["objectives"]), len(aml["attacks"])) != (5, 25):
        errors.append("nist-ai-100-2.json: expected 5 objectives and 25 attacks")
    mp = json.loads((ROOT / "mappings.json").read_text(encoding="utf-8"))
    for r in mp["mappings"]:
        if r["authority"] not in mp["authorities"]:
            errors.append(f"mappings.json: unknown authority {r['authority']}")
            break
        if r["documentId"] not in by_id and r["documentId"] not in nist:
            errors.append(f"mappings.json: unknown documentId {r['documentId']}")
            break
    if mp["counts"]["total"] != len(mp["mappings"]):
        errors.append("mappings.json: counts.total differs from the number of rows")
    for rel in man.get("relatedDocuments", []):
        if rel["id"] not in nist:
            errors.append(f"relatedDocuments: {rel['id']} not in nist-ai-rmf/manifest.json")
    print(f"ATLAS {got}; OWASP LLM 2026/2025 10+10 risks; ASI 10 risks; AI 100-2 {len(aml['objectives'])} objectives + "
          f"{len(aml['attacks'])} attacks; mappings {len(mp['mappings'])} rows")
    for e in errors:
        print("ERROR", e)
    print("OK" if not errors else f"{len(errors)} error(s)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
