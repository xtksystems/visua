"""Page-text extraction and verbatim matching for the us-state-ai-laws corpus.

Each document gets a cleaner that removes print furniture (line numbers, running
headers/footers, spacer glyphs, struck-through text) so that verbatim quotations can
be located on a physical PDF page.  Matching ignores whitespace and dash/hyphen
characters (line-break hyphenation) and normalises typographic quotes; everything
else (letters, case, punctuation, digits) must match exactly.
"""
import html as _html
import os
import re
import unicodedata

import pymupdf

CORPUS = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

DASHES = "-‐‑‒–—―−­"
QUOTES = {"‘": "'", "’": "'", "‛": "'", "′": "'", "“": '"', "”": '"', "‟": '"', "″": '"'}


def key(s: str) -> str:
    s = unicodedata.normalize("NFKC", s)
    for a, b in QUOTES.items():
        s = s.replace(a, b)
    s = re.sub(r"[\s" + re.escape(DASHES) + r"]+", "", s)
    return s


# ---------------------------------------------------------------- cleaners
def _lines(page):
    return page.get_text().split("\n")


def clean_tx_enrolled(page):
    """Texas enrolled bills render non-breaking spaces as 'A' glyphs in a slightly
    smaller Courier size; drop those spans, then drop the margin line numbers."""
    out_lines = []
    d = page.get_text("dict")
    for b in d["blocks"]:
        for l in b.get("lines", []):
            parts = []
            for sp in l["spans"]:
                t = sp["text"]
                if re.fullmatch(r"A+", t) and sp["size"] < 10.03:
                    parts.append(" ")
                    continue
                if re.fullmatch(r"\s+[’']", t) and sp["size"] < 10.03:
                    # apostrophes are set in a smaller size with a leading positioning space: "system ’s" -> "system’s"
                    parts.append(t.strip())
                    continue
                parts.append(t)
            out_lines.append("".join(parts))
    keep = []
    for s in out_lines:
        st = s.strip()
        if re.fullmatch(r"\d{1,2}", st):  # line numbers and page number
            continue
        if re.fullmatch(r"H\.B\.\s*No\.\s*149", st):
            continue
        keep.append(s)
    return "\n".join(keep)


def clean_ny_bill(page):
    """NY LBD bill PDFs: leading line numbers, running header 'S. 8828   2',
    and the EXPLANATION footer."""
    out = []
    for ln in _lines(page):
        s = ln.rstrip()
        st = s.strip()
        if re.fullmatch(r"(S|A)\.\s*\d+(--[A-Z])?\s+\d+(\s+(S|A)\.\s*\d+(--[A-Z])?)?", st):
            continue
        if st.startswith("EXPLANATION--") or st in ("(underscored) is new; matter in brackets", "italics", "[ ] is old law to be omitted."):
            continue
        if re.fullmatch(r"LBD\d+-\d+-\d+", st):
            continue
        s = re.sub(r"^\s*\d{1,2}\s{2}", "", s)
        out.append(s)
    return "\n".join(out)


