import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, readFile, rm, symlink, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { evidenceReviewScope, type CheckResult, type OrganizationProfile } from "@visua/core";
import { FrameworkRegistry } from "@visua/frameworks";
import { createApp } from "../src/app.ts";
import { createService } from "../src/context.ts";
import { AuthService } from "../src/auth/service.ts";
import { loadAuthConfig } from "../src/auth/config.ts";
import { MemoryBlobStore } from "../src/blobs/index.ts";
import { canonical, GENESIS } from "../src/audit.ts";
import { buildAuditorBundle } from "../src/services/auditor-bundle.ts";
import * as snapshots from "../src/services/export-snapshot.ts";
import { TestClient } from "./client.ts";

const exec = promisify(execFile), hash = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const verifier = fileURLToPath(new URL("../src/services/bundle-verifier.mjs", import.meta.url));
const svc = await createService({ database: ":memory:", registry: FrameworkRegistry.load(), blobs: new MemoryBlobStore() });
const auth = new AuthService(svc, { ...loadAuthConfig({}), mode: "dev" });
const client = new TestClient(createApp(svc, auth));
const login = await client.devLogin("auditor-bundle@example.test", "Auditor fixture");
const tenantId = login.json.activeTenant!.id;
const profile: OrganizationProfile = { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 };
const A = "nist-csf-2.0:PR.AA-01", B = "nist-csf-2.0:PR.AA-02";
const selection = { asOf: "2026-01-01T00:00:00Z", frameworkIds: ["nist-csf-2.0"] };
const temp: string[] = [];
const workspace = () => svc.createWorkspace({ name: "Bundle <script>alert(1)</script>", tenantId, profile, frameworks: ["nist-csf-2.0"] });
async function extract(bytes: Uint8Array) {
  const root = await mkdtemp(join(tmpdir(), "visua-bundle-")); temp.push(root);
  const files = unzipSync(bytes);
  for (const [path, body] of Object.entries(files)) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), body); }
  return root;
}
const readJson = async (root: string, file: string) => JSON.parse(await readFile(join(root, file), "utf8"));
const writeJson = async (root: string, file: string, data: unknown) => writeFile(join(root, file), canonical(data) + "\n");
const verify = (root: string, args: string[] = []) => exec(process.execPath, [verifier, root, ...args]);
async function repin(root: string) {
  const manifest = await readJson(root, "manifest.json");
  const snapshot = await readJson(root, "snapshot.json");
  manifest.entities = ["states", "evidence", "tasks", "policies", "checks", "activity"].flatMap(kind => snapshot[kind].map((e: { nodeId?: string; id?: string }) => ({ kind, id: kind === "states" ? e.nodeId : e.id, sha256: hash(canonical(e)) })));
  const { capturedAt: _time, ...stableSnapshot } = snapshot;
  manifest.contentSha256 = hash(canonical({ snapshot: stableSnapshot, artifacts: manifest.artifacts, sources: await readJson(root, "sources.json") }));
  for (const file of manifest.files) { const bytes = await readFile(join(root, file.path)); file.sha256 = hash(bytes); file.size = bytes.length; }
  await writeJson(root, "manifest.json", manifest);
}
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
afterAll(async () => { await svc.store.close(); await Promise.all(temp.map(path => rm(path, { recursive: true, force: true }))); });

