#!/usr/bin/env python3
"""Build nist-ai-100-2.json: a normalised view of the NIST AI 100-2 E2025 attack taxonomy.

Source   : the CPRT export already in the corpus (nist-ai-rmf/machine-readable/cprt-AI_TAXONOMY_1_0_0-export.json,
           documentId cprt-ai-100-2e2025-export-json). It is referenced, not copied.
Pages    : physical pages of nist-ai-rmf/guides/NIST.AI.100-2e2025.pdf (documentId nist-ai-100-2e2025).
Hierarchy: the 'Predictive AI and Generative AI Taxonomy Index' (PDF pp. x-xi = physical 10-11), which CPRT does not
           carry, plus the errata of 2025-06-03 (nist-ai-100-2e2025-errata) for the GenAI Availability branch.
Texts    : definition paragraphs are copied verbatim from the CPRT section texts and cross-checked against the PDF
           text layer. Report: tools/reports/nist-ai-100-2-verification.json

Usage:  python3 tools/extract_nist_ai_100_2.py [--check]
"""
import difflib
import json
import re
import sys
from collections import OrderedDict

import pymupdf

from common import CORPUS, ROOT, RETRIEVED, fix_ligatures, nist_ai_rmf_doc, norm_cmp, sha256, squash, write_json

CPRT = CORPUS / "nist-ai-rmf" / "machine-readable" / "cprt-AI_TAXONOMY_1_0_0-export.json"
PDF = CORPUS / "nist-ai-rmf" / "guides" / "NIST.AI.100-2e2025.pdf"
ID_RE = re.compile(r"NISTAML\.\d+")
INDEX_PAGES = (10, 11)


def toc_sections(doc):
    """Number the PDF bookmarks like the document (1 Introduction, 2 Predictive AI Taxonomy, 2.1 ...)."""
    out, counters, started = {}, [0, 0, 0], False
    for level, title, page in doc.get_toc():
        if level == 1 and title == "Introduction":
            started = True
        if not started or title.startswith("Appendix"):
            continue
        counters[level - 1] += 1
        for i in range(level, 3):
            counters[i] = 0
        num = ".".join(str(c) for c in counters[:level])
        out[num] = (title, page)
    return out


def parse_index(doc):
    """Parse the taxonomy index: bullets '•' taxonomy, '–' objective (ID), '*' attack (ID)."""
    lines = []
    for p in INDEX_PAGES:
        lines += [l.strip() for l in doc[p - 1].get_text().splitlines()]
    tax, cur_tax, cur_obj = [], None, None
    for l in lines:
        m = re.match(r"•\s*(.+Taxonomy)$", l)
        if m:
            cur_tax = OrderedDict(name=m.group(1), objectives=[])
            tax.append(cur_tax)
            continue
        m = re.match(r"–\s*(.+?)\s*\(ID:\s*(NISTAML\.\d+)\)$", l)
        if m:
            cur_obj = OrderedDict(id=m.group(2), nameInIndex=m.group(1), attacks=[])
            cur_tax["objectives"].append(cur_obj)
            continue
        m = re.match(r"\*\s*(.+?)\s*\(ID:\s*(NISTAML\.\d+)\)$", l)
        if m:
            cur_obj["attacks"].append(OrderedDict(id=m.group(2), nameInIndex=m.group(1)))
    return tax


def paragraphs(text):
    return [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]


def definition_for(section_text, tid):
    """Return (definition paragraph, how) for the first paragraph carrying the ID marker."""
    paras = paragraphs(section_text)
    for i, p in enumerate(paras):
        ids = ID_RE.findall(p)
        if tid in ids and re.search(r"\[[^\]]*" + re.escape(tid) + r"(?![0-9])[^\]]*\]", p):
            rest = re.sub(r"\[[^\]]*NISTAML[^\]]*\]", "", p).strip()
            if not rest:  # marker-only paragraph at the head of the section
                return paras[i + 1], "first paragraph after the section-level ID marker"
            return p, "paragraph carrying the ID marker"
    return None, None


