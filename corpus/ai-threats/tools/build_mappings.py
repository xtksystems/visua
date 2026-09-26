#!/usr/bin/env python3
"""Build mappings.json: only mappings published by an authoritative source, each labelled with its authority.

Inputs (all local): atlas.json, owasp-llm-top10.json, owasp-agentic-top10.json, nist-ai-100-2.json (this corpus);
NIST IR 8596 iprd and the COSAiS outline (corpus/nist-ai-rmf/drafts/); the OWASP GenAI Security Crosswalk files
(owasp-genai-crosswalk/). Target identifiers are validated against the local catalogs (ATLAS 2026.09, CSF 2.0 CPRT
export, SP 800-53 Rev. 5 OSCAL catalog, AI RMF core, AI 600-1 risks, NIST AI 100-2 taxonomy, OWASP lists).

MITRE SAFE-AI (© MITRE, all rights reserved) is parsed into mitre-safe-ai/.local/safe-ai-mappings.json only; its
row count is reported in mappings.json under 'localOnly'. Nothing is composed or inferred: every row is one
published statement.

Usage:  python3 tools/build_mappings.py [--check]
"""
import difflib
import json
import re
import sys
from collections import Counter, OrderedDict

import crosswalk as cw
import nist_drafts as nd
from common import CORPUS, OWASP_LICENSE, RETRIEVED, ROOT, sha256, squash, write_json

PD = "Public domain — U.S. Government work (17 U.S.C. §105)"


def load(p):
    return json.loads(p.read_text(encoding="utf-8"))


# ============================================================================ reference catalogs for validation
def catalogs():
    atlas = load(ROOT / "atlas.json")
    cat = OrderedDict()
    cat["atlas"] = {x["id"]: x.get("fullName", x["name"]) for k in ("tactics", "techniques", "mitigations") for x in atlas[k]}
    csf = load(CORPUS / "nist-csf-2.0" / "machine-readable" / "cprt-CSF_2_0_0-export.json")["response"]["elements"]
    els = csf["elements"]
    wd_ids = {x["element_identifier"] for x in els if x["element_type"] == "withdraw_reason"}
    withdrawn = {r["source_element_identifier"] for r in csf["relationships"] if r["dest_element_identifier"] in wd_ids}
    cat["nist-csf-2.0"] = {x["element_identifier"]: x["text"] for x in els
                           if x["element_type"] == "subcategory" and x["element_identifier"] not in withdrawn}
    cat["nist-csf-2.0-categories"] = {x["element_identifier"]: x["title"] for x in els if x["element_type"] == "category"}
    oscal = load(CORPUS / "nist-rmf" / "oscal" / "NIST_SP-800-53_rev5_catalog.json")["catalog"]
    sp = {}

    def walk(ctrls):
        for c in ctrls:
            m = re.match(r"^([a-z]{2})-(\d+)(?:\.(\d+))?$", c["id"])
            cid = f"{m.group(1).upper()}-{m.group(2)}" + (f"({m.group(3)})" if m.group(3) else "")
            withdrawn_c = any(p.get("name") == "status" and p.get("value") == "withdrawn" for p in c.get("props", []))
            sp[cid] = (c["title"], withdrawn_c)
            walk(c.get("controls", []))
    for g in oscal["groups"]:
        walk(g.get("controls", []))
    cat["nist-sp-800-53-r5"] = {k: v[0] for k, v in sp.items() if not v[1]}
    cat["nist-sp-800-53-r5-withdrawn"] = {k: v[0] for k, v in sp.items() if v[1]}
    core = load(CORPUS / "nist-ai-rmf" / "ai-rmf-core.json")
    cat["nist-ai-rmf"] = {x["id"]: x["text"] for k in ("categories", "subcategories") for x in core[k]}
    gai = load(CORPUS / "nist-ai-rmf" / "genai-profile.json")
    cat["nist-ai-600-1"] = {x["id"]: x["title"] for x in gai["risks"]}
    aml = load(ROOT / "nist-ai-100-2.json")
    cat["nist-ai-100-2"] = {x["id"]: x["name"] for x in aml["objectives"] + aml["attacks"]}
    llm = load(ROOT / "owasp-llm-top10.json")
    cat["owasp-llm-top10"] = {x["key"]: x["title"] for x in llm["risks"]}
    asi = load(ROOT / "owasp-agentic-top10.json")
    cat["owasp-agentic-top10"] = {x["id"]: x["title"] for x in asi["risks"]}
    return cat, atlas, llm, asi, aml


