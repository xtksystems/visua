#!/usr/bin/env python3
"""Extract the Cyber AI Profile (NIST IR 8596 iprd, Tables 1-6) into cyber-ai-profile.json.

Input  (relative to corpus/nist-ai-rmf/): drafts/NIST.IR.8596.iprd.pdf
Cross-checks (read-only; skipped if absent): ../../packages/frameworks/data/nist-csf-2.0.json (CSF 2.0
       subcategory ids and statements, and the CSF 2.0 -> SP 800-53 Rev 5.2.0 OLIR mapping),
       ../../packages/frameworks/data/nist-sp-800-53-r5.json (SP 800-53 control and enhancement ids) and
       genai-profile.json (AI 600-1 action ids), ../nist-rmf/controls/sp800-53r5-control-catalog.xlsx (withdrawn controls)
Output: cyber-ai-profile.json and tools/reports/cyber-ai-profile-verification.json

Method: PyMuPDF text layer read with the table geometry. Each table page (physical pages 25-96, landscape)
is cut into row bands at the table's own horizontal rules (only rules that start at a column boundary
count, so hyperlink underlines are ignored; a band must lie on the table's left border, so the heading and
caption of a table that starts mid-page are never read as cell text) and into the five columns (CSF Core |
General Considerations | Secure | Defend | Thwart) at the page's six vertical rules. The running header and
footer, the line-number margin (x < 36 pt) and the repeated header rows are dropped. A band whose CSF cell
does not begin a Function, Category or Subcategory continues the previous row (Word splits a row across a
page break; every cell then continues in its own column). Cell sections are found at their bold labels
("General Considerations:", "Proposed Priority:", "Sample Opportunities:", "Sample Focus Area
Considerations:", "Example Informative References:"; printed variants are logged). Wrapped lines are
joined with one space, except after a line-final hyphen, em dash or slash that has no trailing space in the
text layer, and inside a URL that wraps onto the next line. Superscript footnote markers are removed from
the text and the footnotes are attached to the entry; a superscript "TM" is rendered as U+2122. Runs of
white space are collapsed to one space; nothing else is changed (typos in the source are kept).

Usage: python3 tools/extract_cyber_ai_profile.py [--check]
       --check: rebuild in memory and compare with cyber-ai-profile.json and the verification report on
       disk; write nothing; exit status 1 if either differs.
"""
import json
import re
import sys
from collections import Counter, OrderedDict

import pymupdf
from pypdf import PdfReader

from common import ROOT, fix_ligatures, load_manifest_doc, sha256

PDF = ROOT / "drafts" / "NIST.IR.8596.iprd.pdf"
OUT = ROOT / "cyber-ai-profile.json"
REPORT = ROOT / "tools" / "reports" / "cyber-ai-profile-verification.json"
DATA = ROOT.parent.parent / "packages" / "frameworks" / "data"
CSF_JSON = DATA / "nist-csf-2.0.json"
SP53_JSON = DATA / "nist-sp-800-53-r5.json"
GENAI_JSON = ROOT / "genai-profile.json"
CATALOG_XLSX = ROOT.parent / "nist-rmf" / "controls" / "sp800-53r5-control-catalog.xlsx"
DOC_ID = "nist-ir-8596-iprd"

COLX = [36.2, 153.0, 305.3, 456.1, 606.9, 758.0]       # fallback column boundaries (pt)
COLS = ["csf", "general", "secure", "defend", "thwart"]
FOCUS = ["secure", "defend", "thwart"]

SUB_RE = re.compile(r"^([A-Z]{2}\.[A-Z]{2}-\d{2})\s*:\s*(.*)$", re.S)
CAT_RE = re.compile(r"^(.+?)\s*\(([A-Z]{2}\.[A-Z]{2})\)$", re.S)
FUN_RE = re.compile(r"^(GOVERN|IDENTIFY|PROTECT|DETECT|RESPOND|RECOVER) \((GV|ID|PR|DE|RS|RC)\)$")
LABELS = [
    ("general", re.compile(r"General\s+Considerations\s*:")),
    ("references", re.compile(r"Example\s+Informative\s+References\s*:?")),
    ("priority", re.compile(r"Proposed\s+Priority\s*:?")),
    ("opportunities", re.compile(r"Sample\s+Opportunities\s*:")),
    ("considerations", re.compile(r"(?:Sample\s+)?Focus\s+Area\s+Considerations?\s*:")),
]
CANONICAL_LABEL = {"general": "General Considerations:", "references": "Example Informative References:",
                   "priority": "Proposed Priority:", "opportunities": "Sample Opportunities:",
                   "considerations": "Sample Focus Area Considerations:"}
PENDING_RE = re.compile(r"AI-specific Example Informative References pending additional inputs\.?")
NO_GENERAL_RE = re.compile(r"^No general considerations identified")
STANDARD = "Standard cybersecurity practices apply."
URL_TAIL = re.compile(r"https?://[^\s;]*$")
URL_CONT = re.compile(r"^[a-z0-9./_~%?=&#+-][A-Za-z0-9./_~%?=&#+-]*(?=[;,\s]|$)")
SP53_PREFIX = re.compile(r"^(?:NIST\s+)?SP\s+800-53,?\s+Rev\.?\s*5\s*:\s*")
CONTROL_RE = re.compile(r"^([A-Z]{2})-(\d{1,2})\s*(?:\((\d{1,2})\))?$")
GLUE_SPLIT = re.compile(r"(?:,\s*|\s+)(?=(?:ATLAS\s+AML|ENISA\s|https?://|DASF\s))")
AI_EXCHANGE_UNQUALIFIED_NOTE = ("printed without the 'AI Exchange' qualifier; attributed to the OWASP AI Exchange "
                                "because the name is one of its sections or controls")


def squash_ws(s):
    return re.sub(r"\s+", " ", s).strip()


def natural(s):
    return [int(x) if x.isdigit() else x for x in re.split(r"(\d+)", s)]


def typo_norm(s):
    """Comparison only: curly quotes -> straight, dashes (with or without spaces) -> ' - ', case folded."""
    s = s.replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"')
    s = re.sub(r"\s*[\u2013\u2014]\s*|\s+-\s+", " - ", s)
    return squash_ws(s).rstrip(".").lower()


