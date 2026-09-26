#!/usr/bin/env python3
"""Build owasp-llm-top10.json and owasp-agentic-top10.json from the official OWASP PDFs.

Sources (corpus/ai-threats/):
  owasp-llm-top10/OWASP-GenAI-LLM-Top-10-2026-v1.0.pdf     LLM Top 10 2026 (current; mappings in Appendix A)
  owasp-llm-top10/LLMAll_en-US_FINAL.pdf                   LLM Top 10 2025 (superseded; per-entry Related Frameworks)
  owasp-agentic-top10/OWASP-Top-10-for-Agentic-Applications-2026-12.6-1.pdf   Agentic Top 10 2026 (Appendix A matrix)

All texts are verbatim from the PDF text layer: wrapped lines are re-joined (a line ending in 'letter-' is joined
without a space, which keeps compounds such as 'adversary-chosen'), list labels ('1.', '•') are split off into
'label', ligatures are expanded; nothing else is changed. Every extracted text is re-found in the text layer of
its page(s) (tools/reports/owasp-verification.json).

Usage:  python3 tools/extract_owasp.py [--check]
"""
import json
import re
import sys
from collections import OrderedDict

import logging

import pymupdf
import pypdf

from common import CORPUS, OWASP_LICENSE, OWASP_LICENSE_URL, RETRIEVED, ROOT, sha256, squash, write_json
from pdflines import doc_lines, join_lines, page_lines

logging.getLogger("pypdf").setLevel(logging.ERROR)

LLM26 = ROOT / "owasp-llm-top10" / "OWASP-GenAI-LLM-Top-10-2026-v1.0.pdf"
LLM25 = ROOT / "owasp-llm-top10" / "LLMAll_en-US_FINAL.pdf"
ASI26 = ROOT / "owasp-agentic-top10" / "OWASP-Top-10-for-Agentic-Applications-2026-12.6-1.pdf"
GENAI_PROFILE = CORPUS / "nist-ai-rmf" / "genai-profile.json"

BULLETS = "•●○▪◦■"
# a list label: '1. Text' (also '6.Sandbox Techniques', printed without the space)
NUM_RE = re.compile(r"^(\d{1,2})\.(?:\s+|(?=[A-Z]))(.*)$")


# ============================================================================ generic section/block parsing
class Cfg:
    def __init__(self, **kw):
        self.__dict__.update(kw)


def is_heading(l, cfg):
    return abs(l["size"] - cfg.heading_size) < 0.3 and cfg.heading_font in l["font"]


def is_group(l, cfg):
    """Group labels / sub-headings inside a section (not numbered list items)."""
    t = l["text"].strip()
    if NUM_RE.match(t):
        return False
    return any(f == l["font"] for f in cfg.group_fonts) or (cfg.group_size and abs(l["size"] - cfg.group_size) < 0.3
                                                              and cfg.group_font in l["font"])


def titled_item(l, cfg):
    """Numbered line whose whole text is bold: a list item with a title line and a body below."""
    t = l["text"].strip()
    if not NUM_RE.match(t):
        return False
    if cfg.titled_font and cfg.titled_font in l["font"] and abs(l["size"] - cfg.titled_size) < 0.3:
        return True
    return l["bold"] and l["x"] < cfg.label_x - 5


def build_blocks(lines, cfg):
    """Turn visual lines into blocks: para | group | item (titled or hanging) with page info."""
    blocks, cur, prev = [], None, None
    for l in lines:
        t = l["text"].strip()
        same_page = prev is not None and prev["page"] == l["page"]
        gap = (l["y"] - prev["y1"]) if same_page else None
        m_num = NUM_RE.match(t)
        m_bul = re.match(r"^([" + BULLETS + r"])\s*(.*)$", t)
        prev_ended = prev is not None and prev["text"].rstrip().endswith((".", ":", "!", "?", ")", "”", '"')) \
            and prev["x1"] < cfg.right_edge - 25
        new_par = gap is not None and gap >= cfg.para_gap or (gap is None and prev is not None and prev_ended)
        if is_group(l, cfg):
            if cur and cur["kind"] == "group" and not new_par:
                cur["lines"].append(l)
            else:
                cur = dict(kind="group", lines=[l], page=l["page"])
                blocks.append(cur)
        elif titled_item(l, cfg):
            cur = dict(kind="item", style="titled", label=m_num.group(1), title_lines=[dict(l, text=m_num.group(2))],
                       paras=[], page=l["page"], x=l["x"])
            blocks.append(cur)
        elif (m_num and l["x"] < cfg.label_x + 6) or (m_bul and l["x"] < cfg.label_x + 12):
            m = m_num or m_bul
            cur = dict(kind="item", style="hanging", label=m.group(1), title_lines=[], paras=[[dict(l, text=m.group(2))]],
                       page=l["page"], x=l["x"])
            blocks.append(cur)
        elif cur and cur["kind"] == "item" and cur["style"] == "hanging" and l["x"] >= cfg.text_x - 3:
            if new_par and gap is not None:
                cur["paras"].append([l])
            else:
                cur["paras"][-1].append(l)
        elif cur and cur["kind"] == "item" and cur["style"] == "titled" and not cur["paras"] and not new_par \
                and l["bold"] and l["x"] <= cur["x"] + 3:
            cur["title_lines"].append(l)          # title wrapped onto a second line
        elif cur and cur["kind"] == "item" and cur["style"] == "titled" and l["x"] >= cfg.body_x - 3:
            if not cur["paras"] or new_par:
                cur["paras"].append([l])
            else:
                cur["paras"][-1].append(l)
        elif cur and cur["kind"] == "para" and not new_par:
            cur["lines"].append(l)
        else:
            cur = dict(kind="para", lines=[l], page=l["page"])
            blocks.append(cur)
        prev = l
    return blocks


