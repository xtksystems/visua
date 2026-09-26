#!/usr/bin/env python3
"""Extract the NIST AI 600-1 Generative AI Profile (risks + suggested actions) into genai-profile.json.

Input  (relative to corpus/nist-ai-rmf/): profiles/NIST.AI.600-1.pdf, ai-rmf-core.json (for the
       AI 100-1 subcategory wording used in the comparison)
Output: genai-profile.json and tools/reports/genai-verification.json

Method: PyMuPDF text layer. Section 2 list items (1.-12.) give the risk names and definitions; the
Section 2.x headings give the trustworthy-AI characteristics. The Section 3 tables are split into
rows with the table's own horizontal rules and into columns by x-position (Action ID | Suggested
Action | GAI Risks). Superscript footnote markers are dropped; ligature code points are replaced by
their letters. Usage: python3 tools/extract_genai.py [--check]
"""
import json
import re
import sys
from collections import OrderedDict, Counter

import pymupdf

from common import ROOT, fix_ligatures, norm_cmp, sha256

PDF = ROOT / "profiles" / "NIST.AI.600-1.pdf"
CORE = ROOT / "ai-rmf-core.json"
OUT = ROOT / "genai-profile.json"

RISK_IDS = OrderedDict([
    ("CBRN Information or Capabilities", "cbrn"),
    ("Confabulation", "confabulation"),
    ("Dangerous, Violent, or Hateful Content", "dangerous-violent-hateful-content"),
    ("Data Privacy", "data-privacy"),
    ("Environmental Impacts", "environmental-impacts"),
    ("Harmful Bias or Homogenization", "harmful-bias-homogenization"),
    ("Human-AI Configuration", "human-ai-configuration"),
    ("Information Integrity", "information-integrity"),
    ("Information Security", "information-security"),
    ("Intellectual Property", "intellectual-property"),
    ("Obscene, Degrading, and/or Abusive Content", "obscene-degrading-abusive-content"),
    ("Value Chain and Component Integration", "value-chain-component-integration"),
])
# Tag spellings used in the GAI Risks column that differ from the Section 2 names (verified by hand).
TAG_ALIASES = {
    "harmful bias and homogenization": "harmful-bias-homogenization",
    "cbrn information and capability": "cbrn",
    "cbrn information and capabilities": "cbrn",
    "cbrn information or capability": "cbrn",
    "environmental": "environmental-impacts",
    "environmental impact": "environmental-impacts",
    "dangerous, violent or hateful content": "dangerous-violent-hateful-content",
    "dangerous or violent content": "dangerous-violent-hateful-content",
    "obscene, degrading and/or abusive content": "obscene-degrading-abusive-content",
    "human ai configuration": "human-ai-configuration",
    "value chain and component integrations": "value-chain-component-integration",
}
ACTION_ID = re.compile(r"^(GV|MP|MS|MG)-?(\d+)\.(\d+)-{1,2}(\d{3})$")   # tolerant: the PDF prints "GV4.3--001" once
ACTION_ID_PREFIX = re.compile(r"^\s*((?:GV|MP|MS|MG)-?\d+\.\d+-{1,2}\d{3})\s+(\S.*)$")
ACTOR_RE = re.compile(r"^AI Actor(?:s| Tasks):\s*")
SUB_HEAD = re.compile(r"^(GOVERN|MAP|MEASURE|MANAGE) (\d+)\.(\d+):\s*(.*)$")
FN = {"GV": "GOVERN", "MP": "MAP", "MS": "MEASURE", "MG": "MANAGE"}


def is_superscript(span):
    """Footnote reference marker: PyMuPDF's superscript flag AND a small font. The flag alone is not
    reliable here (it is set on some ordinary 10 pt table lines)."""
    return bool(span["flags"] & 1) and span["size"] < 8.5


def lines_of(page):
    """[(y0, y1, x0, text, bold)] for a page; superscript spans dropped, ligatures fixed."""
    out = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            spans = [s for s in l["spans"] if not is_superscript(s)]
            txt = fix_ligatures("".join(s["text"] for s in spans))
            if not txt.strip():
                continue
            bold = any("Bold" in s["font"] for s in spans if s["text"].strip())
            out.append((l["bbox"][1], l["bbox"][3], l["bbox"][0], txt, bold, spans[0]["size"] if spans else 0))
    return out


