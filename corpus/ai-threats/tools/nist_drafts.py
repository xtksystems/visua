"""Parsers for the NIST draft publications (already in corpus/nist-ai-rmf/drafts/) that link NIST requirements to
AI threat catalogs:

* NIST IR 8596 iprd (Cyber AI Profile, 2025-12-16): per CSF 2.0 subcategory and focus area (Secure / Defend /
  Thwart, plus General Considerations), 'Example Informative References' that cite MITRE ATLAS mitigations
  (AML.Mxxxx) and 'OWASP LLM Top Ten: LLM03 Supply Chain'.
* COSAiS annotated outline, Predictive AI (January 2026): per tailored SP 800-53 control, 'Relevant NIST AI
  100-2e2025 Attack ID: NISTAML.xxx'.

Both are drafts; rows carry status 'draft'.
"""
import re
from collections import OrderedDict

import pymupdf

from common import CORPUS

IR8596 = CORPUS / "nist-ai-rmf" / "drafts" / "NIST.IR.8596.iprd.pdf"
COSAIS = CORPUS / "nist-ai-rmf" / "drafts" / "COSAiS-Predictive-AI-annotated-outline-Jan2026.pdf"

COLS = ("csf", "General Considerations", "Secure", "Defend", "Thwart")
DEFAULT_RULES = (36, 153, 305, 456, 607, 758)
SUB_RE = re.compile(r"^((?:GV|ID|PR|DE|RS|RC)\.[A-Z]{2}-\d{2}):?$")
CAT_RE = re.compile(r"^\((?:GV|ID|PR|DE|RS|RC)\.[A-Z]{2}\)$|^\((?:GV|ID|PR|DE|RS|RC)\)$")
OUTSIDE_TABLE = re.compile(r"^(?:Table \d+\.?|\d+(?:\.\d+)+\.?)\s+Cyber AI Profile")


def _rules(page):
    xs = set()
    for g in page.get_drawings():
        for it in g["items"]:
            if it[0] == "l" and abs(it[1].x - it[2].x) < 0.5 and abs(it[1].y - it[2].y) > 20:
                xs.add(round(it[1].x))
            elif it[0] == "re" and it[1].width < 2 and it[1].height > 20:
                xs.add(round(it[1].x0))
    xs = sorted(xs)
    merged = []
    for x in xs:
        if not merged or x - merged[-1] > 5:
            merged.append(x)
    return tuple(merged) if len(merged) == 6 else DEFAULT_RULES


def _lines(words, tol=3.0):
    """Group PyMuPDF words into printed lines (tops within `tol` pt of the line's first word), each sorted by x.
    Rounding the tops instead would split a line whose words sit a fraction of a point apart."""
    out = []
    for w in sorted(words, key=lambda w: (w[1], w[0])):
        if out and w[1] - out[-1][0][1] <= tol:
            out[-1].append(w)
        else:
            out.append([w])
    return [sorted(line, key=lambda w: w[0]) for line in out]


