"""Build obligations.json and manifest.json for corpus/us-state-ai-laws.

- Resolves every verbatim quotation (obligation texts, appliesTo conditions, penalties,
  safe harbours) from the registered documents by anchors.
- Verifies each quotation independently with a whitespace/hyphen-insensitive page
  locator and records the physical PDF page (and pageEnd when a passage spans pages).
- Writes a review report listing every line-end hyphen decision inside quotations.
"""
import datetime
import hashlib
import importlib
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from common import Q  # noqa: E402
from docs import DOC, DOCS  # noqa: E402
from pagetext import CORPUS, Locator, page_texts  # noqa: E402
from spans import flat_for  # noqa: E402

OUT = os.path.join(CORPUS, "us-state-ai-laws")
ALL_MODULES = "laws_tx,laws_ca,laws_co,laws_ny,laws_il,laws_ut,laws_me"
MODULES = [m for m in os.environ.get("LAW_MODULES", ALL_MODULES).split(",") if m]

review = []
errors = []
_loc = {}


def locator(doc_id):
    if doc_id not in _loc:
        d = DOC[doc_id]
        _loc[doc_id] = Locator(page_texts(os.path.join(CORPUS, d["path"]), d["mode"], d["family"]))
    return _loc[doc_id]


def resolve(q: Q, ctx):
    d = DOC[q.doc]
    if d.get("mode") is None:
        raise ValueError(f"{ctx}: document {q.doc} has no text extraction mode")
    f = flat_for(os.path.join(CORPUS, d["path"]), d["mode"], d["family"], d.get("dehyphenate", d["mode"] == "ny-bill"))
    text, p0, p1, joins = f.extract(q.start, q.end, after=q.after, occurrence=q.occ)
    # independent verification on the unmodified extract
    hit = locator(q.doc).find(text)
    if hit is None:
        errors.append(f"{ctx}: locator could not re-find extracted text")
    elif hit["page"] != p0:
        errors.append(f"{ctx}: page mismatch flat={p0} locator={hit['page']}")
    for a, b in q.fix:
        if a not in text:
            errors.append(f"{ctx}: fix target not found: {a!r}")
        text = text.replace(a, b)
    if joins:
        review.append((ctx, joins))
    return text, p0, p1


def qtext(v, ctx):
    if isinstance(v, Q):
        t, _, _ = resolve(v, ctx)
        return v.prefix + t + v.suffix
    if isinstance(v, list):
        return "".join(qtext(x, ctx) for x in v)
    return v


