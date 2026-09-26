#!/usr/bin/env python3
"""Extract NIST COSAiS (SP 800-53 Control Overlays for Securing AI Systems) into cosais.json.

Inputs (relative to corpus/nist-ai-rmf/):
  drafts/NIST-Overlays-SecuringAI-concept-paper.pdf             concept paper (2025-08-14): the five use cases
  drafts/COSAiS-Predictive-AI-annotated-outline-Jan2026.pdf     annotated outline (2026-01-08): the draft
                                                                 "Using and Fine-Tuning Predictive AI" overlay
Cross-checks (read-only; skipped if absent): ../../packages/frameworks/data/nist-sp-800-53-r5.json (control ids,
  titles, catalog order), ../nist-rmf/controls/sp800-53b-control-baselines.xlsx (moderate baseline),
  machine-readable/cprt-AI_TAXONOMY_1_0_0-export.json (NIST AI 100-2 E2025 attack ids, NISTAML.*)
Output: cosais.json and tools/reports/cosais-verification.json

Method: PyMuPDF text layer. Lines are grouped by baseline; running headers/footers are dropped; superscript
footnote markers are removed from the text and the footnotes are kept. The concept paper's use-case tables
are split at the label column (x < 157 pt: Audience | Purpose | Use Case Description). In the outline, the
summary table is read with its geometry: rows between the table's horizontal rules, the five columns at its
vertical rules; a lifecycle-phase checkbox is an 11 pt square drawn as vector graphics and counts as marked
when two diagonal strokes are drawn inside it (the text layer has no checkbox glyphs); an "X" in the
Control Requirement / Organization-Defined Parameter / Discussion column marks that tailoring. Annotation
blocks are split at their bold-italic labels ("Control ID:", "Selected in SP 800-53B Moderate Baseline:",
"Applicable AI Lifecycle Phase(s):", "Assumptions:", "Control Tailoring:", "Relevant NIST AI 100-2e2025
Attack ID:"). Wrapped lines are joined with a space, except after a line-final hyphen or dash that has no
trailing space in the text layer. Paragraphs inside a block are separated by "\\n". Typos are kept.

Usage: python3 tools/extract_cosais.py [--check]
       --check: rebuild in memory and compare with cosais.json and the verification report on disk; write
       nothing; exit status 1 if either differs.
"""
import json
import re
import sys
from collections import Counter, OrderedDict

import pymupdf
from pypdf import PdfReader

from common import ROOT, fix_ligatures, load_manifest_doc, sha256

CONCEPT = ("nist-cosais-concept-paper", ROOT / "drafts" / "NIST-Overlays-SecuringAI-concept-paper.pdf")
OUTLINE = ("nist-cosais-predictive-ai-annotated-outline", ROOT / "drafts" / "COSAiS-Predictive-AI-annotated-outline-Jan2026.pdf")
OUT = ROOT / "cosais.json"
REPORT = ROOT / "tools" / "reports" / "cosais-verification.json"
SP53_JSON = ROOT.parent.parent / "packages" / "frameworks" / "data" / "nist-sp-800-53-r5.json"
BASELINES_XLSX = ROOT.parent / "nist-rmf" / "controls" / "sp800-53b-control-baselines.xlsx"
TAXONOMY_JSON = ROOT / "machine-readable" / "cprt-AI_TAXONOMY_1_0_0-export.json"

PHASES = ["Model Training", "Model Deployment", "Model Maintenance", "Continuous"]
CTRL_PRINTED = re.compile(r"^([A-Z]{2})-(\d{2})(?:\((\d{2})\))?\s*,\s*(.+)$", re.S)
FIELD_LABELS = [
    ("controlId", re.compile(r"^Control ID:\s*")),
    ("selectedInModerateBaseline", re.compile(r"^Selected in SP 800-53B Moderate Baseline:\s*")),
    ("lifecyclePhases", re.compile(r"^Applicable AI Lifecycle Phase\(s\):\s*")),
    ("assumptions", re.compile(r"^Assumptions:\s*")),
    ("controlTailoring", re.compile(r"^Control Tailoring:\s*")),
    ("attackIds", re.compile(r"^Relevant NIST AI 100-2e2025 Attack ID:\s*")),
]
# Use case (concept paper) -> planned NISTIR volume (outline, "Proposed Deliverables and Timeline"); the
# pairing is asserted below against key phrases that must occur in both printed titles.
VOLUME_OF_USE_CASE = {1: ("NISTIR 8605B", "Adapting and Using Generative AI"),
                      2: ("NISTIR 8605A", "Using and Fine-Tuning Predictive AI"),
                      3: ("NISTIR 8605D", "Single Agent"),
                      4: ("NISTIR 8605D", "Multi-Agent"),
                      5: ("NISTIR 8605C", "Security Controls for AI Developers")}
USE_CASE_IDS = {1: "genai-assistant-llm", 2: "predictive-ai-use-finetune", 3: "ai-agents-single-agent",
                4: "ai-agents-multi-agent", 5: "ai-developers"}


def squash_ws(s):
    return re.sub(r"[ \t]+", " ", s).strip()


def natural(s):
    return [int(x) if x.isdigit() else x for x in re.split(r"(\d+)", s)]


def norm_control(fam, num, enh):
    return f"{fam}-{int(num)}" + (f"({int(enh)})" if enh else "")