def _tokens(t):
    t = re.sub(r"\u00ad\s*\n\s*", "", t).replace("\u00ad", "")
    t = re.sub(r"\[Back to Index\]", "", t)
    t = re.sub(r"\{\{FIG-[^}]*\}\}", " ", t)
    t = re.sub(r"\[?NISTAML\.\d+[^\]]*\]?", "", t)
    return re.findall(r"[a-z0-9]+", norm_cmp(t))


def word_differences(cprt_text, pdf_raw):
    """Word-level differences between a CPRT paragraph and the PDF text layer (pages page..page+1).
    Splits that fall on a PDF line break (hyphenation) are PDF artefacts and are ignored; a word that CPRT runs
    together where the PDF prints a space on the same line is reported as a CPRT defect."""
    a, b = _tokens(cprt_text), _tokens(pdf_raw)
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    blocks = [m for m in sm.get_matching_blocks() if m.size]
    if not blocks:
        return [{"cprt": " ".join(a[:12]), "pdf": None}]
    lo_b, hi_b = blocks[0].b, blocks[-1].b + blocks[-1].size
    out = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal" or j2 <= lo_b or j1 >= hi_b:
            continue
        ca, pb = " ".join(a[i1:i2]), " ".join(b[j1:j2])
        if ca.replace(" ", "") == pb.replace(" ", "") and len(b[j1:j2]) == 2:
            first, second = b[j1], b[j2 - 1]
            if re.search(re.escape(first) + r"[\u00ad\-]?[ \t]*\n\s*" + re.escape(second), fix_ligatures(pdf_raw).lower()):
                continue  # line-break hyphenation in the PDF
        if not ca and pb.startswith("figure ") and "{{FIG-" in cprt_text:
            continue  # figure text printed where CPRT has a {{FIG-...}} placeholder
        out.append({"cprt": ca, "pdf": pb})
    return out