def merged_lines(page):
    """lines_of() with pieces that share a baseline merged left-to-right (used outside the tables,
    e.g. the '2.10.' heading number and its title are separate text lines in the PDF)."""
    out = []
    for ln in sorted(lines_of(page), key=lambda l: (round(l[0]), l[2])):
        if out and abs(out[-1][0] - ln[0]) < 1.5 and ln[2] > out[-1][2]:
            y0, y1, x0, txt, bold, size = out[-1]
            out[-1] = (y0, max(y1, ln[1]), x0, txt.rstrip() + " " + ln[3].strip(), bold or ln[4], size)
        else:
            out.append(ln)
    return out


def join(parts):
    """Join wrapped lines of Word-typeset text: a line ending in '-' or '/' continues without a space."""
    out = ""
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if not out:
            out = p
        elif re.search(r"[A-Za-z0-9][-/]$", out):
            out += p
        else:
            out += " " + p
    return re.sub(r"\s+", " ", out).strip()


def spans_of(page):
    """Non-blank, non-superscript spans as dicts {x0, x1, yc, base, text, bold}. A span that starts
    with an action ID followed by text (e.g. 'MP-3.4-004 Delineate ...') is split in two."""
    out = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            for s in l["spans"]:
                if not s["text"].strip():
                    continue
                if is_superscript(s):   # keep its geometry (for spacing) but not its text
                    out.append({"x0": s["bbox"][0], "x1": s["bbox"][2], "base": s["origin"][1] + 2.5,
                                "yc": s["origin"][1] + 2.5 - 0.35 * 10, "text": "", "bold": False, "col": None, "sup": True})
                    continue
                t = fix_ligatures(s["text"])
                base = s["origin"][1]
                rec = {"x0": s["bbox"][0], "x1": s["bbox"][2], "base": base, "yc": base - 0.35 * s["size"],
                       "text": t, "bold": "Bold" in s["font"], "col": None}
                m = ACTION_ID_PREFIX.match(t)
                if m:
                    out.append(dict(rec, text=m.group(1), col="id"))
                    out.append(dict(rec, text=m.group(2), col="action", x0=rec["x0"] + 60))
                else:
                    out.append(rec)
    return out


def span_lines(spans):
    """Group spans into lines by baseline (within 2 pt) and join them left to right."""
    lines = []
    for sp in sorted(spans, key=lambda z: (z["base"], z["x0"])):
        if lines and abs(lines[-1]["base"] - sp["base"]) < 2.0:
            lines[-1]["parts"].append(sp)
        else:
            lines.append({"base": sp["base"], "parts": [sp]})
    out = []
    for ln in lines:
        parts = sorted(ln["parts"], key=lambda z: z["x0"])
        txt, prev = "", None
        for pz in parts:
            if pz.get("sup"):
                prev = pz
                continue
            gap = pz["x0"] - prev["x1"] if prev is not None else 0
            if not txt or txt.endswith(" ") or pz["text"].startswith(" ") or gap < 1.0:
                txt += pz["text"]
            else:
                txt += " " + pz["text"]
            prev = pz
        out.append(re.sub(r"\s+", " ", txt).strip())
    return [t for t in out if t]


def rules(page):
    """y-positions of the table's horizontal rules. Only horizontal segments that start at a vertical
    rule (a column boundary) count, so hyperlink underlines inside cells are ignored."""
    hs, vx = [], []
    for dr in page.get_drawings():
        for it in dr["items"]:
            if it[0] == "re":
                r = it[1]
                if r.height < 2 and r.width > 40:
                    hs.append((r.x0, (r.y0 + r.y1) / 2))
                elif r.width < 2 and r.height > 0.3:
                    vx.append((r.x0 + r.x1) / 2)
            elif it[0] == "l":
                a, b = it[1], it[2]
                if abs(a.y - b.y) < 1 and abs(a.x - b.x) > 40:
                    hs.append((min(a.x, b.x), a.y))
                elif abs(a.x - b.x) < 1 and abs(a.y - b.y) > 3:
                    vx.append(a.x)
    ys = sorted(y for x0, y in hs if any(abs(x0 - v) <= 3 for v in vx))
    merged = []
    for y in ys:
        if not merged or y - merged[-1] > 1.5:
            merged.append(y)
    return merged


def risk_id(tag):
    t = re.sub(r"\s+", " ", tag.strip().rstrip(".")).strip()
    for name, rid in RISK_IDS.items():
        if t.lower() == name.lower():
            return rid, False
    if t.lower() in TAG_ALIASES:
        return TAG_ALIASES[t.lower()], True
    return None, True