def clean_city_record_columns(page):
    """The City Record is set in three columns; read blocks column by column."""
    w = page.rect.width
    cols = {}
    for x0, y0, x1, y1, txt, bn, bt in page.get_text("blocks"):
        if bt != 0:
            continue
        cols.setdefault(int(x0 // (w / 3)), []).append((y0, x0, txt))
    out = []
    for c in sorted(cols):
        for y0, x0, txt in sorted(cols[c]):
            out.append(txt)
    return "\n".join(out)


def clean_strikethrough(page):
    """Drop characters crossed by a horizontal rule at mid-height (strikethrough)."""
    segs = []
    for dr in page.get_drawings():
        for it in dr["items"]:
            if it[0] == "l":
                p1, p2 = it[1], it[2]
                if abs(p1.y - p2.y) < 0.8:
                    segs.append((min(p1.x, p2.x), max(p1.x, p2.x), (p1.y + p2.y) / 2))
            elif it[0] == "re":
                r = it[1]
                if r.height < 1.6 and r.width > 2:
                    segs.append((r.x0, r.x1, (r.y0 + r.y1) / 2))
    raw = page.get_text("rawdict")
    lines_out = []
    for b in raw["blocks"]:
        if b.get("type") != 0:
            continue
        for l in b["lines"]:
            s = ""
            for sp in l["spans"]:
                for ch in sp["chars"]:
                    x0, y0, x1, y1 = ch["bbox"]
                    cx = (x0 + x1) / 2
                    h = y1 - y0
                    lo, hi = y0 + h * 0.35, y0 + h * 0.75
                    if any(a <= cx <= bb and lo <= y <= hi for a, bb, y in segs):
                        continue
                    s += ch["c"]
            lines_out.append(s)
    return "\n".join(lines_out)


# Header/footer patterns per document family: (where, n_lines, patterns)
DROP = {
    "ca-chaptered": [("foot", 8, [r"\d{2,3}", r"— \d+ —", r"Ch\. \d+", r"STATE OF CALIFORNIA", r"AUTHENTICATED", r"ELECTRONIC LEGAL MATERIAL", r"O", r""])],
    "cppa": [("head", 4, [r"CPPA", r"Page \d+ of \d+", r""])],
    "co-session": [("head", 4, [r"Ch\. \d+", r"Consumer and Commercial Transactions", r"\d{1,4}"]),
                   ("any", 0, [r"\)+",
                   r"Capital letters or bold & italic numbers indicate new material added to existing law; dashes through",
                   r"words or numbers indicate deletions from existing law and such material is not part of the act\."])],
    "il-pa": [("any", 0, [r"(HB|SB)\d+ Enrolled", r"LRB\d+ \d+ [A-Z]+ \d+ [a-z]", r"Public Act \d+-\d+"])],
    "ut-code": [("head", 3, [r"Utah Code", r"Page \d+"]), ("any", 0, [r"Effective \d{1,2}/\d{1,2}/\d{4}"])],
    "nyc-ll": [("head", 3, [r"\d", r""])],
    "plain": [],
}


def clean_default(page, rules=()):
    lines = _lines(page)
    drop = set()
    for where, n, pats in rules:
        if where == "head":
            idx = range(0, min(n, len(lines)))
        elif where == "foot":
            idx = range(max(0, len(lines) - n), len(lines))
        else:
            idx = range(len(lines))
        for i in idx:
            if any(re.fullmatch(p, lines[i].strip()) for p in pats):
                drop.add(i)
    return "\n".join(l for i, l in enumerate(lines) if i not in drop)


def page_texts(path, mode, family="plain"):
    doc = pymupdf.open(path)
    out = []
    for p in doc:
        if mode == "tx-enrolled":
            out.append(clean_tx_enrolled(p))
        elif mode == "ny-bill":
            out.append(clean_ny_bill(p))
        elif mode == "city-record":
            out.append(clean_city_record_columns(p))
        elif mode == "strike":
            out.append(clean_strikethrough(p))
        else:
            out.append(clean_default(p, DROP.get(family, [])))
    return out


def html_text(path):
    s = open(path, encoding="utf-8-sig", errors="replace").read()
    s = re.sub(r"<script.*?</script>|<style.*?</style>", "", s, flags=re.S)
    s = re.sub(r"<br\s*/?>|</p>|</tr>|</div>|</pre>", "\n", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = _html.unescape(s).replace("\xa0", " ")
    return s


class Locator:
    """Find the physical page(s) on which a verbatim passage appears."""

    def __init__(self, pages):
        self.pages = pages
        self.keys = [key(t) for t in pages]
        self.offsets = []
        acc = 0
        for k in self.keys:
            self.offsets.append(acc)
            acc += len(k)
        self.full = "".join(self.keys)

    def find(self, text):
        k = key(text)
        i = self.full.find(k)
        if i < 0:
            return None
        j = i + len(k) - 1
        start = end = None
        for n, off in enumerate(self.offsets):
            if off <= i:
                start = n
            if off <= j:
                end = n
        count = self.full.count(k)
        return {"page": start + 1, "pageEnd": end + 1, "occurrences": count}