def main(check=False):
    cprt = json.loads(CPRT.read_text(encoding="utf-8"))["response"]["elements"]
    els = {e["element_identifier"]: e for e in cprt["elements"]}
    doc_meta = cprt["documents"][0]
    pdf = pymupdf.open(PDF)
    toc = toc_sections(pdf)
    pdf_pages = [pg.get_text() for pg in pdf]
    # squashed page texts for verbatim checks: ID markers, '[Back to Index]' links and the running header/footer
    # ('NIST AI 100-2e2025 / March 2025' plus the page number) are removed so that text can be matched across pages
    def body(t):
        t = re.sub(r"^NIST AI 100-2e2025\s*\nMarch 2025\s*\n", "", t)
        return re.sub(r"\n[0-9ivxl]{1,4}\s*\n?$", "\n", t)
    squashed = [re.sub(r"nistaml\d+|backtoindex", "", squash(body(t))) for t in pdf_pages]
    errors, notes = [], []

    # ---------------------------------------------------------------- sections (CPRT domain/category/subcategory)
    kids = {}
    for r in cprt["relationships"]:
        kids.setdefault(r["source_element_identifier"], []).append(r["dest_element_identifier"])

    def sec_key(k):
        return [int(x) for x in k.split(".")]

    sec_ids = sorted((k for k, e in els.items() if e["element_type"] in ("domain", "category", "subcategory")), key=sec_key)
    sections = []
    for k in sec_ids:
        e = els[k]
        pdf_title, page = toc.get(k, (None, None))
        if pdf_title is None:
            errors.append(f"section {k} not in PDF bookmarks")
        else:
            # the bookmark can point to the foot of the previous page: use the page that prints the numbered heading
            head = squash(f"{k}. {pdf_title}")
            printed = [q for q in (page, page + 1) if head in squashed[q - 1]]
            if printed:
                page = printed[0]
            else:
                notes.append(f"section {k}: heading not found on bookmark page {page} or the next")
        tids = sorted({c for c in kids.get(k, []) if els.get(c, {}).get("element_type") == "taxonomy"}, key=lambda x: (len(x), x))
        rec = OrderedDict(id=k, type=e["element_type"], title=e["title"])
        if pdf_title and squash(pdf_title) != squash(e["title"]):
            rec["titleInPdf"] = pdf_title
        rec["parent"] = k.rsplit(".", 1)[0] if "." in k else None
        rec["page"] = page
        rec["taxonomyIds"] = tids
        rec["isMitigation"] = e["title"] == "Mitigations"
        sections.append(rec)
    sec_by_id = {s["id"]: s for s in sections}
    ordered_pages = sorted((s["page"], s["id"]) for s in sections if s["page"])

    def section_page_range(k):
        start = sec_by_id[k]["page"]
        later = [p for p, sid in ordered_pages if p > start and not sid.startswith(k + ".")]
        return start, (min(later) if later else len(pdf_pages))

    # ---------------------------------------------------------------- taxonomy index (hierarchy)
    index = parse_index(pdf)
    if [t["name"] for t in index] != ["Predictive AI Attacks Taxonomy", "Generative AI Attacks Taxonomy"]:
        errors.append("unexpected index structure: " + str([t["name"] for t in index]))
    tax_ids = {"Predictive AI Attacks Taxonomy": "PredAI", "Generative AI Attacks Taxonomy": "GenAI"}
    tax_domain = {"PredAI": "2", "GenAI": "3"}
    errata_fix = OrderedDict(
        taxonomy="GenAI", objective="NISTAML.01",
        asPrinted=["NISTAML.013", "NISTAML.015", "NISTAML.018"], corrected=["NISTAML.016", "NISTAML.017"],
        source="nist-ai-100-2e2025-errata (Errata (potential updates) for NIST AI 100-2e2025, last updated June 3, 2025), item 1",
        status="NIST: 'these proposed corrections are not official changes to the document'")
    taxonomies = []
    for t in index:
        tid = tax_ids[t["name"]]
        objs = []
        for o in t["objectives"]:
            rec = OrderedDict(objective=o["id"], attacks=[a["id"] for a in o["attacks"]])
            if tid == "GenAI" and o["id"] == "NISTAML.01":
                if rec["attacks"] != errata_fix["asPrinted"]:
                    errors.append("GenAI availability branch differs from the errata's 'original' list")
                rec["attacksAsPrinted"] = rec["attacks"]
                rec["attacks"] = errata_fix["corrected"]
                rec["errata"] = errata_fix
            objs.append(rec)
        taxonomies.append(OrderedDict(id=tid, name=t["name"], domainSection=tax_domain[tid], objectives=objs,
                                      indexPage=INDEX_PAGES[0], indexPageEnd=INDEX_PAGES[1]))
    index_names = {}
    for t in index:
        for o in t["objectives"]:
            index_names.setdefault(o["id"], set()).add(o["nameInIndex"])
            for a in o["attacks"]:
                index_names.setdefault(a["id"], set()).add(a["nameInIndex"])

    # ---------------------------------------------------------------- taxonomy elements
    locations = {}
    for s in sections:
        for tid in s["taxonomyIds"]:
            locations.setdefault(tid, []).append(s["id"])
    elements = []
    checks = []
    for tid in sorted((k for k, e in els.items() if e["element_type"] == "taxonomy"), key=lambda x: (x[:10], len(x), x)):
        e = els[tid]
        kind = "objective" if len(tid.split(".")[1]) == 2 else "attack"
        memberships = []
        for t in taxonomies:
            for o in t["objectives"]:
                if kind == "attack" and tid in o["attacks"]:
                    memberships.append(OrderedDict(taxonomy=t["id"], objective=o["objective"]))
                if kind == "attack" and tid in o.get("attacksAsPrinted", []) and tid not in o["attacks"]:
                    memberships.append(OrderedDict(taxonomy=t["id"], objective=o["objective"], onlyAsPrinted=True))
        in_tax = sorted({t["id"] for t in taxonomies for o in t["objectives"] if o["objective"] == tid or tid in o["attacks"]
                         or tid in o.get("attacksAsPrinted", [])}, key=["PredAI", "GenAI"].index)
        defs = []
        for sid in sorted(locations.get(tid, []), key=sec_key):
            text, how = definition_for(els[sid]["text"], tid)
            if text is None:
                errors.append(f"{tid}: no marker paragraph in CPRT section {sid}")
                continue
            lo, hi = section_page_range(sid)
            marker_pages = [p for p in range(lo, hi + 1) if tid in pdf_pages[p - 1] and p not in INDEX_PAGES]
            page = marker_pages[0] if marker_pages else None
            # verbatim check: definition text must occur in the PDF text layer on page..page+1 (ignoring markers)
            # figure placeholders such as {{FIG-3.1.1c}} stand where the PDF prints the figure: check the pieces around them
            probes = [re.sub(r"nistaml\d+", "", squash(piece)) for piece in re.split(r"\{\{FIG-[^}]*\}\}", text)]
            window = "".join(squashed[(page or lo) - 1:(page or lo) + 1])
            found = all(pr in window for pr in probes if pr)
            raw = "".join(body(pdf_pages[q - 1]) for q in range(page or lo, min((page or lo) + 1, len(pdf_pages)) + 1))
            wdiff = word_differences(text, raw)
            checks.append(OrderedDict(id=tid, section=sid, page=page, textInPdf=found, wordDifferences=wdiff))
            if not found:
                notes.append(f"{tid} @ {sid}: CPRT definition text not found verbatim (squashed) in PDF p.{page}-{(page or 0) + 1}")
            d = OrderedDict(section=sid, sectionTitle=els[sid]["title"])
            dom = sid.split(".")[0]
            d["taxonomy"] = {"2": "PredAI", "3": "GenAI"}.get(dom)
            d["page"] = page
            d["text"] = text
            d["textSelection"] = how
            if not found:
                d["pdfCheck"] = "CPRT text differs from the PDF text layer (see tools/reports/nist-ai-100-2-verification.json)"
            if wdiff:
                d["cprtVersusPdf"] = wdiff
            defs.append(d)
        rec = OrderedDict(id=tid, name=e["title"], kind=kind)
        names = sorted(index_names.get(tid, []))
        if names and names != [e["title"]]:
            rec["nameInIndex"] = names if len(names) > 1 else names[0]
        if kind == "attack":
            rec["objectives"] = memberships
        rec["taxonomies"] = in_tax
        rec["description"] = defs[0]["text"] if defs else None
        rec["definitions"] = defs
        elements.append(rec)

    objectives = [x for x in elements if x["kind"] == "objective"]
    attacks = [x for x in elements if x["kind"] == "attack"]
    for x in attacks:
        if not x["objectives"]:
            errors.append(f"{x['id']}: attack not placed in the index hierarchy")

    # ---------------------------------------------------------------- mitigations (document structure)
    mitigations = []
    for s in sections:
        if s["isMitigation"]:
            parent = s["parent"]
            scope = sorted({t for x in sections if x["id"] == parent or (x["parent"] == parent and not x["isMitigation"])
                            for t in x["taxonomyIds"]}, key=lambda v: (len(v), v))
            mitigations.append(OrderedDict(id=s["id"], kind="section", title=s["title"], parentSection=parent,
                                           parentTitle=sec_by_id[parent]["title"], page=s["page"], attackIdsInParentSection=scope,
                                           firstParagraph=paragraphs(els[s["id"]]["text"])[0]))
    for s in sections:
        for p in paragraphs(els[s["id"]]["text"]):
            if re.match(r"Mitigations?\.\s", p):
                page = next((q for q in range(s["page"], s["page"] + 6) if squash(p[:120]) in squashed[q - 1] + squashed[q]), None)
                mitigations.append(OrderedDict(id=s["id"] + "#mitigations", kind="inline-paragraph", title=s["title"],
                                               parentSection=s["id"], parentTitle=s["title"], page=page,
                                               attackIdsInParentSection=s["taxonomyIds"], firstParagraph=p))
    mitigations.sort(key=lambda m: sec_key(m["parentSection"] if m["kind"] == "inline-paragraph" else m["id"]))

    cprt_doc = nist_ai_rmf_doc("cprt-ai-100-2e2025-export-json")
    pdf_doc = nist_ai_rmf_doc("nist-ai-100-2e2025")
    errata_doc = nist_ai_rmf_doc("nist-ai-100-2e2025-errata")
    if cprt_doc["sha256"] != sha256(CPRT) or pdf_doc["sha256"] != sha256(PDF):
        errors.append("CPRT export or PDF does not match the nist-ai-rmf manifest")
    out = OrderedDict()
    out["source"] = OrderedDict(
        documentId="cprt-ai-100-2e2025-export-json",
        manifest="nist-ai-rmf/manifest.json",
        path=cprt_doc["path"], sha256=cprt_doc["sha256"],
        dataset=doc_meta["doc_identifier"], datasetName=doc_meta["name"], datasetVersion=doc_meta["version"],
        datasetReleased=cprt_doc["published"],
        version="NIST AI 100-2 E2025 (March 2025, final); CPRT dataset AI_TAXONOMY_1_0_0 v1.0.0",
        publication=OrderedDict(documentId="nist-ai-100-2e2025", identifier="NIST AI 100-2 E2025",
                                title="Adversarial Machine Learning: A Taxonomy and Terminology of Attacks and Mitigations",
                                published=pdf_doc["published"], path=pdf_doc["path"], sha256=pdf_doc["sha256"],
                                doi="10.6028/NIST.AI.100-2e2025", url=pdf_doc["url"],
                                pageNumbering="page = 1-based physical page of the PDF (the index is printed on pages x-xi = physical 10-11)"),
        errata=OrderedDict(documentId="nist-ai-100-2e2025-errata", path=errata_doc["path"], published=errata_doc["published"]),
        license="Public domain — U.S. Government work (17 U.S.C. §105); not subject to copyright in the United States",
        retrieved=RETRIEVED,
        extraction=("IDs and names from the CPRT 'taxonomy' elements; hierarchy (taxonomy > objective > attack) from the PDF "
                    "taxonomy index with the GenAI availability branch corrected per the errata (the as-printed list is kept); "
                    "definitions are the CPRT section paragraphs that carry each ID marker (for a marker-only section head, the "
                    "section's first paragraph), copied verbatim with the bracketed ID markers kept; section pages from the PDF "
                    "bookmarks. Mitigations are the document's 'Mitigations' sections and inline 'Mitigations.' paragraphs; NIST "
                    "gives them no IDs, so they are keyed by section number."),
    )
    out["counts"] = OrderedDict(taxonomies=len(taxonomies), objectives=len(objectives), attacks=len(attacks),
                                taxonomyElements=len(elements), sections=len(sections),
                                mitigationSections=sum(1 for m in mitigations if m["kind"] == "section"),
                                inlineMitigationParagraphs=sum(1 for m in mitigations if m["kind"] == "inline-paragraph"))
    out["taxonomies"] = taxonomies
    out["objectives"] = objectives
    out["attacks"] = attacks
    out["mitigations"] = mitigations
    out["sections"] = sections

    if len(elements) != 30 or len(objectives) != 5 or len(attacks) != 25:
        errors.append(f"counts {len(elements)}/{len(objectives)}/{len(attacks)} != 30/5/25")
    report = OrderedDict(counts=out["counts"], definitionChecks=checks, notes=notes, errors=errors)
    same = write_json(ROOT / "nist-ai-100-2.json", out, check=check)
    write_json(ROOT / "tools" / "reports" / "nist-ai-100-2-verification.json", report, check=check)
    print(f"nist-ai-100-2.json: {len(objectives)} objectives, {len(attacks)} attacks, {len(sections)} sections, "
          f"{len(mitigations)} mitigation entries; {sum(c['textInPdf'] for c in checks)}/{len(checks)} definitions verbatim in PDF; "
          f"{'unchanged' if same else ('DIFFERS' if check else 'written')}")
    for n in notes:
        print("NOTE", n)
    for e in errors:
        print("ERROR", e)
    return 1 if errors or (check and not same) else 0


if __name__ == "__main__":
    sys.exit(main(check="--check" in sys.argv))