# ------------------------------------------------------------------------------------------------
# page geometry
# ------------------------------------------------------------------------------------------------
def table_rules(page):
    """Table geometry of a page: (bands, xs).

    xs    = x of the vertical rules (6 on every table page: the 5 column boundaries);
    bands = [(y_top, y_bottom)] between consecutive horizontal rules that start at a column boundary
            (hyperlink underlines inside cells do not), kept only when the left table border (a vertical
            rule at xs[0]) runs through the band. The gap between two tables printed on one page (section
            heading and caption of the next table) therefore never becomes a band."""
    hs, vs = [], []
    for dr in page.get_drawings():
        for it in dr["items"]:
            if it[0] == "re":
                r = it[1]
                if r.height < 2 and r.width > 5:
                    hs.append((r.x0, (r.y0 + r.y1) / 2))
                elif r.width < 2 and r.height > 2:
                    vs.append(((r.x0 + r.x1) / 2, r.y0, r.y1))
            elif it[0] == "l":
                a, b = it[1], it[2]
                if abs(a.y - b.y) < 1 and abs(a.x - b.x) > 5:
                    hs.append((min(a.x, b.x), a.y))
                elif abs(a.x - b.x) < 1 and abs(a.y - b.y) > 2:
                    vs.append((a.x, min(a.y, b.y), max(a.y, b.y)))
    xs = []
    for x in sorted(v[0] for v in vs):
        if not xs or x - xs[-1] > 1.5:
            xs.append(x)
    bounds = xs if len(xs) == 6 else COLX
    ys = sorted(y for x0, y in hs if any(abs(x0 - c) <= 1.5 for c in bounds))
    rows = []
    for y in ys:
        if not rows or y - rows[-1] > 1.5:
            rows.append(y)
    left = [(y0, y1) for x, y0, y1 in vs if abs(x - bounds[0]) <= 1.5]
    bands = [(a, b) for a, b in zip(rows, rows[1:])
             if any(y0 - 1.0 <= a + 0.5 and b - 0.5 <= y1 + 1.0 for y0, y1 in left)]
    return bands, xs


def page_spans(page):
    out = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            for s in l["spans"]:
                if not s["text"].strip():
                    continue
                out.append({"x0": s["bbox"][0], "x1": s["bbox"][2], "y0": s["bbox"][1], "y1": s["bbox"][3],
                            "base": s["origin"][1], "size": s["size"], "bold": "Bold" in s["font"],
                            "sup": bool(s["flags"] & 1) and s["size"] < 7.5, "text": fix_ligatures(s["text"])})
    return out


def column_of(x0, bounds):
    for c in range(5):
        if bounds[c] - 1.0 <= x0 < bounds[c + 1] - 1.0:
            return c
    return None


def make_lines(spans):
    """Group spans into lines by baseline; within a line, spans are joined left to right and a space is
    inserted where neither side has one and the horizontal gap exceeds 1 pt."""
    spans = sorted(spans, key=lambda z: (round(z["base"], 0), z["x0"]))
    groups = []
    for sp in spans:
        if groups and abs(groups[-1][0]["base"] - sp["base"]) < 2.0:
            groups[-1].append(sp)
        else:
            groups.append([sp])
    lines = []
    for g in groups:
        g.sort(key=lambda z: z["x0"])
        segs, prev = [], None
        for sp in g:
            t = sp["text"]
            if prev is not None:
                last = segs[-1][0] if segs else ""
                if not (last.endswith((" ", "\t")) or t.startswith((" ", "\t"))) and sp["x0"] - prev["x1"] > 1.0:
                    t = " " + t
            segs.append((t, sp["bold"]))
            prev = sp
        lines.append({"text": "".join(t for t, _ in segs), "segs": segs, "base": g[0]["base"],
                      "y0": min(z["y0"] for z in g)})
    return lines


def assemble(lines, log, ctx):
    """Join cell lines into (text, per-character bold mask).

    Lines are joined with one space, except (a) after a line-final hyphen, em dash or slash that has no
    trailing space in the text layer (Word does not hyphenate, so these are compounds, control ids such as
    "SR-" + "06", or "cybersecurity—" + "including"), and (b) when the text so far ends inside a URL and
    the next line starts with a URL continuation (a token of URL characters beginning with a lower-case
    letter, digit or punctuation, e.g. "https://arxiv.org/html/2503.1191" + "7v3"). Every such join is
    logged for review."""
    text, mask = "", []
    for i, ln in enumerate(lines):
        segs = list(ln["segs"])
        if i > 0:
            stripped = text.rstrip()
            text, mask = stripped, mask[: len(stripped)]
            prev_raw = lines[i - 1]["text"]
            nxt = ln["text"].lstrip()
            sep, reason = " ", None
            if URL_TAIL.search(text) and URL_CONT.match(nxt):
                sep, reason = "", "url-continuation"
            elif not prev_raw.endswith((" ", "\t")) and re.search(r"[A-Za-z0-9)][-—/]$", text):
                sep, reason = "", "line-final " + text[-1]
            elif not prev_raw.endswith((" ", "\t")) and re.search(r"[A-Za-z,]$", text) and re.match(r"[a-z]", nxt):
                reason = "no trailing space in the text layer; joined with a space"
            if reason:
                log.append(OrderedDict([("context", ctx), ("end", text[-45:]), ("next", nxt[:45]),
                                        ("joined", "without space" if sep == "" else "with space"), ("rule", reason)]))
            text += sep
            mask += [False] * len(sep)
            if segs:
                segs[0] = (segs[0][0].lstrip(), segs[0][1])
        for t, b in segs:
            text += t
            mask += [b] * len(t)
    return text, mask


def split_sections(text, mask, allowed, ctx, problems):
    """Find the bold labels; return (OrderedDict label -> raw section text, printed label variants).
    A label match counts only if at least 60 % of its letters are bold, so running text such as
    "see Focus Area Considerations." is never taken for a label."""
    found = []
    for key, rx in LABELS:
        for m in rx.finditer(text):
            letters = [i for i in range(m.start(), m.end()) if text[i].isalpha()]
            if letters and sum(mask[i] for i in letters) / len(letters) >= 0.6:
                found.append((m.start(), m.end(), key, squash_ws(m.group(0))))
    found.sort()
    clean = []
    for f in found:
        if clean and f[0] < clean[-1][1]:
            continue
        clean.append(f)
    sections, variants = OrderedDict(), []
    pre = text[: clean[0][0]] if clean else text
    if squash_ws(pre):
        problems.append({"context": ctx, "problem": "text before the first label", "text": squash_ws(pre)})
    for i, (s, e, key, printed) in enumerate(clean):
        end = clean[i + 1][0] if i + 1 < len(clean) else len(text)
        if key not in allowed:
            problems.append({"context": ctx, "problem": f"unexpected label {printed!r}"})
        if key in sections:
            problems.append({"context": ctx, "problem": f"duplicate label {printed!r}"})
            sections[key] += " " + text[e:end]
        else:
            sections[key] = text[e:end]
        if printed != CANONICAL_LABEL[key]:
            variants.append(OrderedDict([("context", ctx), ("printed", printed), ("canonical", CANONICAL_LABEL[key])]))
    return sections, variants