def attach(blocks):
    """Second pass for titled items: a body paragraph at the item's x belongs to the item unless it ends with ':'
    and introduces a following item (then it is a group lead-in). Returns (intro paras, items, notes)."""
    out = []
    for i, b in enumerate(blocks):
        if b["kind"] == "item" and b["style"] == "titled" and b["paras"]:
            # split off trailing paragraphs that end with ':' and are followed by another item
            nxt = blocks[i + 1] if i + 1 < len(blocks) else None
            keep = []
            for j, p in enumerate(b["paras"]):
                last = j == len(b["paras"]) - 1
                if last and j > 0 and join_lines(p).endswith(":") and nxt is not None and nxt["kind"] == "item":
                    out.append(b)
                    b = dict(b, paras=keep)
                    out[-1] = b
                    out.append(dict(kind="para", lines=p, page=p[0]["page"]))
                    break
                keep.append(p)
            else:
                out.append(b)
        else:
            out.append(b)
    return out


def block_text(b):
    if b["kind"] in ("para", "group"):
        return join_lines(b["lines"])
    title = join_lines(b["title_lines"]) if b["title_lines"] else None
    body = "\n\n".join(join_lines(p) for p in b["paras"] if p)
    return title, body


def pages_of(b):
    ls = b.get("lines", []) + b.get("title_lines", []) + [l for p in b.get("paras", []) for l in p]
    ps = sorted({l["page"] for l in ls})
    return ps[0], ps[-1]


def section_items(blocks):
    """Items of a list section with their group lead-in; paragraphs before the first item are the intro."""
    blocks = attach(blocks)
    intro, items, notes, group = [], [], [], None
    for i, b in enumerate(blocks):
        if b["kind"] == "item":
            title, body = block_text(b)
            p0, p1 = pages_of(b)
            rec = OrderedDict(label=b["label"])
            if title:
                rec["title"] = title
            rec["text"] = body
            if group:
                rec["group"] = group
            rec["page"] = p0
            if p1 != p0:
                rec["pageEnd"] = p1
            rec["_lines"] = b.get("title_lines", []) + [l for par in b.get("paras", []) for l in par]
            items.append(rec)
        else:
            text = block_text(b)
            nxt_is_item = i + 1 < len(blocks) and blocks[i + 1]["kind"] == "item"
            if b["kind"] == "group" or (nxt_is_item and text.endswith(":")) or (items and nxt_is_item):
                group = text
                if not items and b["kind"] == "para" and not text.endswith(":"):
                    intro.append(text)
            elif not items:
                intro.append(text)
            else:
                notes.append(text)
    return intro, items, notes


def paragraphs_of(blocks):
    """Verbatim paragraph list for prose sections; list items keep their label ('1. ', '• ') as printed."""
    out = []
    for b in attach(blocks):
        if b["kind"] in ("para", "group"):
            out.append(block_text(b))
        else:
            title, body = block_text(b)
            lab = b["label"] + ("." if b["label"].isdigit() else "")
            out.append(f"{lab} " + "\n".join(x for x in (title, body) if x))
    return out


def split_risks(lines, cfg):
    """Group lines by risk (title lines) and by section heading inside each risk."""
    risks, cur, sec = [], None, None
    for l in lines:
        if l["size"] >= cfg.title_min and cfg.title_font in l["font"]:
            t = l["text"].strip()
            if cur is not None and cur["title_page"] == l["page"] and not cur["sections"]:
                cur["title"] += " " + t     # title wrapped onto a second line
                continue
            cur = dict(title=t, title_page=l["page"], sections=[], lines=[])
            risks.append(cur)
            sec = None
            continue
        if cur is None:
            continue
        if is_heading(l, cfg):
            sec = dict(name=l["text"].strip(), page=l["page"], lines=[])
            cur["sections"].append(sec)
            continue
        if sec is not None:
            sec["lines"].append(l)
    return risks


def find_section(risk, *names):
    for s in risk["sections"]:
        if any(s["name"].lower().startswith(n.lower()) for n in names):
            return s
    return None


# ============================================================================ table helpers
def raw_lines(doc, pno, bottom):
    return page_lines(doc[pno - 1], pno, bottom=bottom, drop=())


def unmerged_lines(doc, pno, bottom, gap=8.0):
    """Table-cell pieces: PyMuPDF lines split wherever two consecutive spans are more than `gap` points apart
    (Word can put the texts of several table cells on one PyMuPDF line)."""
    out = []
    for b in doc[pno - 1].get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            if l["bbox"][1] >= bottom:
                continue
            pieces, cur = [], []
            for s in l["spans"]:
                if not s["text"]:
                    continue
                if cur and s["text"].strip() and s["bbox"][0] - cur[-1]["bbox"][2] > gap and "".join(x["text"] for x in cur).strip():
                    pieces.append(cur)
                    cur = []
                cur.append(s)
            if cur:
                pieces.append(cur)
            for spans in pieces:
                text = "".join(s["text"] for s in spans)
                if not text.strip():
                    continue
                vis = [s for s in spans if s["text"].strip()]
                first = vis[0]
                out.append(dict(page=pno, x=first["bbox"][0], x1=vis[-1]["bbox"][2], y=l["bbox"][1], y1=l["bbox"][3],
                                text=text, font=first["font"], size=round(first["size"], 1),
                                bold=all("Bold" in s["font"] for s in vis), anybold=False))
    out.sort(key=lambda r: (round(r["y"], 0), r["x"]))
    return out


# ============================================================================ LLM Top 10 2026 appendix A
FW_KEYS = OrderedDict([
    ("OWASP Top 10 for Agentic Applications", ("ASI", "other", "owasp-agentic-top10")),
    ("OWASP GenAI Data Security", ("DSGAI", "other", "owasp-genai-data-security")),
    ("MITRE ATLAS", ("ATLAS", "atlas", "atlas")),
    ("MITRE ATT&CK", ("ATT&CK", "other", "mitre-attack")),
    ("MITRE CWE", ("CWE", "other", "cwe")),
    ("NIST AI 600-1", ("600-1", "nist", "nist-ai-600-1")),
    ("NIST AI RMF", ("RMF", "nist", "nist-ai-rmf")),
    ("CSA AI Controls Matrix", ("AICM", "other", "csa-aicm")),
    ("OWASP AIVSS", ("AIVSS", "other", "owasp-aivss")),
])