# ------------------------------------------------------------------------------------------------
# text layer
# ------------------------------------------------------------------------------------------------
def page_lines(doc, pno, markers):
    """Lines of a page (header y < 62 and footer y > 735 dropped), grouped by baseline, left to right.
    Superscript footnote markers are removed and recorded in `markers` as (page, marker, y)."""
    page = doc[pno]
    raw = [s for b in page.get_text("dict")["blocks"] for l in b.get("lines", []) for s in l["spans"] if s["text"].strip()]
    # footnote area: from the first line that starts with a small (<= 7 pt) number at the left margin
    foot_top = min([s["bbox"][1] for s in raw if s["size"] <= 7 and s["text"].strip().isdigit()
                    and s["bbox"][0] < 80 and s["bbox"][1] > 600] or [10 ** 6])
    spans = []
    for s in raw:
        if s["bbox"][1] < 62 or s["bbox"][1] > 735 or s["bbox"][1] >= foot_top - 1:
            continue
        ghost = bool(s["flags"] & 1 and s["size"] < 9 and s["text"].strip().isdigit() and s["bbox"][0] > 80)
        if ghost:                      # superscript footnote marker: removed, but kept for spacing
            markers.append((pno + 1, s["text"].strip(), s["bbox"][1]))
        spans.append({"x0": s["bbox"][0], "x1": s["bbox"][2], "y0": s["bbox"][1], "y1": s["bbox"][3],
                      "base": s["origin"][1] + (2.5 if ghost else 0), "size": s["size"], "font": s["font"],
                      "text": "" if ghost else fix_ligatures(s["text"]), "ghost": ghost})
    spans.sort(key=lambda z: (round(z["base"]), z["x0"]))
    rows = []
    for sp in spans:
        if rows and abs(rows[-1][0]["base"] - sp["base"]) < 2.0:
            rows[-1].append(sp)
        else:
            rows.append([sp])
    groups = []                       # a gap > 20 pt on one baseline separates table columns
    for r in rows:
        r.sort(key=lambda z: z["x0"])
        groups.append([r[0]])
        for sp in r[1:]:
            if sp["x0"] - groups[-1][-1]["x1"] > 20:
                groups.append([sp])
            else:
                groups[-1].append(sp)
    lines = []
    for g in groups:
        g.sort(key=lambda z: z["x0"])
        segs, prev = [], None
        for sp in g:
            t = sp["text"]
            if sp["ghost"]:
                prev = sp
                continue
            if prev is not None and segs and not (segs[-1][0].endswith((" ", "\t")) or t.startswith((" ", "\t"))) and sp["x0"] - prev["x1"] > 1.0:
                t = " " + t
            segs.append((t, "Bold" in sp["font"], sp["font"]))
            prev = sp
        real = [z for z in g if not z["ghost"]]
        if not real:
            continue
        lines.append({"page": pno + 1, "x0": real[0]["x0"], "y0": min(z["y0"] for z in real), "y1": max(z["y1"] for z in real),
                      "size": round(real[0]["size"], 1), "font": real[0]["font"], "text": "".join(t for t, _, _ in segs), "segs": segs})
    return lines


def join_lines(lines, log=None, ctx=""):
    """Join wrapped lines with one space; no space after a line-final hyphen/dash/slash that has no trailing
    space in the text layer (Word does not hyphenate)."""
    out = ""
    for i, ln in enumerate(lines):
        t = ln["text"] if isinstance(ln, dict) else ln
        if i == 0:
            out = t.rstrip()
            continue
        raw_prev = lines[i - 1]["text"] if isinstance(lines[i - 1], dict) else lines[i - 1]
        nxt = t.strip()
        if not raw_prev.endswith((" ", "\t")) and re.search(r"[A-Za-z0-9)][-–—/]$", out):
            if log is not None:
                log.append(OrderedDict([("context", ctx), ("end", out[-40:]), ("next", nxt[:40])]))
            out += nxt
        else:
            out = out.rstrip() + " " + nxt
        out = out.rstrip()
    return squash_ws(out)


def footnotes_of(doc):
    """Footnotes: a line starting with a small (<= 7 pt) number at the left margin in the lower page area,
    followed by its continuation lines."""
    notes = OrderedDict()
    for pno in range(doc.page_count):
        cur = None
        for b in doc[pno].get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                spans = [s for s in l["spans"] if s["text"].strip()]
                if not spans or l["bbox"][1] < 600 or l["bbox"][1] > 735:
                    continue
                first = spans[0]
                if first["size"] <= 7 and first["text"].strip().isdigit() and l["bbox"][0] < 80:
                    cur = first["text"].strip()
                    notes[cur] = {"lines": ["".join(s["text"] for s in spans[1:])], "page": pno + 1}
                elif cur and all(s["size"] <= 10.5 for s in spans):
                    notes[cur]["lines"].append("".join(s["text"] for s in spans))
    return OrderedDict((k, OrderedDict([("text", join_lines(v["lines"])), ("page", v["page"])])) for k, v in notes.items())


def is_bold_italic_label(ln, label_rx):
    """True if the line starts with the label and the label's characters are set in a bold font."""
    m = label_rx.match(ln["text"].lstrip())
    if not m:
        return False
    first = next((f for t, b, f in ln["segs"] if t.strip()), "")
    return "Bold" in first