# ============================================================================ cross-checks with corpus/nist-ai-rmf
def ir8596_cross_check(ir_rows, ir_doc):
    """Compare with the independent Cyber AI Profile extraction in corpus/nist-ai-rmf/cyber-ai-profile.json
    (row bands from the table rules instead of subcategory tokens): the (subcategory, focus area, id) sets for ATLAS
    and OWASP LLM references, the document-level references, and every reference list (letters and digits only)."""
    path = CORPUS / "nist-ai-rmf" / "cyber-ai-profile.json"
    if not path.exists():
        return None
    cp = load(path)
    theirs, their_doc, their_lists = Counter(), Counter(), {}
    for e in cp["entries"]:
        for r in e["refs"]:
            if r["scheme"] == "atlas" and r["id"]:
                theirs[(e["subcategory"], r["column"], r["id"])] += 1
            elif r["scheme"] == "owasp-llm":
                theirs[(e["subcategory"], r["column"], r["id"] + ":2025")] += 1
            elif r["scheme"] in ("atlas", "nist-ai-100-2"):
                their_doc[(e["subcategory"], r["column"], r["scheme"])] += 1
        for col in ("secure", "defend", "thwart"):
            refs = e["focus"][col].get("references") or []
            if refs:
                their_lists[(e["subcategory"], col)] = squash("".join(refs))
    mine = Counter((x["csf"], x["focusArea"].lower(), x["id"]) for x in ir_rows)
    mine_doc = Counter((x["csf"], x["focusArea"].lower(), x["targetScheme"]) for x in ir_doc)
    my_lists = {(x["csf"], x["focusArea"].lower()): squash(x["references"]) for x in ir_rows}
    list_diff = sorted(k for k, v in my_lists.items() if their_lists.get(k) != v)
    return OrderedDict(file="nist-ai-rmf/cyber-ai-profile.json", sha256=sha256(path),
                       elementReferences=sum(mine.values()), documentLevelReferences=sum(mine_doc.values()),
                       onlyHere=sorted(map(list, mine - theirs)), onlyThere=sorted(map(list, theirs - mine)),
                       documentLevelOnlyHere=sorted(map(list, mine_doc - their_doc)),
                       documentLevelOnlyThere=sorted(map(list, their_doc - mine_doc)),
                       referenceListsCompared=len(my_lists), referenceListsDiffering=[list(k) for k in list_diff],
                       identical=not (mine - theirs or theirs - mine or mine_doc - their_doc or their_doc - mine_doc or list_diff))


def cosais_cross_check(cosais_rows):
    """Compare the (control, attack id) pairs with corpus/nist-ai-rmf/cosais.json (annotation.attackIdsNormalized)."""
    path = CORPUS / "nist-ai-rmf" / "cosais.json"
    if not path.exists():
        return None
    cs = load(path)
    theirs = {(c["id"], t) for ov in cs["overlays"] for c in ov["controls"] if c.get("annotation")
              for t in c["annotation"].get("attackIdsNormalized") or []}
    mine = {(r["source"]["id"], r["target"]["id"]) for r in cosais_rows}
    return OrderedDict(file="nist-ai-rmf/cosais.json", sha256=sha256(path), pairs=len(mine),
                       onlyHere=sorted(map(list, mine - theirs)), onlyThere=sorted(map(list, theirs - mine)),
                       identical=mine == theirs)


def known(cat, scheme, tid):
    if scheme not in cat or tid is None:
        return None
    return tid in cat[scheme]


def row(source, target, relationship, authority, documentId, locator, status, **extra):
    r = OrderedDict(source=source, target=target, relationship=relationship)
    for k in ("strength",):
        if k in extra:
            r[k] = extra.pop(k)
    r["authority"] = authority
    r["status"] = status
    r["documentId"] = documentId
    r["locator"] = locator
    for k, v in extra.items():
        if v is not None:
            r[k] = v
    return r


def ref(scheme, id_, **kw):
    d = OrderedDict(scheme=scheme, id=id_)
    for k, v in kw.items():
        if v is not None:
            d[k] = v
    return d


def title_match(a, b):
    na, nb = squash(a.replace("&", "and")), squash(b.replace("&", "and"))
    if na == nb:
        return "exact"
    if na in nb or nb in na or difflib.SequenceMatcher(None, na, nb).ratio() >= 0.8:
        return "close"
    return "different"


