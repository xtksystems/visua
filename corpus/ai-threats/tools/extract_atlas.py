#!/usr/bin/env python3
"""Build atlas.json from the MITRE ATLAS 2026.09 data release (format 6.0.0).

Source : mitre-atlas/ATLAS-2026.09.yaml (release asset of atlas-data v2026.09, identical to
         dist/v6/ATLAS-2026.09.yaml at the tag commit).
Checks : counts against the release notes / CHANGELOG, every relationship end resolves, and the
         STIX 2.1 bundle (mitre-atlas/stix-atlas.json) carries the same objects and 'mitigates'
         pairs. Report: tools/reports/atlas-verification.json

Usage:  python3 tools/extract_atlas.py [--check]
"""
import json
import re
import sys
from collections import Counter, OrderedDict

import yaml

from common import ROOT, RETRIEVED, sha256, write_json

YAML_PATH = ROOT / "mitre-atlas" / "ATLAS-2026.09.yaml"
STIX_PATH = ROOT / "mitre-atlas" / "stix-atlas.json"
MANIFEST_YAML = ROOT / "mitre-atlas" / "manifest.yaml"
LICENSE_PATH = ROOT / "mitre-atlas" / "LICENSE"
README_PATH = ROOT / "mitre-atlas" / "README.md"
CHANGELOG_PATH = ROOT / "mitre-atlas" / "CHANGELOG.md"

EXPECTED = {"tactics": 16, "techniques": 120, "subTechniques": 88, "mitigations": 40, "caseStudies": 73}


