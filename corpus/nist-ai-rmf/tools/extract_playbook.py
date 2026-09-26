#!/usr/bin/env python3
"""Build ai-rmf-playbook.json (one entry per AI RMF subcategory) from the NIST AI RMF Playbook.

Primary source (official machine-readable, linked from https://airc.nist.gov/airmf-resources/playbook/):
  playbook/playbook.json            (AIRC "Playbook JSON"; same content as playbook.csv / playbook.xlsx)
Cross-checks:
  playbook/AI_RMF_Playbook.pdf      (AIRC "Playbook PDF"; used for page numbers and a containment check)
  machine-readable/cprt-AI_100_1_0_0-export.json   (NIST CPRT itemised copy of the Playbook)
  ai-rmf-core.json                  (AI 100-1 subcategory wording, run tools/extract_core.py first)
Output:
  ai-rmf-playbook.json   and   tools/reports/playbook-verification.json

Usage:  python3 tools/extract_playbook.py [--check]
"""
import json
import re
import sys
from collections import OrderedDict

import pymupdf

from common import ROOT, fix_ligatures, norm_cmp, sha256

PB_JSON = ROOT / "playbook" / "playbook.json"
PB_PDF = ROOT / "playbook" / "AI_RMF_Playbook.pdf"
CPRT = ROOT / "machine-readable" / "cprt-AI_100_1_0_0-export.json"
CORE = ROOT / "ai-rmf-core.json"
OUT = ROOT / "ai-rmf-playbook.json"

BARE_LABELS = {"URL", "LINK", "PDF"}  # link labels that stand for a bare hyperlink
URL_TOKEN = re.compile(r"https?://[^\s)]+")
BULLET_RE = re.compile(r"^(\s*)(?:[-*\u2022])\s*(.*)$")


def _clean_url(u):
    u = u.strip().rstrip(".,;")
    while u.endswith(")") and u.count(")") > u.count("("):
        u = u[:-1]
    return u


def _close_paren(s, k):
    """Index of the parenthesis closing the one at s[k] (balanced), or -1."""
    depth = 0
    for idx in range(k, len(s)):
        if s[idx] == "(":
            depth += 1
        elif s[idx] == ")":
            depth -= 1
            if depth == 0:
                return idx
        elif s[idx] in "[\n":
            return -1
    return -1


def md_links(s):
    """Render the markdown links of playbook.json as plain text, the way the Playbook renders them.

    '[label](target)' keeps 'label' as text, except bare link words (URL, LINK, PDF), which are
    dropped. Everything inside the parentheses is link target, never visible text. Malformed
    forms seen in the data are tolerated: '[URL] (https://...)', '[URL]( https://...)',
    '[URL](https://a or http://b)' and a missing closing parenthesis (the target then runs to the
    next whitespace). Brackets not followed by a target, e.g. '[cs]' or '[Technical Report]',
    are kept verbatim. Returns (text, [urls])."""
    out, urls, i = [], [], 0
    bracket = re.compile(r"\[([^\]]*)\]")
    while True:
        m = bracket.search(s, i)
        if not m:
            out.append(s[i:])
            break
        label, k = m.group(1), m.end()
        if s[k:k + 2] == " (" and label.strip() in BARE_LABELS and s[k + 2:k + 6] == "http":
            k += 1
        if k < len(s) and s[k] == "(":
            close = _close_paren(s, k)
            if close == -1:
                mm = re.match(r"\(\s*(\S*)", s[k:])
                target, end = mm.group(1), k + mm.end()
            else:
                target, end = s[k + 1:close], close + 1
            tokens = target.split()
            found = [_clean_url(t) for t in tokens if t.startswith("http")] if len(tokens) > 1 else [_clean_url(t) for t in tokens]
            urls += [u for u in found if u]
            out.append(s[i:m.start()])
            out.append("" if label.strip() in BARE_LABELS else label)
            i = end
        else:
            out.append(s[i:k])
            i = k
    t = "".join(out)
    t = re.sub(r"[ \t]+", " ", t).strip()
    t = re.sub(r"(?:\s*,)+\s*(?=[.;:]|$)", "", t)   # ", ," left behind by removed link words
    t = re.sub(r"\s+([.,;:])", r"\1", t)
    t = re.sub(r"\.\s*\.(?!\.)", ".", t)
    return t.strip(), urls


def indent_width(line):
    w = 0
    for ch in line:
        if ch == " ":
            w += 1
        elif ch == "\t":
            w += 4
        else:
            break
    return w