def build_law(law):
    out = {}
    for k in ["id", "jurisdiction", "title", "citation", "status", "statusNote", "enacted", "effective", "sunset"]:
        if k in law:
            out[k] = law[k]
    out["appliesTo"] = [dict(role=a["role"], condition=qtext(a["condition"], f"{law['id']}/appliesTo/{a['role']}")) for a in law["appliesTo"]]
    enf = law["enforcement"]
    out["enforcement"] = {k: qtext(v, f"{law['id']}/enforcement/{k}") for k, v in enf.items()}
    out["safeHarbors"] = []
    for i, s in enumerate(law.get("safeHarbors", [])):
        e = dict(text=qtext(s["text"], f"{law['id']}/safeHarbor/{i}"), section=s["section"], references=s.get("references", []))
        if s.get("note"):
            e["note"] = s["note"]
        out["safeHarbors"].append(e)
    out["sources"] = law["sources"]
    if law.get("notes"):
        out["notes"] = [qtext(n, f"{law['id']}/notes") for n in law["notes"]]
    obls = []
    seen = set()
    for o in law["obligations"]:
        ctx = f"{law['id']}/{o['id']}"
        if o["id"] in seen:
            errors.append(f"duplicate obligation id {o['id']}")
        seen.add(o["id"])
        if len(o["title"].split()) > 10:
            errors.append(f"{ctx}: title longer than 10 words")
        text_doc = o.get("textDoc", o["doc"])
        if "spans" in o:
            parts, pages = [], []
            for sp in o["spans"]:
                q = Q(text_doc, sp[0], sp[1], after=(sp[2] if len(sp) > 2 else None), fix=o.get("fix", []))
                t, p0, p1 = resolve(q, ctx)
                parts.append(t)
                pages += [p0, p1]
            text = o.get("joiner", " … ").join(parts)
            p0, p1 = min(pages), max(pages)
        else:
            q = Q(text_doc, o["start"], o["end"], after=o.get("after"), occ=o.get("occ", 1), fix=o.get("fix", []))
            text, p0, p1 = resolve(q, ctx)
        cited = DOC[o["doc"]]
        is_pdf = cited["mediaType"] == "application/pdf"
        page = o.get("page", p0 if is_pdf else None)
        page_end = o.get("pageEnd", p1 if is_pdf else None)
        rec = dict(id=o["id"], title=o["title"], text=text, section=o["section"], documentId=o["doc"], page=page)
        if page is not None and page_end is not None and page_end != page:
            rec["pageEnd"] = page_end
        rec.update(role=o["role"], effective=o["effective"])
        if o.get("until"):
            rec["until"] = o["until"]
        rec.update(category=o["category"], evidence=o["evidence"])
        if o.get("notes"):
            rec["notes"] = o["notes"]
        if text_doc != o["doc"]:
            rec["textVerifiedAgainst"] = dict(documentId=text_doc, page=p0) if p0 == p1 else dict(documentId=text_doc, page=p0, pageEnd=p1)
        obls.append(rec)
    out["obligations"] = obls
    return out


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    laws = []
    for m in MODULES:
        laws += importlib.import_module(m).LAWS
    built = [build_law(l) for l in laws]
    # document ids referenced must exist
    for l in built:
        for s in l["sources"]:
            if s["documentId"] not in DOC:
                errors.append(f"{l['id']}: unknown source document {s['documentId']}")
        for o in l["obligations"]:
            if o["documentId"] not in DOC:
                errors.append(f"{l['id']}/{o['id']}: unknown document {o['documentId']}")
    # global validation
    import re as _re
    STATUSES = {"in force", "enacted, not yet effective", "enjoined", "repealed"}
    CATS = {"disclosure", "transparency", "risk-assessment", "impact-assessment", "documentation", "incident-reporting", "bias-audit",
            "notice", "opt-out", "appeal", "safety-framework", "record-keeping", "prohibition", "other", "audit"}
    ROLES = {"business", "developer", "deployer", "government", "health-care-provider", "processor", "sandbox participant", "operator",
             "platform", "manufacturer", "licensee", "frontier-developer", "large-frontier-developer", "service-provider", "seller",
             "distributor", "covered-provider", "provider", "employer", "employment-agency", "insurer", "supplier",
             "licensed-professional", "generation-service"}
    DATE = _re.compile(r"^\d{4}-\d{2}-\d{2}$")
    all_ids = set()
    for l in built:
        if l["status"] not in STATUSES:
            errors.append(f"{l['id']}: bad status {l['status']}")
        for k in ("enacted", "effective"):
            if not DATE.match(l.get(k) or ""):
                errors.append(f"{l['id']}: bad {k} date {l.get(k)}")
        if l.get("sunset") is not None and not DATE.match(l["sunset"]):
            errors.append(f"{l['id']}: bad sunset {l['sunset']}")
        for a in l["appliesTo"]:
            for r in a["role"].split(", "):
                if r not in ROLES:
                    errors.append(f"{l['id']}: unknown appliesTo role {r}")
        if l["id"] in all_ids:
            errors.append(f"duplicate id {l['id']}")
        all_ids.add(l["id"])
        for o in l["obligations"]:
            if o["id"] in all_ids:
                errors.append(f"duplicate id {o['id']}")
            all_ids.add(o["id"])
            if not _re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", o["id"]):
                errors.append(f"{o['id']}: id not kebab-case")
            if o["category"] not in CATS:
                errors.append(f"{o['id']}: unknown category {o['category']}")
            for r in o["role"].split(", "):
                if r not in ROLES:
                    errors.append(f"{o['id']}: unknown role {r}")
            if not DATE.match(o["effective"]):
                errors.append(f"{o['id']}: bad effective {o['effective']}")
            if o.get("until") and not DATE.match(o["until"]):
                errors.append(f"{o['id']}: bad until {o['until']}")
            if not o["evidence"]:
                errors.append(f"{o['id']}: no evidence")
            if o["page"] is not None and DOC[o["documentId"]]["mediaType"] != "application/pdf":
                errors.append(f"{o['id']}: page set for non-PDF")
    obligations = {
        "retrieved": "2026-09-26",
        "disclaimer": "Summaries of official texts for compliance tracking; not legal advice.",
        "laws": built,
    }
    with open(os.path.join(OUT, "obligations.json"), "w", encoding="utf-8") as fh:
        json.dump(obligations, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    # manifest
    docs = []
    for d in DOCS:
        p = os.path.join(CORPUS, d["path"])
        rec = {k: d[k] for k in ["id", "title", "identifier", "publisher", "version", "published", "role", "mediaType", "path", "url", "landingPage"]}
        rec["sha256"] = sha256(p)
        rec["bytes"] = os.path.getsize(p)
        rec["license"] = d["license"]
        rec["notes"] = d["notes"]
        docs.append(rec)
    manifest = {
        "framework": "us-state-ai-laws",
        "title": "U.S. state AI laws and implementing rules — official texts corpus",
        "retrieved": "2026-09-26",
        "documents": docs,
    }
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports"), exist_ok=True)
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports", "review-hyphens.txt"), "w") as fh:
        for ctx, joins in review:
            fh.write(ctx + "\n")
            for j in joins:
                fh.write("    " + j + "\n")
    n = sum(len(l["obligations"]) for l in built)
    print(f"laws={len(built)} obligations={n} documents={len(docs)} errors={len(errors)} hyphen-reviews={sum(len(j) for _, j in review)}")
    for e in errors:
        print("ERROR", e)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
