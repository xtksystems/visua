import { afterEach, describe, expect, it } from "vitest";
import { copyFile, lstat, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { evidenceReviewScope } from "@visua/core";
import { createService } from "../src/context.ts";
import { LocalBlobStore } from "../src/blobs/local.ts";
import { createLocalBackup, restoreLocalBackup, verifyLocalBackup } from "../src/operations/local-backup.ts";
import { buildAuditorBundle } from "../src/services/auditor-bundle.ts";
import type { VisuaService } from "../src/services/visua.ts";

const directories: string[] = [], services: VisuaService[] = [];
afterEach(async () => {
  for (const svc of services.splice(0)) await svc.store.close();
  for (const path of directories.splice(0)) await rm(path, { force: true, recursive: true });
});
async function fixture() {
  const root = await mkdtemp(join(await realpath(tmpdir()), "visua-recovery-")); directories.push(root);
  const database = join(root, "source.sqlite"), blobs = join(root, "source-blobs"), output = join(root, "backup");
  await mkdir(blobs, { mode: 0o700 });
  const svc = await createService({ database, blobs: new LocalBlobStore(blobs) }); services.push(svc);
  const ws = await svc.createWorkspace({ name: "Recovery fixture", tenantId: "recovery-tenant", frameworks: ["nist-csf-2.0"], planInitialTasks: false,
    profile: { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 } });
  const bytes = Buffer.from([0, 255, 10, 45, 73, 128]);
  const evidence = await svc.createFileEvidence(ws.id, { title: "Retained observation", fileName: "observation.bin", mediaType: "application/octet-stream", requirementIds: ["nist-csf-2.0:PR.AA-01"], collectedAt: "2026-01-01", validUntil: "2030-01-01" }, bytes);
  await svc.reviewEvidence(ws.id, evidence.id, "accepted", "recovery-reviewer", undefined, evidenceReviewScope(evidence));
  await svc.createEvidence(ws.id, { title: "Inline record", content: "Retain inline bytes too", requirementIds: ["nist-csf-2.0:PR.AA-01"] });
  const expected = { workspace: await svc.workspace(ws.id), evidence: await svc.store.evidence.list(ws.id), activity: await svc.store.activity.chain(ws.id), revision: await svc.store.workspaces.rev(ws.id) };
  await svc.store.close(); services.pop();
  return { root, database, blobs, output, ws, bytes, evidence, expected };
}

describe("offline SQLite and local-blob recovery", () => {
  it("restores reviewed artifacts and audit history from a closed source, then exports their actual bytes", async () => {
    const f = await fixture();
    const manifest = await createLocalBackup({ ...f, quiesced: true });
    expect(manifest.blobs).toHaveLength(1);
    expect((await lstat(join(f.output, "database.sqlite"))).mode & 0o077).toBe(0);
    const database = join(f.root, "restored.sqlite"), blobs = join(f.root, "restored-blobs");
    expect(await restoreLocalBackup({ backup: f.output, database, blobs })).toEqual(manifest);
    const restored = await createService({ database, blobs: new LocalBlobStore(blobs) }); services.push(restored);
    expect(await restored.workspace(f.ws.id)).toEqual(f.expected.workspace);
    expect(await restored.store.workspaces.rev(f.ws.id)).toBe(f.expected.revision);
    expect(await restored.store.evidence.list(f.ws.id)).toEqual(f.expected.evidence);
    expect(await restored.store.activity.chain(f.ws.id)).toEqual(f.expected.activity);
    expect((await restored.verifyAuditTrail(f.ws.id)).valid).toBe(true);
    expect(Buffer.from((await restored.getEvidenceFile(f.ws.id, f.evidence.id)).bytes)).toEqual(f.bytes);
    const bundle = await buildAuditorBundle(restored, await restored.workspace(f.ws.id));
    expect(bundle.bytes.byteLength).toBeGreaterThan(f.bytes.byteLength);
    expect(bundle.snapshot.evidence.find(e => e.id === f.evidence.id)?.sha256).toBe(f.evidence.sha256);
  });

  it("requires stopped writers and refuses to overwrite any backup or restore destination", async () => {
    const f = await fixture();
    await expect(createLocalBackup({ ...f, quiesced: false })).rejects.toThrow("Stop all application writers");
    await createLocalBackup({ ...f, quiesced: true });
    await expect(createLocalBackup({ ...f, quiesced: true })).rejects.toThrow("already exists");
    const before = await readFile(f.database);
    await expect(restoreLocalBackup({ backup: f.output, database: f.database, blobs: join(f.root, "new-blobs") })).rejects.toThrow("already exists");
    expect(await readFile(f.database)).toEqual(before);
    await expect(lstat(join(f.root, "new-blobs"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each(["backup", "restore"])("rejects a genuine WAL overlay at the %s database without changing existing files", async location => {
    const f = await fixture();
    const source = new DatabaseSync(f.database);
    try { source.exec("CREATE TABLE retained_state(value TEXT); INSERT INTO retained_state VALUES ('expected');"); }
    finally { source.close(); }
    await createLocalBackup({ ...f, quiesced: true });
    const snapshot = join(f.output, "database.sqlite"), original = await readFile(snapshot);
    const stale = join(f.root, "stale.sqlite");
    await copyFile(snapshot, stale);
    const old = new DatabaseSync(stale);
    let wal: Buffer, shm: Buffer;
    try {
      old.exec("PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; UPDATE retained_state SET value='unexpected-stale-wal';");
      wal = await readFile(stale + "-wal"); shm = await readFile(stale + "-shm");
    } finally { old.close(); }
    // Establish that these copied sidecars change SQL-visible state without changing the main file.
    const probe = join(f.root, "probe.sqlite");
    await copyFile(snapshot, probe);
    await writeFile(probe + "-wal", wal); await writeFile(probe + "-shm", shm);
    const overlaid = new DatabaseSync(probe, { readOnly: true });
    try { expect(overlaid.prepare("SELECT value FROM retained_state").get()?.value).toBe("unexpected-stale-wal"); }
    finally { overlaid.close(); }
    expect(await readFile(probe)).toEqual(original);

    const database = join(f.root, "restored.sqlite"), blobs = join(f.root, "restored-blobs");
    const target = location === "backup" ? snapshot : database;
    await writeFile(target + "-wal", wal); await writeFile(target + "-shm", shm);
    if (location === "backup") await expect(verifyLocalBackup(f.output)).rejects.toThrow("SQLite sidecar already exists");
    await expect(restoreLocalBackup({ backup: f.output, database, blobs })).rejects.toThrow("SQLite sidecar already exists");
    expect(await readFile(target + "-wal")).toEqual(wal);
    expect(await readFile(target + "-shm")).toEqual(shm);
    expect(await readFile(snapshot)).toEqual(original);
    await expect(lstat(database)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(blobs)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each(["-shm", "-journal"])("refuses an isolated %s sidecar in the backup or restore destination and preserves it", async suffix => {
    const f = await fixture();
    await createLocalBackup({ ...f, quiesced: true });
    const snapshot = join(f.output, "database.sqlite"), original = await readFile(snapshot);
    const database = join(f.root, "restored.sqlite"), blobs = join(f.root, "restored-blobs");
    const bytes = Buffer.from("pre-existing sidecar");
    await writeFile(snapshot + suffix, bytes);
    await expect(verifyLocalBackup(f.output)).rejects.toThrow("SQLite sidecar already exists");
    await expect(restoreLocalBackup({ backup: f.output, database, blobs })).rejects.toThrow("SQLite sidecar already exists");
    expect(await readFile(snapshot + suffix)).toEqual(bytes);
    expect(await readFile(snapshot)).toEqual(original);
    await expect(lstat(database)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(blobs)).rejects.toMatchObject({ code: "ENOENT" });
    await rm(snapshot + suffix);
    await writeFile(database + suffix, bytes);
    await expect(restoreLocalBackup({ backup: f.output, database, blobs })).rejects.toThrow("SQLite sidecar already exists");
    expect(await readFile(database + suffix)).toEqual(bytes);
    await expect(lstat(database)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(blobs)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each(["database", "blob", "missing"])("detects %s corruption before creating restore destinations", async kind => {
    const f = await fixture();
    const manifest = await createLocalBackup({ ...f, quiesced: true });
    const target = join(f.output, kind === "database" ? "database.sqlite" : manifest.blobs[0]!.path);
    if (kind === "missing") await rm(target); else await writeFile(target, "tampered", { mode: 0o600 });
    const database = join(f.root, "restore.sqlite"), blobs = join(f.root, "restore-blobs");
    await expect(restoreLocalBackup({ backup: f.output, database, blobs })).rejects.toThrow();
    await expect(lstat(database)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(blobs)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects manifest path injection and symlinked artifact content", async () => {
    const f = await fixture();
    const manifest = await createLocalBackup({ ...f, quiesced: true });
    const original = await readFile(join(f.output, "manifest.json"), "utf8");
    manifest.blobs[0]!.path = "../../outside";
    await writeFile(join(f.output, "manifest.json"), JSON.stringify(manifest));
    await expect(verifyLocalBackup(f.output)).rejects.toThrow("references");
    await writeFile(join(f.output, "manifest.json"), original);
    const file = join(f.output, JSON.parse(original).blobs[0].path), outside = join(f.root, "outside");
    await writeFile(outside, f.bytes, { mode: 0o600 }); await rm(file); await symlink(outside, file);
    await expect(verifyLocalBackup(f.output)).rejects.toThrow();
  });

  it("does not publish an incomplete backup when a referenced original blob is missing", async () => {
    const f = await fixture();
    await rm(join(f.blobs, f.ws.tenantId!, f.ws.id, f.evidence.artifact!.id));
    await expect(createLocalBackup({ ...f, quiesced: true })).rejects.toThrow();
    await expect(lstat(f.output)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