def parse_list(section):
    """Parse a markdown-ish bullet list. Returns (intro_paragraphs, tree) where tree is a list of
    {"text": str, "urls": [...], "children": [...]}. Nesting depth follows indentation width."""
    lines = [l.rstrip() for l in section.replace("\r", "").split("\n")]
    widths = sorted({indent_width(l) for l in lines if l.strip() and BULLET_RE.match(l)})
    # indentation of 0-1 characters counts as top level
    levels = []
    for w in widths:
        if w <= 1:
            continue
        levels.append(w)
    def depth(w):
        if w <= 1:
            return 0
        return 1 + levels.index(w)
    intro, tree, stack = [], [], []
    for l in lines:
        if not l.strip():
            continue
        m = BULLET_RE.match(l)
        if m and not l.strip().startswith("**"):
            d = depth(indent_width(l))
            text, urls = md_links(m.group(2))
            node = {"text": text, "urls": urls, "children": []}
            while stack and stack[-1][0] >= d:
                stack.pop()
            if stack:
                stack[-1][1]["children"].append(node)
            else:
                tree.append(node)
            stack.append((d, node))
        else:
            text, urls = md_links(l.strip())
            if stack:  # continuation of the previous bullet
                stack[-1][1]["text"] = (stack[-1][1]["text"] + " " + text).strip()
                stack[-1][1]["urls"] += urls
            else:
                intro.append(text)
    return intro, tree


def render(node, depth=0):
    """Item text with nested sub-items appended as '\n- child' lines (two spaces per extra level)."""
    s = node["text"]
    for c in node["children"]:
        s += "\n" + "  " * depth + "- " + render(c, depth + 1)
    return s


def flatten(tree):
    for n in tree:
        yield n
        yield from flatten(n["children"])


def split_headed(section):
    """Split a section into {heading or None: body} using '### ' headings."""
    parts, cur, buf = OrderedDict(), None, []
    for l in section.replace("\r", "").split("\n"):
        m = re.match(r"^\s*#{1,6}\s*(.*?)\s*$", l)
        if m:
            parts[cur] = "\n".join(buf)
            cur, buf = m.group(1), []
        else:
            buf.append(l)
    parts[cur] = "\n".join(buf)
    return OrderedDict((k, v) for k, v in parts.items() if v.strip() or k is not None)


def plain_paragraphs(section):
    """About text: blocks separated by blank lines; bullet lines kept as '- ' lines."""
    blocks, cur = [], []
    for l in section.replace("\r", "").split("\n"):
        if not l.strip():
            if cur:
                blocks.append(cur)
                cur = []
            continue
        cur.append(l)
    if cur:
        blocks.append(cur)
    out = []
    for b in blocks:
        lines = []
        for l in b:
            m = BULLET_RE.match(l)
            if m:
                lines.append("- " + md_links(m.group(2))[0])
            else:
                t = md_links(l.strip())[0]
                if lines and not lines[-1].startswith("- "):
                    lines[-1] += " " + t
                else:
                    lines.append(t)
        out.append("\n".join(lines))
    return "\n\n".join(out)


def parse_references(section):
    refs = []
    for heading, body in split_headed(section).items():
        # paragraphs (blank-line separated) or bullet lists
        blocks, cur = [], []
        for l in body.split("\n"):
            if not l.strip():
                if cur:
                    blocks.append(cur)
                    cur = []
            else:
                cur.append(l)
        if cur:
            blocks.append(cur)
        for b in blocks:
            if any(BULLET_RE.match(l) for l in b):
                intro, tree = parse_list("\n".join(b))
                for t in intro:
                    refs.append({"text": t, "urls": [], "group": heading})
                for n in tree:
                    urls = [u for x in flatten([n]) for u in x["urls"]]
                    refs.append({"text": render(n), "urls": urls, "group": heading})
            else:
                text, urls = md_links(" ".join(l.strip() for l in b))
                refs.append({"text": text, "urls": urls, "group": heading})
    return refs


def squash(s):
    s = fix_ligatures(s)
    s = md_links(s)[0] if "[" in s else s
    s = s.replace(" ", " ")
    s = re.sub(r"[\s\-‐‑–—•▪●o§]", "", s)
    for a, b in (("’", "'"), ("‘", "'"), ("“", '"'), ("”", '"')):
        s = s.replace(a, b)
    return s.lower()


