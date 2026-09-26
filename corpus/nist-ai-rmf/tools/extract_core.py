#!/usr/bin/env python3
"""Extract the AI RMF 1.0 Core (functions, categories, subcategories) from NIST AI 100-1.

Inputs (relative to corpus/nist-ai-rmf/):
  core/NIST.AI.100-1.pdf                          authoritative text + page numbers
  machine-readable/cprt-AI_100_1_0_0-export.json  NIST CPRT dataset (cross-check, hyphenation oracle,
                                                  function one-liners from Figure 5)
  playbook/playbook.json                          AIRC Playbook (cross-check of subcategory wording)
Output:
  ai-rmf-core.json

Usage:  python3 tools/extract_core.py [--check]   (--check: compare only, do not write)
Requires PyMuPDF (pip install pymupdf).
"""
import json
import re
import sys
from collections import OrderedDict

import pymupdf

from common import ROOT, fix_ligatures, join_lines, norm_cmp, sha256, vocabulary, load_manifest_doc

PDF = ROOT / "core" / "NIST.AI.100-1.pdf"
CPRT = ROOT / "machine-readable" / "cprt-AI_100_1_0_0-export.json"
PLAYBOOK = ROOT / "playbook" / "playbook.json"
OUT = ROOT / "ai-rmf-core.json"

FUNCS = [("GOVERN", "GV", "Govern", "5.1"), ("MAP", "MP", "Map", "5.2"),
         ("MEASURE", "MS", "Measure", "5.3"), ("MANAGE", "MG", "Manage", "5.4")]
# Figure 5 of AI 100-1 is a raster image; its one-line function descriptions were read from the
# image and are identical (apart from a trailing period) to the CPRT function texts.
FIG5 = {"GOVERN": "A culture of risk management is cultivated and present",
        "MAP": "Context is recognized and risks related to context are identified",
        "MEASURE": "Identified risks are assessed, analyzed, or tracked",
        "MANAGE": "Risks are prioritized and acted upon based on a projected impact"}

CAT_RE = re.compile(r"^(GOVERN|MAP|MEASURE|MANAGE) (\d+):\s*(.*)$")
SUB_RE = re.compile(r"^(GOVERN|MAP|MEASURE|MANAGE) (\d+)\.(\d+):\s*(.*)$")
CAPTION_RE = re.compile(r"^Table (\d): Categories and subcategories for the (\w+) function\.")


def page_lines(doc):
    """Yield (page_no_1based, x0, baseline_y, text) for every text line, ligatures fixed.
    The baseline (not the bbox top) is used for ordering: small-caps and tall glyphs shift bbox tops."""
    for pno in range(doc.page_count):
        page = doc[pno]
        for b in page.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                txt = fix_ligatures("".join(s["text"] for s in l["spans"]))
                if txt.strip():
                    yield pno + 1, l["bbox"][0], round(max(s["origin"][1] for s in l["spans"]), 1), txt


