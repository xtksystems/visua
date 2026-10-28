import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { zipSync } from "fflate";
import type { Evidence, Workspace } from "@visua/core";
import { canonical, chainHash, GENESIS } from "../audit.ts";
import { verify as verifyBlob } from "../blobs/shared.ts";
import { artifactHash } from "./evidence.ts";
import { captureExportSnapshot, EXPORT_SNAPSHOT_BASIS, type ExportSelection, type ExportSnapshot } from "./export-snapshot.ts";
import { actionPlanCsv, aiRmfProfileCsv, csfProfileCsv, evidenceIndexCsv, oscalPoam, oscalSsp, readinessMarkdown, soc2PbcCsv, toCsv } from "./exports.ts";
import { ValidationError, type VisuaService } from "./visua.ts";

export const AUDITOR_BUNDLE_LIMITS = Object.freeze({ bytes: 64 * 1024 * 1024, artifacts: 256, concurrent: 2, milliseconds: 60_000 });
let activeBuilds = 0;
const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const json = (value: unknown) => canonical(value) + "\n";
const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
interface ArtifactRecord { evidenceId: string; kind: "file" | "inline" | "not-recorded"; path?: string; sha256?: string; size?: number }
interface FileRecord { path: string; size: number; sha256: string; purpose: string }
export interface AuditorBundle {
  bytes: Uint8Array;
  manifestSha256: string;
  /** Stable digest of captured business records, source metadata and artifact inventory; excludes capturedAt. */
  contentSha256: string;
  snapshot: ExportSnapshot;
  filename: string;
}