def split_refs(raw):
    """-> (verbatim reference strings split on ';', placeholder sentence or None). The placeholder
    "AI-specific Example Informative References pending additional inputs." is not a reference."""
    note = None
    m = PENDING_RE.search(raw)
    if m:
        note = m.group(0)
        raw = raw[: m.start()] + ";" + raw[m.end():]
    refs = [squash_ws(r) for r in raw.split(";")]
    return [r for r in refs if r], note


# ------------------------------------------------------------------------------------------------
# reference classification (the `refs` layer; `references` keeps the verbatim strings)
# ------------------------------------------------------------------------------------------------
def norm_control(fam, num, enh):
    return f"{fam}-{int(num)}" + (f"({int(enh)})" if enh else "")


def dasf_ids(body, max_single, ctx, anomalies):
    """'13, 40, 51-53' -> ['DASF 13', 'DASF 40', 'DASF 51', 'DASF 52', 'DASF 53'] (+ notes).
    A range is expanded only when it is ascending, starts after the previous number and ends at or below
    the highest single DASF number cited in the Profile; anything else is left out and flagged."""
    ids, notes, prev = [], [], 0
    for item in [x.strip() for x in body.split(",")]:
        m1 = re.fullmatch(r"(\d{1,3})", item)
        m2 = re.fullmatch(r"(\d{1,3})\s*-\s*(\d{1,3})", item)
        if m1:
            ids.append(int(m1.group(1)))
            prev = int(m1.group(1))
        elif m2 and prev < int(m2.group(1)) < int(m2.group(2)) <= max_single:
            ids += list(range(int(m2.group(1)), int(m2.group(2)) + 1))
            prev = int(m2.group(2))
        else:
            notes.append(f"list item {item!r} not read as DASF control number(s)")
            anomalies.append(OrderedDict([("context", ctx), ("text", "DASF " + body), ("anomaly", notes[-1])]))
    out = []
    for n in ids:
        if f"DASF {n}" not in out:
            out.append(f"DASF {n}")
    return out, notes


def classify(piece, column, prev_scheme, max_dasf, ctx, anomalies, genai_ids):
    """Classify one verbatim reference string -> list of refs (several when a string holds several ids,
    or two references printed without a separator)."""
    parts = [p for p in GLUE_SPLIT.split(piece) if p.strip()]
    glued = len(parts) > 1
    if glued:
        anomalies.append(OrderedDict([("context", ctx), ("text", piece), ("anomaly", "two references without a ';' separator; split in `refs`")]))
    out = []
    for part in parts:
        part = part.strip().rstrip(",").strip()
        notes = ["split from " + repr(piece) + " (no ';' separator in the source)"] if glued else []
        recs = []                      # (scheme, id, notes, text)
        m_url = re.match(r"^(https?://\S+)(?:\s+(.+))?$", part)
        if m_url:
            url, rest = m_url.group(1), m_url.group(2)
            ma = re.match(r"https?://arxiv\.org/(?:pdf|html|abs)/(\d{4}\.\d{4,5}(?:v\d+)?)$", url)
            recs.append(("other", f"arXiv:{ma.group(1)}" if ma else None, [], url))
            if rest:
                anomalies.append(OrderedDict([("context", ctx), ("text", piece), ("anomaly", f"text {rest!r} follows a URL without a separator")]))
                recs.append(("other", None, ["fragment printed after a URL without a separator (source defect); not a reference by itself"], rest))
        elif SP53_PREFIX.match(part) or (column == "general" and prev_scheme == "nist-sp-800-53"
                                         and (CONTROL_RE.match(part) or re.fullmatch(r"[A-Z]{2}", part))):
            for tok in [t.strip() for t in SP53_PREFIX.sub("", part).split(",") if t.strip()]:
                mc = CONTROL_RE.match(tok)
                if mc:
                    n = []
                    if re.search(r"\d\s+\(", tok):
                        n.append("space before the enhancement number in the source")
                        anomalies.append(OrderedDict([("context", ctx), ("text", part), ("anomaly", n[0])]))
                    recs.append(("nist-sp-800-53", norm_control(*mc.groups()), n, part))
                elif re.fullmatch(r"[A-Z]{2}", tok):
                    recs.append(("nist-sp-800-53", tok, ["control family only (no control number); kept out of general.sp80053"], part))
                else:
                    recs.append(("nist-sp-800-53", None, [f"token {tok!r} not read as a control id"], part))
                    anomalies.append(OrderedDict([("context", ctx), ("text", part), ("anomaly", f"SP 800-53 token {tok!r} not read as a control id")]))
        elif re.match(r"^(?:ATLAS\s+)?AML[.\-]M\d{4}", part):
            m = re.match(r"^(?:ATLAS\s+)?AML([.\-])M(\d{4})(.*)$", part)
            n = []
            if m.group(1) == "-":
                n.append("printed 'AML-M' (hyphen); id normalized to 'AML.M'")
                anomalies.append(OrderedDict([("context", ctx), ("text", part), ("anomaly", n[-1])]))
            if m.group(3).strip() and not re.fullmatch(r"\s*\([^()]*\)", m.group(3)):
                n.append(f"trailing {m.group(3).strip()!r} in the source")
                anomalies.append(OrderedDict([("context", ctx), ("text", part), ("anomaly", n[-1])]))
            if not part.startswith("ATLAS"):
                n.append("printed without the 'ATLAS' prefix")
            recs.append(("atlas", f"AML.M{m.group(2)}", n, part))
        elif part == "ATLAS":
            recs.append(("atlas", None, ["ATLAS cited as a whole"], part))
        elif part.startswith("OWASP LLM Top Ten:"):
            m = re.match(r"^OWASP LLM Top Ten:\s*(LLM\d{2})\b", part)
            recs.append(("owasp-llm", m.group(1) if m else None, [], part))
        elif part.startswith("OWASP GenAI Security Project:"):
            recs.append(("owasp-genai", squash_ws(part.split(":", 1)[1]), [], part))
        elif re.match(r"^O?WASP AI Exchange:", part):
            n = [] if part.startswith("OWASP") else ["printed 'WASP' (missing 'O') in the source"]
            if n:
                anomalies.append(OrderedDict([("context", ctx), ("text", part), ("anomaly", n[0])]))
            recs.append(("owasp-ai-exchange", squash_ws(part.split(":", 1)[1]), n, part))
        elif part == "OWASP (all)":
            recs.append(("other", None, ["OWASP cited as a whole"], part))
        elif re.match(r"^OWASP\s+\S", part):
            recs.append(("owasp-ai-exchange", squash_ws(part[len("OWASP"):]), [AI_EXCHANGE_UNQUALIFIED_NOTE], part))
        elif re.match(r"^DASF\s", part):
            ids, n = dasf_ids(part[4:].strip().strip('"').strip(), max_dasf, ctx, anomalies)
            if part.rstrip().endswith('"'):
                n.append("stray '\"' in the source")
                anomalies.append(OrderedDict([("context", ctx), ("text", part), ("anomaly", n[-1])]))
            for i in ids:
                recs.append(("dasf", i, n, part))
            if not ids:
                recs.append(("dasf", None, n, part))
        elif re.fullmatch(r"\d{1,3}", part) and prev_scheme == "dasf":
            n = ["bare number after a DASF list, separated by ';' instead of ','; read as a DASF control number"]
            anomalies.append(OrderedDict([("context", ctx), ("text", part), ("anomaly", n[0])]))
            recs.append(("dasf", f"DASF {int(part)}", n, part))
        elif part.startswith("ENISA "):
            n = []
            if "Theat" in part:
                n.append("'Theat' (typo) in the source")
            if not re.search(r"\b2025$", part):
                n.append("year printed as " + repr(part.split()[-1]))
            for x in n:
                anomalies.append(OrderedDict([("context", ctx), ("text", part), ("anomaly", x)]))
            recs.append(("enisa", None, n, part))
        elif re.fullmatch(r"(?:NIST\s+)?AI\s+100-2\s*e2025", part):
            recs.append(("nist-ai-100-2", None, [], part))
        elif re.fullmatch(r"ATT&CK(?:\s+M\d{4})?", part):
            mid = part.split()[1] if " " in part else None
            recs.append(("mitre-attack", mid, [] if mid else ["ATT&CK cited as a whole"], part))
        elif re.fullmatch(r"NIST AI 600-1\s+(?:GV|MP|MS|MG)-\d+\.\d+-\d{3}", part):
            aid = part.split()[-1]
            n = [] if (genai_ids is None or aid in genai_ids) else ["action id not found in genai-profile.json"]
            recs.append(("nist-ai-rmf", aid, n, part))
        else:
            n = []
            if part == "NIST SP 800-281 (all)":
                n.append("no NIST SP 800-281 exists; probably SP 800-218 (not corrected)")
                anomalies.append(OrderedDict([("context", ctx), ("text", part), ("anomaly", n[0])]))
            recs.append(("other", None, n, part))
        for scheme, rid, n, text in recs:
            r = OrderedDict([("scheme", scheme), ("id", rid), ("text", text), ("column", column)])
            if notes or n:
                r["note"] = "; ".join(notes + n)
            out.append(r)
    return out


