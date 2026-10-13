/** Offline SQLite/local-blob backup. Keep operator-owned parent directories quiesced throughout; restore only into new paths. */
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { chmod, copyFile, lstat, mkdir, mkdtemp, open, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Evidence } from "@visua/core";
import { LocalBlobStore } from "../blobs/local.ts";
import { checkedReference, checkedScope, type BlobReference, type BlobScope } from "../blobs/shared.ts";

interface FileDigest { path: string; size: number; sha256: string }
export interface LocalBackupManifest {
  format: "visua-local-backup";
  version: 1;
  capturedAt: string;
  basis: string;
  database: FileDigest;
  blobs: FileDigest[];
}
interface StoredArtifact { scope: BlobScope; reference: BlobReference; path: string }

async function digest(path: string): Promise<Omit<FileDigest, "path">> {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new Error("Expected a regular file with no links");
  const hash = createHash("sha256");
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = await handle.stat();
    if (opened.dev !== stat.dev || opened.ino !== stat.ino || opened.size !== stat.size) throw new Error("File changed while opening backup");
    for await (const bytes of handle.createReadStream({ autoClose: false })) hash.update(bytes);
  } finally { await handle.close(); }
  return { size: stat.size, sha256: hash.digest("hex") };
}
async function absent(path: string, message = "Destination already exists; restore and backup never overwrite existing paths"): Promise<void> {
  try { await lstat(path); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw error; }
  throw new Error(message);
}
async function absentDatabaseSidecars(database: string): Promise<void> {
  for (const suffix of ["-wal", "-shm", "-journal"]) {
    await absent(database + suffix, "SQLite sidecar already exists; backup snapshots and restore destinations must have no adjacent -wal, -shm, or -journal files");
  }
}
async function canonicalParent(path: string): Promise<string> {
  const target = resolve(path), parent = dirname(target);
  if (await realpath(parent) !== parent || !(await lstat(parent)).isDirectory()) throw new Error("Use an existing canonical, operator-owned parent directory");
  return target;
}
function artifacts(database: string): StoredArtifact[] {
  const db = new DatabaseSync(database, { readOnly: true });
  try {
    if (db.prepare("PRAGMA quick_check").get()?.["quick_check"] !== "ok") throw new Error("Database integrity check failed");
    const rows = db.prepare("SELECT e.data, e.workspace_id, w.tenant_id FROM evidence e LEFT JOIN workspaces w ON w.id = e.workspace_id").all();
    const items = new Map<string, StoredArtifact>();
    for (const row of rows) {
      const evidence = JSON.parse(String(row["data"])) as Evidence;
      if (!evidence.artifact) continue;
      const scope = checkedScope({ tenantId: String(row["tenant_id"] ?? ""), workspaceId: String(row["workspace_id"]) });
      const reference = checkedReference(evidence.artifact);
      if (evidence.workspaceId !== scope.workspaceId || evidence.sha256 !== reference.sha256) throw new Error("Evidence artifact metadata is inconsistent");
      const path = `blobs/${scope.tenantId}/${scope.workspaceId}/${reference.id}`;
      const previous = items.get(path);
      if (previous && JSON.stringify(previous.reference) !== JSON.stringify(reference)) throw new Error("Conflicting references for one artifact");
      items.set(path, { scope, reference, path });
    }
    return [...items.values()].sort((a, b) => a.path.localeCompare(b.path));
  } finally { db.close(); }
}
async function storeBytes(root: string, item: StoredArtifact, bytes: Uint8Array): Promise<void> {
  const path = join(root, item.path);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, bytes, { mode: 0o600, flag: "wx" });
}