# ------------------------------------------------------------------------------------------------
# concept paper: the five proposed use cases
# ------------------------------------------------------------------------------------------------
def planned_overlays(doc, joins):
    markers = []
    lines = [ln for pno in range(doc.page_count) for ln in page_lines(doc, pno, markers)]
    heads = [i for i, ln in enumerate(lines) if re.match(r"^Use Case \d: ", ln["text"].strip()) and "Bold" in ln["font"]]
    end = next(i for i, ln in enumerate(lines) if ln["text"].strip().startswith("NIST Overlays Securing AI Slack Channel"))
    out = []
    for k, h in enumerate(heads):
        block = lines[h + 1:(heads[k + 1] if k + 1 < len(heads) else end)]
        m = re.match(r"^Use Case (\d): (.+)$", lines[h]["text"].strip())
        num, title = int(m.group(1)), squash_ws(m.group(2))
        labels = [ln for ln in block if ln["x0"] < 150 and ln["text"].strip() in ("Audience", "Purpose", "Use Case")]
        note_lines = [ln for ln in block if ln["x0"] < 150 and "BoldItalic" in ln["font"]]
        fields = OrderedDict()
        for j, lab in enumerate(labels):
            nxt = labels[j + 1] if j + 1 < len(labels) else None
            content = [ln for ln in block if ln["x0"] >= 155 and (ln["page"], ln["y0"]) >= (lab["page"], lab["y0"] - 1)
                       and (nxt is None or (ln["page"], ln["y0"]) < (nxt["page"], nxt["y0"] - 1))]
            fields[lab["text"].strip()] = content
        # description: lead paragraph, lettered scenarios (x ~162/180) and their lettered sub-items (x ~198/216)
        desc = fields.get("Use Case", [])          # Use Case 5 has no description row
        lead, scenarios, cur, sub = [], [], None, None
        for ln in desc:
            t = ln["text"].strip()
            ms = re.match(r"^([A-Z])\. (.+)$", t)
            mi = re.match(r"^([a-z])\. (.+)$", t)
            if ms and ln["x0"] < 170:
                cur = {"id": ms.group(1), "lines": [dict(ln, text=ln["text"].strip()[3:])], "items": [], "page": ln["page"]}
                scenarios.append(cur)
                sub = None
            elif mi and cur is not None and ln["x0"] > 190:
                sub = [dict(ln)]
                cur["items"].append(sub)
            elif sub is not None and ln["x0"] > 205:
                sub.append(ln)
            elif cur is not None:
                cur["lines"].append(ln)
            else:
                lead.append(ln)
        rec = OrderedDict([("id", USE_CASE_IDS[num]), ("useCase", num), ("title", title),
                           ("description", join_lines(lead, joins, f"use case {num} description") if lead else None),
                           ("audience", join_lines(fields["Audience"], joins, f"use case {num} audience")),
                           ("purpose", join_lines(fields["Purpose"], joins, f"use case {num} purpose"))])
        rec["scenarios"] = []
        for s in scenarios:
            text = join_lines(s["lines"], joins, f"use case {num} scenario {s['id']}")
            if s["items"]:
                text += "\n" + "\n".join(join_lines(it, joins, f"use case {num} scenario {s['id']} item") for it in s["items"])
            rec["scenarios"].append(OrderedDict([("id", s["id"]), ("text", text), ("page", s["page"])]))
        if note_lines:
            rec["note"] = join_lines(note_lines, joins, f"use case {num} note")
        rec["page"] = lines[h]["page"]
        out.append(rec)
    return out


# ------------------------------------------------------------------------------------------------
# outline
# ------------------------------------------------------------------------------------------------
def section(lines, start_rx, stop_rx):
    i = next(k for k, ln in enumerate(lines) if re.match(start_rx, ln["text"].strip()))
    j = next(k for k in range(i + 1, len(lines)) if re.match(stop_rx, lines[k]["text"].strip()))
    return lines[i + 1:j]


def bullets(block, joins, ctx):
    """'- ' bullets (text at x ~108) with 'o ' sub-bullets (x ~126, continuation x ~144) -> strings; sub-bullets
    are kept inside their parent as '\\n- child' (the house style of ai-rmf-playbook.json)."""
    items, cur, sub = [], None, None
    for ln in block:
        t = ln["text"].strip()
        if re.match(r"^-\s", t) and ln["x0"] < 100:
            cur = {"lines": [dict(ln, text=re.sub(r"^-\s*", "", ln["text"].lstrip()))], "subs": [], "page": ln["page"]}
            items.append(cur)
            sub = None
        elif re.match(r"^(o|[A-Z]\.)\s", t) and 120 < ln["x0"] < 135 and cur is not None:
            sub = [dict(ln, text=re.sub(r"^o\s+", "", ln["text"].lstrip()))]     # 'o ' is the bullet glyph; 'A.' is kept
            cur["subs"].append(sub)
        elif sub is not None and ln["x0"] > 138:
            sub.append(ln)
        elif cur is not None:
            cur["lines"].append(ln)
    out = []
    for it in items:
        text = join_lines(it["lines"], joins, ctx)
        for s in it["subs"]:
            text += "\n- " + join_lines(s, joins, ctx)
        out.append((text, it["page"]))
    return out