def element_id(fw_scheme, name, gai_titles):
    """Identifier of an Appendix A element as printed (plus the Visua id for AI 600-1 risk categories)."""
    pats = {
        "owasp-agentic-top10": r"^(ASI\d\d)\b", "owasp-genai-data-security": r"^(DSGAI\d\d)\b",
        "atlas": r"^(AML\.TA?\d{4}(?:\.\d{3})?)\b", "mitre-attack": r"^(TA\d{4}|T\d{4}(?:\.\d{3})?)\b",
        "cwe": r"^(CWE-\d+)\b", "nist-ai-rmf": r"^((?:GOVERN|MAP|MEASURE|MANAGE) \d+(?:\.\d+)?)\b",
        "csa-aicm": r"^([A-Z]{2,4})\s", "owasp-aivss": r"^(AIVSS-\d+)\b",
    }
    if fw_scheme == "nist-ai-600-1":
        return gai_titles.get(squash(name))
    m = re.match(pats[fw_scheme], name)
    return m.group(1) if m else None


def parse_llm26_appendix(doc, gai_titles, errors):
    start = next(p for p in range(55, 70) if "Appendix A: Related" in doc[p - 1].get_text())
    end = next(p for p in range(start, len(doc) + 1) if "Framework Sources & Versions" in doc[p - 1].get_text()
               and "Framework Sources & Versions \n" in doc[p - 1].get_text().replace("Versions\n", "Versions \n")
               and p > start + 5)
    # ---------------- coverage matrix: glyph words aligned to the header words
    words = []
    for p in (start, start + 1):
        words += [(p,) + tuple(w[:5]) for w in doc[p - 1].get_text("words")]
    heads = {}
    coverage = OrderedDict()
    row_y = {}
    for p in (start, start + 1):
        ws = [w for w in words if w[0] == p]
        hdr = [w for w in ws if w[5] in ("ASI", "DSGAI", "ATLAS", "ATT&CK", "CWE", "600-1", "RMF", "AICM", "AIVSS")]
        hdr_y = min((w[2] for w in hdr), default=None)
        cols = [(w[5], (w[1] + w[3]) / 2) for w in hdr if abs(w[2] - hdr_y) < 2]
        heads[p] = cols
        # the first framework table starts on the matrix's second page: stop at its heading
        stop_y = min((w[2] for w in ws if w[5] == "(ASI)"), default=10_000)
        labels = [w for w in ws if re.fullmatch(r"LLM\d\d", w[5]) and w[1] < 120 and hdr_y < w[2] < stop_y]
        for lab in labels:
            row_y[lab[5]] = (p, lab[2])
        for lab in labels:
            cells = [w for w in ws if w[5] in ("●", "○", "—") and abs(w[2] - lab[2]) < 3.5 and w[1] > 150]
            rec = OrderedDict()
            for name, cx in cols:
                hit = [c for c in cells if abs((c[1] + c[3]) / 2 - cx) < 14]
                sym = hit[0][5] if hit else None
                rec[name] = {"●": "primary", "○": "supporting", "—": "none"}.get(sym)
            coverage[lab[5]] = rec
    for k, v in coverage.items():
        if None in v.values() or len(v) != 9:
            errors.append(f"coverage matrix row {k} incomplete: {dict(v)}")
    if list(coverage) != [f"LLM{n:02d}" for n in range(1, 11)]:
        errors.append(f"coverage matrix rows {list(coverage)}")

    # ---------------- framework tables
    sections, cur_fw = [], None
    entries = []
    last = None
    for p in range(start + 1, end):
        lines = unmerged_lines(doc, p, 745)
        hdr = [l for l in lines if l["text"].strip() in ("Risk", "Element", "Relevance") and l["bold"]]
        colx = {l["text"].strip(): l["x"] for l in hdr}
        # framework headings on this page (Poppins-SemiBold 15), possibly wrapped
        for l in lines:
            if l["font"].startswith("Poppins-SemiBold") and l["size"] == 15.0 and "Coverage matrix" not in l["text"]:
                t = l["text"].strip()
                if cur_fw is not None and cur_fw["page"] == p and abs(l["y"] - cur_fw["y1"]) < 6:
                    cur_fw["heading"] = join_lines([dict(text=cur_fw["heading"]), dict(text=t)])
                    cur_fw["y1"] = l["y1"]
                    continue
                cur_fw = dict(heading=t, page=p, y=l["y"], y1=l["y1"], intro=[])
                sections.append(cur_fw)
            elif cur_fw is not None and "Italic" in l["font"] and cur_fw["page"] == p and l["y"] > cur_fw["y"] \
                    and not any(cur_fw["y"] < h["y"] <= l["y"] for h in hdr):
                cur_fw["intro"].append(l)
        if "Element" not in colx:
            continue
        # one page can hold the end of one table and the start of the next, each with its own header row and
        # slightly different column positions: every body line uses the nearest header row above it
        rows_hdr = []
        for h in sorted(hdr, key=lambda h: h["y"]):
            if not rows_hdr or abs(rows_hdr[-1]["y"] - h["y"]) > 3:
                rows_hdr.append(dict(y=h["y"], y1=h["y1"], cols={}))
            rows_hdr[-1]["cols"][h["text"].strip()] = h["x"]
            rows_hdr[-1]["y1"] = max(rows_hdr[-1]["y1"], h["y1"])
        rows_hdr = [r for r in rows_hdr if {"Risk", "Element", "Relevance"} <= set(r["cols"])]

        def cols_for(l):
            above = [r for r in rows_hdr if r["y1"] < l["y"] + 1]
            if not above:
                return None
            c = above[-1]["cols"]
            return c["Element"] - 2, c["Relevance"] - 2

        body = [dict(l, cols=cols_for(l)) for l in lines if not ("Italic" in l["font"])]
        body = [l for l in body if l["cols"] and l["text"].strip() not in ("Risk", "Element", "Relevance")]
        # a heading further down the page starts a new table, so the framework is looked up by position.
        # pass 1: risk labels of the Risk column (collected first: a label can sit a fraction of a point below the
        # first element of its row)
        for l in body:
            xe, xr = l["cols"]
            if l["font"].startswith("Poppins-SemiBold") or l["x"] >= xe:
                continue
            fw = current_fw(sections, p, l["y"] + 3)
            if fw is None:
                continue
            t = l["text"].strip()
            m = re.match(r"^(LLM\d\d)\s+(.*)$", t)
            if m:
                fw.setdefault("risks", []).append(dict(id=m.group(1), label=t, page=p, y=l["y"], fw=fw["heading"]))
            elif fw.get("risks"):
                fw["risks"][-1]["label"] += " " + t
        # pass 2: elements (Element column) and their relevance texts (Relevance column)
        for l in body:
            xe, xr = l["cols"]
            if l["font"].startswith("Poppins-SemiBold") or l["x"] < xe:
                continue
            fw = current_fw(sections, p, l["y"])
            if fw is None:
                continue
            t = l["text"].strip()
            if l["x"] < xr:
                g = re.match(r"^([●○])\s*(.*)$", t)
                if g:
                    risk = next((r for r in reversed(fw.get("risks", [])) if (r["page"], r["y"] - 3.5) <= (p, l["y"])), None)
                    last = OrderedDict(fw=fw["heading"], risk=risk["id"] if risk else None, strength=g.group(1),
                                       element=[g.group(2)], relevance=[], page=p, y=l["y"])
                    entries.append(last)
                elif last is not None:
                    last["element"].append(t)
                continue
            if last is not None:
                last["relevance"].append(l)
                last.setdefault("pages", set()).add(p)
    # tidy
    fw_meta = []
    for s in sections:
        key = next((k for k in FW_KEYS if s["heading"].startswith(k)), None)
        if key is None:
            errors.append(f"unknown framework heading {s['heading']!r}")
            continue
        m = re.match(r"^(.*?)\s+—\s+(.*)$", s["heading"])
        fw_meta.append(OrderedDict(heading=s["heading"], framework=m.group(1) if m else s["heading"],
                                   version=m.group(2) if m else None, column=FW_KEYS[key][0], scheme=FW_KEYS[key][1],
                                   targetScheme=FW_KEYS[key][2], note=join_lines(s["intro"]) if s["intro"] else None,
                                   page=s["page"]))
    by_heading = {f["heading"]: f for f in fw_meta}
    out = []
    for e in entries:
        f = by_heading[e["fw"]]
        name = " ".join(x.strip() for x in e["element"])
        name = re.sub(r"(\w)- (\w)", r"\1-\2", name) if False else name
        rel = join_lines(sorted(e["relevance"], key=lambda l: (l["page"], l["y"])))
        pages = sorted(e.get("pages", {e["page"]}) | {e["page"]})
        rec = OrderedDict(risk=e["risk"], framework=f["framework"], column=f["column"], scheme=f["scheme"],
                          targetScheme=f["targetScheme"], id=element_id(f["targetScheme"], name, gai_titles),
                          element=name, strength="primary" if e["strength"] == "●" else "supporting", text=rel,
                          page=pages[0])
        if pages[-1] != pages[0]:
            rec["pageEnd"] = pages[-1]
        out.append(rec)
    # sources & versions table
    src_lines = [l for l in unmerged_lines(doc, end, 745)]
    hdr = [l for l in src_lines if l["text"].strip() in ("Framework", "Version", "Source") and l["bold"]]
    cx = {l["text"].strip(): l["x"] for l in hdr}
    hy = max(l["y1"] for l in hdr)
    rows = []
    for l in src_lines:
        if l["y"] <= hy:
            continue
        col = "Framework" if l["x"] < cx["Version"] - 2 else ("Version" if l["x"] < cx["Source"] - 2 else "Source")
        if col == "Framework" and (not rows or l["y"] - rows[-1]["_y1"] > 4 and rows[-1]["Framework"] and rows[-1]["Source"]):
            rows.append({"Framework": [], "Version": [], "Source": [], "_y1": l["y1"]})
        rows[-1][col].append(l["text"].strip())
        rows[-1]["_y1"] = max(rows[-1]["_y1"], l["y1"])
    sources = [OrderedDict(framework=" ".join(r["Framework"]), version=" ".join(r["Version"]),
                           source="".join(r["Source"]), page=end) for r in rows]
    return OrderedDict(startPage=start, endPage=end, coverage=coverage, frameworks=fw_meta, frameworkSources=sources), out