describe("frozen auditor package and standalone offline verifier", () => {
  it("round-trips original file and canonical inline bytes, reviews, state rationales and a separately pinned checkpoint without business writes", async () => {
    const ws = await workspace();
    await svc.updateState(ws.id, A, { current: 2, target: 4, notes: "Observation <script>bad()</script>" });
    await svc.updateState(ws.id, B, { applicable: false, applicabilityRationale: "Outside contracted service" });
    const bytes = Buffer.from([0, 255, 13, 10, 1, 2]);
    const file = await svc.createFileEvidence(ws.id, { title: "File <script>bad()</script>", fileName: "hostile.html", mediaType: "text/html", requirementIds: [A], collectedAt: "2025-12-01" }, bytes);
    const inline = await svc.createEvidence(ws.id, { title: "Inline", content: '{"observed":true}', data: { a: 1 }, requirementIds: [A], collectedAt: "2025-12-01" });
    const connector = await svc.createEvidence(ws.id, { title: "Connector", source: "connector", data: { checkId: "check-1", observed: { b: 2, a: 1 } }, requirementIds: [A], collectedAt: "2025-12-01" });
    const metadata = await svc.createEvidence(ws.id, { title: "Metadata only", requirementIds: [A] });
    await svc.reviewEvidence(ws.id, file.id, "accepted", "Person", undefined, evidenceReviewScope(file));
    const rev = await svc.store.workspaces.rev(ws.id), activity = await svc.store.activity.chain(ws.id);
    const result = await buildAuditorBundle(svc, ws, selection), root = await extract(result.bytes);
    expect(await svc.store.workspaces.rev(ws.id)).toBe(rev);
    expect(await svc.store.activity.chain(ws.id)).toEqual(activity);
    const manifest = await readJson(root, "manifest.json"), snapshot = await readJson(root, "snapshot.json");
    const record = (id: string) => manifest.artifacts.find((a: { evidenceId: string }) => a.evidenceId === id);
    expect(await readFile(join(root, record(file.id).path))).toEqual(bytes);
    expect(await readFile(join(root, record(inline.id).path), "utf8")).toBe(canonical({ content: inline.content, data: inline.data }));
    expect(await readFile(join(root, record(connector.id).path), "utf8")).toBe(canonical({ checkId: "check-1", observed: { b: 2, a: 1 }, observedAt: connector.collectedAt }));
    expect(record(metadata.id)).toEqual({ evidenceId: metadata.id, kind: "not-recorded" });
    expect(snapshot.states.find((s: { nodeId: string }) => s.nodeId === B)).toMatchObject({ applicable: false, userExclusion: { rationale: "Outside contracted service" } });
    expect(snapshot.evidence.find((e: { id: string }) => e.id === file.id).reviewHistory.at(-1).decision).toBe("accepted");
    const html = await readFile(join(root, "index.html"), "utf8");
    expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain("<script>"); expect(html).not.toContain('src="http');
    expect(html).toContain("Outside contracted service");
    const pin = `${ws.id}:${manifest.checkpoint.seq}:${manifest.checkpoint.hash}`;
    const checked = JSON.parse((await verify(root, ["--manifest-sha256", result.manifestSha256, "--checkpoint", pin])).stdout);
    expect(checked).toMatchObject({ integrity: "verified", externalManifestPinChecked: true, externalCheckpointPinChecked: true });
    // Execute the actually extracted helper too, after establishing equality to our trusted copy.
    expect(await readFile(join(root, "verify.mjs"))).toEqual(await readFile(verifier));
    expect(JSON.parse((await exec(process.execPath, [join(root, "verify.mjs"), root])).stdout).externalManifestPinChecked).toBe(false);
    await expect(verify(root, ["--checkpoint", `${ws.id}:0:${GENESIS}`])).rejects.toThrow(/External checkpoint mismatch/);
    await expect(verify(root, ["--manifest-sha256", "f".repeat(64)])).rejects.toThrow(/External manifest hash mismatch/);
  });

  it("includes source observations and honestly distinguishes retained approved-policy bytes from recorded-only history", async () => {
    const ws = await workspace();
    const policy = await svc.createPolicy(ws.id, { title: "Access policy", body: "Version one approved body", requirementIds: [A] });
    const approved = await svc.updatePolicy(ws.id, policy.id, { status: "approved" }, "Approver");
    await svc.updatePolicy(ws.id, policy.id, { body: "Version two draft body" });
    await svc.createEvidence(ws.id, { title: "Old policy reference only", requirementIds: [A] }, "Recorder", { policy: { ...approved, version: 0, body: "Unretained version zero" } });
    const check: CheckResult = { id: "check-bundle", workspaceId: ws.id, connectorId: "source-connector", checkId: "source-check", title: "Source observation", outcome: "pass", detail: "Configuration observed", requirementIds: [A], observed: { enabled: true }, observedAt: "2025-12-01T00:00:00.000Z" };
    await svc.store.checks.put(check);
    const evidence = await svc.createEvidence(ws.id, { title: "Recorded check", source: "connector", data: { checkId: check.checkId, observed: check.observed }, collectedAt: check.observedAt, requirementIds: [A] }, "Connector", { check });
    const bundle = await buildAuditorBundle(svc, ws, selection), root = await extract(bundle.bytes);
    const versions = await readJson(root, "policy-versions.json");
    expect(versions.references).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: policy.id, version: 1, availability: "Historical body stored in evidence.content" }),
      expect.objectContaining({ id: policy.id, version: 0, availability: "Recorded reference only; historic bytes not stored" }),
    ]));
    expect(bundle.snapshot.checks).toContainEqual(check);
    expect(bundle.snapshot.evidence.find(e => e.id === evidence.id)?.provenance?.check?.resultId).toBe(check.id);
    expect(JSON.parse((await verify(root)).stdout).integrity).toBe("verified");
  });

  it("keeps stable content and artifact identifiers with fixed asOf across generation times", async () => {
    const ws = await workspace();
    await svc.createEvidence(ws.id, { title: "Inline", content: "stable", requirementIds: [A] });
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-01T00:00:00Z"));
    const first = await buildAuditorBundle(svc, ws, selection);
    vi.setSystemTime(new Date("2026-10-02T00:00:00Z"));
    const second = await buildAuditorBundle(svc, ws, selection);
    expect(first.contentSha256).toBe(second.contentSha256);
    expect(first.manifestSha256).not.toBe(second.manifestSha256);
    const one = unzipSync(first.bytes), two = unzipSync(second.bytes);
    expect(Object.keys(one).filter(p => p.startsWith("artifacts/"))).toEqual(Object.keys(two).filter(p => p.startsWith("artifacts/")));
    expect(first.snapshot.capturedAt).not.toBe(second.snapshot.capturedAt);
  });

  it("releases the capture transaction before blob I/O and retains the frozen revision while a normal mutation completes", async () => {
    const ws = await workspace();
    await svc.createFileEvidence(ws.id, { title: "File", fileName: "a.txt", mediaType: "text/plain", requirementIds: [A] }, Buffer.from("data"));
    const revision = await svc.store.workspaces.rev(ws.id), original = svc.blobs.get.bind(svc.blobs);
    vi.spyOn(svc.blobs, "get").mockImplementationOnce(async (...args) => { await svc.updateState(ws.id, A, { current: 3 }); return original(...args); });
    const bundle = await buildAuditorBundle(svc, ws, selection);
    expect(bundle.snapshot.revision).toBe(revision);
    expect(bundle.snapshot.states.find(s => s.nodeId === A)?.current).toBe(0);
    expect((await svc.store.states.get(ws.id, A))?.current).toBe(3);
  });

  it("detects tampered bytes, missing artifact refs, altered chain events and coordinated truncation against a retained pin", async () => {
    const ws = await workspace();
    await svc.createEvidence(ws.id, { title: "Inline", content: "artifact bytes", requirementIds: [A] });
    const bundle = await buildAuditorBundle(svc, ws, selection);
    let root = await extract(bundle.bytes), manifest = await readJson(root, "manifest.json");
    await writeFile(join(root, manifest.artifacts[0].path), "tampered");
    await expect(verify(root)).rejects.toThrow(/File digest mismatch/);
    root = await extract(bundle.bytes); manifest = await readJson(root, "manifest.json");
    await rm(join(root, manifest.artifacts[0].path));
    await expect(verify(root)).rejects.toThrow(/ENOENT/);
    root = await extract(bundle.bytes); manifest = await readJson(root, "manifest.json"); manifest.artifacts[0].path = "artifacts/missing.json";
    await writeJson(root, "manifest.json", manifest);
    await expect(verify(root)).rejects.toThrow(/Invalid artifact path/);
    root = await extract(bundle.bytes);
    let snapshot = await readJson(root, "snapshot.json"); snapshot.activity[0].summary = "rewritten";
    await writeJson(root, "snapshot.json", snapshot); await repin(root);
    await expect(verify(root)).rejects.toThrow(/Audit event hash mismatch/);
    root = await extract(bundle.bytes); manifest = await readJson(root, "manifest.json"); snapshot = await readJson(root, "snapshot.json");
    const retainedPin = `${ws.id}:${manifest.checkpoint.seq}:${manifest.checkpoint.hash}`;
    snapshot.activity.pop();
    const head = snapshot.activity.at(-1);
    manifest.checkpoint = snapshot.auditCheckpoint = { seq: head?.seq ?? 0, hash: head?.hash ?? GENESIS };
    await writeJson(root, "snapshot.json", snapshot); await writeJson(root, "manifest.json", manifest); await repin(root);
    expect(JSON.parse((await verify(root)).stdout).integrity).toBe("verified");
    await expect(verify(root, ["--checkpoint", retainedPin])).rejects.toThrow(/External checkpoint mismatch/);
    await expect(verify(root, ["--manifest-sha256", bundle.manifestSha256])).rejects.toThrow(/External manifest hash mismatch/);
  });

  it("rejects traversal, duplicate entries, symlinks, malformed manifests and excess verification count/bytes", async () => {
    const bundle = await buildAuditorBundle(svc, await workspace(), selection);
    for (const path of ["../outside.txt", "/tmp/outside.txt", "artifacts/../../outside.txt", "artifacts\\outside.txt"]) {
      const root = await extract(bundle.bytes), m = await readJson(root, "manifest.json");
      m.files[0].path = path; await writeJson(root, "manifest.json", m);
      await expect(verify(root)).rejects.toThrow(/Unsafe or duplicate/);
    }
    let root = await extract(bundle.bytes), m = await readJson(root, "manifest.json");
    m.files.push(m.files[0]); await writeJson(root, "manifest.json", m);
    await expect(verify(root)).rejects.toThrow(/duplicate/);
    root = await extract(bundle.bytes); await rm(join(root, "snapshot.json")); await symlink(join(root, "sources.json"), join(root, "snapshot.json"));
    await expect(verify(root)).rejects.toThrow(/Symlink rejected/);
    root = await extract(bundle.bytes); await writeFile(join(root, "unexpected.txt"), "addition");
    await expect(verify(root)).rejects.toThrow(/Unlisted file/);
    root = await extract(bundle.bytes); m = await readJson(root, "manifest.json");
    const canonicalManifest = canonical(m); await writeFile(join(root, "manifest.json"), canonicalManifest.slice(0, -1) + ',"version":1}\n');
    await expect(verify(root)).rejects.toThrow(/duplicate keys/);
    root = await extract(bundle.bytes); await writeFile(join(root, "manifest.json"), "{");
    await expect(verify(root)).rejects.toThrow(/Integrity verification failed/);
    root = await extract(bundle.bytes); m = await readJson(root, "manifest.json"); m.files = Array.from({ length: 513 }, () => m.files[0]); await writeJson(root, "manifest.json", m);
    await expect(verify(root)).rejects.toThrow(/Invalid file count/);
    root = await extract(bundle.bytes); await writeFile(join(root, "manifest.json"), " ".repeat(2 * 1024 * 1024 + 1));
    await expect(verify(root)).rejects.toThrow(/byte bound/);
    root = await extract(bundle.bytes); await truncate(join(root, "snapshot.json"), 65 * 1024 * 1024);
    await expect(verify(root)).rejects.toThrow(/byte bound/);
  });

  it.skipIf(process.platform === "win32").each(["manifest.json", "snapshot.json"])("rejects a FIFO at %s without blocking the verifier", async path => {
    const bundle = await buildAuditorBundle(svc, await workspace(), selection), root = await extract(bundle.bytes);
    await rm(join(root, path));
    await exec("mkfifo", [join(root, path)], { timeout: 1500, killSignal: "SIGKILL" });
    // A blocking open must fail this assertion after a bounded child lifetime, not hang the test runner.
    await expect(exec(process.execPath, [verifier, root], { timeout: 1500, killSignal: "SIGKILL" })).rejects.toMatchObject({
      code: 1, killed: false, stderr: expect.stringContaining("Expected a regular file"),
    });
  });

  it("uses generated paths even when recorded filenames and evidence IDs are hostile", async () => {
    const ws = await workspace();
    const e = await svc.createEvidence(ws.id, { title: "Hostile", content: "still valid", requirementIds: [A] });
    const snapshot = await snapshots.captureExportSnapshot(svc, ws, selection);
    snapshot.evidence[0] = { ...e, id: "../../escape<script>", fileName: "../../danger.html" };
    vi.spyOn(snapshots, "captureExportSnapshot").mockResolvedValue(snapshot);
    const bundle = await buildAuditorBundle(svc, ws, selection), files = unzipSync(bundle.bytes);
    const artifactPaths = Object.keys(files).filter(p => p.startsWith("artifacts/"));
    expect(artifactPaths).toEqual([`artifacts/${hash("../../escape<script>")}.json`]);
    expect(JSON.parse((await verify(await extract(bundle.bytes))).stdout).integrity).toBe("verified");
  });

  it("fails atomically for missing stored bytes, corrupted bytes, count and declared byte limits", async () => {
    const ws = await workspace();
    const e = await svc.createFileEvidence(ws.id, { title: "File", fileName: "a.bin", mediaType: "application/octet-stream", requirementIds: [A] }, Buffer.from("actual"));
    const get = vi.spyOn(svc.blobs, "get").mockResolvedValueOnce(Buffer.from("wrong"));
    await expect(buildAuditorBundle(svc, ws, selection)).rejects.toThrow(/fails integrity checks/);
    get.mockRestore();
    await svc.blobs.delete({ tenantId, workspaceId: ws.id }, e.artifact!.id);
    await expect(buildAuditorBundle(svc, ws, selection)).rejects.toThrow(/missing/);
    const snapshot = await snapshots.captureExportSnapshot(svc, ws, selection);
    snapshot.evidence = Array.from({ length: 257 }, (_, i) => ({ ...e, id: `e-${i}` }));
    const capture = vi.spyOn(snapshots, "captureExportSnapshot").mockResolvedValue(snapshot);
    await expect(buildAuditorBundle(svc, ws, selection)).rejects.toThrow(/256 artifacts/);
    snapshot.evidence = [{ ...e, artifact: { ...e.artifact!, size: 65 * 1024 * 1024 } }]; capture.mockResolvedValue(snapshot);
    await expect(buildAuditorBundle(svc, ws, selection)).rejects.toThrow(/64 MiB/);
  });

  it("bounds concurrent builds and releases slots after completion or timeout", async () => {
    const ws = await workspace();
    await svc.createFileEvidence(ws.id, { title: "File", fileName: "a.bin", mediaType: "application/octet-stream", requirementIds: [A] }, Buffer.from("data"));
    const original = svc.blobs.get.bind(svc.blobs);
    let release!: () => void, reached!: () => void, calls = 0;
    const blocked = new Promise<void>(resolve => { release = resolve; }), entered = new Promise<void>(resolve => { reached = resolve; });
    const get = vi.spyOn(svc.blobs, "get").mockImplementation(async (...args) => { if (++calls === 2) reached(); await blocked; return original(...args); });
    const one = buildAuditorBundle(svc, ws, selection), two = buildAuditorBundle(svc, ws, selection);
    await entered;
    await expect(buildAuditorBundle(svc, ws, selection)).rejects.toThrow(/already building/);
    release(); await Promise.all([one, two]); get.mockRestore();
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-01T00:00:00Z"));
    vi.spyOn(svc.blobs, "get").mockImplementationOnce(async (...args) => { vi.setSystemTime(new Date("2026-10-01T00:01:01Z")); return original(...args); });
    await expect(buildAuditorBundle(svc, ws, selection)).rejects.toThrow(/60-second/);
    vi.useRealTimers();
    expect((await buildAuditorBundle(svc, ws, selection)).bytes.length).toBeGreaterThan(0);
  });
});