def summary_table(doc, pages):
    """Rows of the overlay summary table: control as printed, lifecycle checkboxes, tailoring X marks."""
    rows = []
    for pn in pages:
        page = doc[pn - 1]
        hs, vs, boxes, diags = [], [], [], []
        for dr in page.get_drawings():
            for it in dr["items"]:
                if it[0] == "re":
                    r = it[1]
                    if r.height < 2 and r.width > 20:
                        hs.append((r.x0, (r.y0 + r.y1) / 2))
                    elif r.width < 2 and r.height > 5:
                        vs.append((r.x0 + r.x1) / 2)
                    elif 9 < r.width < 13 and 9 < r.height < 13:
                        boxes.append(r)
                elif it[0] == "l":
                    a, b = it[1], it[2]
                    if abs(a.x - b.x) > 3 and abs(a.y - b.y) > 3:
                        diags.append(pymupdf.Rect(min(a.x, b.x), min(a.y, b.y), max(a.x, b.x), max(a.y, b.y)))
                    elif abs(a.y - b.y) < 1 and abs(a.x - b.x) > 20:
                        hs.append((min(a.x, b.x), a.y))
                    elif abs(a.x - b.x) < 1 and abs(a.y - b.y) > 5:
                        vs.append(a.x)
        xs = []
        for x in sorted(vs):
            if not xs or x - xs[-1] > 1.5:
                xs.append(x)
        assert len(xs) == 6, (pn, xs)                 # table borders + 4 inner column rules
        rules = sorted({round(y, 1) for x0, y in hs if abs(x0 - xs[0]) <= 1.5})
        markers = []
        lines = page_lines(doc, pn - 1, markers)
        spans = [s for b in page.get_text("dict")["blocks"] for l in b.get("lines", []) for s in l["spans"] if s["text"].strip() == "X"]
        for ln in lines:
            m = CTRL_PRINTED.match(ln["text"].strip())
            if not (m and ln["x0"] < xs[1]):
                continue
            top = max([y for y in rules if y <= ln["y0"] + 1] or [ln["y0"] - 2])
            bottom = min([y for y in rules if y > ln["y0"] + 5] or [ln["y1"] + 60])
            band = [z for z in lines if top <= (z["y0"] + z["y1"]) / 2 < bottom]
            ctrl_text = join_lines([z for z in band if z["x0"] < xs[1]])
            phases = []
            for z in band:
                if xs[1] <= z["x0"] < xs[2]:
                    label = z["text"].strip()
                    box = next((b for b in boxes if xs[1] - 1 <= b.x0 < z["x0"] and abs(b.y0 - z["y0"]) < 4), None)
                    marked = box is not None and sum(1 for dg in diags if abs(dg.x0 - box.x0) < 1.5 and abs(dg.y0 - box.y0) < 1.5
                                                     and dg.width > 8 and dg.height > 8) >= 2
                    phases.append((label, box is not None, marked))
            marks = [s for s in spans if top <= (s["bbox"][1] + s["bbox"][3]) / 2 < bottom]
            tail = OrderedDict([("controlRequirement", any(xs[2] <= s["bbox"][0] < xs[3] for s in marks)),
                                ("organizationDefinedParameter", any(xs[3] <= s["bbox"][0] < xs[4] for s in marks)),
                                ("discussion", any(xs[4] <= s["bbox"][0] < xs[5] for s in marks))])
            rows.append({"printed": ctrl_text, "phases": phases, "tailoring": tail, "page": pn,
                         "band": [round(top, 1), round(bottom, 1)], "xMarks": len(marks)})
    return rows


def annotations(lines, joins):
    """Annotation blocks: from a 'Control ID:' line to the next one, a family heading (12 pt italic at the
    margin) or the 'Terms and Definitions' heading."""
    starts = [i for i, ln in enumerate(lines) if is_bold_italic_label(ln, FIELD_LABELS[0][1])]
    out = []
    for k, i in enumerate(starts):
        j = i + 1
        while j < len(lines) and j != (starts[k + 1] if k + 1 < len(starts) else -1):
            ln = lines[j]
            if ln["x0"] < 76 and ln["size"] >= 12:        # family heading or next section heading
                break
            j += 1
        block = lines[i:j]
        # paragraphs: a new one starts at a label line, a bracketed tailoring label, a bullet, or a gap > 20 pt
        paras = []
        for n, ln in enumerate(block):
            t = ln["text"].strip()
            prev = block[n - 1] if n > 0 else None
            if prev is not None and ln["page"] != prev["page"]:
                # across a page break a new paragraph is assumed only if the previous page's last line ends a
                # sentence and space was left below it (Word fills the page when a paragraph continues)
                gap = bool(re.search(r"[.!?:”\"]$", prev["text"].strip())) and prev["y1"] < 700
            else:
                gap = prev is not None and ln["y0"] - prev["y1"] > 12
            new = (n == 0 or gap or any(is_bold_italic_label(ln, rx) for _, rx in FIELD_LABELS)
                   or t.startswith("[") or t.startswith("•"))
            if new:
                paras.append([ln])
            else:
                paras[-1].append(ln)
        texts = []
        for p in paras:
            t = join_lines(p, joins, "annotation")
            t = re.sub(r"^•\s*", "- ", t)
            texts.append((t, p[0]))
        fields, cur = OrderedDict(), None
        for t, first in texts:
            key = next((key for key, rx in FIELD_LABELS if is_bold_italic_label(first, rx)), None)
            if key:
                cur = key
                fields[key] = [FIELD_LABELS[[k2 for k2, _ in FIELD_LABELS].index(key)][1].sub("", t)]
            elif cur:
                fields[cur].append(t)
        out.append({"fields": fields, "text": "\n".join(t for t, _ in texts), "page": block[0]["page"], "pageEnd": block[-1]["page"]})
    return out