def current_fw(sections, p, y):
    cands = [s for s in sections if (s["page"], s["y"]) <= (p, y)]
    return cands[-1] if cands else None


# ============================================================================ LLM Top 10 2025 related frameworks
def related_2025(section, doc):
    blocks = build_blocks(section["lines"], CFG25)
    intro, items, notes = section_items(blocks)
    if notes:
        raise ValueError(f"unexpected text after the related-framework list: {notes!r}")
    links = {}
    for p in {l["page"] for l in section["lines"]}:
        for ln in doc[p - 1].get_links():
            if ln.get("uri"):
                links.setdefault(p, []).append((pymupdf.Rect(ln["from"]), ln["uri"]))
    out = []
    for it in items:
        text = it["text"]
        ids = re.findall(r"AML\.TA?\d{4}(?:\.\d{3})?", text)
        # link targets on the item's lines (e.g. 'ML Supply Chain Compromise' links to AML.T0010)
        urls = []
        for l in it.pop("_lines"):
            r = pymupdf.Rect(l["x"], l["y"], l["x1"], l["y1"])
            for rect, uri in links.get(l["page"], []):
                cy = (rect.y0 + rect.y1) / 2
                if r.y0 + 1 < cy < r.y1 - 1 and rect.x1 > r.x0 and rect.x0 < r.x1 and uri not in urls:
                    urls.append(uri)
        link_ids = [re.search(r"(AML\.TA?\d{4}(?:\.\d{3})?)", u).group(1) for u in urls if re.search(r"atlas\.mitre\.org/(?:techniques|tactics)/AML\.", u)]
        scheme = "atlas" if re.search(r"MITRE ATLAS|Mitre ATLAS", text) else ("nist" if "NIST" in text else "other")
        rec = OrderedDict(scheme=scheme)
        if ids:
            rec["id"] = ids[0]
            if len(ids) > 1:
                rec["ids"] = ids
        elif link_ids:
            rec["id"] = link_ids[0]
            rec["idSource"] = "link target (the printed text carries no identifier)"
        rec["text"] = text
        if urls:
            rec["urls"] = urls
        rec["page"] = it["page"]
        out.append(rec)
    return intro, out