/** Caller must stop every writer first, including other instances using this database/blob root. */
export async function createLocalBackup(input: { database: string; blobs: string; output: string; quiesced: boolean }): Promise<LocalBackupManifest> {
  if (input.quiesced !== true) throw new Error("Stop all application writers and confirm quiesced before backing up");
  const database = resolve(input.database), output = await canonicalParent(input.output);
  if (await realpath(database) !== database) throw new Error("Database path must be canonical");
  await absent(output);
  const stage = await mkdtemp(join(dirname(output), ".visua-backup-"));
  await chmod(stage, 0o700);
  try {
    const snapshotPath = join(stage, "database.sqlite");
    const db = new DatabaseSync(database, { readOnly: true });
    try { db.prepare("VACUUM INTO ?").run(snapshotPath); } finally { db.close(); }
    await chmod(snapshotPath, 0o600);
    await mkdir(join(stage, "blobs"), { mode: 0o700 });
    const source = new LocalBlobStore(input.blobs), files: FileDigest[] = [];
    for (const item of artifacts(snapshotPath)) {
      const bytes = await source.get(item.scope, item.reference);
      await storeBytes(stage, item, bytes);
      files.push({ path: item.path, sha256: item.reference.sha256, size: item.reference.size });
    }
    const manifest: LocalBackupManifest = {
      format: "visua-local-backup", version: 1, capturedAt: new Date().toISOString(),
      basis: "Quiesced SQLite snapshot and every currently referenced local evidence blob. Unreferenced/deleted artifacts are not retained. Included hashes establish consistency, not independent authenticity.",
      database: { path: "database.sqlite", ...await digest(snapshotPath) }, blobs: files,
    };
    await writeFile(join(stage, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600, flag: "wx" });
    await verifyLocalBackup(stage);
    await absent(output);
    await rename(stage, output);
    return manifest;
  } catch (error) { await rm(stage, { recursive: true, force: true }); throw error; }
}

/** Validate bytes and reference closure before creating any restore destination. */
export async function verifyLocalBackup(input: string): Promise<LocalBackupManifest> {
  const root = resolve(input);
  if (await realpath(root) !== root || !(await lstat(root)).isDirectory()) throw new Error("Backup directory must be canonical");
  const manifestPath = join(root, "manifest.json");
  const stat = await lstat(manifestPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16 * 1024 * 1024) throw new Error("Invalid backup manifest");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as LocalBackupManifest;
  if (manifest.format !== "visua-local-backup" || manifest.version !== 1 || manifest.database?.path !== "database.sqlite" || !Array.isArray(manifest.blobs)) throw new Error("Unsupported backup manifest");
  const database = join(root, "database.sqlite");
  await absentDatabaseSidecars(database);
  const actual = await digest(database);
  if (actual.sha256 !== manifest.database.sha256 || actual.size !== manifest.database.size) throw new Error("Backup database digest mismatch");
  const expected = artifacts(database);
  const records = new Map<string, FileDigest>();
  for (const file of manifest.blobs) {
    if (!file || typeof file.path !== "string" || records.has(file.path)) throw new Error("Invalid or duplicate blob manifest entry");
    records.set(file.path, file);
  }
  if (records.size !== expected.length) throw new Error("Backup blob references do not match the database");
  const blobs = new LocalBlobStore(join(root, "blobs"));
  for (const item of expected) {
    const record = records.get(item.path);
    if (!record || record.size !== item.reference.size || record.sha256 !== item.reference.sha256) throw new Error("Backup blob references do not match the database");
    await blobs.get(item.scope, item.reference);
  }
  return manifest;
}

/** New destinations only. Do not start an application against them until this promise succeeds. */
export async function restoreLocalBackup(input: { backup: string; database: string; blobs: string }): Promise<LocalBackupManifest> {
  const backup = resolve(input.backup), database = await canonicalParent(input.database), blobs = await canonicalParent(input.blobs);
  if (database === blobs || database.startsWith(blobs + "/") || blobs.startsWith(database + "/")) throw new Error("Database and blob destinations must be separate paths");
  await absent(database); await absent(blobs);
  await absentDatabaseSidecars(database);
  const manifest = await verifyLocalBackup(backup);
  let createdBlobs = false, createdDatabase = false;
  try {
    await mkdir(blobs, { mode: 0o700 }); createdBlobs = true;
    const source = new LocalBlobStore(join(backup, "blobs"));
    for (const item of artifacts(join(backup, "database.sqlite"))) {
      const bytes = await source.get(item.scope, item.reference);
      const target = join(blobs, item.scope.tenantId, item.scope.workspaceId);
      await mkdir(target, { recursive: true, mode: 0o700 });
      await writeFile(join(target, item.reference.id), bytes, { flag: "wx", mode: 0o600 });
    }
    await copyFile(join(backup, "database.sqlite"), database, constants.COPYFILE_EXCL); createdDatabase = true;
    await chmod(database, 0o600);
    const actual = await digest(database);
    if (actual.sha256 !== manifest.database.sha256) throw new Error("Restored database digest mismatch");
    const restored = new LocalBlobStore(blobs);
    for (const item of artifacts(database)) await restored.get(item.scope, item.reference);
    return manifest;
  } catch (error) {
    if (createdDatabase) await rm(database, { force: true });
    if (createdBlobs) await rm(blobs, { force: true, recursive: true });
    throw error;
  }
}