# ============================================================================ main
def main(check=False):
    cat, atlas, llm, asi, _aml = catalogs()
    rows, excluded, problems = [], [], []

    # ---------------------------------------------------------------- 1. MITRE ATLAS data
    for m in atlas["mitigations"]:
        for u in m["techniques"]:
            rows.append(row(ref("atlas", m["id"], label=m["name"]), ref("atlas", u["id"], label=cat["atlas"].get(u["id"])),
                            "mitigates", "mitre-atlas-2026.09", "mitre-atlas-2026-09-yaml",
                            f"relationships['{m['id']}'].mitigates → {u['id']}", "final", text=u["use"]))
    for k in ("tactics", "techniques", "mitigations"):
        for x in atlas[k]:
            if "attackReference" in x:
                rows.append(row(ref("atlas", x["id"], label=x["name"]), ref("mitre-attack", x["attackReference"]["id"],
                                                                              url=x["attackReference"]["url"]),
                                "attack-reference", "mitre-atlas-2026.09", "mitre-atlas-2026-09-yaml",
                                f"{k}['{x['id']}']['attack-reference']", "final"))

    # ---------------------------------------------------------------- 2. OWASP LLM Top 10 2026, Appendix A
    fw_version = {f["framework"]: f["version"] for f in llm["appendixA2026"]["frameworks"]}
    for r in llm["risks"]:
        if r["edition"] != "2026":
            continue
        for f in r["relatedFrameworks"]:
            tgt = ref(f["targetScheme"], f["id"], label=f["element"], frameworkVersion=fw_version.get(f["framework"]))
            loc = f"Appendix A: Related Framework Mappings — {f['framework']}, row {r['id']}"
            chk = OrderedDict(targetKnown=known(cat, f["targetScheme"], f["id"]))
            if f["targetScheme"] == "atlas" and f["id"] in cat["atlas"]:
                chk["targetNameNow"] = cat["atlas"][f["id"]]    # the appendix was mapped against ATLAS v2026.06
            rows.append(row(ref("owasp-llm-top10", r["key"], label=r["title"]), tgt, "related-framework-mapping",
                            "owasp-llm-top10-2026", "owasp-llm-top10-2026-pdf", loc, "final", strength=f["strength"],
                            page=f["page"], pageEnd=f.get("pageEnd"), text=f["text"], checks=chk))

    # ---------------------------------------------------------------- 3. OWASP LLM Top 10 2025, Related Frameworks
    for r in llm["risks"]:
        if r["edition"] != "2025":
            continue
        for f in r["relatedFrameworks"]:
            ids = f.get("ids") or ([f["id"]] if f.get("id") else [])
            if not ids:
                for pat, scheme in ((r"CWE-\d+", "cwe"), (r"ML\d\d:2023", "owasp-ml-top10"), (r"API\d:2023", "owasp-api-top10")):
                    m = re.search(pat, f["text"])
                    if m:
                        ids, f_scheme = [m.group(0)], scheme
                        break
                else:
                    excluded.append(OrderedDict(authority="owasp-llm-top10-2025", source=r["key"], text=f["text"],
                                                reason="no element-level identifier (framework-level reference)"))
                    continue
            else:
                f_scheme = "atlas"
            for tid in ids:
                chk = OrderedDict(targetKnown=known(cat, f_scheme, tid))
                if f_scheme == "atlas" and tid in cat["atlas"]:
                    chk["targetNameNow"] = cat["atlas"][tid]
                rows.append(row(ref("owasp-llm-top10", r["key"], label=r["title"]),
                                ref(f_scheme, tid, idSource=f.get("idSource")), "related-framework",
                                "owasp-llm-top10-2025", "owasp-llm-top10-2025-pdf",
                                f"{r['key']} {r['title']} — Related Frameworks and Taxonomies", "superseded",
                                page=f["page"], text=f["text"], checks=chk))

    # ---------------------------------------------------------------- 4. OWASP Agentic Top 10 2026, Appendix A
    for r in asi["risks"]:
        for f in r["relatedFrameworks"]:
            tgt = ref(f["targetScheme"], f["id"], label=None if f["id"] else f["text"], idAsPrinted=f.get("idAsPrinted"))
            rows.append(row(ref("owasp-agentic-top10", r["id"], label=r["title"]), tgt, "cross-mapping",
                            "owasp-agentic-top10-2026", "owasp-agentic-top10-2026-pdf",
                            f"Appendix A - OWASP Agentic AI Security Mapping Matrix, row {r['id']}, column '{f['column']}'",
                            "final", page=f["page"], pageEnd=f.get("pageEnd"), text=f["text"],
                            checks=OrderedDict(targetKnown=known(cat, f["targetScheme"], f["id"]))))

    # ---------------------------------------------------------------- 5. NIST IR 8596 iprd (Cyber AI Profile)
    ir_rows, ir_doc = nd.ir8596_references()
    for x in ir_rows:
        chk = OrderedDict(sourceKnown=known(cat, "nist-csf-2.0", x["csf"]), targetKnown=known(cat, x["targetScheme"], x["id"]))
        if x["targetScheme"] == "atlas" and x["id"] in cat["atlas"]:
            chk["targetNameNow"] = cat["atlas"][x["id"]]
        rows.append(row(ref("nist-csf-2.0", x["csf"]), ref(x["targetScheme"], x["id"], idAsPrinted=x["asPrinted"], note=x.get("note")),
                        "example-informative-reference", "nist-ir-8596-iprd", "nist-ir-8596-iprd",
                        f"Cyber AI Profile tables (Sec. 2.3-2.8), {x['csf']}, focus area '{x['focusArea']}' — Example Informative References",
                        "draft", page=x["page"],
                        context=OrderedDict(focusArea=x["focusArea"], proposedPriority=x["proposedPriority"],
                                            referencesAsPrinted=x["references"]), checks=chk))
    for x in ir_doc:
        excluded.append(OrderedDict(authority="nist-ir-8596-iprd", source=x["csf"], focusArea=x["focusArea"],
                                    targetScheme=x["targetScheme"], text=x["asPrinted"], page=x["page"],
                                    reason="document-level reference: cites the whole publication, no element identifier"))
    cross_checks = OrderedDict(nistIr8596=ir8596_cross_check(ir_rows, ir_doc), cosais=None)

    # ---------------------------------------------------------------- 6. NIST COSAiS annotated outline
    for x in nd.cosais_references():
        cid = nd.sp80053_id(x["control"])
        for aid in x["attackIds"]:
            rows.append(row(ref("nist-sp-800-53-r5", cid, idAsPrinted=x["control"], label=x["controlTitleAsPrinted"]),
                            ref("nist-ai-100-2", aid, label=cat["nist-ai-100-2"].get(aid)),
                            "relevant-attack", "nist-cosais-outline", "nist-cosais-predictive-ai-annotated-outline",
                            f"Control ID: {x['control']} — 'Relevant NIST AI 100-2e2025 Attack ID: {x['asPrinted']}'", "draft",
                            page=x["attackLinePage"],
                            checks=OrderedDict(sourceKnown=known(cat, "nist-sp-800-53-r5", cid),
                                               targetKnown=known(cat, "nist-ai-100-2", aid))))

    cross_checks["cosais"] = cosais_cross_check([r for r in rows if r["authority"] == "nist-cosais-outline"])
    for k, v in cross_checks.items():
        if v and not v["identical"]:
            problems.append(f"{k}: differs from the independent extraction in corpus/nist-ai-rmf ({v['file']})")

    # ---------------------------------------------------------------- 7. NIST AI 100-2 E2025 citations of ATLAS mitigations
    # p. 62, 'Usage restrictions': "... [250]. Additionally, limiting the release of public information [252, 266] and
    # artifacts [249] and restricting the total number of model queries available to users [251] ..."; the
    # bibliography (p. 99) resolves each number to an ATLAS mitigation ('[249] MITRE ATLAS. AML.M0001: ...')
    cites = [("AML.M0002", "[250]"), ("AML.M0000", "[252]"), ("AML.M0001", "[249]"), ("AML.M0004", "[251]")]
    pdf_text, bib_text = _ai1002_page(62), _ai1002_page(99)
    for mid, refno in cites:
        if not re.search(r"\[[^\]]*\b" + refno.strip("[]") + r"\b[^\]]*\]", pdf_text):
            problems.append(f"AI 100-2 p.62 no longer cites {refno}")
        if not re.search(re.escape(refno) + r"\s*MITRE ATLAS\.\s*" + re.escape(mid) + ":", bib_text):
            problems.append(f"AI 100-2 p.99: reference {refno} is not ATLAS {mid}")
        rows.append(row(ref("nist-ai-100-2", "NISTAML.018", label=cat["nist-ai-100-2"]["NISTAML.018"]),
                        ref("atlas", mid, label=cat["atlas"].get(mid)), "mitigation-cites", "nist-ai-100-2e2025",
                        "nist-ai-100-2e2025",
                        f"Sec. 3.3.3 Mitigations (Direct Prompting Attacks and Mitigations [NISTAML.018]), 'Usage restrictions', reference {refno}",
                        "final", page=62, checks=OrderedDict(targetKnown=known(cat, "atlas", mid))))

    # ---------------------------------------------------------------- 8. OWASP GenAI Security Crosswalk
    official = {"owasp-llm-top10": {r["id"]: r["title"] for r in llm["risks"] if r["edition"] == "2026"},
                "owasp-agentic-top10": {r["id"]: r["title"] for r in asi["risks"]}}
    cw_files = OrderedDict()
    for rel, (src_scheme, tgt_scheme, fw) in cw.FILES.items():
        parsed = cw.parse_file(rel)
        kept = 0
        entry_match = {p["entryId"]: title_match(p["entryTitle"], official[src_scheme].get(p["entryId"])) for p in parsed}
        # a file whose entries mostly carry other titles is keyed to a different list: exclude all of its rows
        file_mismatch = sum(1 for v in entry_match.values() if v == "different") >= len(entry_match) / 2
        for p in parsed:
            official_title = official[src_scheme].get(p["entryId"])
            tm = entry_match[p["entryId"]]
            if file_mismatch and tm != "exact":
                tm = "different"
            cells = p["row"]
            label_key = next(k for k in cells if k not in ("ID", "Function", "Family", "Tactic", "Description",
                                                              "How it applies", "Agentic context"))
            text_key = next(k for k in cells if k in ("How it applies", "Description", "Agentic context"))
            raw_id = cells["ID"]
            if tgt_scheme == "atlas":
                tid = cw.atlas_id(raw_id)
            elif tgt_scheme == "nist-ai-rmf":
                tid = cw.ai_rmf_id(raw_id)
            else:
                tid = raw_id.strip()
            src_key = f"{p['entryId']}:2026" if src_scheme == "owasp-llm-top10" else p["entryId"]
            chk = OrderedDict(entryTitleAsPublished=p["entryTitle"], entryTitleMatch=tm,
                              targetKnown=known(cat, tgt_scheme, tid))
            # label checks: 'exact' / 'close' (same after '&' -> 'and', one contained in the other, or >= 80 % similar)
            # / 'different'
            if tgt_scheme == "atlas" and tid in cat["atlas"]:
                chk["targetNameNow"] = cat["atlas"][tid]
                chk["labelMatch"] = title_match(cells[label_key], cat["atlas"][tid])
            if tgt_scheme == "nist-csf-2.0" and tid:
                catname = cat["nist-csf-2.0-categories"].get(tid.split("-")[0])
                chk["categoryNow"] = catname
                # only the category can be checked: the crosswalk labels a subcategory with its category name
                chk["categoryLabelMatch"] = title_match(cells[label_key].replace("Organisational", "Organizational"),
                                                        catname) if catname else None
            if tgt_scheme == "nist-sp-800-53-r5" and tid in cat["nist-sp-800-53-r5"]:
                base_label = cells[label_key].split(" — ")[0]
                chk["targetTitleNow"] = cat["nist-sp-800-53-r5"][tid]
                chk["labelMatch"] = title_match(base_label, cat["nist-sp-800-53-r5"][tid])
            if tgt_scheme == "nist-ai-rmf":
                chk["labelSource"] = "crosswalk-authored (AI RMF subcategories have no titles)"
            if tm == "different":
                excluded.append(OrderedDict(authority="owasp-genai-crosswalk", file=rel, source=src_key,
                                            entryTitleAsPublished=p["entryTitle"], officialTitle=official_title,
                                            target=tid, reason=("the file's entries are keyed to a different ASI list than the "
                                                                "published OWASP Top 10 for Agentic Applications 2026"
                                                                if file_mismatch else
                                                                "the crosswalk entry is keyed to a different risk definition "
                                                                "than the published OWASP entry with this ID")))
                continue
            draft = re.search(r"\*\*(DRAFT\b[^*]*)\*\*", " | ".join(cells.values()))
            if draft:
                # the crosswalk itself flags the row as wrong and pending review
                excluded.append(OrderedDict(authority="owasp-genai-crosswalk", file=rel, source=src_key, target=tid,
                                            label=cells[label_key], line=p["line"],
                                            reason=f"the crosswalk marks this row '{draft.group(1).strip()}'"))
                continue
            kept += 1
            rows.append(row(ref(src_scheme, src_key, label=official_title),
                            ref(tgt_scheme, tid, idAsPrinted=raw_id if raw_id != tid else None, label=cells[label_key]),
                            "maps-to", "owasp-genai-crosswalk", "owasp-genai-crosswalk-" + rel.split("/")[1][:-3].lower().replace("_", "-"),
                            f"{rel} ({p['entryId']} — {p['entryTitle']}; table '{p['table']}'), line {p['line']}",
                            "unreviewed", text=cells[text_key],
                            context=OrderedDict((k, v) for k, v in cells.items() if k in ("Function", "Family", "Tactic")),
                            checks=chk))
        cw_files[rel] = OrderedDict(framework=fw, rows=len(parsed), included=kept, excluded=len(parsed) - kept)

    # ---------------------------------------------------------------- SAFE-AI (local only)
    local_only = OrderedDict()
    safe_path = ROOT / "mitre-safe-ai" / ".local" / "SAFEAI_Full_Report.pdf"
    if safe_path.exists():
        import safe_ai
        threats = safe_ai.table1()
        srows = []
        for t in threats:
            for a in t["relatedAtlas"]:
                srows.append(row(ref("mitre-safe-ai-threat", t["threat"]), ref("atlas", a["id"], label=a["nameAsPrinted"]),
                                 "related-atlas-id", "mitre-safe-ai", "mitre-safe-ai-report",
                                 "Appendix C, Table 1 'Threats and Concerns', column 'Related ATLAS ID'", "final",
                                 page=t["page"], checks=OrderedDict(targetKnown=known(cat, "atlas", a["id"]),
                                                                    targetNameNow=cat["atlas"].get(a["id"]))))
            for elem, ctrls in t["controls"].items():
                for c in ctrls:
                    srows.append(row(ref("mitre-safe-ai-threat", t["threat"]), ref("nist-sp-800-53-r5", c["id"], idAsPrinted=c["asPrinted"]),
                                     "control-for-threat", "mitre-safe-ai", "mitre-safe-ai-report",
                                     f"Appendix C, Table 1 'Threats and Concerns', column '{elem}'", "final",
                                     page=t["page"], pageEnd=t["pageEnd"] if t["pageEnd"] != t["page"] else None,
                                     context=OrderedDict(systemElement=elem),
                                     checks=OrderedDict(targetKnown=known(cat, "nist-sp-800-53-r5", c["id"]))))
        safe_doc = OrderedDict(
            note=("LOCAL ONLY — derived from MITRE SAFE-AI (MP250397), '©2025 The MITRE Corporation. All rights reserved. "
                  "Approved for Public Release; Distribution Unlimited. Public Release Case Number 25-1028.' Not "
                  "redistributable: kept under a git-ignored .local/ folder."),
            source=OrderedDict(documentId="mitre-safe-ai-report", path="ai-threats/mitre-safe-ai/.local/SAFEAI_Full_Report.pdf",
                               sha256=sha256(safe_path)),
            counts=OrderedDict(threats=len(threats), rows=len(srows),
                               threatAtlasLinks=sum(1 for r in srows if r["relationship"] == "related-atlas-id"),
                               threatControlLinks=sum(1 for r in srows if r["relationship"] == "control-for-threat")),
            threats=threats, mappings=srows)
        write_json(ROOT / "mitre-safe-ai" / ".local" / "safe-ai-mappings.json", safe_doc, check=check)
        local_only["mitre-safe-ai"] = OrderedDict(path="ai-threats/mitre-safe-ai/.local/safe-ai-mappings.json",
                                                  rows=len(srows), threats=len(threats),
                                                  reason="© MITRE, all rights reserved; not redistributable")
    else:
        local_only["mitre-safe-ai"] = OrderedDict(path="ai-threats/mitre-safe-ai/.local/safe-ai-mappings.json", rows=None,
                                                  reason="source PDF not present in this checkout (git-ignored)")

    # ---------------------------------------------------------------- checks and output
    unknown = [r for r in rows if r.get("checks", {}).get("targetKnown") is False or r.get("checks", {}).get("sourceKnown") is False]
    by_auth = Counter(r["authority"] for r in rows)
    by_pair = Counter((r["authority"], r["source"]["scheme"], r["target"]["scheme"]) for r in rows)
    out = OrderedDict()
    out["description"] = ("Mappings between AI threat catalogs and requirements, restricted to statements published by an "
                          "authoritative source. One row = one published link; nothing is composed or inferred. Direction "
                          "is as published (source → target). Filter by 'authority' and 'status' before display: "
                          "'final' rows come from final publications or data releases, 'draft' rows from NIST drafts, "
                          "'superseded' rows from the OWASP LLM Top 10 2025, and 'unreviewed' rows from the OWASP GenAI "
                          "Security Crosswalk, whose own schema marks them as not reviewed by a named person.")
    out["generated"] = RETRIEVED
    out["license"] = ("Mixed. Identifiers and relationships are facts. Row 'text' fields are verbatim from the authority's "
                      "publication and keep its license (see authorities[].license): ATLAS texts Apache-2.0 (© MITRE); "
                      "OWASP texts CC BY-SA 4.0 (attribution to the OWASP GenAI Security Project; adaptations must be "
                      "shared alike); NIST texts public domain.")
    out["authorities"] = authorities(cw_files)
    out["counts"] = OrderedDict(total=len(rows), byAuthority=OrderedDict(sorted(by_auth.items())),
                                byAuthorityAndSchemes=[OrderedDict(authority=a, source=s, target=t, rows=n)
                                                       for (a, s, t), n in sorted(by_pair.items())],
                                excluded=len(excluded), unknownIdentifiers=len(unknown))
    out["localOnly"] = local_only
    out["excluded"] = excluded
    out["mappings"] = rows
    same = write_json(ROOT / "mappings.json", out, check=check)
    report = OrderedDict(counts=out["counts"], crosswalkFiles=cw_files,
                         unknownIdentifiers=[OrderedDict(authority=r["authority"], source=r["source"], target=r["target"],
                                                         checks=r["checks"]) for r in unknown],
                         crosswalkLabelMatch=OrderedDict(
                             (sch, dict(Counter(r["checks"].get("labelMatch") or r["checks"].get("categoryLabelMatch")
                                                for r in rows if r["authority"] == "owasp-genai-crosswalk"
                                                and r["target"]["scheme"] == sch)))
                             for sch in ("atlas", "nist-csf-2.0", "nist-sp-800-53-r5")),
                         crossChecks=cross_checks, problems=problems)
    write_json(ROOT / "tools" / "reports" / "mappings-report.json", report, check=check)
    print(f"mappings.json: {len(rows)} rows; excluded {len(excluded)}; unknown identifiers {len(unknown)}")
    for a, n in sorted(by_auth.items()):
        print(f"  {a:28s} {n}")
    print(f"  local only: {local_only}")
    for p in problems:
        print("PROBLEM", p)
    return 1 if problems or (check and not same) else 0