def main(check=False):
    data = yaml.safe_load(YAML_PATH.read_text(encoding="utf-8"))
    coll = data["collection"]
    rel = data["relationships"]
    release = next(r for r in yaml.safe_load(MANIFEST_YAML.read_text(encoding="utf-8")) if r["release"] == coll["version"])
    license_text = LICENSE_PATH.read_text(encoding="utf-8").strip()
    readme = README_PATH.read_text(encoding="utf-8")
    statement = readme.split("## Release Statement", 1)[1].strip()

    def rels(obj_id, kind):
        return rel.get(obj_id, {}).get(kind, [])

    # matrix order of tactics
    seq = sorted(rels("ATLAS-matrix", "sequences"), key=lambda r: r["position"])
    order = [r["target"] for r in seq]

    tactics = []
    for tid in order:
        t = data["tactics"][tid]
        rec = OrderedDict(id=tid, name=t["name"], description=t["description"], matrixPosition=order.index(tid) + 1)
        if "attack-reference" in t:
            rec["attackReference"] = t["attack-reference"]
        rec["created"] = t["created-date"]
        rec["modified"] = t["modified-date"]
        tactics.append(rec)
    assert len(tactics) == len(data["tactics"]), "matrix does not sequence every tactic"

    def tech_sort(k):
        m = re.match(r"AML\.T(\d{4})(?:\.(\d{3}))?$", k)
        return (int(m.group(1)), -1 if m.group(2) is None else int(m.group(2)))

    techniques = []
    for tid in sorted(data["techniques"], key=tech_sort):
        t = data["techniques"][tid]
        parent = [r["target"] for r in rels(tid, "specializes")]
        tac = [r["target"] for r in rels(tid, "achieves")]
        tac.sort(key=order.index)
        rec = OrderedDict(id=tid, name=t["name"])
        if parent:
            # the ATLAS website shows sub-techniques as '<parent name>: <name>'
            rec["fullName"] = f"{data['techniques'][parent[0]]['name']}: {t['name']}"
        rec.update(description=t["description"], tactics=tac, parent=parent[0] if parent else None,
                   maturity=t.get("maturity"), platforms=t.get("platforms", []))
        if "attack-reference" in t:
            rec["attackReference"] = t["attack-reference"]
        if t.get("references"):
            rec["references"] = t["references"]
        rec["created"] = t["created-date"]
        rec["modified"] = t["modified-date"]
        techniques.append(rec)

    mitigations = []
    for mid in sorted(data["mitigations"]):
        m = data["mitigations"][mid]
        uses = [OrderedDict(id=r["target"], use=r.get("description", "")) for r in rels(mid, "mitigates")]
        uses.sort(key=lambda u: tech_sort(u["id"]))
        rec = OrderedDict(id=mid, name=m["name"], description=m["description"], categories=m.get("categories", []),
                          lifecyclePhases=m.get("lifecycle-phases", []), techniques=uses)
        if "attack-reference" in m:
            rec["attackReference"] = m["attack-reference"]
        if m.get("references"):
            rec["references"] = m["references"]
        rec["created"] = m["created-date"]
        rec["modified"] = m["modified-date"]
        mitigations.append(rec)

    n_sub = sum(1 for t in techniques if t["parent"])
    counts = OrderedDict(tactics=len(tactics), techniques=len(techniques) - n_sub, subTechniques=n_sub,
                         mitigations=len(mitigations), caseStudies=len(data["case-studies"]),
                         mitigationTechniqueLinks=sum(len(m["techniques"]) for m in mitigations),
                         techniqueTacticLinks=sum(len(t["tactics"]) for t in techniques),
                         caseStudyTechniqueSteps=sum(len(rels(c, "employs")) for c in data["case-studies"]))

    out = OrderedDict()
    out["source"] = OrderedDict(
        documentId="mitre-atlas-2026-09-yaml",
        title="MITRE ATLAS (Adversarial Threat Landscape for Artificial-Intelligence Systems) data",
        publisher="The MITRE Corporation",
        version=coll["version"],
        formatVersion=data["format-version"],
        released=release["release-date"],
        collectionModified=coll["modified-date"],
        path="ai-threats/mitre-atlas/ATLAS-2026.09.yaml",
        sha256=sha256(YAML_PATH),
        url="https://github.com/mitre-atlas/atlas-data/releases/download/v2026.09/ATLAS-2026.09.yaml",
        repository="https://github.com/mitre-atlas/atlas-data",
        gitTag="v2026.09",
        gitCommit="3259f388d19cbcca11bacf12a0ef97f4198f711b",
        retrieved=RETRIEVED,
        license="Apache-2.0",
        licenseNotice=license_text,
        licenseFile="ai-threats/mitre-atlas/LICENSE",
        licenseText="ai-threats/licenses/Apache-2.0.txt",
        releaseStatement=statement,
        trademark="MITRE ATLAS™ is a trademark of The MITRE Corporation.",
        modifications=("Derivative work prepared by Visua on " + RETRIEVED + " from the unmodified ATLAS 2026.09 YAML: objects were "
                       "re-keyed into arrays, relationships (achieves, specializes, mitigates) were folded into the objects they "
                       "describe, sub-techniques gained a 'fullName' ('<parent name>: <name>', as the ATLAS website shows them), "
                       "case studies were reduced to a count, and field names were changed to camelCase. All names, "
                       "descriptions and mitigation 'use' texts are copied verbatim (markdown and internal links such as "
                       "(/techniques/AML.T0051.000) kept as published). The unmodified source, its LICENSE and the Apache License 2.0 "
                       "text are kept alongside."),
        notes=("dist/ATLAS.yaml in the atlas-data repository is deprecated ('no longer being updated'; frozen at legacy format "
               "5.6.0); this extraction uses the current format-6 release file. Descriptions are markdown."),
    )
    out["counts"] = counts
    out["matrix"] = OrderedDict(id=data["matrix"]["id"], name=data["matrix"]["name"], tacticOrder=order)
    out["tactics"] = tactics
    out["techniques"] = techniques
    out["mitigations"] = mitigations
    out["caseStudies"] = len(data["case-studies"])

    # ------------------------------------------------------------------ verification
    errors = []
    for k, v in EXPECTED.items():
        if counts[k] != v:
            errors.append(f"{k}: {counts[k]} != {v}")
    ids = {t["id"] for t in techniques} | {t["id"] for t in tactics} | {m["id"] for m in mitigations}
    for t in techniques:
        if t["parent"] and t["parent"] not in ids:
            errors.append(f"{t['id']}: parent {t['parent']} unknown")
        if not t["tactics"]:
            errors.append(f"{t['id']}: no tactic")
        if t["parent"] and not t["id"].startswith(t["parent"] + "."):
            errors.append(f"{t['id']}: parent id mismatch")
    for m in mitigations:
        for u in m["techniques"]:
            if u["id"] not in ids:
                errors.append(f"{m['id']}: mitigates unknown {u['id']}")
            if not u["use"]:
                errors.append(f"{m['id']}->{u['id']}: empty use text")
    # release notes / changelog statement
    cl = CHANGELOG_PATH.read_text(encoding="utf-8")
    m = re.search(r"## \[2026\.09\]\(\) \((\d{4}-\d{2}-\d{2})\)\s+##### Content v2026\.09\s+(This version of ATLAS data contains [^\n]+)", cl)
    changelog_statement = m.group(2) if m else None
    expected_sentence = (f"This version of ATLAS data contains 1 matrix, {counts['tactics']} tactics, {counts['techniques']} techniques, "
                         f"{counts['subTechniques']} sub-techniques, {counts['mitigations']} mitigations, and {counts['caseStudies']} case studies.")
    if changelog_statement != expected_sentence:
        errors.append(f"CHANGELOG statement differs: {changelog_statement!r}")
    # STIX cross-check
    stix = json.loads(STIX_PATH.read_text(encoding="utf-8"))
    sc = Counter(o["type"] for o in stix["objects"])
    ext = {}
    for o in stix["objects"]:
        for r in o.get("external_references", []):
            if r.get("source_name") == "mitre-atlas" and r.get("external_id"):
                ext[o["id"]] = r["external_id"]
    stix_mitigates = {(ext.get(o["source_ref"]), ext.get(o["target_ref"])) for o in stix["objects"]
                      if o["type"] == "relationship" and o.get("relationship_type") == "mitigates"}
    yaml_mitigates = {(m["id"], u["id"]) for m in mitigations for u in m["techniques"]}
    stix_check = OrderedDict(
        objectTypes=dict(sc),
        attackPatternsEqualTechniquesPlusSub=sc["attack-pattern"] == len(techniques),
        coursesOfActionEqualMitigations=sc["course-of-action"] == len(mitigations),
        tacticsEqual=sc["x-mitre-tactic"] == len(tactics),
        campaignsEqualCaseStudies=sc["campaign"] == len(data["case-studies"]),
        mitigatesPairsIdentical=stix_mitigates == yaml_mitigates,
        stixMitigatesPairs=len(stix_mitigates),
    )
    if not all(v for k, v in stix_check.items() if isinstance(v, bool)):
        errors.append("STIX bundle differs from YAML: " + json.dumps(stix_check))
    report = OrderedDict(source=out["source"]["path"], sha256=out["source"]["sha256"], counts=counts,
                         changelogStatement=changelog_statement, stix=stix_check,
                         maturity=dict(Counter(t["maturity"] for t in techniques)),
                         platforms=dict(Counter(p for t in techniques for p in t["platforms"])),
                         techniquesWithoutMitigation=[t["id"] for t in techniques
                                                      if t["id"] not in {u for _, u in yaml_mitigates}],
                         errors=errors)
    same = write_json(ROOT / "atlas.json", out, check=check)
    write_json(ROOT / "tools" / "reports" / "atlas-verification.json", report, check=check)
    print(f"atlas.json: {counts['tactics']} tactics, {counts['techniques']} techniques + {counts['subTechniques']} sub-techniques, "
          f"{counts['mitigations']} mitigations ({counts['mitigationTechniqueLinks']} mitigation->technique links), "
          f"{counts['caseStudies']} case studies; STIX identical={stix_check['mitigatesPairsIdentical']}; "
          f"{'unchanged' if same else ('DIFFERS' if check else 'written')}")
    for e in errors:
        print("ERROR", e)
    return 1 if errors or (check and not same) else 0


if __name__ == "__main__":
    sys.exit(main(check="--check" in sys.argv))
