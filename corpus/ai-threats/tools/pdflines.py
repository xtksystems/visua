"""Visual-line reader for the Word-generated OWASP PDFs (PyMuPDF).

A 'visual line' merges the PyMuPDF lines that share a baseline, so a list label printed as its own
text run ('1. ' at x=90) and the item text (x=108) come back as one line. Every line keeps its page,
geometry, the font of its first non-blank span and whether any span is bold.
"""
import re

from common import fix_ligatures

NBSP = chr(0xA0)


def page_lines(page, pno, top=0, bottom=10_000, drop=()):
    raw = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            spans = [s for s in l["spans"] if s["text"]]
            text = "".join(s["text"] for s in spans)
            if not text.strip():
                continue
            x0, y0, x1, y1 = l["bbox"]
            if y0 >= bottom or y1 <= top:
                continue
            vis = [s for s in spans if s["text"].strip()]
            first = vis[0]
            raw.append(dict(page=pno, x=x0, x1=x1, y=y0, y1=y1, text=fix_ligatures(text), font=first["font"],
                            size=round(first["size"], 1),
                            bold=all(("Bold" in s["font"] or s["flags"] & 16) for s in vis),
                            anybold=any(("Bold" in s["font"] or s["flags"] & 16) for s in vis),
                            spans=[(s["font"], s["text"]) for s in spans]))
    raw = [r for r in raw if r["text"].strip() not in drop]
    # cluster runs whose tops are within 2.5 pt (a list label can sit 1 pt lower than its text), then read each
    # cluster left to right and merge horizontally adjacent runs
    raw.sort(key=lambda r: r["y"])
    clusters = []
    for r in raw:
        if clusters and abs(clusters[-1][0]["y"] - r["y"]) < 2.5:
            clusters[-1].append(r)
        else:
            clusters.append([r])
    merged = []
    for c in clusters:
        c.sort(key=lambda r: r["x"])
        m = dict(c[0])
        for r in c[1:]:
            if r["x"] >= m["x1"] - 1 and r["x"] - m["x1"] < 40:
                sep = "" if m["text"].endswith((" ", NBSP)) or r["text"].startswith(" ") else " "
                m["text"] += sep + r["text"]
                m["x1"] = r["x1"]
                m["y"] = min(m["y"], r["y"])
                m["y1"] = max(m["y1"], r["y1"])
                m["spans"] = m["spans"] + r["spans"]
                m["bold"] = m["bold"] and r["bold"]
                m["anybold"] = m["anybold"] or r["anybold"]
            else:
                merged.append(m)
                m = dict(r)
        merged.append(m)
    return merged


def doc_lines(doc, pages, **kw):
    out = []
    for p in pages:
        out += page_lines(doc[p - 1], p, **kw)
    return out


def join_lines(lines):
    """Join wrapped lines of one paragraph: a line ending in a letter or digit + '-' joins without a space
    (compounds such as 'high-\\nimpact' and dates such as '2026-03-\\n17' stay intact); otherwise lines join
    with one space. Text inside a line is kept as printed; only the line ends are trimmed."""
    text = ""
    for l in lines:
        t = l["text"].rstrip()
        if not text:
            text = t.lstrip()
            continue
        if re.search(r"[A-Za-z0-9]-$", text):
            text += t.lstrip()
        else:
            text += " " + t.lstrip()
    return text.strip()