def _ai1002_page(p):
    import pymupdf
    return pymupdf.open(CORPUS / "nist-ai-rmf" / "guides" / "NIST.AI.100-2e2025.pdf")[p - 1].get_text()


def authorities(cw_files):
    return OrderedDict([
        ("mitre-atlas-2026.09", OrderedDict(
            name="MITRE ATLAS data, release 2026.09 (2026-09-15)", publisher="The MITRE Corporation", kind="catalog-data",
            status="final", documentIds=["mitre-atlas-2026-09-yaml"], license="Apache-2.0 (Copyright 2021-2026 MITRE)",
            relationships={"mitigates": "ATLAS mitigation → ATLAS technique; text = the mitigation's use for that technique",
                           "attack-reference": "ATLAS object → the MITRE ATT&CK object it references ('attack-reference')"})),
        ("owasp-llm-top10-2026", OrderedDict(
            name="OWASP Top 10 for LLM Applications 2026 (v1.0), Appendix A: Related Framework Mappings",
            publisher="OWASP GenAI Security Project", kind="publication", status="final",
            documentIds=["owasp-llm-top10-2026-pdf"], license=OWASP_LICENSE,
            notes=("Coarse-level mappings (ATLAS and ATT&CK tactics, AI RMF categories, AI 600-1 risk categories, CWE, CSA "
                   "AICM domains, AIVSS core risks, OWASP ASI/DSGAI entries), each marked primary (●) or supporting (○), pinned "
                   "to the framework versions in 'Framework Sources & Versions' (ATLAS content v2026.06: tactic AML.TA0001 is "
                   "printed as 'AI Attack Staging', renamed 'AI Attack Adaptation' in ATLAS 2026.08)."))),
        ("owasp-llm-top10-2025", OrderedDict(
            name="OWASP Top 10 for LLM Applications 2025, 'Related Frameworks and Taxonomies' sections",
            publisher="OWASP GenAI Security Project", kind="publication", status="superseded (by the 2026 edition)",
            documentIds=["owasp-llm-top10-2025-pdf"], license=OWASP_LICENSE,
            notes=("Technique-level ATLAS references written against ATLAS 4.x (2024): several names have since changed "
                   "('ML' → 'AI'); targetNameNow gives the 2026.09 name. Framework-level references without an element "
                   "identifier are listed under 'excluded'."))),
        ("owasp-agentic-top10-2026", OrderedDict(
            name="OWASP Top 10 for Agentic Applications 2026, Appendix A - OWASP Agentic AI Security Mapping Matrix",
            publisher="OWASP GenAI Security Project — Agentic Security Initiative", kind="publication", status="final",
            documentIds=["owasp-agentic-top10-2026-pdf"], license=OWASP_LICENSE,
            notes=("Maps ASI entries to OWASP LLM Top 10 2025 entries, OWASP Agentic AI Threats & Mitigations T-codes and "
                   "AIVSS core risks (named without identifiers; id is null). No ATLAS or NIST mapping is published for the "
                   "Agentic Top 10."))),
        ("nist-ir-8596-iprd", OrderedDict(
            name="NIST IR 8596 iprd, Cybersecurity Framework Profile for AI (Cyber AI Profile) — Example Informative References",
            publisher="National Institute of Standards and Technology", kind="publication", status="draft (initial preliminary draft, 2025-12-16)",
            documentIds=["nist-ir-8596-iprd"], manifest="nist-ai-rmf/manifest.json", license=PD,
            notes=("CSF 2.0 subcategory → MITRE ATLAS mitigation / 'OWASP LLM Top Ten: LLM03 Supply Chain' (the 2025 edition "
                   "was current when the draft was written), per focus area (Secure, Defend, Thwart). NIST: 'This preliminary "
                   "draft reflects examples of Informative References.' References that cite ATLAS or NIST AI 100-2e2025 as "
                   "a whole are listed under 'excluded'. The rows are cross-checked against the independent extraction "
                   "corpus/nist-ai-rmf/cyber-ai-profile.json (tools/reports/mappings-report.json, crossChecks)."))),
        ("nist-cosais-outline", OrderedDict(
            name="NIST SP 800-53 Control Overlays for Securing AI Systems (COSAiS): Using Predictive AI — draft annotated outline",
            publisher="National Institute of Standards and Technology", kind="publication",
            status="draft (discussion draft / annotated outline, January 2026)",
            documentIds=["nist-cosais-predictive-ai-annotated-outline"], manifest="nist-ai-rmf/manifest.json", license=PD,
            notes="Tailored SP 800-53 control → 'Relevant NIST AI 100-2e2025 Attack ID'. Control IDs normalised from the "
                  "zero-padded form (AC-06, SA-11(02)); 'NIST AML.011' normalised to NISTAML.011.")),
        ("nist-ai-100-2e2025", OrderedDict(
            name="NIST AI 100-2 E2025, Sec. 3.3.3 Mitigations (direct prompting attacks) — citations of ATLAS mitigations",
            publisher="National Institute of Standards and Technology", kind="publication", status="final",
            documentIds=["nist-ai-100-2e2025"], manifest="nist-ai-rmf/manifest.json", license=PD,
            notes="The 'Usage restrictions' mitigation for NISTAML.018 cites ATLAS AML.M0000-M0002 and AML.M0004 as sources.")),
        ("owasp-genai-crosswalk", OrderedDict(
            name="OWASP GenAI Security Crosswalk (OWASP GenAI Security Project — GenAI Data Security Initiative), v4.0.0 + main @ 922350d",
            publisher="OWASP GenAI Security Project", kind="community-crosswalk", status="unreviewed",
            documentIds=sorted({"owasp-genai-crosswalk-" + rel.split("/")[1][:-3].lower().replace("_", "-") for rel in cw_files}),
            license="CC BY-SA 4.0 (Copyright (c) 2026 OWASP GenAI Data Security Initiative)",
            files=cw_files,
            notes=("Listed as an OWASP GenAI Security Project resource (2026-09-01). Its rows carry confidence 'unreviewed' "
                   "(no named reviewer, per its own schema v2). Checks found identifier/label mismatches (e.g. AI RMF IDs "
                   "written GV-1.7 with labels that do not describe that subcategory; CSF 'PR.PS-04' used for secure "
                   "development). Excluded: all of Agentic_FedRAMP.md (keyed to ASI titles that are not the published "
                   "list) and the 17 ATLAS rows the crosswalk itself marks '**DRAFT — not an ATLAS technique name "
                   "[or id]; retarget pending SME review (#93)**'. Use only as a lead, never as an authoritative "
                   "requirement link."))),
    ])


if __name__ == "__main__":
    sys.exit(main(check="--check" in sys.argv))