# ============================================================================ configs
CFG26 = Cfg(title_min=20.0, title_font="Poppins-Bold", heading_size=15.0, heading_font="Poppins-SemiBold",
            group_fonts=("Poppins-Medium", "Poppins-SemiBoldItalic"), group_size=None, group_font=None,
            titled_font=None, titled_size=None, label_x=90.1, text_x=108.1, body_x=72.0, para_gap=8.0,
            right_edge=540.0, bottom=745.0, drop=())
CFG25 = Cfg(title_min=20.0, title_font="BarlowBold", heading_size=16.0, heading_font="PoppinsBold",
            group_fonts=(), group_size=11.0, group_font="PoppinsBold", titled_font="PoppinsBold", titled_size=11.0,
            label_x=90.0, text_x=100.8, body_x=100.8, para_gap=8.0, right_edge=540.0, bottom=745.0,
            drop=("OWASP Top 10 for LLM Applications v2.0",))
CFGASI = Cfg(title_min=20.0, title_font="Poppins-Bold", heading_size=15.1, heading_font="Poppins-SemiBold",
             group_fonts=("Poppins-Medium", "Poppins-SemiBoldItalic"), group_size=None, group_font=None,
             titled_font=None, titled_size=None, label_x=90.5, text_x=108.5, body_x=72.5, para_gap=8.0,
             right_edge=540.0, bottom=745.0, drop=())


def risk_record(r, cfg, edition, idre, doc, scheme_key):
    m = re.match(idre, r["title"])
    rid, title = m.group(1), m.group(3).strip()
    printed_key = m.group(1) + (m.group(2) or "")
    desc = find_section(r, "Description")
    prev = find_section(r, "Prevention and Mitigation")
    dblocks = build_blocks(desc["lines"], cfg)
    dparas = paragraphs_of(dblocks)
    intro, items, notes = section_items(build_blocks(prev["lines"], cfg))
    for it in items:
        it.pop("_lines", None)
    last_page = max([l["page"] for s in r["sections"] for l in s["lines"]] + [r["title_page"]])
    rec = OrderedDict(id=rid, edition=edition, key=f"{rid}:{edition}" if scheme_key != "asi" else rid, title=title)
    if printed_key != rec["key"] and scheme_key != "asi":
        rec["titleAsPrinted"] = r["title"]
    rec["description"] = dparas[0]
    rec["descriptionParagraphs"] = dparas
    if intro:
        rec["preventionIntro"] = intro
    rec["preventionStrategies"] = items
    if notes:
        rec["preventionNotes"] = notes
    rec["sections"] = [OrderedDict(name=s["name"], page=s["page"]) for s in r["sections"]]
    rec["page"] = r["title_page"]
    rec["pageEnd"] = last_page
    # completeness: every printed line of the two sections is covered by the extracted texts, and numbered labels run
    # 1..n without gaps inside each group
    covered = squash(" ".join(dparas))
    for l in desc["lines"]:
        probe = squash(NUM_RE.sub(r"\2", l["text"].strip()).lstrip(BULLETS))
        if probe and probe not in covered:
            COMPLETENESS.append(f"{rec['key']} Description: line not extracted p{l['page']}: {l['text'].strip()[:70]!r}")
    covered = squash(" ".join(intro + notes + [i.get("group", "") + (i.get("title") or "") + i["text"] for i in items]))
    for l in prev["lines"]:
        probe = squash(NUM_RE.sub(r"\2", l["text"].strip()).lstrip(BULLETS))
        if probe and probe not in covered:
            COMPLETENESS.append(f"{rec['key']} Prevention: line not extracted p{l['page']}: {l['text'].strip()[:70]!r}")
    seq = {}
    for i in items:
        if i["label"].isdigit():
            seq.setdefault(i.get("group"), []).append(int(i["label"]))
    for g, nums in seq.items():
        if nums != list(range(nums[0], nums[0] + len(nums))) or nums[0] != 1 and g is None:
            COMPLETENESS.append(f"{rec['key']} Prevention: numbering {nums} (group {g!r})")
    return rec


COMPLETENESS = []


def pypdf_pages(path, strip):
    """Independent text layer (pypdf, content-stream order) squashed to letters/digits, running headers removed."""
    reader = pypdf.PdfReader(str(path))
    return [re.sub(strip, "", squash(pg.extract_text() or "")) for pg in reader.pages]


def verify_texts(pages, recs, errors, label):
    """Every verbatim text must occur (letters/digits only) in the pypdf text of its page range."""
    n = 0
    for r in recs:
        p0, p1 = r["page"], r.get("pageEnd", r["page"])
        window = "".join(pages[p0 - 1:p1])
        texts = [r["description"]] + r["descriptionParagraphs"] + r.get("preventionIntro", []) + r.get("preventionNotes", [])
        texts += [(i.get("title") or "") + i["text"] for i in r["preventionStrategies"]]
        texts += [f["text"] for f in r.get("relatedFrameworks", []) if f.get("source") != "appendix"]
        for t in texts:
            n += 1
            probe = squash(re.sub(r"^(\d{1,2}\.|[" + BULLETS + r"])\s", "", t))
            if probe not in window:
                errors.append(f"{label} {r['key']}: text not found in PDF pages {p0}-{p1}: {t[:80]!r}")
    return n