def split_known(label):
    """Split a comma-joined label into known risk names (greedy, left to right); None if impossible."""
    names = sorted(list(RISK_IDS) + [k for k in TAG_ALIASES], key=len, reverse=True)
    rest, out = label.strip(), []
    while rest:
        for n in names:
            if rest.lower().startswith(n.lower()) and (len(rest) == len(n) or rest[len(n)] == ","):
                out.append(rest[:len(n)])
                rest = rest[len(n):].lstrip(", ").strip()
                break
        else:
            return None
    return out


def main():
    check_only = "--check" in sys.argv
    doc = pymupdf.open(PDF)
    core = {s["id"]: s for s in json.loads(CORE.read_text(encoding="utf-8"))["subcategories"]}
    report = OrderedDict()

    # ---------------- risks: Section 2 numbered list + 2.x sections -------------------------------
    risks, cur = [], None
    sec = {}
    for pno in range(doc.page_count):
        if pno > 20:
            break
        for y0, y1, x0, txt, bold, size in merged_lines(doc[pno]):
            s = txt.strip()
            if size < 10.5:          # page numbers, footnotes
                continue
            m = re.match(r"^(\d{1,2})\. ([^:]+): (.*)$", s)
            if m and 85 <= x0 <= 95:
                cur = {"n": int(m.group(1)), "title": m.group(2).strip(), "lines": [m.group(3)], "page": pno + 1}
                risks.append(cur)
                continue
            h = re.match(r"^2\.(\d{1,2})\. (.+)$", s)
            if h and bold:
                cur = None
                sec[int(h.group(1))] = {"title": h.group(2).strip(), "page": pno + 1, "tac": None}
                last_sec = int(h.group(1))
                continue
            if s.startswith("Trustworthy AI Characteristic") and bold and sec:
                sec[last_sec]["tac"] = [s]
                sec[last_sec]["tacOpen"] = y0
                continue
            if sec and sec[last_sec].get("tacOpen"):
                # the characteristics line wraps onto the next line (not bold, ~14.5 pt lower)
                if x0 < 80 and 0 < y0 - sec[last_sec]["tacOpen"] < 20 and not re.match(r"^\d+\.", s):
                    sec[last_sec]["tac"].append(s)
                    sec[last_sec]["tacOpen"] = y0
                    continue
                sec[last_sec]["tacOpen"] = None
            if cur is not None and 100 <= x0 <= 115:
                cur["lines"].append(s)
            elif cur is not None and x0 < 100:
                cur = None
    assert [r["n"] for r in risks] == list(range(1, 13)), [r["n"] for r in risks]
    risk_out = []
    for r in risks:
        title = r["title"]
        rid = RISK_IDS[title]
        sct = sec[r["n"]]
        tac_line = join(sct["tac"])
        tac = [t.strip() for t in re.sub(r"^Trustworthy AI Characteristics?:\s*", "", tac_line).split(",") if t.strip()]
        risk_out.append(OrderedDict([
            ("id", rid), ("number", r["n"]), ("title", title), ("description", join(r["lines"])),
            ("page", r["page"]), ("section", f"2.{r['n']}"), ("sectionTitle", sct["title"]),
            ("sectionPage", sct["page"]), ("trustworthyCharacteristics", tac),
        ]))

    # ---------------- Section 3 tables ------------------------------------------------------------
    subcats, actions = OrderedDict(), []
    cur_sub, cur_act = None, None
    raw_tags = Counter()
    for pno in range(doc.page_count):
        page = doc[pno]
        if subcats and re.search(r"(?m)^\s*Appendix A\. ", fix_ligatures(page.get_text())):
            break                       # Section 3 ends where Appendix A begins
        ys = rules(page)
        if len(ys) < 2:
            continue
        rows = [[] for _ in range(len(ys) - 1)]
        for sp in spans_of(page):
            for i in range(len(ys) - 1):
                if ys[i] <= sp["yc"] < ys[i + 1]:
                    rows[i].append(sp)
                    break
        for i, row in enumerate(rows):
            if not row:
                continue
            all_lines = span_lines(row)
            if not all_lines:
                continue
            first = all_lines[0]
            m = SUB_HEAD.match(first)
            if m:
                sid = f"{m.group(1)} {m.group(2)}.{m.group(3)}"
                cur_sub = OrderedDict([("id", sid), ("function", m.group(1)), ("text", join([m.group(4)] + all_lines[1:])),
                                       ("page", pno + 1)])
                subcats[sid] = cur_sub
                cur_act = None
                continue
            if cur_sub is None:
                continue
            joined = " ".join(all_lines)
            if "Action ID" in joined and "Suggested Action" in joined:
                continue
            if ACTOR_RE.match(first):
                cur_sub["aiActorTasksLabel"] = first.split(":")[0]
                t = ACTOR_RE.sub("", join(all_lines))
                cur_sub["aiActorTasks"] = [a.strip() for a in t.split(",") if a.strip()]
                if cur_sub["aiActorTasksLabel"] == "AI Actor Tasks":
                    del cur_sub["aiActorTasksLabel"]
                cur_act = None
                continue
            for sp in row:
                if sp["col"] is None:
                    sp["col"] = "id" if sp["x0"] < 70 else ("risk" if sp["x0"] >= 420 else "action")
            idtxt = " ".join(span_lines([z for z in row if z["col"] == "id"])).strip()
            act = span_lines([z for z in row if z["col"] == "action"])
            rsk = span_lines([z for z in row if z["col"] == "risk"])
            am = ACTION_ID.match(idtxt)
            if am:
                canon = f"{am.group(1)}-{am.group(2)}.{am.group(3)}-{am.group(4)}"
                cur_act = OrderedDict([
                    ("id", canon), ("subcategory", f"{FN[am.group(1)]} {am.group(2)}.{am.group(3)}"),
                    ("_act", act), ("_rsk", rsk), ("page", pno + 1)])
                if canon != idtxt:
                    cur_act["idAsPrinted"] = idtxt
                actions.append(cur_act)
            elif not idtxt and cur_act is not None and (act or rsk):
                cur_act["_act"] += act      # row continued from the previous page
                cur_act["_rsk"] += rsk
                cur_act["pageEnd"] = pno + 1
            else:
                report.setdefault("unparsedRows", []).append({"page": pno + 1, "lines": all_lines})

    unknown_tags, alias_used = Counter(), Counter()
    out_actions = []
    for a in actions:
        text = join(a["_act"])
        rtext = join(a["_rsk"])
        tags = [t.strip() for t in rtext.split(";") if t.strip()]     # labels exactly as printed
        ids = []
        for t in tags:
            raw_tags[t] += 1
            parts = [t]
            if risk_id(t)[0] is None and "," in t and split_known(t):
                # e.g. "Human-AI Configuration, Dangerous, Violent, or Hateful Content" (comma instead of ';')
                parts = split_known(t)
                report.setdefault("riskLabelsSplitOnComma", []).append({"action": a["id"], "label": t, "split": parts})
            for part in parts:
                rid, alias = risk_id(part)
                if rid is None:
                    unknown_tags[part] += 1
                    continue
                if alias:
                    alias_used[part] += 1
                if rid not in ids:
                    ids.append(rid)
        rec = OrderedDict([("id", a["id"]), ("subcategory", a["subcategory"]), ("text", text), ("risks", ids),
                           ("riskLabels", tags), ("page", a["page"])])
        if "idAsPrinted" in a:
            rec["idAsPrinted"] = a["idAsPrinted"]
        if "pageEnd" in a:
            rec["pageEnd"] = a["pageEnd"]
        out_actions.append(rec)

    # ---------------- verification ---------------------------------------------------------------
    per_fn = Counter(FN[a["id"][:2]] for a in out_actions)
    per_sub = Counter(a["subcategory"] for a in out_actions)
    ids_seen = [a["id"] for a in out_actions]
    dup = [k for k, v in Counter(ids_seen).items() if v > 1]
    seq_gaps = []
    for sid in per_sub:
        nums = sorted(int(a["id"][-3:]) for a in out_actions if a["subcategory"] == sid)
        if nums != list(range(1, len(nums) + 1)):
            seq_gaps.append({"subcategory": sid, "numbers": nums})
    mismatch_sub = [a["id"] for a in out_actions if a["subcategory"] not in subcats]
    stmt_diff = [OrderedDict([("id", s), ("ai600_1", v["text"]), ("ai100_1", core[s]["text"])])
                 for s, v in subcats.items() if norm_cmp(v["text"]) != norm_cmp(core[s]["text"])]
    # every action text must occur in the page text (whitespace/hyphen-insensitive)
    def squash(t):
        return re.sub(r"[\s\-‐‑–—]", "", fix_ligatures(t))
    def page_blob(p, clip=None):
        # native text-layer order, footnote markers removed (independent of the row/column logic)
        parts = []
        for b in doc[p - 1].get_text("dict", clip=clip)["blocks"]:
            for l in b.get("lines", []):
                parts += [sp["text"] for sp in l["spans"] if not is_superscript(sp)]
        return squash(fix_ligatures("".join(parts)))
    not_found = []
    for a in out_actions:
        pages = range(a["page"], a.get("pageEnd", a["page"]) + 1)
        t = squash(re.sub(r"^(GV|MP|MS|MG)-\S+\s*", "", a["text"]))
        if t not in "".join(page_blob(p) for p in pages):
            # table cells can interleave in the text layer; retry on the action column only
            if t not in "".join(page_blob(p, pymupdf.Rect(70, 0, 425, 800)) for p in pages):
                not_found.append(a["id"])
    report["counts"] = OrderedDict([
        ("risks", len(risk_out)), ("subcategoriesWithActions", len(subcats)), ("actions", len(out_actions)),
        ("actionsPerFunction", OrderedDict((f, per_fn.get(f, 0)) for f in ("GOVERN", "MAP", "MEASURE", "MANAGE"))),
        ("subcategoriesPerFunction", OrderedDict((f, sum(1 for s in subcats if s.startswith(f + " "))) for f in ("GOVERN", "MAP", "MEASURE", "MANAGE"))),
        ("actionsPerSubcategory", OrderedDict(per_sub)),
    ])
    report["duplicateActionIds"] = dup
    report["actionNumberingGaps"] = seq_gaps
    report["actionsWithoutSubcategoryHeader"] = mismatch_sub
    report["actionsWithoutRiskTags"] = [a["id"] for a in out_actions if not a["risks"]]
    report["riskTagSpellings"] = OrderedDict(sorted(raw_tags.items()))
    report["riskTagAliasesUsed"] = OrderedDict(sorted(alias_used.items()))
    report["unknownRiskTags"] = OrderedDict(unknown_tags)
    report["actionsNotFoundInPdfText"] = not_found
    report["subcategoryStatementsDifferingFromAi100_1"] = stmt_diff
    report["riskActionCounts"] = OrderedDict((r["id"], sum(1 for a in out_actions if r["id"] in a["risks"])) for r in risk_out)

    out = OrderedDict()
    out["source"] = OrderedDict([
        ("documentId", "nist-ai-600-1"),
        ("title", "Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile"),
        ("identifier", "NIST AI 600-1"),
        ("version", "July 2024 (final)"),
        ("path", "nist-ai-rmf/profiles/NIST.AI.600-1.pdf"),
        ("sha256", sha256(PDF)),
        ("url", "https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf"),
        ("doi", "https://doi.org/10.6028/NIST.AI.600-1"),
        ("pageNumbering", "page/pageEnd/sectionPage = 1-based physical pages of the PDF file (printed page = physical page - 4 in the body)"),
        ("extraction", "PyMuPDF text layer; Section 2 list for risk names/definitions, Section 2.x headings for trustworthy-AI characteristics; Section 3 tables split into rows by their horizontal rules and into columns by x-position; superscript footnote markers dropped; ligatures (U+FB00-FB06) replaced by letters"),
        ("machineReadableSource", "none published by NIST as of 2026-09-26 (not in CPRT, not on the AIRC); extracted from the PDF"),
    ])
    out["counts"] = OrderedDict([("risks", len(risk_out)), ("actions", len(out_actions)),
                                 ("actionsPerFunction", report["counts"]["actionsPerFunction"]),
                                 ("subcategoriesWithActions", len(subcats))])
    out["risks"] = risk_out
    out["subcategories"] = list(subcats.values())
    out["actions"] = out_actions
    print(json.dumps({k: v for k, v in report.items() if k not in ("riskTagSpellings",)}, indent=1, ensure_ascii=False)[:6000])
    (ROOT / "tools" / "reports").mkdir(exist_ok=True)
    (ROOT / "tools" / "reports" / "genai-verification.json").write_text(json.dumps(report, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    if not check_only:
        OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        print("wrote", OUT)


if __name__ == "__main__":
    main()