# ------------------------------------------------------------------------------------------------
# body text (Sections 2.1-2.2): focus-area descriptions, priority levels, draft notice
# ------------------------------------------------------------------------------------------------
def body_lines(page):
    """Body lines of a portrait page: line numbers (x < 60), running header/footer, footnotes, figure
    captions and superscript footnote markers dropped."""
    out = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            spans = [s for s in l["spans"] if s["text"].strip() and not (s["flags"] & 1 and s["size"] < 8)]
            if not spans or l["bbox"][0] < 60 or l["bbox"][1] < 62 or l["bbox"][1] > 735 or spans[0]["size"] < 11:
                continue
            out.append({"x0": l["bbox"][0], "y0": l["bbox"][1],
                        "text": fix_ligatures("".join(s["text"] for s in l["spans"] if s in spans or not s["text"].strip())),
                        "bold": all("Bold" in s["font"] for s in spans)})
    return sorted(out, key=lambda z: z["y0"])


def paragraphs(page):
    """Group body lines into paragraphs / bullet items (a gap > 18 pt, a bullet or a bold heading starts
    a new one)."""
    paras, cur, last = [], None, None
    for ln in body_lines(page):
        t = ln["text"]
        if cur is None or ln["y0"] - last > 18 or t.lstrip().startswith(("•", "o ")) or ln["bold"] != cur["bold"]:
            cur = {"lines": [t], "page": page.number + 1, "bold": ln["bold"]}
            paras.append(cur)
        else:
            cur["lines"].append(t)
        last = ln["y0"]
    for p in paras:
        text = ""
        for t in p["lines"]:
            if text and not re.search(r"[A-Za-z0-9][-—/]$", text):
                text += " "
            text += t.strip()
        p["text"] = squash_ws(text)
    return paras


def focus_areas_and_priorities(doc):
    bullets, firsts, levels, notice = {}, {}, [], None
    for pno in range(14, 24):
        paras = paragraphs(doc[pno])
        for i, p in enumerate(paras):
            m = re.match(r"^• (Securing AI System Components|Conducting AI-Enabled Cyber Defense|Thwarting AI-Enabled Cyber Attacks)"
                         r" \((Secure|Defend|Thwart)\): (.+)$", p["text"])
            if m and m.group(2) not in bullets:
                bullets[m.group(2)] = (m.group(1), m.group(3), p["page"])
            h = re.match(r"^2\.1\.(\d)\. (.+) \((Secure|Defend|Thwart)\)$", p["text"])
            if h and p["bold"]:
                body = next(q for q in paras[i + 1:] if not q["bold"])
                firsts[h.group(3)] = (h.group(2), body["text"], p["page"], "2.1." + h.group(1))
            pm = re.match(r"^• “([123])” for (High|Moderate|Foundational) Priority: (.+)$", p["text"])
            if pm:
                levels.append(OrderedDict([("level", int(pm.group(1))), ("label", pm.group(2)), ("description", pm.group(3)),
                                           ("printedAs", f"“{pm.group(1)}” for {pm.group(2)} Priority"),
                                           ("page", p["page"]), ("section", "2.2")]))
    areas = []
    for short in ("Secure", "Defend", "Thwart"):
        title, summary, spage = bullets[short]
        title2, desc, page, sec = firsts[short]
        assert title == title2, (title, title2)
        areas.append(OrderedDict([("id", short.lower()), ("short", short), ("title", title), ("description", desc),
                                  ("page", page), ("section", sec), ("summary", summary), ("summaryPage", spage),
                                  ("summarySection", "2.1")]))
    for p in paragraphs(doc[23]):
        if p["text"].startswith("NOTE: Work remains ongoing"):
            notice = OrderedDict([("text", p["text"]), ("page", p["page"])])
    return areas, levels, notice