def main(check=False):
    errors, notes = [], []
    gai = json.loads(GENAI_PROFILE.read_text(encoding="utf-8"))
    gai_titles = {squash(x["title"]): x["id"] for x in gai["risks"]}
    gai_titles[squash("Harmful Bias and Homogenization")] = "harmful-bias-homogenization"

    # ------------------------------------------------------------------ LLM 2026
    d26 = pymupdf.open(LLM26)
    lines = doc_lines(d26, range(10, 58), bottom=CFG26.bottom)
    risks26 = split_risks(lines, CFG26)
    recs26 = [risk_record(r, CFG26, "2026", r"^(LLM\d\d)(:2026)\s+(.+)$", d26, "llm") for r in risks26]
    appendix, rows = parse_llm26_appendix(d26, gai_titles, errors)
    for r in recs26:
        r["coverage"] = appendix["coverage"].get(r["id"])
        r["relatedFrameworks"] = [OrderedDict([("scheme", x["scheme"]), ("framework", x["framework"]),
                                               ("targetScheme", x["targetScheme"]), ("id", x["id"]), ("element", x["element"]),
                                               ("strength", x["strength"]), ("text", x["text"]), ("page", x["page"])]
                                              + ([("pageEnd", x["pageEnd"])] if "pageEnd" in x else []))
                                  for x in rows if x["risk"] == r["id"]]
        for f in r["relatedFrameworks"]:
            f["source"] = "appendix"
    # coverage matrix vs. rows: every ●/○ column has rows of that strength, every — column none
    for r in recs26:
        for col, strength in r["coverage"].items():
            have = {x["strength"] for x in r["relatedFrameworks"] if next(f for f in appendix["frameworks"]
                                                                        if f["framework"] == x["framework"])["column"] == col}
            if strength == "none" and have:
                errors.append(f"{r['id']} {col}: matrix says none but rows exist")
            if strength in ("primary", "supporting") and strength not in have:
                if not (strength == "supporting" and "primary" in have):
                    notes.append(f"{r['id']} {col}: matrix says {strength}, rows have {sorted(have) or 'none'}")
    for x in rows:
        if x["id"] is None:
            errors.append(f"appendix row without identifier: {x['risk']} {x['framework']} {x['element']!r}")

    # ------------------------------------------------------------------ LLM 2025
    d25 = pymupdf.open(LLM25)
    lines = doc_lines(d25, range(7, 43), bottom=CFG25.bottom, drop=CFG25.drop)
    risks25 = split_risks(lines, CFG25)
    recs25 = []
    for r in risks25:
        rec = risk_record(r, CFG25, "2025", r"^(LLM\d\d)(:2025|:)?\s+(.+)$", d25, "llm")
        rf = find_section(r, "Related Frameworks")
        if rf:
            intro, rel = related_2025(rf, d25)
            rec["relatedFrameworksIntro"] = intro[0] if intro else None
            rec["relatedFrameworks"] = rel
        else:
            rec["relatedFrameworks"] = []
        recs25.append(rec)

    # ------------------------------------------------------------------ 2025 → 2026 lineage (as stated by OWASP)
    rename = "What used to be System Prompt Leakage is now Hidden Context Exposure"
    whats_new = d26[6].get_text()
    if squash(rename) not in squash(whats_new):
        errors.append("2026 'What's New' no longer states the System Prompt Leakage rename")
    by_title25 = {squash(r["title"]): r for r in recs25}
    for r in recs26:
        prev = by_title25.get(squash(r["title"]))
        if prev:
            r["previousEdition"] = OrderedDict(key=prev["key"], basis="same entry title in the 2025 edition")
        elif r["title"] == "Hidden Context Exposure":
            prev = by_title25[squash("System Prompt Leakage")]
            r["previousEdition"] = OrderedDict(key=prev["key"], basis=f"2026 edition p. 7: '{rename}'")
        else:
            errors.append(f"LLM 2026 {r['id']}: no 2025 predecessor")

    # ------------------------------------------------------------------ Agentic 2026
    da = pymupdf.open(ASI26)
    lines = doc_lines(da, range(10, 40), bottom=CFGASI.bottom)
    risksa = split_risks(lines, CFGASI)
    recsa = [risk_record(r, CFGASI, "2026", r"^(ASI\d\d)(:)\s*(.+)$", da, "asi") for r in risksa]
    asi_matrix = parse_asi_appendix(da, errors)
    for r in recsa:
        r["relatedFrameworks"] = asi_matrix.get(r["id"], [])
        for f in r["relatedFrameworks"]:
            f["source"] = "appendix"

    # ------------------------------------------------------------------ checks
    for label, recs, prefix in (("LLM 2026", recs26, "LLM"), ("LLM 2025", recs25, "LLM"), ("ASI 2026", recsa, "ASI")):
        ids = [r["id"] for r in recs]
        if ids != [f"{prefix}{n:02d}" for n in range(1, 11)]:
            errors.append(f"{label}: ids {ids}")
        for r in recs:
            if not r["preventionStrategies"]:
                errors.append(f"{label} {r['id']}: no prevention strategies")
    pp26 = pypdf_pages(LLM26, r"page\d+genaiowasporg|riskelementrelevance")
    pp25 = pypdf_pages(LLM25, r"owasptop10forllmapplicationsv20\d+genaiowasporg")
    ppa = pypdf_pages(ASI26, r"page\d+genaiowasporg")
    n = verify_texts(pp26, recs26, errors, "LLM 2026") + verify_texts(pp25, recs25, errors, "LLM 2025") + verify_texts(ppa, recsa, errors, "ASI 2026")
    # appendix rows: element name immediately followed by its relevance text in the pypdf (row-major) text
    for x in rows:
        w = "".join(pp26[x["page"] - 1:x.get("pageEnd", x["page"])])
        n += 1
        if squash(x["element"]) + squash(x["text"]) not in w:
            errors.append(f"appendix row not found as element+relevance in pypdf text p{x['page']}: {x['risk']} {x['element']!r}")
    for aid, recs in asi_matrix.items():
        for x in recs:
            n += 1
            probe = squash(x["text"])
            p0, p1 = x["page"], x.get("pageEnd", x["page"])
            ok = probe in "".join(ppa[p0 - 1:p1])
            if not ok and p1 == p0 + 1:
                # a cell that breaks across pages: pypdf prints the row's continuation after the page break, so
                # the two halves are checked on their own pages
                ok = any(probe[:k] in ppa[p0 - 1] and probe[k:] in ppa[p1 - 1] for k in range(1, len(probe)))
            if not ok:
                errors.append(f"ASI appendix cell text not found: {aid} {x['text']!r}")
    # TOC titles
    toc26 = {re.match(r"(LLM\d\d)", t[1]).group(1): t[1] for t in d26.get_toc() if re.match(r"LLM\d\d:2026", t[1])}
    for r in recs26:
        if squash(toc26.get(r["id"], "")) != squash(f"{r['id']}:2026 {r['title']}"):
            errors.append(f"LLM 2026 {r['id']}: title differs from bookmark {toc26.get(r['id'])!r}")

    llm = OrderedDict()
    llm["source"] = OrderedDict(
        catalog="OWASP Top 10 for LLM Applications",
        publisher="OWASP GenAI Security Project (OWASP Foundation)",
        currentEdition="2026",
        editions=[
            OrderedDict(edition="2026", status="current", documentId="owasp-llm-top10-2026-pdf",
                        title="OWASP Top 10 for LLM Applications 2026", version="Version 2026 (v1.0)",
                        released="2026-08-03", path="ai-threats/owasp-llm-top10/OWASP-GenAI-LLM-Top-10-2026-v1.0.pdf",
                        sha256=sha256(LLM26), url="https://genai.owasp.org/download/56857/",
                        landingPage="https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/",
                        pageNumbering="page = 1-based physical page of the PDF (equals the printed 'Page N' footer)",
                        mappings="Appendix A: Related Framework Mappings (replaces the per-entry Related Frameworks sections)"),
            OrderedDict(edition="2025", status="superseded by 2026", documentId="owasp-llm-top10-2025-pdf",
                        title="OWASP Top 10 for LLM Applications 2025", version="Version 2025 (PDF v4.2.0a 20241114-202703)",
                        released="2024-11-18", path="ai-threats/owasp-llm-top10/LLMAll_en-US_FINAL.pdf",
                        sha256=sha256(LLM25), url="https://genai.owasp.org/download/43299/",
                        landingPage="https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/",
                        pageNumbering="page = 1-based physical page of the PDF (printed page = physical - 4)",
                        mappings="per-entry 'Related Frameworks and Taxonomies' sections (7 of 10 entries)"),
        ],
        license=OWASP_LICENSE,
        licenseUrl=OWASP_LICENSE_URL,
        licenseNotice="This document is licensed under Creative Commons, CC BY-SA 4.0.",
        attribution=("OWASP Top 10 for LLM Applications 2026 and 2025, OWASP GenAI Security Project (https://genai.owasp.org), "
                     "licensed under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/legalcode)."),
        changes=("Adapted by Visua on " + RETRIEVED + ": the text of each entry's Description and Prevention and Mitigation "
                 "Strategies sections and the Appendix A / Related Frameworks mappings were extracted from the PDFs and "
                 "rearranged into JSON (list labels split into 'label'; wrapped lines re-joined). The wording is unchanged. "
                 "Common Examples, Example Attack Scenarios and References are not included. This file is licensed "
                 "under CC BY-SA 4.0."),
        retrieved=RETRIEVED,
    )
    llm["counts"] = OrderedDict(risks2026=len(recs26), risks2025=len(recs25),
                                preventionStrategies2026=sum(len(r["preventionStrategies"]) for r in recs26),
                                preventionStrategies2025=sum(len(r["preventionStrategies"]) for r in recs25),
                                appendixMappings2026=len(rows),
                                relatedFrameworks2025=sum(len(r["relatedFrameworks"]) for r in recs25))
    llm["appendixA2026"] = appendix
    llm["risks"] = recs26 + recs25

    asi = OrderedDict()
    asi["source"] = OrderedDict(
        catalog="OWASP Top 10 for Agentic Applications",
        publisher="OWASP GenAI Security Project — Agentic Security Initiative (OWASP Foundation)",
        edition="2026", version="Version 2026 (December 2025; file 'OWASP Top 10 for Agentic Applications 2026 12.6')",
        released="2025-12-09", documentId="owasp-agentic-top10-2026-pdf",
        path="ai-threats/owasp-agentic-top10/OWASP-Top-10-for-Agentic-Applications-2026-12.6-1.pdf",
        sha256=sha256(ASI26), url="https://genai.owasp.org/download/52117/",
        landingPage="https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/",
        pageNumbering="page = 1-based physical page of the PDF (printed 'Page N' footer = physical - 1)",
        license=OWASP_LICENSE, licenseUrl=OWASP_LICENSE_URL,
        licenseNotice="This document is licensed under Creative Commons, CC BY-SA 4.0",
        attribution=("OWASP Top 10 for Agentic Applications 2026, OWASP GenAI Security Project – Agentic Security Initiative "
                     "(https://genai.owasp.org), licensed under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/legalcode)."),
        changes=("Adapted by Visua on " + RETRIEVED + ": Description and Prevention and Mitigation Guidelines texts and the "
                 "Appendix A mapping matrix were extracted from the PDF and rearranged into JSON (list labels split into "
                 "'label'; wrapped lines re-joined). The wording is unchanged. This file is licensed under CC BY-SA 4.0."),
        retrieved=RETRIEVED,
        mappings="Appendix A - OWASP Agentic AI Security Mapping Matrix (ASI → OWASP LLM Top 10 2025, Agentic AI Threats & "
                 "Mitigations T-codes, AIVSS core risks). The document maps to no MITRE ATLAS or NIST element.",
    )
    asi["counts"] = OrderedDict(risks=len(recsa), preventionStrategies=sum(len(r["preventionStrategies"]) for r in recsa),
                                appendixMappings=sum(len(r["relatedFrameworks"]) for r in recsa))
    asi["risks"] = recsa

    errors += COMPLETENESS
    report = OrderedDict(textsChecked=n, llm2026=[(r["id"], r["title"], len(r["preventionStrategies"]),
                                                   len(r["relatedFrameworks"])) for r in recs26],
                         llm2025=[(r["id"], r["title"], len(r["preventionStrategies"]), len(r["relatedFrameworks"])) for r in recs25],
                         asi2026=[(r["id"], r["title"], len(r["preventionStrategies"]), len(r["relatedFrameworks"])) for r in recsa],
                         appendixFrameworks=[(f["framework"], f["version"], sum(1 for x in rows if x["framework"] == f["framework"]))
                                             for f in appendix["frameworks"]],
                         notes=notes, errors=errors)
    s1 = write_json(ROOT / "owasp-llm-top10.json", llm, check=check)
    s2 = write_json(ROOT / "owasp-agentic-top10.json", asi, check=check)
    write_json(ROOT / "tools" / "reports" / "owasp-verification.json", report, check=check)
    print(f"owasp-llm-top10.json: 2026 {len(recs26)} risks / {llm['counts']['preventionStrategies2026']} strategies / "
          f"{len(rows)} appendix mappings; 2025 {len(recs25)} risks / {llm['counts']['preventionStrategies2025']} strategies / "
          f"{llm['counts']['relatedFrameworks2025']} related-framework items")
    print(f"owasp-agentic-top10.json: {len(recsa)} risks / {asi['counts']['preventionStrategies']} guidelines / "
          f"{asi['counts']['appendixMappings']} appendix mappings; {n} texts verified")
    for x in notes:
        print("NOTE", x)
    for e in errors:
        print("ERROR", e)
    return 1 if errors or (check and not (s1 and s2)) else 0