# ------------------------------------------------------------------------------------------------
def main():
    check_only = "--check" in sys.argv
    joins, report = [], OrderedDict()
    cdoc = pymupdf.open(CONCEPT[1])
    odoc = pymupdf.open(OUTLINE[1])

    # ---------------- sources ------------------------------------------------------------------
    sources = []
    for doc_id, path in (CONCEPT, OUTLINE):
        man = load_manifest_doc(doc_id)
        digest = sha256(path)
        if man:
            assert man["sha256"] == digest, f"manifest sha256 differs for {doc_id}"
        sources.append(OrderedDict([("documentId", doc_id), ("title", man["title"] if man else path.stem),
                                    ("status", "concept paper (pre-draft)" if doc_id == CONCEPT[0] else "annotated outline / discussion draft"),
                                    ("published", man["published"] if man else None), ("path", "nist-ai-rmf/drafts/" + path.name),
                                    ("sha256", digest), ("url", man["url"] if man else None)]))

    # ---------------- concept paper --------------------------------------------------------------
    planned = planned_overlays(cdoc, joins)

    # ---------------- outline ------------------------------------------------------------------
    omarkers = []
    olines = [ln for pno in range(odoc.page_count) for ln in page_lines(odoc, pno, omarkers)]
    ofoot = footnotes_of(odoc)
    big = [ln for ln in olines if ln["page"] == 1 and ln["size"] >= 15]
    title_lines = [big[0]] + [ln for k, ln in enumerate(big[1:], 1) if ln["y0"] - big[k - 1]["y1"] < 8 and all(
        z["y0"] - big[m - 1]["y1"] < 8 for m, z in enumerate(big[1:k + 1], 1))]
    title = join_lines(title_lines, joins, "title")
    subtitle = join_lines([ln for ln in big if ln not in title_lines], joins, "subtitle")
    # publication plan
    plan_block = section(olines, r"^Proposed Deliverables and Timeline$", r"^Background$")
    volumes, timeline = [], []
    for ln in plan_block:
        m = re.match(r"^\d\.\s+(NISTIR 8605[A-D]?), (.+)$", ln["text"].strip())
        if m:
            volumes.append({"identifier": m.group(1), "lines": [dict(ln, text=m.group(2))], "page": ln["page"]})
        elif volumes and ln["x0"] > 100 and not timeline:
            volumes[-1]["lines"].append(ln)
        elif volumes:
            timeline.append(ln)
    volumes = [OrderedDict([("identifier", v["identifier"]), ("title", join_lines(v["lines"], joins, "volume")), ("page", v["page"])]) for v in volumes]
    publication_plan = OrderedDict([("volumes", volumes), ("timeline", join_lines(timeline, joins, "timeline")),
                                    ("page", timeline[0]["page"] if timeline else None), ("documentId", OUTLINE[0])])
    for p in planned:
        ident, phrase = VOLUME_OF_USE_CASE[p["useCase"]]
        vol = next(v for v in volumes if v["identifier"] == ident)
        assert phrase in p["title"] and phrase in vol["title"], (p["title"], vol["title"])
        p["plannedPublication"] = OrderedDict([("identifier", ident), ("title", vol["title"]), ("documentId", OUTLINE[0]), ("page", vol["page"])])
    # development approach and assumptions
    approach = bullets(section(olines, r"^Development Approach and Assumptions$", r"^Overlay Characteristics$"), joins, "approach")
    approach = [(t, pg) for t, pg in approach if not t.startswith("This section will be included")]
    assumptions = [t for t, pg in approach if re.search(r"\bassum", t.split("\n")[0])]
    # overlay characteristics: the two use cases
    char_block = section(olines, r"^Overlay Characteristics$", r"^Applicability$")
    use_cases, cur = [], None
    for ln in char_block:
        m = re.match(r"^([A-Z])\. (.+)$", ln["text"].strip())
        if m and 120 < ln["x0"] < 135:
            cur = {"id": m.group(1), "lines": [dict(ln, text=m.group(2))], "page": ln["page"]}
            use_cases.append(cur)
        elif cur is not None and ln["x0"] > 138:
            cur["lines"].append(ln)
    use_cases = [OrderedDict([("id", u["id"]), ("text", join_lines(u["lines"], joins, "use case")), ("page", u["page"])]) for u in use_cases]
    char_bullets = bullets(char_block, joins, "characteristics")
    use_case_intro = next(t for t, pg in char_bullets if t.startswith("This overlay addresses")).split("\n")[0]
    # lifecycle phases from the proposed example structure
    struct = join_lines(section(olines, r"^Proposed Example Structure for Overlay Controls", r"^How to Use$"), joins, "structure")
    mph = re.search(r"Applicable AI Lifecycle Phase\(s\): \{\(select one or more\): ([^}]+)\}", struct)
    phases = [p.strip() for p in mph.group(1).split(";")]
    assert phases == PHASES, phases
    # reviewer notes around the summary table
    notes = [ln for ln in olines if ln["text"].strip() == "Note to Reviewers"]
    def note_after(head):
        i = olines.index(head)
        body = []
        for ln in olines[i + 1:]:
            if ln["page"] != head["page"] or (body and ln["y0"] - body[-1]["y1"] > 8) or ln["x0"] > 100:
                break
            body.append(ln)
        return join_lines(body, joins, "reviewer note"), head["page"]
    table_note = next(note_after(n) for n in notes if n["page"] == 5)
    complete_note = next(note_after(n) for n in notes if n["page"] == 6)
    # summary table, additional list, annotations
    rows = summary_table(odoc, [5, 6])
    add_block = section(olines, r"^Additional controls and control enhancements proposed for inclusion in this overlay include:$", r"^Access Control$")
    additional, cur = [], None
    for ln in add_block:
        t = ln["text"].strip()
        if re.match(r"^-\s", t):
            cur = {"lines": [dict(ln, text=re.sub(r"^-\s*", "", ln["text"].lstrip()))], "page": ln["page"]}
            additional.append(cur)
        elif cur is not None:
            cur["lines"].append(ln)
    additional = [(join_lines(a["lines"], joins, "additional"), a["page"]) for a in additional]
    ann_lines = [ln for ln in olines if (ln["page"], ln["y0"]) >= (7, 0)]
    anns = annotations(ann_lines[next(i for i, ln in enumerate(ann_lines) if ln["text"].strip() == "Access Control"):], joins)

    # ---------------- cross-check data -------------------------------------------------------------
    sp53 = json.loads(SP53_JSON.read_text(encoding="utf-8")) if SP53_JSON.exists() else None
    nodes = {n["code"]: n for n in sp53["nodes"]} if sp53 else {}
    order = {n["code"]: i for i, n in enumerate(sp53["nodes"])} if sp53 else {}
    moderate, withdrawn = {}, {}
    if BASELINES_XLSX.exists():
        import openpyxl
        ws = openpyxl.load_workbook(BASELINES_XLSX, read_only=True)["SP 800-53B"]
        for row in ws.iter_rows(min_row=2, values_only=True):
            if row and row[1]:
                moderate[str(row[1]).strip()] = str(row[6] or "").strip().lower() == "x"
                if row[3]:
                    withdrawn[str(row[1]).strip()] = str(row[3]).strip()
    taxonomy = {}
    if TAXONOMY_JSON.exists():
        els = json.loads(TAXONOMY_JSON.read_text(encoding="utf-8"))["response"]["elements"]["elements"]
        taxonomy = {e["element_identifier"]: e.get("title") for e in els if e["element_type"] == "taxonomy"}

    # ---------------- controls -------------------------------------------------------------------
    controls = OrderedDict()
    anomalies = []

    def record(printed, page):
        m = CTRL_PRINTED.match(printed)
        cid = norm_control(m.group(1), m.group(2), m.group(3))
        as_printed = f"{m.group(1)}-{m.group(2)}" + (f"({m.group(3)})" if m.group(3) else "")
        rec = controls.get(cid)
        if rec is None:
            rec = OrderedDict([("id", cid), ("idAsPrinted", as_printed), ("title", None), ("titleAsPrinted", OrderedDict()),
                               ("inSummaryTable", False), ("annotated", False), ("proposedAdditional", False),
                               ("lifecyclePhases", None), ("tailoring", None), ("annotation", None), ("page", page)])
            controls[cid] = rec
        return rec, squash_ws(m.group(4))

    for r in rows:
        rec, t = record(r["printed"], r["page"])
        rec["inSummaryTable"] = True
        rec["titleAsPrinted"]["summaryTable"] = t
        labels = [lab for lab, has_box, marked in r["phases"]]
        if labels != PHASES or not all(hb for _, hb, _ in r["phases"]):
            anomalies.append(OrderedDict([("control", rec["id"]), ("problem", "summary-table phase rows not as expected"), ("rows", labels)]))
        rec["lifecyclePhases"] = [lab for lab, hb, marked in r["phases"] if marked]
        rec["tailoring"] = r["tailoring"]
        rec["summaryTablePage"] = r["page"]
    for text, page in additional:
        rec, t = record(text, page)
        rec["proposedAdditional"] = True
        rec["titleAsPrinted"]["additionalList"] = t
        rec["additionalListPage"] = page
    for a in anns:
        f = a["fields"]
        rec, t = record(f["controlId"][0], a["page"])
        rec["annotated"] = True
        rec["titleAsPrinted"]["annotation"] = t
        raw_ids = [x.strip() for x in " ".join(f.get("attackIds", [])).split(",") if x.strip()]
        ids = []
        for x in raw_ids:
            clean = x.rstrip(").;").strip()
            if clean != x:
                anomalies.append(OrderedDict([("control", rec["id"]), ("problem", f"attack id printed as {x!r}; trailing punctuation dropped")]))
            ids.append(clean)
        norm_ids = [re.sub(r"^NIST\s*AML", "NISTAML", x) for x in ids]
        tail_text = "\n".join(f.get("controlTailoring", [])).strip() or None
        sections = []
        for para in (tail_text or "").split("\n"):
            m = re.match(r"^\[([^\]]+)\]\s*(.*)$", para)
            if m and m.group(1) in ("Discussion", "Organization-Defined Parameters", "Control Requirement", "Control Language"):
                sections.append(OrderedDict([("label", m.group(1)), ("text", m.group(2))]))
            elif sections:
                sections[-1]["text"] = (sections[-1]["text"] + "\n" + para).strip()
            elif para:
                sections.append(OrderedDict([("label", None), ("text", para)]))
        rec["annotation"] = OrderedDict([
            ("selectedInModerateBaseline", " ".join(f.get("selectedInModerateBaseline", [])).strip() or None),
            ("lifecyclePhases", [p.strip() for p in " ".join(f.get("lifecyclePhases", [])).split(";") if p.strip()]),
            ("assumptions", "\n".join(f.get("assumptions", [])).strip() or None),
            ("controlTailoring", tail_text),
            ("controlTailoringSections", sections),
            ("attackIds", ids),
            ("attackIdsNormalized", norm_ids),
            ("text", a["text"]),
            ("page", a["page"]), ("pageEnd", a["pageEnd"])])
    for rec in controls.values():
        tp = rec["titleAsPrinted"]
        rec["title"] = tp.get("annotation") or tp.get("additionalList") or tp.get("summaryTable")
        if len(set(tp.values())) == 1:
            rec["titleAsPrinted"] = None
    ordered = sorted(controls.values(), key=lambda r: (order.get(r["id"], 10 ** 6), natural(r["id"])))

    overlay = OrderedDict([
        ("id", "predictive-ai-use-finetune"),
        ("title", title),
        ("subtitle", subtitle),
        ("status", "annotated outline (draft)"),
        ("complete", False),
        ("note", complete_note[0]),
        ("notePage", complete_note[1]),
        ("summaryTableNote", table_note[0]),
        ("documentId", OUTLINE[0]),
        ("plannedPublication", next(p["plannedPublication"] for p in planned if p["id"] == "predictive-ai-use-finetune")),
        ("useCasesIntro", use_case_intro),
        ("useCases", use_cases),
        ("useCasesNote", ofoot.get("3")),
        ("assumptions", assumptions),
        ("developmentApproach", [OrderedDict([("text", t), ("page", pg)]) for t, pg in approach]),
        ("footnotes", ofoot),
        ("lifecyclePhases", phases),
        ("controls", ordered),
    ])

    # ---------------- verification -------------------------------------------------------------------
    report["sources"] = sources
    report["plannedOverlays"] = [OrderedDict([("id", p["id"]), ("title", p["title"]), ("scenarios", len(p["scenarios"])), ("page", p["page"])]) for p in planned]
    c = OrderedDict()
    c["controls"] = len(ordered)
    c["inSummaryTable"] = sum(1 for r in ordered if r["inSummaryTable"])
    c["annotated"] = sum(1 for r in ordered if r["annotated"])
    c["proposedAdditional"] = sum(1 for r in ordered if r["proposedAdditional"])
    c["summaryTableAndAnnotated"] = sum(1 for r in ordered if r["inSummaryTable"] and r["annotated"])
    c["inSummaryTableButNotAnnotated"] = [r["id"] for r in ordered if r["inSummaryTable"] and not r["annotated"]]
    c["annotatedButNotInSummaryTable"] = [r["id"] for r in ordered if r["annotated"] and not r["inSummaryTable"]]
    c["bothInSummaryTableAndAdditionalList"] = [r["id"] for r in ordered if r["inSummaryTable"] and r["proposedAdditional"]]
    c["enhancements"] = sum(1 for r in ordered if "(" in r["id"])
    c["families"] = OrderedDict(sorted(Counter(r["id"][:2] for r in ordered).items()))
    report["counts"] = c
    report["summaryTableRows"] = [OrderedDict([("printed", r["printed"]), ("page", r["page"]), ("band", r["band"]),
                                              ("phases", [OrderedDict([("label", lab), ("checkbox", hb), ("marked", mk)]) for lab, hb, mk in r["phases"]]),
                                              ("tailoring", r["tailoring"]), ("xMarks", r["xMarks"])]) for r in rows]
    v = OrderedDict()
    v["notInSp80053Data"] = [r["id"] for r in ordered if nodes and r["id"] not in nodes]
    v["withdrawn"] = [OrderedDict([("id", r["id"]), ("status", withdrawn[r["id"]])]) for r in ordered if r["id"] in withdrawn]
    title_diffs = []
    for r in ordered:
        n = nodes.get(r["id"])
        if not n:
            continue
        variants = r["titleAsPrinted"] or {"all": r["title"]}
        for where, t in variants.items():
            parts = [p.strip() for p in t.split("|")]
            official = [nodes[r["id"].split("(")[0]]["title"], n["title"]] if "(" in r["id"] else [n["title"]]
            if [p.lower() for p in parts] != [p.lower() for p in official]:
                title_diffs.append(OrderedDict([("id", r["id"]), ("where", where), ("printed", t), ("sp80053", " | ".join(official))]))
    v["titleDifferencesFromSp80053"] = title_diffs
    v["titleComparison"] = "printed 'Base Control | Enhancement' split on '|' and compared case-insensitively with the node titles in nist-sp-800-53-r5.json"
    base = []
    for r in ordered:
        if r["annotation"] and moderate:
            printed = r["annotation"]["selectedInModerateBaseline"]
            actual = "Yes" if moderate.get(r["id"]) else "No"
            base.append(OrderedDict([("id", r["id"]), ("printed", printed), ("sp80053b", actual), ("agrees", printed == actual)]))
    v["moderateBaseline"] = base
    v["additionalControlsAlreadyInModerateBaseline"] = [r["id"] for r in ordered if r["proposedAdditional"] and moderate.get(r["id"])]
    v["attackIds"] = [OrderedDict([("control", r["id"]), ("printed", r["annotation"]["attackIds"]), ("normalized", r["annotation"]["attackIdsNormalized"]),
                                   ("titles", [taxonomy.get(x) for x in r["annotation"]["attackIdsNormalized"]]),
                                   ("notInTaxonomy", [x for x in r["annotation"]["attackIdsNormalized"] if taxonomy and x not in taxonomy])])
                      for r in ordered if r["annotation"]]
    v["distinctAttackIds"] = sorted({x for r in ordered if r["annotation"] for x in r["annotation"]["attackIdsNormalized"]}, key=natural)
    v["phaseAgreement"] = [OrderedDict([("id", r["id"]), ("summaryTable", r["lifecyclePhases"]), ("annotation", r["annotation"]["lifecyclePhases"]),
                                        ("agrees", r["lifecyclePhases"] == r["annotation"]["lifecyclePhases"])])
                           for r in ordered if r["inSummaryTable"] and r["annotation"]]
    tail_agree = []
    for r in ordered:
        if r["inSummaryTable"] and r["annotation"]:
            labs = {s["label"] for s in r["annotation"]["controlTailoringSections"]}
            from_ann = OrderedDict([("controlRequirement", bool(labs & {"Control Requirement", "Control Language"})),
                                    ("organizationDefinedParameter", "Organization-Defined Parameters" in labs),
                                    ("discussion", "Discussion" in labs)])
            tail_agree.append(OrderedDict([("id", r["id"]), ("summaryTable", r["tailoring"]), ("annotationSections", sorted(l for l in labs if l)),
                                           ("agrees", from_ann == r["tailoring"])]))
    v["tailoringAgreement"] = tail_agree
    v["unmarkedCheckboxRows"] = [r["id"] for r in ordered if r["inSummaryTable"] and not r["lifecyclePhases"]]
    # independent check: every extracted text occurs (white space ignored) in pypdf's text of its document
    def squash(t):
        return re.sub(r"\s+", "", t)
    running = [r"^DRAFT ANNOTATED OUTLINE – January 2026\s*$",
               r"^NIST SP 800-53 Control Overlays for Securing AI Systems: Using Predictive AI\s*$",
               r"^Cyber AI Profile Workshop #2\s*\d*\s*$", r"^Control Overlays for Securing AI Systems Concept Paper\s*\d*\s*$", r"^\s*\d{1,2}\s*$"]

    def body(path):              # pypdf text with the running header/footer lines removed
        out = []
        for pg in PdfReader(str(path)).pages:
            out += [ln for ln in (pg.extract_text() or "").split("\n") if not any(re.match(rx, ln) for rx in running)]
        return squash("\n".join(out))
    ctext, otext = body(CONCEPT[1]), body(OUTLINE[1])
    checks, missing = 0, []
    def need(text, blob, where):
        nonlocal checks
        for piece in [x for x in re.split(r"\n(?:- )?", text or "") if x.strip()]:
            checks += 1
            if squash(piece) not in blob:
                missing.append(OrderedDict([("where", where), ("text", piece[:160])]))
    for pov in planned:
        for k in ("title", "description", "audience", "purpose", "note"):
            need(pov.get(k), ctext, f"{pov['id']}.{k}")
        for sc in pov["scenarios"]:
            need(sc["text"], ctext, f"{pov['id']}.scenario {sc['id']}")
    for k in ("title", "subtitle", "note", "summaryTableNote", "useCasesIntro"):
        need(overlay[k], otext, "overlay." + k)
    for u in overlay["useCases"]:
        need(u["text"], otext, "overlay.useCase " + u["id"])
    for t in overlay["assumptions"] + [a["text"] for a in overlay["developmentApproach"]]:
        need(t, otext, "overlay.assumptions/developmentApproach")
    for vol in volumes:
        need(vol["title"], otext, "publicationPlan " + vol["identifier"])
    need(publication_plan["timeline"], otext, "publicationPlan.timeline")
    for r in ordered:
        for where, t in (r["titleAsPrinted"] or {"title": r["title"]}).items():
            need(t, otext, f"{r['id']}.{where}")
        if r["annotation"]:
            need(r["annotation"]["text"], otext, f"{r['id']}.annotation")
    report["pypdfContainment"] = OrderedDict([("piecesChecked", checks), ("notFound", missing),
                                              ("method", "each extracted string (split at its '\\n' paragraph breaks) must occur in pypdf's text of the source PDF (running headers and footers removed), white space ignored; pypdf keeps superscript footnote markers inline, so a string that carried one cannot match")])
    report["verification"] = v
    report["anomalies"] = anomalies
    report["lineJoins"] = joins
    report["outlineFootnotes"] = ofoot
    report["conceptPaperFootnotes"] = footnotes_of(cdoc)

    out = OrderedDict()
    out["sources"] = sources
    out["status"] = ("Pre-draft material: a concept paper and an annotated outline issued for discussion. No COSAiS overlay has been "
                     "published as a draft or final NIST publication; the outline itself says its control list is not complete.")
    out["publicationPlan"] = publication_plan
    out["plannedOverlays"] = planned
    out["overlays"] = [overlay]
    out_s = json.dumps(out, indent=1, ensure_ascii=False) + "\n"
    rep_s = json.dumps(report, indent=1, ensure_ascii=False) + "\n"
    summary = OrderedDict([("plannedOverlays", len(planned)), ("counts", c), ("notInSp80053Data", v["notInSp80053Data"]),
                           ("titleDifferences", len(title_diffs)), ("baselineDisagreements", [b["id"] for b in base if not b["agrees"]]),
                           ("phaseDisagreements", [p["id"] for p in v["phaseAgreement"] if not p["agrees"]]),
                           ("tailoringDisagreements", [p["id"] for p in tail_agree if not p["agrees"]]),
                           ("attackIdsNotInTaxonomy", sorted({x for a in v["attackIds"] for x in a["notInTaxonomy"]})),
                           ("anomalies", len(anomalies)), ("pypdfNotFound", len(missing))])
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