def main():
    check_only = "--check" in sys.argv
    pb = json.loads(PB_JSON.read_text(encoding="utf-8"))
    core = {s["id"]: s for s in json.loads(CORE.read_text(encoding="utf-8"))["subcategories"]}
    cprt = json.loads(CPRT.read_text(encoding="utf-8"))["response"]["elements"]["elements"]

    # ---- Playbook PDF: page of each subcategory heading --------------------------------------
    doc = pymupdf.open(PB_PDF)
    heads = []
    for pno in range(doc.page_count):
        for b in doc[pno].get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                t = "".join(s["text"] for s in l["spans"]).strip()
                if re.fullmatch(r"(GOVERN|MAP|MEASURE|MANAGE) \d+\.\d+", t) and l["spans"][0]["size"] >= 12.5:
                    heads.append((t, pno + 1, l["bbox"][1]))
    order = [h[0] for h in heads]
    page_of = {h[0]: h[1] for h in heads}
    # drop the running footer "N of 142" so paragraphs that cross a page break stay contiguous
    page_text = [re.sub(r"(?m)^\s*\d+ of \d+\s*$", "", fix_ligatures(doc[i].get_text())) for i in range(doc.page_count)]

    def pdf_segment(sid):
        i = order.index(sid)
        p0 = page_of[sid]
        p1 = heads[i + 1][1] if i + 1 < len(heads) else doc.page_count
        txt = "\n".join(page_text[p - 1] for p in range(p0, p1 + 1))
        return txt, p0, p1

    # ---- CPRT itemised copy -------------------------------------------------------------------
    by_prefix = {}
    for e in cprt:
        m = re.match(r"^(SA|D|R|REF|A)-((?:GOVERN|MAP|MEASURE|MANAGE) \d+\.\d+)(?:-(.*))?$", e["element_identifier"])
        if m:
            by_prefix.setdefault((m.group(1), m.group(2)), []).append(e)

    entries, report = [], {"entries": {}, "summary": {}}
    tot = {"suggestedActions": 0, "suggestedActionItemsFlat": 0, "transparencyDocumentation": 0,
           "transparencyResources": 0, "references": 0}
    for e in pb:
        sid = e["title"]
        fn = sid.split()[0]
        intro, tree = parse_list(e["section_actions"])
        doc_parts = split_headed(e["section_doc"])
        tdoc, tres = [], []
        for h, body in doc_parts.items():
            hl = (h or "").lower()
            if hl.startswith("organizations can document"):
                i2, t2 = parse_list(body)
                tdoc += [render(n) for n in t2] + i2
            elif hl.startswith("ai transparency resources"):
                for l in body.split("\n"):
                    if l.strip():
                        m = BULLET_RE.match(l)
                        text, urls = md_links(m.group(2) if m else l.strip())
                        tres.append(OrderedDict([("text", text), ("urls", urls)]))
            elif body.strip():
                raise SystemExit(f"unexpected documentation heading in {sid}: {h!r}")
        refs = parse_references(e["section_ref"])
        seg, p0, p1 = pdf_segment(sid)
        rec = OrderedDict()
        rec["id"] = sid
        rec["function"] = fn
        rec["category"] = e["category"].replace("-", " ")
        rec["playbookStatement"] = e["description"].strip()
        rec["statementMatchesAi100_1"] = norm_cmp(e["description"]) == norm_cmp(core[sid]["text"])
        rec["about"] = plain_paragraphs(e["section_about"])
        if intro:
            rec["suggestedActionsIntro"] = " ".join(intro)
        rec["suggestedActions"] = [render(n) for n in tree]
        rec["transparencyDocumentation"] = tdoc
        rec["transparencyResources"] = tres
        rec["references"] = [r["text"] for r in refs]
        rec["referenceDetails"] = [OrderedDict([("text", r["text"]), ("urls", r["urls"]), ("group", r["group"])]) for r in refs]
        rec["aiActors"] = e.get("AI Actors", [])
        rec["topics"] = e.get("Topic", [])
        rec["page"] = p0
        rec["pageEnd"] = p1 if p1 != p0 else None
        if rec["pageEnd"] is None:
            del rec["pageEnd"]
        entries.append(rec)

        # ---- verification ----
        sq = squash(seg)
        missing = []
        flat_actions = [n["text"] for n in flatten(tree)]
        checks = ([("about", p) for p in rec["about"].split("\n")] + [("intro", t) for t in intro]
                  + [("action", t) for t in flat_actions] + [("doc", t) for t in tdoc]
                  + [("resource", r["text"]) for r in tres] + [("reference", r["text"]) for r in refs])
        checked = 0
        for kind, t in checks:
            for piece in t.split("\n"):
                piece = re.sub(r"^\s*-\s*", "", piece)
                if not piece.strip():
                    continue
                checked += 1
                if squash(piece) not in sq:
                    missing.append({"kind": kind, "text": piece})
        cp = {k: len(by_prefix.get((k, sid), [])) for k in ("SA", "D", "R", "REF", "A")}
        cprt_sa = [x["text"] for x in by_prefix.get(("SA", sid), [])]
        mine_norm = {norm_cmp(t) for t in flat_actions}
        cprt_unmatched = [t for t in cprt_sa if norm_cmp(t) not in mine_norm]
        report["entries"][sid] = OrderedDict([
            ("pdfPages", [p0, p1]),
            ("itemsChecked", checked),
            ("counts", {"suggestedActions": len(tree), "suggestedActionItemsFlat": len(flat_actions),
                        "transparencyDocumentation": len(tdoc), "transparencyResources": len(tres),
                        "references": len(refs)}),
            ("cprtCounts", {"suggestedActions(SA)": cp["SA"], "documentation(D)": cp["D"],
                            "resources(R)": cp["R"], "references(REF)": cp["REF"], "about(A)": cp["A"]}),
            ("cprtSuggestedActionsNotMatchedVerbatim", cprt_unmatched),
            ("notFoundInPdf", missing),
        ])
        tot["suggestedActions"] += len(tree)
        tot["suggestedActionItemsFlat"] += len(flat_actions)
        tot["transparencyDocumentation"] += len(tdoc)
        tot["transparencyResources"] += len(tres)
        tot["references"] += len(refs)

    ids = [x["id"] for x in entries]
    report["summary"] = OrderedDict([
        ("entries", len(entries)),
        ("coversAll72Subcategories", sorted(ids) == sorted(core)),
        ("statementsDifferingFromAi100_1", [x["id"] for x in entries if not x["statementMatchesAi100_1"]]),
        ("totals", tot),
        ("cprtTotals", {k: sum(len(v) for (kk, _), v in by_prefix.items() if kk == k) for k in ("SA", "D", "R", "REF", "A")}),
        ("itemsCheckedAgainstPdf", sum(v["itemsChecked"] for v in report["entries"].values())),
        ("itemsNotFoundInPdf", sum(len(v["notFoundInPdf"]) for v in report["entries"].values())),
        ("cprtSuggestedActionsNotMatchedVerbatim", sum(len(v["cprtSuggestedActionsNotMatchedVerbatim"]) for v in report["entries"].values())),
    ])
    out = OrderedDict()
    out["source"] = OrderedDict([
        ("documentId", "ai-rmf-playbook-json"),
        ("title", "NIST AI RMF Playbook (machine-readable JSON)"),
        ("publisher", "National Institute of Standards and Technology (Trustworthy & Responsible AI Resource Center)"),
        ("version", "Playbook for AI RMF 1.0; content last revised March 2023 per the AIRC Playbook audit log (August 2023: tagging/formatting only); JSON file Last-Modified 2026-06-11"),
        ("path", "nist-ai-rmf/playbook/playbook.json"),
        ("sha256", sha256(PB_JSON)),
        ("url", "https://airc.nist.gov/docs/playbook.json"),
        ("landingPage", "https://airc.nist.gov/airmf-resources/playbook/"),
        ("pdf", OrderedDict([("documentId", "ai-rmf-playbook-pdf"), ("path", "nist-ai-rmf/playbook/AI_RMF_Playbook.pdf"),
                             ("sha256", sha256(PB_PDF)), ("url", "https://airc.nist.gov/docs/AI_RMF_Playbook.pdf"),
                             ("pageNumbering", "page/pageEnd = 1-based physical pages of AI_RMF_Playbook.pdf spanned by the entry")])),
        ("extraction", "Markdown fields of playbook.json parsed into lists; markdown link targets moved to urls; nested bullets kept inside the parent string as '\\n- ' lines; every item checked for presence in the Playbook PDF pages of its subcategory and compared with the CPRT itemisation (dataset AI_100_1_0_0)"),
    ])
    out["counts"] = OrderedDict([("entries", len(entries)), ("perFunction", {f: sum(1 for x in entries if x["function"] == f) for f in ("GOVERN", "MAP", "MEASURE", "MANAGE")})] + list(tot.items()))
    out["entries"] = entries
    print(json.dumps(report["summary"], indent=1))
    (ROOT / "tools" / "reports").mkdir(exist_ok=True)
    (ROOT / "tools" / "reports" / "playbook-verification.json").write_text(json.dumps(report, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    if not check_only:
        OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        print("wrote", OUT)


if __name__ == "__main__":
    main()
