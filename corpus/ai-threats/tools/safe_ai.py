"""Parser for MITRE SAFE-AI (MP250397, April 2025), Appendix C, Table 1 'Threats and Concerns'.

Each SAFE-AI threat row lists NIST SP 800-53 Rev. 5 controls per system element (Environment, AI Platform,
AI Models, AI Data) and 'Related ATLAS ID(s)' 'for reference'. The report is © 2025 The MITRE Corporation, all
rights reserved (approved for public release, distribution unlimited), so the PDF and everything derived from it
stay under mitre-safe-ai/.local/ (git-ignored).
"""
import re
from collections import OrderedDict

import pymupdf

from common import ROOT

PDF = ROOT / "mitre-safe-ai" / ".local" / "SAFEAI_Full_Report.pdf"
# column rules of Table 1 (physical pages 17-34): AI Threats | AI Concerns | Environment | AI Platform | AI Models |
# AI Data | Residual Risk | Related ATLAS ID
RULES = (30.6, 95.5, 345.9, 405.3, 455.8, 506.2, 556.6, 704.9, 767.4)
COLS = ("threat", "concerns", "Environment", "AI Platform", "AI Models", "AI Data", "residualRisk", "relatedAtlas")
HEADER_WORDS = {"AI", "Threats", "Concerns", "Environment", "Platform", "Models", "Data", "Residual", "Risk", "Related",
                "ATLAS", "ID"}


def _col(x):
    return max(i for i, r in enumerate(RULES[:-1]) if x >= r - 1)


def sp80053(cid):
    """'AC-02-12' -> 'AC-2(12)'; 'AC-03-00' -> 'AC-3' (SAFE-AI Appendix B convention: XX-nn-nn, zero-padded)."""
    m = re.match(r"^([A-Z]{2})-(\d{2})-(\d{2})$", cid)
    base = f"{m.group(1)}-{int(m.group(2))}"
    return base if m.group(3) == "00" else f"{base}({int(m.group(3))})"


def table1(first=17, last=34):
    doc = pymupdf.open(PDF)
    rows = []
    for pno in range(first, last + 1):
        words = [w for w in doc[pno - 1].get_text("words") if w[1] < 555]
        hdr = [w for w in words if w[4] == "Related" and w[0] > RULES[7] - 2]
        top = max(w[3] for w in words if w[0] > RULES[7] - 2 and w[4] in ("ATLAS", "ID") and hdr and abs(w[1] - hdr[0][1]) < 15) if hdr else 0
        body = sorted((w for w in words if w[1] > top), key=lambda w: (w[1], w[0]))
        # pass 1: row starts = first word of each threat name in column 0 (names wrap over several lines; a name
        # that starts in lower case at the top of a page continues the previous page's row)
        starts, last0 = [], None
        for w in body:
            if _col(w[0]) != 0:
                continue
            if last0 is None or w[1] - last0 > 20:
                if not (last0 is None and rows and w[4][:1].islower()):
                    starts.append(w[1])
            last0 = w[1]
        page_rows = []
        for y in starts:
            page_rows.append(dict(cells=[[] for _ in COLS], page=pno, pageEnd=pno, y=y))
        # pass 2: every word belongs to the last row that starts at or above it (3 pt tolerance); words above the
        # first start continue the previous page's last row
        for w in body:
            own = [r for r in page_rows if r["y"] <= w[1] + 3]
            target = own[-1] if own else (rows[-1] if rows else None)
            if target is None:
                continue
            target["cells"][_col(w[0])].append((pno, w[1], w[0], w[4]))
            target["pageEnd"] = pno
        rows += page_rows
    out = []
    for r in rows:
        text = [" ".join(t for _, _, _, t in sorted(cell)) for cell in r["cells"]]
        atlas_txt = re.sub(r"(AML\.T\d{4}\.)\s+(\d{3})", r"\1\2", text[7])
        related = []
        for m in re.finditer(r"(AML\.TA?\d{4}(?:\.\d{3})?)\s*[\"“]\s*([^\"”]+?)\s*[\"”]", atlas_txt):
            related.append(OrderedDict(id=m.group(1), nameAsPrinted=m.group(2)))
        for m in re.finditer(r"AML\.TA?\d{4}(?:\.\d{3})?", atlas_txt):
            if m.group(0) not in [x["id"] for x in related]:
                related.append(OrderedDict(id=m.group(0), nameAsPrinted=None))
        attack = [OrderedDict(id=m.group(1), nameAsPrinted=m.group(2).strip())
                  for m in re.finditer(r"(?<![.\w])(T\d{4}(?:\.\d{3})?)\s*[\"“]\s*([^\"”]+?)\s*[\"”]", atlas_txt)]
        controls = OrderedDict()
        for i in range(2, 6):
            controls[COLS[i]] = [dict(asPrinted=c, id=sp80053(c)) for c in re.findall(r"[A-Z]{2}-\d{2}-\d{2}", text[i])]
        rec = OrderedDict(threat=text[0], relatedAtlas=related)
        if attack:
            rec["relatedAttack"] = attack
        rec["relatedAsPrinted"] = text[7] or None
        rec["controls"] = controls
        rec["page"] = r["page"]
        rec["pageEnd"] = r["pageEnd"]
        out.append(rec)
    return out