# ============================================================================ ASI appendix A
ASI_COLS = ("ASI ID / Title", "OWASP LLM Top 10 (2025)", "Agentic AI Threats & Mitigations", "AIVSS Core Risk Alignment")


def parse_asi_appendix(doc, errors):
    start = next(p for p in range(35, 45) if "Appendix A - OWASP Agentic" in doc[p - 1].get_text())
    rows, cur = [], None
    for p in (start, start + 1):
        lines = unmerged_lines(doc, p, 745)
        hdr = [l for l in lines if l["bold"] and l["size"] == 11.0]
        if hdr:
            xs = sorted({round(l["x"], 1) for l in hdr})
            hy = max(l["y1"] for l in hdr)
        else:
            hy = 0
        stop = next((l["y"] for l in lines if l["text"].strip() == "Notes"), 10_000)
        for l in lines:
            if l["y"] <= hy or l["y"] >= stop or l["font"] != "Barlow-Regular":
                continue
            col = max(i for i, x in enumerate(xs) if l["x"] >= x - 2)
            t = l["text"].strip()
            if col == 0 and re.match(r"^ASI \d\d\b", t):
                cur = dict(cells=[[], [], [], []], page=p)
                rows.append(cur)
            if cur is None:
                continue
            cur["cells"][col].append(l)
            cur["pageEnd"] = p
    out = {}
    for r in rows:
        cells = [join_lines(sorted(c, key=lambda l: (l["page"], l["y"]))) for c in r["cells"]]
        m = re.match(r"^ASI (\d\d)\s+–\s+(.*)$", cells[0])
        aid = f"ASI{m.group(1)}"
        recs = []
        for part in re.split(r"\s*(?:·|,)\s*(?=LLM\d)", cells[1]):
            mm = re.match(r"^LLM(\d\d)(:2025)?", part)
            rec = OrderedDict(scheme="other", framework="OWASP Top 10 for LLM Applications", frameworkVersion="2025",
                              targetScheme="owasp-llm-top10", id=f"LLM{mm.group(1)}:2025")
            if not mm.group(2):
                rec["idAsPrinted"] = f"LLM{mm.group(1)}"
            rec["text"] = part
            recs.append(rec)
        for part in re.split(r"\s*·\s*(?=T\d)", cells[2]):
            mm = re.match(r"^(T\d+)\b", part)
            recs.append(OrderedDict(scheme="other", framework="OWASP Agentic AI – Threats and Mitigations",
                                    targetScheme="owasp-agentic-threats", id=mm.group(1) if mm else None, text=part))
        for part in re.split(r"\s*·\s*", cells[3]):
            recs.append(OrderedDict(scheme="other", framework="OWASP AIVSS (AI Vulnerability Scoring System) core risks",
                                    targetScheme="owasp-aivss", id=None, text=part))
        for x in recs:
            x["column"] = ASI_COLS[{"owasp-llm-top10": 1, "owasp-agentic-threats": 2, "owasp-aivss": 3}[x["targetScheme"]]]
            x["page"] = r["page"]
            if r["pageEnd"] != r["page"]:
                x["pageEnd"] = r["pageEnd"]
        out[aid] = recs
        if not m or m.group(2) is None:
            errors.append(f"ASI appendix row label {cells[0]!r}")
    if list(out) != [f"ASI{n:02d}" for n in range(1, 11)]:
        errors.append(f"ASI appendix rows {list(out)}")
    return out


if __name__ == "__main__":
    sys.exit(main(check="--check" in sys.argv))