def ir8596_cells(first=25, last=96):
    """Return {(subcategory, column): {'words': [(page, y0, x0, text)] in reading order, 'pages': set}} for the
    Cyber AI Profile tables (Tables 1-6)."""
    doc = pymupdf.open(IR8596)
    cells = OrderedDict()
    current = None
    for pno in range(first, last + 1):
        page = doc[pno - 1]
        rules = _rules(page)
        # drop the line numbers (x < 30), the running head (y <= 60) and the folio (y >= 555)
        words = [w for w in page.get_text("words") if w[0] >= 30 and 60 < w[1] < 555]
        # header bands: from 'CSF 2.0 Core:' to the 'Secure Defend Thwart' line of each table on the page
        heads = [w[1] for w in words if w[4] == "CSF" and w[0] < rules[1]]
        subs = [w[1] for w in words if w[4] in ("Secure", "Defend", "Thwart") and w[0] > rules[2] - 5]
        bands = []
        for h in heads:
            nxt = [y for y in subs if y > h]
            if nxt:
                bands.append((h - 2, min(nxt) + 10))
        # function / category rows ('Supply Chain Risk Management (GV.SC)' + the category statement): their
        # statement sits in one filled cell merged across columns 1-4; its first lines come before the '(GV.SC)'
        # token in reading order, so the row is recognised by that merged cell, not by the token
        merged = sorted({(g["rect"].y0, g["rect"].y1) for g in page.get_drawings()
                         if g.get("fill") and abs(g["rect"].x0 - rules[1]) < 3 and abs(g["rect"].x1 - rules[-1]) < 3
                         and g["rect"].height > 5})
        for line in _lines(words):
            # section headings between tables ('2.5. Cyber AI Profile: PROTECT') and the centred table captions
            # ('Table 2 Cyber AI Profile – IDENTIFY.'), which follow the last row of the previous table
            if OUTSIDE_TABLE.match(" ".join(w[4] for w in line)):
                continue
            for w in line:
                x0, y0, _x1, y1, t = w[:5]
                if any(a <= y0 <= b for a, b in bands):
                    continue
                if any(a <= (y0 + y1) / 2 <= b for a, b in merged):
                    current = None              # function / category header row
                    continue
                col = max(i for i, r in enumerate(rules[:-1]) if x0 >= r - 2)
                if col == 0:
                    m = SUB_RE.match(t)
                    if m:
                        current = m.group(1)
                    elif CAT_RE.match(t):
                        current = None          # category / function header row
                if current is None:
                    continue
                key = (current, COLS[col])
                c = cells.setdefault(key, {"words": [], "pages": set()})
                c["words"].append((pno, y0, x0, t))
                c["pages"].add(pno)
    return cells


REFS_LABEL = re.compile(r"(?<!AI-specific )Example Informative References:?")
NEXT_LABEL = re.compile(r"Proposed Priority:|Sample Opportunities:|Sample Focus Area Considerations?:")
PLACEHOLDER = "AI-specific Example Informative References pending additional inputs."
ATLAS_ID = re.compile(r"^\(?(AML[.-](?:M|T|TA)\d{4}(?:\.\d{3})?)")
DOC_LEVEL = (("atlas", re.compile(r"\bATLAS\b(?!\s+AML[.-])")),
             ("nist-ai-100-2", re.compile(r"(?:NIST\s+)?AI\s+100-\s?2e2025")))