def main():
    check_only = "--check" in sys.argv
    doc = pymupdf.open(PDF)
    cprt = json.loads(CPRT.read_text(encoding="utf-8"))["response"]["elements"]
    cels = {e["element_identifier"]: e for e in cprt["elements"]}
    playbook = {e["title"]: e for e in json.loads(PLAYBOOK.read_text(encoding="utf-8"))}

    # Vocabulary oracle for end-of-line hyphens: whole AI 100-1 text layer + CPRT + Playbook.
    all_pdf_text = "\n".join(fix_ligatures(doc[i].get_text()) for i in range(doc.page_count))
    oracle_texts = [all_pdf_text] + [e["text"] + " " + e.get("title", "") for e in cprt["elements"]]
    oracle_texts += [p["description"] + " " + p["section_about"] for p in playbook.values()]
    plain_vocab, hyph_vocab = vocabulary(oracle_texts)

    # ---- collect table lines (Tables 1-4) --------------------------------------------------
    lines_by_page = {}
    for pno, x0, y0, txt in page_lines(doc):
        lines_by_page.setdefault(pno, []).append((y0, x0, txt))
    table_lines = {"left": [], "right": []}   # (page, y, text)
    in_table = False
    table_pages = set()
    for pno in sorted(lines_by_page):
        rows = sorted(lines_by_page[pno])
        started_here = False
        for y0, x0, txt in rows:
            s = txt.strip()
            if y0 < 60 or re.fullmatch(r"Page \d+", s):
                continue  # running header / footer
            if CAPTION_RE.match(s):
                in_table = True
                started_here = True
                table_pages.add(pno)
                continue
            if not in_table:
                continue
            if s in ("Categories", "Subcategories", "Continued on next page"):
                continue
            if x0 < 94:          # body text / section heading => table has ended
                in_table = False
                continue
            table_pages.add(pno)
            col = "left" if x0 < 201 else "right"
            table_lines[col].append((pno, y0, s))
        # a table continues onto the next page only via its "(Continued)" caption
        in_table = False

    # ---- parse categories (left column) and subcategories (right column) -------------------
    def parse(col, regex, is_sub):
        items = OrderedDict()
        cur = None
        for pno, y0, s in table_lines[col]:
            m = regex.match(s)
            if m and (not is_sub or SUB_RE.match(s)) and (is_sub or not SUB_RE.match(s)):
                if is_sub:
                    fid, c, n, rest = m.groups()
                    iid = f"{fid} {c}.{n}"
                else:
                    fid, c, rest = m.groups()
                    iid = f"{fid} {c}"
                cur = {"id": iid, "function": fid, "lines": [rest] if rest else [], "pages": [pno]}
                items[iid] = cur
            elif cur is not None:
                cur["lines"].append(s)
                if pno not in cur["pages"]:
                    cur["pages"].append(pno)
        return items

    cats = parse("left", CAT_RE, False)
    subs = parse("right", SUB_RE, True)

    hyphen_log = []
    labels = {i + 1: doc[i].get_label() for i in range(doc.page_count)}

    def finish(item, cprt_id):
        own = cels.get(cprt_id, {}).get("text", "")
        text = join_lines(item["lines"], plain_vocab, hyph_vocab, own_text=own, log=hyphen_log, ctx=item["id"])
        rec = {"text": text, "page": item["pages"][0]}
        if len(item["pages"]) > 1:
            rec["pageEnd"] = item["pages"][-1]
        rec["printedPage"] = labels[item["pages"][0]]
        return rec

    # ---- functions -----------------------------------------------------------------------
    section_pages = {}
    fig5_page = None
    for pno, x0, y0, txt in page_lines(doc):
        s = txt.strip()
        if s.startswith("Fig. 5.") and fig5_page is None:
            fig5_page = pno
        for fid, code, title, sec in FUNCS:
            if s == sec and fid not in section_pages and pno > 20:
                section_pages[fid] = pno
    functions = []
    for fid, code, title, sec in FUNCS:
        cprt_text = cels[fid]["text"]
        assert cprt_text.rstrip(".") == FIG5[fid], (fid, cprt_text)
        functions.append(OrderedDict([
            ("id", fid), ("code", code), ("title", title), ("text", FIG5[fid]),
            ("page", fig5_page), ("printedPage", labels[fig5_page]),
            ("textSource", "Figure 5 (image) of NIST AI 100-1; identical to the CPRT AI_100_1_0_0 function text, which adds a final period"),
            ("section", sec), ("sectionPage", section_pages[fid]),
            ("codeSource", "AI 100-1 defines no two-letter codes; GV/MP/MS/MG are the tags defined in NIST AI 600-1, Section 3 (physical page 17): \"GV = Govern; MP = Map; MS = Measure; MG = Manage\""),
        ]))

    categories = []
    for cid, it in cats.items():
        rec = finish(it, cid)
        categories.append(OrderedDict([("id", cid), ("function", it["function"])] + list(rec.items())))
    subcategories = []
    for sid, it in subs.items():
        cat = sid.split(".")[0]
        rec = finish(it, sid)
        subcategories.append(OrderedDict([("id", sid), ("category", cat), ("function", it["function"])] + list(rec.items())))

    # ---- verification ----------------------------------------------------------------------
    report = {"counts": {}, "cprtDifferences": [], "playbookDifferences": [], "hyphenation": hyphen_log}
    per_fn = OrderedDict()
    for fid, *_ in FUNCS:
        per_fn[fid] = {"categories": sum(1 for c in categories if c["function"] == fid),
                       "subcategories": sum(1 for s in subcategories if s["function"] == fid)}
    report["counts"] = {"functions": len(functions), "categories": len(categories),
                        "subcategories": len(subcategories), "perFunction": per_fn}
    cprt_cats = {k for k, v in cels.items() if v["element_type"] == "category"}
    cprt_subs = {k for k, v in cels.items() if v["element_type"] == "subcategory"}
    report["idSetMatchesCprt"] = (cprt_cats == set(cats)) and (cprt_subs == set(subs))
    for rec in categories + subcategories:
        c = cels.get(rec["id"], {}).get("text")
        if c is None or norm_cmp(c) != norm_cmp(rec["text"]):
            report["cprtDifferences"].append({"id": rec["id"], "pdf": rec["text"], "cprt": c})
    for rec in subcategories:
        p = playbook.get(rec["id"], {}).get("description")
        if p is None or norm_cmp(p) != norm_cmp(rec["text"]):
            report["playbookDifferences"].append({"id": rec["id"], "pdf": rec["text"], "playbook": p})

    # independent containment check: every extracted text must occur (ignoring whitespace and
    # hyphens) in the text layer of its column on its page(s)
    def squash(t):
        t = fix_ligatures(t)
        for w in ("Categories", "Subcategories", "Continued on next page"):
            t = t.replace(w, "")
        t = re.sub(r"Table \d: Categories and subcategories for the \w+ function\.( \(Continued\))?", "", t)
        return re.sub(r"[\s\-\u2010\u2011\u2013\u2014\u00ad]", "", t)
    missing = []
    for rec in categories + subcategories:
        is_cat = rec in categories
        blob = ""
        for i, p in enumerate(range(rec["page"], rec.get("pageEnd", rec["page"]) + 1)):
            clip = pymupdf.Rect(94, 60, 201, 665) if is_cat else pymupdf.Rect(201, 60, 530, 665)
            lines = []
            for b in doc[p - 1].get_text("dict", clip=clip)["blocks"]:
                for l in b.get("lines", []):
                    t = "".join(sp["text"] for sp in l["spans"])
                    base = max(sp["origin"][1] for sp in l["spans"])   # baseline, robust to tall glyphs
                    if i > 0 and base < 105:
                        continue          # "(Continued)" caption of a continuation page
                    lines.append((round(base, 1), l["bbox"][0], t))
            blob += "".join(t for _, _, t in sorted(lines))
        if squash(rec["text"]) not in squash(blob):
            missing.append(rec["id"])
    report["notFoundInPdfColumn"] = missing

    out = OrderedDict()
    man = load_manifest_doc("nist-ai-100-1")
    out["source"] = OrderedDict([
        ("documentId", "nist-ai-100-1"),
        ("title", "Artificial Intelligence Risk Management Framework (AI RMF 1.0)"),
        ("identifier", "NIST AI 100-1"),
        ("version", "AI RMF 1.0 (January 2023)"),
        ("path", "nist-ai-rmf/core/NIST.AI.100-1.pdf"),
        ("sha256", sha256(PDF)),
        ("url", "https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf"),
        ("doi", "https://doi.org/10.6028/NIST.AI.100-1"),
        ("pageNumbering", "page = 1-based physical page of the PDF file; printedPage = page label printed in the footer"),
        ("extraction", "PyMuPDF text layer of Tables 1-4 (Section 5), split into the Categories/Subcategories columns by x-position; end-of-line hyphens resolved against the CPRT and Playbook wording; cross-checked against CPRT AI_100_1_0_0 and the AIRC Playbook JSON"),
        ("crossCheck", OrderedDict([
            ("cprtDataset", "AI_100_1_0_0"),
            ("cprtSha256", sha256(CPRT)),
            ("playbookJsonSha256", sha256(PLAYBOOK)),
        ])),
    ])
    if man:
        assert man["sha256"] == out["source"]["sha256"], "manifest sha256 differs from file"
    out["functions"] = functions
    out["categories"] = categories
    out["subcategories"] = subcategories

    print(json.dumps(report["counts"], indent=1))
    print("ID sets match CPRT:", report["idSetMatchesCprt"])
    print("CPRT text differences:", len(report["cprtDifferences"]))
    print("Playbook description differences:", len(report["playbookDifferences"]))
    unresolved = [h for h in hyphen_log if h["decision"] == "keep?"]
    print("end-of-line hyphens:", len(hyphen_log), "unresolved:", unresolved)
    print("texts not found in their PDF column:", report["notFoundInPdfColumn"])
    (ROOT / "tools" / "reports").mkdir(exist_ok=True)
    (ROOT / "tools" / "reports" / "core-verification.json").write_text(
        json.dumps(report, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    if not check_only:
        OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        print("wrote", OUT)


if __name__ == "__main__":
    main()