function inlineArtifact(e: Evidence): string | undefined {
  if (e.source === "connector") {
    if (!e.data || typeof e.data["checkId"] !== "string" || e.data["observed"] === undefined) return undefined;
    return canonical({ checkId: e.data["checkId"], observed: e.data["observed"], observedAt: e.collectedAt });
  }
  if (e.content !== undefined || e.data !== undefined) return canonical({ content: e.content, data: e.data });
  return undefined;
}
function table(caption: string, headings: string[], rows: unknown[][]): string {
  return `<table><caption>${escape(caption)}</caption><thead><tr>${headings.map(h => `<th scope="col">${escape(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escape(typeof cell === "object" ? canonical(cell) : cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function presentation(snapshot: ExportSnapshot, artifacts: ArtifactRecord[], reports: { path?: string; name: string; unavailable?: string }[]): string {
  const inventory = artifacts.map(a => `<li>${escape(a.evidenceId)}: ${a.path ? `<a download href="${a.path}">${a.kind === "file" ? "Original file" : "Canonical inline artifact"}</a> (${a.size} bytes, SHA-256 ${a.sha256})` : "Artifact not recorded"}</li>`).join("");
  const tables = [
    table("Recorded assessment states (effective date scope is shown in reports)", ["Requirement", "Current", "Target", "Recorded applicable", "Rationale", "Owner", "Notes"], snapshot.states.map(s => [s.nodeId, s.current, s.target, s.applicable ? "Yes" : "No", s.applicabilityRationale ?? s.userExclusion?.rationale ?? "", s.owner, s.notes])),
    table("Evidence and recorded review history", ["ID", "Title", "Original filename", "Status", "Collected", "Expires", "Requirements", "Assurance", "Provenance", "Review history"], snapshot.evidence.map(e => [e.id, e.title, e.fileName, e.status, e.collectedAt, e.validUntil, e.requirementIds, e.assurance, e.provenance, e.reviewHistory])),
    table("Source checks", ["ID", "Recorded observation"], snapshot.checks.map(c => [c.id, c])),
    table("Stored policy versions", ["ID", "Title", "Version", "Status", "Approved by", "Approved at", "Body"], snapshot.policies.map(p => [p.id, p.title, p.version, p.status, p.approvedBy, p.approvedAt, p.body])),
    table("Work and requests", ["ID", "Title", "Status", "Record"], snapshot.tasks.map(t => [t.id, t.title, t.status, t])),
    table("References not recorded", ["Kind", "ID", "Referenced by evidence"], snapshot.dependencies.missing.map(d => [d.kind, d.id, d.referencedByEvidenceId])),
    table("Audit events", ["Sequence", "At", "Actor", "Action", "Entity", "Summary", "Hash"], snapshot.activity.map(e => [e.seq, e.at, e.actor, e.action, e.entityId, e.summary, e.hash])),
  ];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'"><title>Visua auditor package</title></head><body><main><h1>${escape(snapshot.workspace.name)} — auditor package</h1><p>Read-only recorded evidence. No audit opinion or certification is provided.</p><p>Workspace ${escape(snapshot.workspace.id)}; revision ${snapshot.revision}; captured ${escape(snapshot.capturedAt)}; evaluated at ${escape(snapshot.asOf)}${snapshot.periodStart ? `; period begins ${escape(snapshot.periodStart)}` : ""}.</p><p>${escape(EXPORT_SNAPSHOT_BASIS.records)} ${escape(EXPORT_SNAPSHOT_BASIS.period)}</p><p>Selected frameworks: ${snapshot.frameworkIds.map(escape).join(", ")}. Related records outside assessment scope: ${escape(canonical(snapshot.dependencies))}.</p><p>Checksums establish internal consistency only. Use a separately trusted verifier and an independently retained manifest hash to bind the complete package. A retained audit checkpoint binds the audit chain only. Do not execute a verifier from an untrusted package without first establishing trust in that verifier.</p><p>From a terminal: <code>node /trusted/path/verify.mjs /path/to/extracted-bundle --manifest-sha256 RETAINED_HASH</code>. <a href="readme.txt">Verification instructions and limitations</a></p><h2>Package records</h2><ul><li><a href="manifest.json">Manifest</a></li><li><a href="snapshot.json">Frozen snapshot</a></li><li><a href="sources.json">Source and license metadata</a></li><li><a href="policy-versions.json">Recorded policy version availability</a></li></ul><h2>Artifacts</h2><p>Artifact downloads may contain active content. Inspect them with appropriate tools; this page does not execute or embed artifacts.</p><ul>${inventory}</ul><h2>Reports</h2><ul>${reports.map(r => `<li>${escape(r.name)}: ${r.path ? `<a download href="${r.path}">Download</a>` : escape(r.unavailable)}</li>`).join("")}</ul><h2>Recorded detail</h2>${tables.join("\n")}</main></body></html>`;
}

/** Captures SQL atomically, then reads immutable blobs after releasing the transaction. No business writes. */
export async function buildAuditorBundle(svc: VisuaService, ws: Workspace, selection: ExportSelection = {}): Promise<AuditorBundle> {
  if (activeBuilds >= AUDITOR_BUNDLE_LIMITS.concurrent) throw new ValidationError("Two auditor packages are already building; retry when one completes.");
  activeBuilds++;
  const deadline = Date.now() + AUDITOR_BUNDLE_LIMITS.milliseconds;
  const check = () => { if (Date.now() > deadline) throw new ValidationError("Auditor package exceeded its 60-second work budget; reduce scope and retry."); };
  try {
    const snapshot = await captureExportSnapshot(svc, ws, selection);
    check();
    const archive: Record<string, Uint8Array> = Object.create(null) as Record<string, Uint8Array>;
    const files: FileRecord[] = [], artifacts: ArtifactRecord[] = [];
    let bytes = 0;
    function add(path: string, value: string | Uint8Array, purpose: string) {
      check();
      const data = typeof value === "string" ? Buffer.from(value) : value;
      if (bytes + data.byteLength > AUDITOR_BUNDLE_LIMITS.bytes) throw new ValidationError("Auditor package exceeds 64 MiB uncompressed; reduce scope or artifact volume.");
      bytes += data.byteLength;
      archive[path] = data;
      files.push({ path, size: data.byteLength, sha256: sha(data), purpose });
    }
    let previous = GENESIS, sequence = 0;
    for (const event of snapshot.activity) {
      if (event.workspaceId !== snapshot.workspace.id || event.seq !== ++sequence || event.prevHash !== previous || event.hash !== chainHash(previous, event)) throw new ValidationError("Cannot export an inconsistent workspace audit chain.");
      previous = event.hash;
    }
    if (sequence !== snapshot.auditCheckpoint.seq || previous !== snapshot.auditCheckpoint.hash) throw new ValidationError("Cannot export a mismatched audit checkpoint.");
    const expectedArtifacts = snapshot.evidence.filter(e => e.artifact || inlineArtifact(e) !== undefined);
    if (expectedArtifacts.length > AUDITOR_BUNDLE_LIMITS.artifacts) throw new ValidationError("Auditor package exceeds 256 artifacts; reduce selected scope.");
    const declaredBytes = expectedArtifacts.reduce((sum, e) => sum + (e.artifact?.size ?? Buffer.byteLength(inlineArtifact(e)!)), 0);
    if (!Number.isSafeInteger(declaredBytes) || declaredBytes > AUDITOR_BUNDLE_LIMITS.bytes) throw new ValidationError("Auditor package exceeds 64 MiB of artifacts; reduce selected scope.");
    add("snapshot.json", json(snapshot), "Frozen current records, complete audit chain and checkpoint");
    for (const e of snapshot.evidence) {
      check();
      const expected = artifactHash(e);
      if (expected !== e.sha256) throw new ValidationError("Evidence artifact does not match its recorded hash; repair the record before exporting.");
      if (expected === undefined) { artifacts.push({ evidenceId: e.id, kind: "not-recorded" }); continue; }
      const kind = e.artifact ? "file" : "inline";
      const path = `artifacts/${sha(e.id)}.${kind === "file" ? "bin" : "json"}`;
      let content: Uint8Array;
      if (e.artifact) {
        if (!snapshot.workspace.tenantId) throw new ValidationError("File evidence has no recorded owning organization.");
        if (bytes + e.artifact.size > AUDITOR_BUNDLE_LIMITS.bytes) throw new ValidationError("Auditor package exceeds 64 MiB uncompressed; reduce scope or artifact volume.");
        try { content = verifyBlob(await svc.blobs.get({ tenantId: snapshot.workspace.tenantId, workspaceId: snapshot.workspace.id }, e.artifact), e.artifact); }
        catch { throw new ValidationError("An evidence file is missing, unavailable, or fails integrity checks; no package was generated."); }
        check();
      } else content = Buffer.from(inlineArtifact(e)!);
      if (sha(content) !== expected) throw new ValidationError("Evidence bytes do not match their recorded artifact digest.");
      add(path, content, kind === "file" ? "Original immutable evidence file" : "Canonical UTF-8 inline artifact using Visua artifactHash encoding");
      artifacts.push({ evidenceId: e.id, kind, path, sha256: expected, size: content.byteLength });
    }
    const documentIds = new Set(snapshot.frameworkIds.flatMap(id => svc.registry.framework(id)!.graph.framework.sources.map(source => source.documentId)));
    for (const e of snapshot.evidence) for (const id of [...(e.contentSourceDocumentIds ?? []), ...(e.provenance?.sourceDocumentIds ?? [])]) documentIds.add(id);
    const sources = {
      notice: "Catalog source files and restricted framework corpora are not included. Citations identify external originals; retrieval and redistribution remain subject to the recorded licenses.",
      frameworks: snapshot.frameworkIds.map(id => { const f = svc.registry.framework(id)!.graph.framework; return { id, name: f.name, publisher: f.publisher, version: f.version, sources: f.sources, contentNotice: f.contentNotice }; }),
      documents: [...documentIds].sort().map(id => { const d = svc.registry.documents.get(id); return d ? { id, title: d.title, publisher: d.publisher, version: d.version, url: d.url, sha256: d.sha256, license: d.license, notes: d.notes } : { id, availability: "Source metadata not recorded" }; }),
    };
    add("sources.json", json(sources), "Original source citations and license metadata; no source corpora");
    add("policy-versions.json", json({
      notice: "Stored policies are current records, not a complete version archive. Prior approval references prove only what was recorded. Historical bytes are available only where identified below.",
      references: snapshot.evidence.filter(e => e.provenance?.policy).map(e => {
        const ref = e.provenance!.policy!;
        const current = snapshot.policies.find(p => p.id === ref.id && p.version === ref.version && sha(p.body) === ref.sha256);
        const inline = e.content !== undefined && sha(e.content) === ref.sha256;
        return { evidenceId: e.id, ...ref, availability: inline ? "Historical body stored in evidence.content" : current ? "Matching version body stored in snapshot.policies" : "Recorded reference only; historic bytes not stored" };
      }),
    }), "Available approved policy versions and explicit historical-byte gaps");
    const reports: { name: string; path?: string; unavailable?: string }[] = [];
    async function report(name: string, path: string, generate: () => Promise<unknown>) {
      check();
      try { const value = await generate(); add(path, typeof value === "string" ? value : json(value), name); reports.push({ name, path }); }
      catch (error) { if (!(error instanceof ValidationError) || /exceeds|budget/.test(error.message)) throw error; reports.push({ name, unavailable: error.message }); }
    }
    await report("Readiness report", "reports/readiness.md", () => readinessMarkdown(svc, snapshot.workspace, snapshot));
    await report("Action plan", "reports/action-plan.csv", () => actionPlanCsv(svc, snapshot.workspace, snapshot));
    await report("Evidence index", "reports/evidence-index.csv", () => evidenceIndexCsv(svc, snapshot.workspace, snapshot));
    if (snapshot.frameworkIds.includes("nist-csf-2.0")) await report("CSF profile", "reports/csf-profile.csv", () => csfProfileCsv(svc, snapshot.workspace, snapshot));
    if (snapshot.frameworkIds.includes("aicpa-tsc-2017")) await report("SOC 2 PBC requests", "reports/soc2-pbc.csv", () => soc2PbcCsv(svc, snapshot.workspace, snapshot));
    if (snapshot.frameworkIds.includes("nist-ai-rmf")) await report("AI RMF profile", "reports/ai-rmf-profile.csv", () => aiRmfProfileCsv(svc, snapshot.workspace, snapshot));
    if (snapshot.frameworkIds.includes("nist-sp-800-53-r5")) await report("OSCAL SSP", "reports/oscal-ssp.json", () => oscalSsp(svc, snapshot.workspace, snapshot));
    await report("OSCAL POA&M", "reports/oscal-poam.json", () => oscalPoam(svc, snapshot.workspace, snapshot));
    // Visua-authored requests deliberately omit licensed criterion text on every installation.
    add("reports/pbc-requests.csv", toCsv([["Requirement", "Evidence requested (Visua-authored)", "Applicable", "Scope rationale"], ...snapshot.states.map(s => [s.nodeId, "Provide the approved procedure and dated operational records; identify the owner, system scope, observation period and representative sample linked to this requirement.", s.applicable ? "Yes" : "No", s.applicabilityRationale ?? s.userExclusion?.rationale ?? ""])]), "Visua-authored provided-by-client requests without licensed catalog text");
    reports.push({ name: "PBC requests (Visua-authored)", path: "reports/pbc-requests.csv" });
    add("reports.json", json(reports), "Report availability; unavailable reports are explicit");
    add("verify.mjs", await readFile(new URL("./bundle-verifier.mjs", import.meta.url)), "Standalone dependency-free Node.js verifier");
    add("readme.txt", `Visua frozen auditor package\n\nExtract into a new empty directory. Inspect index.html offline. The page has no scripts or remote assets. Artifacts are downloads, never embedded or executed.\n\nUse Node.js 22 or later with a separately trusted copy of verify.mjs:\n  node /trusted/path/verify.mjs /path/to/extracted-bundle\n  node /trusted/path/verify.mjs /path/to/extracted-bundle --manifest-sha256 INDEPENDENTLY_RETAINED_HASH\n  node /trusted/path/verify.mjs /path/to/extracted-bundle --checkpoint WORKSPACE_ID:SEQUENCE:HEAD_HASH\nBoth pins may be supplied. Retain the manifest hash and checkpoint outside this package at export time. The response reports which external pins were checked.\n\nDo not trust executable code merely because it arrived in this package. The included verifier is convenient only after its code is separately trusted. It runs without dependencies or network access and checks every file, evidence artifact, entity digest, and audit event from genesis through the included checkpoint. Verification is bounded to 64 MiB, 512 files and 20,000 entities. Symlinks, unlisted files, duplicate entries and unsafe paths fail.\n\nIncluded checksums and unsigned checkpoints establish internal consistency only. A coordinated rewrite or truncation can recompute them. An independently trusted exact audit checkpoint detects chain rewrites/truncation relative to that checkpoint; it does not authenticate other snapshot data. An independently trusted manifest hash binds all listed package files. Neither produces an audit opinion, certification, or proof that recorded observations are true.\n\n${Object.values(EXPORT_SNAPSHOT_BASIS).join("\n")}\nMetadata-only evidence is explicitly not recorded and has no artifact file reference. Policy version references may record hashes without retained historic bytes; policy-versions.json states availability. Dependencies outside the selected assessment scope and missing record references are declared in snapshot.dependencies. No catalog source corpora are included; sources.json records source/license metadata.\n\nmanifest.contentSha256 covers the canonical snapshot excluding capturedAt, artifact inventory and sources metadata. It remains stable for identical records and a fixed asOf; file digests still include generation metadata where present. Entity hashes cover whole captured entities. Historical event content digests are only those recorded in the original events; no historic entity reconstruction is claimed.\n`, "Offline usage and precise trust boundary");
    add("index.html", presentation(snapshot, artifacts, reports), "Escaped read-only offline presentation");
    const entities = (["states", "evidence", "tasks", "policies", "checks", "activity"] as const).flatMap(kind => snapshot[kind].map(entity => ({ kind, id: "nodeId" in entity ? entity.nodeId : entity.id, sha256: sha(canonical(entity)) })));
    const { capturedAt: _capturedAt, ...stableSnapshot } = snapshot;
    const contentSha256 = sha(canonical({ snapshot: stableSnapshot, artifacts, sources }));
    const manifest = json({ format: "visua-auditor-bundle", version: 1, workspaceId: snapshot.workspace.id, revision: snapshot.revision, capturedAt: snapshot.capturedAt, asOf: snapshot.asOf, checkpoint: snapshot.auditCheckpoint, contentSha256, files: files.sort((a, b) => a.path.localeCompare(b.path)), artifacts, entities });
    if (Buffer.byteLength(manifest) > 2 * 1024 * 1024) throw new ValidationError("Auditor manifest exceeds 2 MiB; reduce selected scope.");
    add("manifest.json", manifest, "Package verification manifest");
    check();
    const ordered = Object.fromEntries(Object.entries(archive).sort(([a], [b]) => a.localeCompare(b)));
    const zipped = zipSync(ordered, { level: 0, mtime: new Date(1980, 0, 1) });
    check();
    return { bytes: zipped, manifestSha256: sha(manifest), contentSha256, snapshot, filename: `visua-auditor-${contentSha256.slice(0, 16)}.zip` };
  } finally { activeBuilds--; }
}
