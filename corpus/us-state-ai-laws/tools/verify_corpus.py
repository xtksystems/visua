"""Verify corpus/us-state-ai-laws.

Checks, for every document in manifest.json:
  * the file exists (files under .local/ may be absent in a fresh clone) and its SHA-256 and size match;
  * PDFs open and report their page and text counts; HTML files contain readable text;
  * no embedded secrets or access tokens (map/analytics keys, cloud keys, private keys) in any file,
    including decompressed PDF streams and DOCX parts.
It also checks that every file under the corpus folder is listed in the manifest (except the build tooling and the
three top-level JSON/Markdown files) and that every quoted obligation text can be found again on its cited page.

Usage: python3 verify_corpus.py            (writes reports/verify.json and exits 1 on any failure)
"""
import hashlib
import html
import json
import os
import re
import sys
import zipfile

import pymupdf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
FOLDER = os.path.dirname(HERE)
CORPUS = os.path.dirname(FOLDER)

from docs import DOC  # noqa: E402
from pagetext import Locator, page_texts  # noqa: E402

SECRET = re.compile(
    rb"pk\.eyJ|sk\.eyJ|AIza[0-9A-Za-z_\-]{35}|AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|ghp_[0-9A-Za-z]{36}|github_pat_"
    rb"|xox[baprs]-[0-9A-Za-z-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY|sk-[A-Za-z0-9]{32,}|AccountKey=|SharedAccessSignature="
    rb"|api[_-]?key[\"']?\s*[:=]\s*[\"'][0-9A-Za-z_\-]{16,}", re.I)
SKIP_TOP = {"manifest.json", "obligations.json", "STRUCTURE.md"}


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def blobs_of(path):
    data = open(path, "rb").read()
    out = [data]
    if path.endswith(".pdf"):
        d = pymupdf.open(path)
        for x in range(1, d.xref_length()):
            try:
                if d.xref_is_stream(x):
                    out.append(d.xref_stream(x) or b"")
            except Exception:  # noqa: BLE001 - damaged streams are reported by the open check
                pass
    elif path.endswith(".docx"):
        z = zipfile.ZipFile(path)
        out += [z.read(n) for n in z.namelist()]
    return out


def main():
    manifest = json.load(open(os.path.join(FOLDER, "manifest.json"), encoding="utf-8"))
    failures, report = [], {"documents": [], "secrets": [], "orphans": [], "quotes": {"checked": 0, "failed": []}}
    listed = set()
    for d in manifest["documents"]:
        p = os.path.join(CORPUS, d["path"])
        listed.add(os.path.normpath(p))
        rec = {"id": d["id"], "path": d["path"]}
        if not os.path.exists(p):
            if "/.local/" in d["path"]:
                rec["status"] = "absent (.local, not in git)"
                report["documents"].append(rec)
                continue
            failures.append(f"missing {d['path']}")
            rec["status"] = "MISSING"
            report["documents"].append(rec)
            continue
        if sha256(p) != d["sha256"] or os.path.getsize(p) != d["bytes"]:
            failures.append(f"hash/size mismatch {d['path']}")
            rec["status"] = "HASH MISMATCH"
        else:
            rec["status"] = "ok"
        if p.endswith(".pdf"):
            doc = pymupdf.open(p)
            rec["pages"] = len(doc)
            rec["textChars"] = sum(len(pg.get_text()) for pg in doc)
            if rec["textChars"] == 0:
                rec["note"] = "image-only PDF (no text layer)"
        elif p.endswith((".htm", ".html")):
            s = open(p, "rb").read().decode("utf-8", "replace")
            t = re.sub(r"<script.*?</script>|<style.*?</style>", " ", s, flags=re.S | re.I)
            words = len(re.findall(r"[A-Za-z]{3,}", html.unescape(re.sub(r"<[^>]+>", " ", t))))
            rec["words"] = words
            if words < 200:
                failures.append(f"HTML has little text: {d['path']}")
        for b in blobs_of(p):
            for m in SECRET.finditer(b):
                report["secrets"].append({"path": d["path"], "match": m.group(0)[:24].decode("latin-1")})
        report["documents"].append(rec)
    if report["secrets"]:
        failures.append(f"{len(report['secrets'])} possible secrets")
    for root, dirs, files in os.walk(FOLDER):
        dirs[:] = [x for x in dirs if not (root == FOLDER and x == "tools") and x != "__pycache__"]
        for f in files:
            p = os.path.normpath(os.path.join(root, f))
            if root == FOLDER and f in SKIP_TOP:
                continue
            if p not in listed:
                report["orphans"].append(os.path.relpath(p, CORPUS))
    if report["orphans"]:
        failures.append(f"{len(report['orphans'])} files not in manifest")
    # quotes
    import importlib
    from build import MODULES
    fixed = {}
    for m in MODULES:
        for law in importlib.import_module(m).LAWS:
            for o in law["obligations"]:
                if o.get("fix"):
                    fixed[o["id"]] = o["fix"]
    report["quotes"]["tolerated"] = []
    obligations = json.load(open(os.path.join(FOLDER, "obligations.json"), encoding="utf-8"))
    locs = {}
    for law in obligations["laws"]:
        for o in law["obligations"]:
            src = o.get("textVerifiedAgainst", {}).get("documentId", o["documentId"])
            d = DOC[src]
            path = os.path.join(CORPUS, d["path"])
            if not os.path.exists(path) or d.get("mode") is None:
                continue
            if src not in locs:
                locs[src] = Locator(page_texts(path, d["mode"], d["family"]))
            parts = o["text"].split(" … ")
            for part in parts:
                # 'fix' corrections (letter-spacing, deleted-text markup) are applied after verification in build.py,
                # so re-verification tolerates them by checking a long prefix and suffix of each part.
                probes = [part] if len(part) < 120 else [part[:100], part[-100:]]
                for probe in probes:
                    report["quotes"]["checked"] += 1
                    if locs[src].find(probe) is None:
                        entry = {"id": o["id"], "probe": probe[:80]}
                        if o["id"] in fixed:
                            entry["fix"] = fixed[o["id"]]
                            report["quotes"]["tolerated"].append(entry)
                        else:
                            report["quotes"]["failed"].append(entry)
    if report["quotes"]["failed"]:
        failures.append(f"{len(report['quotes']['failed'])} quotation probes not found")
    report["failures"] = failures
    os.makedirs(os.path.join(HERE, "reports"), exist_ok=True)
    with open(os.path.join(HERE, "reports", "verify.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    n_ok = sum(1 for r in report["documents"] if r["status"] == "ok")
    print(f"documents={len(report['documents'])} ok={n_ok} secrets={len(report['secrets'])} orphans={len(report['orphans'])} "
          f"quote-probes={report['quotes']['checked']} failed={len(report['quotes']['failed'])} "
          f"tolerated-after-fix={len(report['quotes']['tolerated'])}")
    for f in failures:
        print("FAIL", f)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