def ir8596_references():
    """Rows: CSF subcategory -> ATLAS mitigation / OWASP LLM risk, read from the cell's 'Example Informative
    References' list only (text after the label, up to the next label). Also returns the references that cite
    ATLAS or NIST AI 100-2e2025 as a whole document (no element identifier).

    Returns (rows, document_level)."""
    rows, doc_level = [], []
    for (sub, col), c in ir8596_cells().items():
        if col == "csf":
            continue
        ws = c["words"]                     # reading order: page, then printed line, then x
        pos, text = [], ""
        for i, w in enumerate(ws):
            if i:
                a = ws[i - 1]
                wrap = a[0] != w[0] or abs(a[1] - w[1]) > 3
                # wrapped lines join with a space, except after a line-final hyphen ('SR-' + '06', 'AI-' + 'enabled')
                # and inside a wrapped URL ('https://arxiv.org/html/2503.1191' + '7v3')
                glue = wrap and ((a[3].endswith("-") and len(a[3]) > 1) or
                                 (a[3].startswith("http") and not a[3].endswith((";", ",")) and re.match(r"[0-9a-z;]", w[3])))
                text += "" if glue else " "
            pos.append(len(text))
            text += w[3]
        pri = re.search(r"Proposed Priority:\s*(\d)", text)
        priority = int(pri.group(1)) if pri else None
        m = REFS_LABEL.search(text)
        if not m:
            continue
        nxt = NEXT_LABEL.search(text, m.end())
        r0, r1 = m.end(), nxt.start() if nxt else len(text)
        refs = text[r0:r1].replace(PLACEHOLDER, "").strip()

        def page_at(off):
            return ws[max(i for i, p in enumerate(pos) if p <= off)][0]

        for i, w in enumerate(ws):
            if not r0 <= pos[i] < r1:
                continue
            t = w[3]
            hit = ATLAS_ID.match(t)
            if hit:
                raw = hit.group(1)
                rec = OrderedDict(csf=sub, focusArea=col, targetScheme="atlas", id=raw.replace("AML-", "AML."),
                                  asPrinted=_segment(refs, raw) or raw, page=w[0], references=refs,
                                  proposedPriority=priority)
                if raw.startswith("AML-"):
                    rec["note"] = f"printed '{raw}' (hyphen); normalised to '{rec['id']}'"
                rows.append(rec)
            hit = re.match(r"^(LLM\d\d)$", t)
            if hit:
                rows.append(OrderedDict(csf=sub, focusArea=col, targetScheme="owasp-llm-top10", id=hit.group(1) + ":2025",
                                        asPrinted=_segment(refs, hit.group(1)) or hit.group(1), page=w[0],
                                        references=refs, proposedPriority=priority))
        for scheme, rx in DOC_LEVEL:
            for d in rx.finditer(text, r0, r1):
                doc_level.append(OrderedDict(csf=sub, focusArea=col, targetScheme=scheme, asPrinted=d.group(0),
                                             page=page_at(d.start()), references=refs))
    return rows, doc_level


def _segment(refs, token):
    """The ';'-separated item of a reference list that carries `token`, as printed."""
    if not refs:
        return None
    return next((seg.strip() for seg in refs.split(";") if token in seg), None)


def cosais_references():
    """Rows: SP 800-53 control (as tailored in the outline) -> NIST AI 100-2 attack IDs."""
    doc = pymupdf.open(COSAIS)
    text, marks = "", []
    for i, p in enumerate(doc):
        marks.append((len(text), i + 1))
        text += p.get_text() + "\n"

    def page_at(pos):
        return max(pg for off, pg in marks if off <= pos)

    out = []
    for m in re.finditer(r"Control ID:\s*([A-Z]{2}-\d{2}(?:\(\d{2}\))?),\s*([^\n]+?)\s*\n(.*?)(?=Control ID:|Terms and Definitions|$)", text, re.S):
        cid, title, body = m.group(1), m.group(2).strip(), m.group(3)
        a = re.search(r"Relevant NIST AI 100-2e2025 Attack ID:\s*(.*?)\s*\n\s*\n", body + "\n\n", re.S)
        if not a:
            continue
        printed = re.sub(r"\s+", " ", a.group(1)).strip()
        ids = []
        for raw in re.findall(r"NIST\s?AML\.\d+", printed):
            nid = raw.replace("NIST AML", "NISTAML")
            if nid not in ids:
                ids.append(nid)
        # continuation of the heading line: "SA-11(02), Developer Testing ... | Threat Modeling and\nVulnerability Analyses"
        tail = re.match(r"([^\n]*?)\n", body)
        if tail and not tail.group(1).startswith("Selected in"):
            title = f"{title} {tail.group(1).strip()}"
        pos = m.start() + m.group(0).find("Relevant NIST AI 100-2e2025 Attack ID")
        out.append(OrderedDict(control=cid, controlTitleAsPrinted=title, attackIds=ids, asPrinted=printed,
                               page=page_at(m.start()), attackLinePage=page_at(pos)))
    return out


def sp80053_id(cid):
    """'SA-11(02)' / 'AC-06' -> Visua form 'SA-11(2)' / 'AC-6'."""
    m = re.match(r"^([A-Z]{2})-(\d{2})(?:\((\d{2})\))?$", cid)
    base = f"{m.group(1)}-{int(m.group(2))}"
    return base + (f"({int(m.group(3))})" if m.group(3) else "")