# ------------------------------------------------------------------------------------------------
# independent check with pypdf
# ------------------------------------------------------------------------------------------------
def squash(t):
    return re.sub(r"\s+", "", t.replace("™", "TM"))


def found_in(text, pages):
    """Whitespace-insensitive containment in the page texts; a field that crosses a page break may be
    split at any point per break (its two parts are then separate cells in pypdf's reading order)."""
    t = squash(text)
    return not t or _found(t, pages)


def _found(t, pages):
    if t in pages[0]:
        return True
    if len(pages) == 1:
        return False
    for k in range(len(t) - 1, 0, -1):
        if t[:k] in pages[0] and _found(t[k:], pages[1:]):
            return True
    return _found(t, pages[1:])


# ------------------------------------------------------------------------------------------------
def main():
    check_only = "--check" in sys.argv
    doc = pymupdf.open(PDF)
    problems, join_log, label_variants, anomalies, missing_sections = [], [], [], [], []

    # ---------------- walk the table pages ----------------------------------------------------
    elements, footnotes, markers = [], {}, []
    table_pages, geometry_issues, col_bounds, outside = [], [], {}, []
    cur = None
    for pno in range(doc.page_count):
        page = doc[pno]
        pn = pno + 1
        if "CSF 2.0 Core:" not in page.get_text():
            if table_pages:
                break
            continue
        table_pages.append(pn)
        bands_y, xs = table_rules(page)
        if len(xs) == 6:
            bounds = xs
            col_bounds.setdefault(tuple(round(x, 1) for x in xs), []).append(pn)
        else:
            bounds = COLX
            geometry_issues.append({"page": pn, "verticalRules": [round(x, 1) for x in xs]})
        spans = page_spans(page)
        normal = [s for s in spans if not s["sup"]]
        for s in spans:                     # superscript "TM" -> trademark sign on its host line
            if s["sup"] and s["text"].strip() == "TM":
                host = [n for n in normal if abs(n["x1"] - s["x0"]) < 1.5 and n["y0"] - 2 < s["y0"] < n["y1"]]
                if host:
                    s.update(base=host[0]["base"], text="™", sup=False)
                else:
                    problems.append({"page": pn, "problem": "superscript TM without a host span"})
        # footnotes printed below the table: a small (~5 pt) number, then 8 pt text
        below = bands_y[-1][1] if bands_y else 1e9
        foot = [s for s in spans if (s["y0"] + s["y1"]) / 2 > below and s["x0"] >= 30 and s["size"] < 9.5 and s["y1"] < 555]
        cur_fn = None
        for ln in make_lines([s for s in foot if s["size"] >= 6]):
            nums = [s for s in foot if s["size"] < 6 and abs(s["y0"] - ln["y0"]) < 2.0]
            if nums:
                cur_fn = nums[0]["text"].strip()
                footnotes[cur_fn] = {"lines": [ln], "page": pn}
            elif cur_fn:
                footnotes[cur_fn]["lines"].append(ln)
        # cells
        bands = {}
        for s in spans:
            if s["sup"] and not s["text"].strip().isdigit():
                continue
            yc = (s["y0"] + s["y1"]) / 2
            band = next((i for i, (a, b) in enumerate(bands_y) if a <= yc < b), None)
            if band is None or s["x0"] < bounds[0] - 1:
                if band is None and s["x0"] >= bounds[0] - 1 and s["y0"] > 62 and s["y1"] < 555 and s not in foot:
                    outside.append(OrderedDict([("page", pn), ("text", s["text"].strip())]))
                continue
            col = column_of(s["x0"], bounds)
            if col is None:
                problems.append({"page": pn, "problem": "span outside the columns", "text": s["text"]})
                continue
            bands.setdefault(band, {}).setdefault(col, []).append(s)
        for band in sorted(bands):
            cells = bands[band]
            sup_markers = {c: [s for s in ss if s["sup"]] for c, ss in cells.items()}
            lines = {c: make_lines([s for s in ss if not s["sup"]]) for c, ss in cells.items()}
            csf_text = squash_ws(" ".join(l["text"] for l in lines.get(0, [])))
            all_text = squash_ws(" ".join(l["text"] for c in sorted(lines) for l in lines[c]))
            if csf_text.startswith("CSF 2.0 Core") or all_text == "Secure Defend Thwart":
                continue            # repeated table header rows
            m_fun, m_sub, m_cat = FUN_RE.match(csf_text), SUB_RE.match(csf_text), CAT_RE.match(csf_text)
            if m_fun or m_sub or m_cat:
                kind, eid = (("subcategory", m_sub.group(1)) if m_sub else ("function", m_fun.group(2)) if m_fun
                             else ("category", m_cat.group(2)))
                cur = {"kind": kind, "id": eid, "cols": {c: [] for c in range(5)}, "pages": []}
                elements.append(cur)
            elif cur is None:
                problems.append({"page": pn, "problem": "continuation row before any element", "text": all_text[:200]})
                continue
            if pn not in cur["pages"]:
                cur["pages"].append(pn)
            for c, ls in lines.items():
                cur["cols"][c].extend(ls)
            for c, ms in sup_markers.items():
                for s in ms:
                    markers.append((len(elements) - 1, c, s["text"].strip(), pn))

    fn_texts = OrderedDict()
    for k in sorted(footnotes, key=int):
        t, _ = assemble(footnotes[k]["lines"], join_log, f"footnote {k}")
        fn_texts[k] = OrderedDict([("text", squash_ws(t)), ("page", footnotes[k]["page"])])

    # ---------------- cross-check data ----------------------------------------------------------
    csf = json.loads(CSF_JSON.read_text(encoding="utf-8")) if CSF_JSON.exists() else None
    sp53 = json.loads(SP53_JSON.read_text(encoding="utf-8")) if SP53_JSON.exists() else None
    genai = json.loads(GENAI_JSON.read_text(encoding="utf-8")) if GENAI_JSON.exists() else None
    genai_ids = {a["id"] for a in genai["actions"]} if genai else None
    withdrawn = {}
    if CATALOG_XLSX.exists():        # SP 800-53 Rev 5 control catalog (corpus/nist-rmf): withdrawal notes
        import openpyxl
        for row in openpyxl.load_workbook(CATALOG_XLSX, read_only=True).worksheets[0].iter_rows(values_only=True):
            if row and isinstance(row[0], str) and isinstance(row[2], str) and row[2].startswith("[Withdrawn"):
                withdrawn[row[0].strip()] = row[2].strip()

    # ---------------- build entries -------------------------------------------------------------
    entries, functions, categories = [], [], []
    for idx, el in enumerate(elements):
        ctx = el["id"]
        texts = {c: assemble(el["cols"][c], join_log, f"{ctx}/{COLS[c]}") for c in range(5)}
        csf_cell = squash_ws(texts[0][0])
        if el["kind"] in ("function", "category"):
            title = FUN_RE.match(csf_cell).group(1) if el["kind"] == "function" else squash_ws(CAT_RE.match(csf_cell).group(1))
            (functions if el["kind"] == "function" else categories).append(OrderedDict([
                ("id", el["id"]), ("title", title), ("text", squash_ws(texts[1][0])), ("page", el["pages"][0])]))
            for c in range(2, 5):
                if squash_ws(texts[c][0]):
                    problems.append({"context": ctx, "problem": f"unexpected text in column {COLS[c]}", "text": squash_ws(texts[c][0])})
            continue
        m = SUB_RE.match(csf_cell)
        sub_id, sub_text = m.group(1), squash_ws(m.group(2))
        secs, var = split_sections(texts[1][0], texts[1][1], {"general", "references"}, f"{ctx}/general", problems)
        label_variants += var
        gtext = squash_ws(secs.get("general", ""))
        grefs, gnote = split_refs(secs.get("references", ""))
        general = OrderedDict()
        if NO_GENERAL_RE.match(gtext):
            general["considerations"], general["note"] = None, gtext
        else:
            general["considerations"], general["note"] = (gtext or None), None
        general["references"] = grefs
        if gnote:
            general["referencesNote"] = gnote
        focus = OrderedDict()
        for c, fa in zip((2, 3, 4), FOCUS):
            allowed = {"priority", "considerations", "references"} | ({"opportunities"} if fa == "defend" else set())
            secs, var = split_sections(texts[c][0], texts[c][1], allowed, f"{ctx}/{fa}", problems)
            label_variants += var
            for need in ("priority", "considerations", "references"):
                if need not in secs:
                    missing_sections.append(OrderedDict([("context", f"{ctx}/{fa}"), ("label", CANONICAL_LABEL[need]),
                                                         ("cellText", squash_ws(texts[c][0]))]))
            pr_raw = squash_ws(secs.get("priority", ""))
            mp = re.fullmatch(r"([123])", pr_raw)
            if not mp:
                problems.append({"context": f"{ctx}/{fa}", "problem": "priority not parsed", "text": pr_raw})
            refs, rnote = split_refs(secs.get("references", ""))
            cell = OrderedDict([("priority", int(mp.group(1)) if mp else None)])
            if fa == "defend":
                cell["opportunities"] = squash_ws(secs["opportunities"]) if "opportunities" in secs else None
            cell["considerations"] = squash_ws(secs["considerations"]) if "considerations" in secs else None
            cell["references"] = refs
            if rnote:
                cell["referencesNote"] = rnote
            focus[fa] = cell
        rec = OrderedDict([("subcategory", sub_id), ("text", sub_text), ("page", el["pages"][0]),
                           ("pageEnd", el["pages"][-1]), ("general", general), ("focus", focus)])
        fns = [OrderedDict([("marker", mk), ("column", COLS[c]), ("text", fn_texts.get(mk, {}).get("text")),
                            ("page", fn_texts.get(mk, {}).get("page"))]) for i, c, mk, _ in markers if i == idx]
        if fns:
            rec["footnotes"] = fns
        entries.append(rec)

    # ---------------- refs and general.sp80053 -----------------------------------------------------
    max_dasf = 0
    for e in entries:
        for fa in FOCUS:
            for r in e["focus"][fa]["references"]:
                if r.startswith("DASF"):
                    for item in r[4:].split(","):
                        if re.fullmatch(r"\s*\d{1,3}\s*", item):
                            max_dasf = max(max_dasf, int(item))
    for e in entries:
        refs = []
        for col, strings in [("general", e["general"]["references"])] + [(fa, e["focus"][fa]["references"]) for fa in FOCUS]:
            prev = None
            for s in strings:
                got = classify(s, col, prev, max_dasf, f"{e['subcategory']}/{col}", anomalies, genai_ids)
                refs += got
                prev = got[-1]["scheme"] if got else prev
        sp = []
        for r in refs:
            if r["column"] == "general" and r["scheme"] == "nist-sp-800-53" and r["id"] and "-" in r["id"] and r["id"] not in sp:
                sp.append(r["id"])
        e["general"]["sp80053"] = sp
        e["refs"] = refs
        if "footnotes" in e:
            e.move_to_end("footnotes")

    areas, levels, notice = focus_areas_and_priorities(doc)

    # ---------------- verification -------------------------------------------------------------------
    report = OrderedDict()
    report["source"] = OrderedDict([("path", "nist-ai-rmf/drafts/NIST.IR.8596.iprd.pdf"), ("sha256", sha256(PDF)),
                                    ("tablePages", [table_pages[0], table_pages[-1]]), ("tablePageCount", len(table_pages))])
    ids = [e["subcategory"] for e in entries]
    v = OrderedDict([("entries", len(entries)), ("distinct", len(set(ids))),
                     ("functionRows", [f["id"] for f in functions]), ("categoryRows", len(categories))])
    if csf:
        by = {n["code"]: n for n in csf["nodes"]}
        csf_ids = [n["code"] for n in csf["nodes"] if n["kind"] == "subcategory"]
        v["csfSubcategories"] = len(csf_ids)
        v["missing"] = [i for i in csf_ids if i not in ids]
        v["extra"] = [i for i in ids if i not in csf_ids]
        v["sameOrderAsCsf"] = ids == csf_ids
        v["subcategoryTextDifferences"] = [
            OrderedDict([("id", e["subcategory"]), ("pdf", e["text"]), ("csf", by[e["subcategory"]]["text"])])
            for e in entries if e["subcategory"] in by and typo_norm(e["text"]) != typo_norm(by[e["subcategory"]]["text"])]
        v["textComparison"] = "quotes, dashes, case and a final period ignored"
        v["functionAndCategoryDifferences"] = []
        for f in functions + categories:
            n = by.get(f["id"])
            if n is None:
                v["functionAndCategoryDifferences"].append(OrderedDict([("id", f["id"]), ("problem", "not in CSF 2.0")]))
                continue
            for k in ("title", "text"):
                if typo_norm(f[k]) != typo_norm(n[k]):
                    v["functionAndCategoryDifferences"].append(OrderedDict([("id", f["id"]), ("field", k), ("pdf", f[k]), ("csf", n[k])]))
    report["subcategories"] = v
    pr = OrderedDict()
    for fa in FOCUS:
        pr[fa] = OrderedDict((str(l), sum(1 for e in entries if e["focus"][fa]["priority"] == l)) for l in (1, 2, 3))
        pr[fa]["unparsed"] = sum(1 for e in entries if e["focus"][fa]["priority"] is None)
    report["priorities"] = pr
    report["priorityPatterns"] = OrderedDict(sorted(Counter("".join(str(e["focus"][fa]["priority"]) for fa in FOCUS) for e in entries).items()))
    cellstats = OrderedDict()
    cellstats["generalConsiderations"] = sum(1 for e in entries if e["general"]["considerations"])
    cellstats["generalNoConsiderationsNote"] = sum(1 for e in entries if e["general"]["note"])
    cellstats["generalNoteSpellings"] = OrderedDict(sorted(Counter(e["general"]["note"] for e in entries if e["general"]["note"]).items()))
    for fa in FOCUS:
        cs = [e["focus"][fa] for e in entries]
        cellstats[fa] = OrderedDict([
            ("considerations", sum(1 for c in cs if c["considerations"])),
            ("considerationsExactlyStandardPractices", sum(1 for c in cs if c["considerations"] == STANDARD)),
            ("considerationsStartingWithStandardPractices", sum(1 for c in cs if (c["considerations"] or "").startswith(STANDARD))),
            ("considerationsWithRationale", sum(1 for c in cs if "(Rationale)" in (c["considerations"] or ""))),
            ("referencesPendingNote", sum(1 for c in cs if c.get("referencesNote"))),
            ("cellsWithoutReferences", sum(1 for c in cs if not c["references"])),
        ])
        if fa == "defend":
            cellstats[fa]["opportunities"] = sum(1 for c in cs if c["opportunities"])
            cellstats[fa]["opportunitiesExactlyStandardPractices"] = sum(1 for c in cs if c["opportunities"] == STANDARD)
    report["cells"] = cellstats
    allrefs = [r for e in entries for r in e["refs"]]
    rstat = OrderedDict()
    rstat["referenceStrings"] = OrderedDict([("general", sum(len(e["general"]["references"]) for e in entries))] +
                                            [(fa, sum(len(e["focus"][fa]["references"]) for e in entries)) for fa in FOCUS])
    rstat["refs"] = len(allrefs)
    rstat["refsByScheme"] = OrderedDict(sorted(Counter(r["scheme"] for r in allrefs).items()))
    rstat["refsBySchemeAndColumn"] = OrderedDict((s, OrderedDict(sorted(Counter(r["column"] for r in allrefs if r["scheme"] == s).items())))
                                                 for s in sorted({r["scheme"] for r in allrefs}))

    def distinct(scheme, cols=None):
        return sorted({r["id"] for r in allrefs if r["scheme"] == scheme and r["id"] and (cols is None or r["column"] in cols)}, key=natural)
    rstat["distinctIds"] = OrderedDict([
        ("atlas", distinct("atlas")), ("owasp-llm", distinct("owasp-llm")), ("owasp-ai-exchange", distinct("owasp-ai-exchange")),
        ("owasp-genai", distinct("owasp-genai")), ("dasf", distinct("dasf")), ("mitre-attack", distinct("mitre-attack")),
        ("nist-ai-rmf", distinct("nist-ai-rmf")), ("nist-sp-800-53 (general column)", distinct("nist-sp-800-53", {"general"})),
        ("nist-sp-800-53 (focus columns)", distinct("nist-sp-800-53", set(FOCUS))), ("arXiv (other)", distinct("other")),
    ])
    rstat["distinctCounts"] = OrderedDict((k, len(x)) for k, x in rstat["distinctIds"].items())
    rstat["otherTexts"] = OrderedDict(sorted(Counter(r["text"] for r in allrefs if r["scheme"] == "other").items()))
    rstat["maxDasfNumberCited"] = max_dasf
    report["references"] = rstat
    s53 = OrderedDict()
    all_sp = sorted({c for e in entries for c in e["general"]["sp80053"]}, key=natural)
    s53["distinctIdsInGeneralSp80053"] = len(all_sp)
    s53["totalGeneralSp80053"] = sum(len(e["general"]["sp80053"]) for e in entries)
    s53["familyOnlyTokens"] = [OrderedDict([("subcategory", e["subcategory"]), ("token", r["id"])]) for e in entries for r in e["refs"]
                               if r["scheme"] == "nist-sp-800-53" and r["id"] and "-" not in r["id"]]
    if sp53:
        codes = {n["code"] for n in sp53["nodes"]}
        s53["catalogUnits"] = sum(1 for n in sp53["nodes"] if n["kind"] in ("control", "enhancement"))
        s53["notInCatalog"] = sorted({r["id"] for r in allrefs if r["scheme"] == "nist-sp-800-53" and r["id"] and r["id"] not in codes}, key=natural)
        s53["notInCatalogDetails"] = [OrderedDict([("id", c), ("citedBy", sorted({e["subcategory"] for e in entries for r in e["refs"]
                                                                                     if r["scheme"] == "nist-sp-800-53" and r["id"] == c})),
                                                   ("catalogStatus", withdrawn.get(c))]) for c in s53["notInCatalog"]]
    if csf:
        same, diffs = 0, []
        for e in entries:
            olir = [r["ref"] for r in by[e["subcategory"]].get("references", []) if r["source"].startswith("SP 800-53")]
            olir_controls = [x for x in olir if "-" in x]
            if olir_controls == e["general"]["sp80053"]:
                same += 1
            else:
                diffs.append(OrderedDict([("subcategory", e["subcategory"]), ("profile", e["general"]["sp80053"]), ("csfMapping", olir_controls),
                                          ("onlyInProfile", [x for x in e["general"]["sp80053"] if x not in olir_controls]),
                                          ("onlyInCsfMapping", [x for x in olir_controls if x not in e["general"]["sp80053"]])]))
        s53["comparedWith"] = ("the CSF 2.0 -> SP 800-53 Rev 5.2.0 OLIR mapping in packages/frameworks/data/nist-csf-2.0.json; the Profile "
                               "says it lists the controls exactly as in the CSF 2.0 / SP 800-53 Rev 5 OLIR crosswalk (referenceId=131, accessed 2025-12-05)")
        s53["identicalLists"] = same
        s53["differentLists"] = diffs
    report["sp80053"] = s53

    reader = PdfReader(str(PDF))
    ptext = {p: squash(fix_ligatures(reader.pages[p - 1].extract_text() or "")) for p in table_pages}
    fields, missing = 0, []
    for e in entries:
        pages = [ptext[p] for p in range(e["page"], e["pageEnd"] + 1)]
        items = [("text", e["text"]), ("general.considerations", e["general"]["considerations"]), ("general.note", e["general"]["note"])]
        items += [("general.references", r) for r in e["general"]["references"]]
        for fa in FOCUS:
            c = e["focus"][fa]
            items += [(f"{fa}.opportunities", c.get("opportunities")), (f"{fa}.considerations", c["considerations"]),
                      (f"{fa}.referencesNote", c.get("referencesNote"))]
            items += [(f"{fa}.references", r) for r in c["references"]]
        for name, val in items:
            if not val:
                continue
            fields += 1
            if not found_in(val, pages):
                missing.append(OrderedDict([("subcategory", e["subcategory"]), ("field", name), ("text", val[:200])]))
    report["pypdfContainment"] = OrderedDict([
        ("fieldsChecked", fields), ("notFound", missing),
        ("method", "each extracted field (statement, considerations, opportunities, notes, every reference string) must occur, ignoring white space, "
                   "in pypdf's text of the entry's page(s); a field crossing a page break may be split once per break. pypdf keeps footnote "
                   "marker digits inline, so fields that carried a marker cannot match")])
    report["focusAreas"] = [OrderedDict([("id", a["id"]), ("title", a["title"]), ("page", a["page"])]) for a in areas]
    report["priorityLevels"] = [OrderedDict([("level", l["level"]), ("label", l["label"]), ("page", l["page"])]) for l in levels]
    report["functionRows"] = functions
    report["categoryRows"] = categories
    report["footnotes"] = fn_texts
    report["labelVariants"] = label_variants
    report["cellsWithoutAnExpectedLabel"] = missing_sections
    report["sourceAnomalies"] = anomalies
    report["lineJoins"] = OrderedDict([("counts", OrderedDict(sorted(Counter(j["rule"] for j in join_log).items()))),
                                       ("otherThanHyphen", [j for j in join_log if not j["rule"].startswith("line-final -")]),
                                       ("hyphen", [j for j in join_log if j["rule"].startswith("line-final -")])])
    report["columnBoundaries"] = [OrderedDict([("x", list(k)), ("pages", [p[0], p[-1]]), ("pageCount", len(p))]) for k, p in col_bounds.items()]
    report["geometryIssues"] = geometry_issues
    report["textOutsideTableBands"] = outside
    report["problems"] = problems

    # ---------------- output ----------------------------------------------------------------------
    man = load_manifest_doc(DOC_ID)
    digest = sha256(PDF)
    if man:
        assert man["sha256"] == digest, "manifest sha256 differs from the PDF on disk"
    out = OrderedDict()
    out["source"] = OrderedDict([
        ("documentId", DOC_ID),
        ("title", man["title"] if man else "Cybersecurity Framework Profile for Artificial Intelligence (Cyber AI Profile): NIST Community Profile"),
        ("identifier", "NIST IR 8596 iprd"),
        ("version", man["version"] if man else "Initial Preliminary Draft (iprd) — DRAFT"),
        ("status", "initial preliminary draft"),
        ("published", man["published"] if man else "2025-12-16"),
        ("path", "nist-ai-rmf/drafts/NIST.IR.8596.iprd.pdf"),
        ("sha256", digest),
        ("url", man["url"] if man else "https://nvlpubs.nist.gov/nistpubs/ir/2025/NIST.IR.8596.iprd.pdf"),
        ("doi", "https://doi.org/10.6028/NIST.IR.8596.iprd"),
        ("landingPage", man["landingPage"] if man else "https://csrc.nist.gov/pubs/ir/8596/iprd"),
        ("commentPeriod", "2025-12-16 to 2026-01-30 (closed)"),
        ("draftNotice", notice),
        ("pageNumbering", "page/pageEnd = 1-based physical pages of the PDF (printed page = physical page - 9 in the body); Tables 1-6 are on physical pages 25-96"),
        ("extraction", "PyMuPDF text layer read with the table geometry (row bands at the table's horizontal rules, columns at its vertical "
                       "rules); bold labels delimit the cell sections; superscript footnote markers removed (footnotes attached to the entry); "
                       "line numbers, running headers/footers and repeated header rows dropped; white space collapsed; typos kept as printed"),
    ])
    out["focusAreas"] = areas
    out["priorityLevels"] = levels
    out["counts"] = OrderedDict([("entries", len(entries)), ("priorities", OrderedDict((fa, OrderedDict((k, n) for k, n in pr[fa].items() if k != "unparsed")) for fa in FOCUS)),
                                 ("refs", len(allrefs)), ("refsByScheme", rstat["refsByScheme"])])
    out["entries"] = entries

    out_s = json.dumps(out, indent=1, ensure_ascii=False) + "\n"
    rep_s = json.dumps(report, indent=1, ensure_ascii=False) + "\n"
    summary = OrderedDict([("entries", len(entries)), ("missing", v.get("missing")), ("extra", v.get("extra")),
                           ("priorities", pr), ("refsByScheme", rstat["refsByScheme"]), ("distinct", rstat["distinctCounts"]),
                           ("sp80053NotInCatalog", s53.get("notInCatalog")), ("sp80053IdenticalToCsfMapping", s53.get("identicalLists")),
                           ("pypdfNotFound", len(missing)), ("problems", len(problems)), ("sourceAnomalies", len(anomalies))])
    print(json.dumps(summary, indent=1, ensure_ascii=False))
    if check_only:
        ok = True
        for path, s in ((OUT, out_s), (REPORT, rep_s)):
            same = path.exists() and path.read_text(encoding="utf-8") == s
            print(("identical: " if same else "DIFFERS:   ") + str(path.relative_to(ROOT)))
            ok = ok and same
        sys.exit(0 if ok else 1)
    REPORT.parent.mkdir(exist_ok=True)
    REPORT.write_text(rep_s, encoding="utf-8")
    OUT.write_text(out_s, encoding="utf-8")
    print("wrote", OUT.relative_to(ROOT), "and", REPORT.relative_to(ROOT))


if __name__ == "__main__":
    main()
