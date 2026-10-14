import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createService } from '../../../../apps/server/src/context.ts';
import { LocalBlobStore } from '../../../../apps/server/src/blobs/local.ts';
import { buildAuditorBundle } from '../../../../apps/server/src/services/auditor-bundle.ts';
import { verifyBundle } from '../../../../apps/server/src/services/bundle-verifier.mjs';
import { createLocalBackup, restoreLocalBackup } from '../../../../apps/server/src/operations/local-backup.ts';
import { evidenceReviewScope } from '../../../../packages/core/src/index.ts';
const { unzipSync } = createRequire(new URL('../../../../apps/server/package.json', import.meta.url))('fflate');
const root = fileURLToPath(new URL('./recovery-data', import.meta.url));
await mkdir(root, { mode: 0o700 });
const database = join(root, 'source.sqlite'), blobs = join(root, 'source-blobs');
const svc = await createService({ database, blobs: new LocalBlobStore(blobs) });
const fw = 'nist-csf-2.0', id = `${fw}:PR.AA-01`;
let ws, reviewed, original;
try {
 ws = await svc.createWorkspace({ name: 'Synthetic recovery fixture', tenantId: 'fixture-tenant', frameworks: [fw], planInitialTasks: false, profile: { industry: 'saas', size: '11-50', dataTypes: [], drivers: [], environments: ['cloud'], maturityTier: 1, guidance: 'guided', securityTeamSize: 1 } });
 const bytes = Buffer.from([0, 255, 13, 10, 1, 2, 3]);
 const item = await svc.createFileEvidence(ws.id, { title: 'Synthetic binary', fileName: 'fixture.bin', mediaType: 'application/octet-stream', requirementIds: [id], collectedAt: '2026-01-01', validUntil: '2027-12-31' }, bytes);
 reviewed = await svc.reviewEvidence(ws.id, item.id, 'accepted', 'fixture-reviewer', undefined, evidenceReviewScope(item));
 await assert.rejects(svc.blobs.get({ tenantId: 'foreign-tenant', workspaceId: ws.id }, reviewed.artifact));
 await assert.rejects(svc.updateEvidence(ws.id, item.id, { content: 'replacement' }), /immutable/);
 const bundle = await buildAuditorBundle(svc, ws);
 const extracted = join(root, 'bundle');
 await mkdir(extracted, { mode: 0o700 });
 for (const [path, body] of Object.entries(unzipSync(bundle.bytes))) { await mkdir(dirname(join(extracted, path)), { recursive: true, mode: 0o700 }); await writeFile(join(extracted, path), body, { mode: 0o600 }); }
 const verified = await verifyBundle(extracted, { manifestSha256: bundle.manifestSha256, checkpoint: { workspaceId: ws.id, ...bundle.snapshot.auditCheckpoint } });
 assert.equal(verified.integrity, 'verified');
 await assert.rejects(verifyBundle(extracted, { manifestSha256: 'f'.repeat(64) }), /External manifest hash mismatch/);
 console.log(JSON.stringify({ check: 'file isolation and bundle', foreignTenantReadRefused: true, fileMutationRefused: true, manifestAndCheckpointPinsVerified: verified.externalManifestPinChecked && verified.externalCheckpointPinChecked, incorrectPinRefused: true }));
 original = { reviewed, activity: await svc.store.activity.chain(ws.id), revision: await svc.store.workspaces.rev(ws.id), bytes };
} finally { await svc.store.close(); }
const output = join(root, 'backup');
const manifest = await createLocalBackup({ database, blobs, output, quiesced: true });
const restoredDatabase = join(root, 'restored.sqlite'), restoredBlobs = join(root, 'restored-blobs');
await restoreLocalBackup({ backup: output, database: restoredDatabase, blobs: restoredBlobs });
const restored = await createService({ database: restoredDatabase, blobs: new LocalBlobStore(restoredBlobs) });
try {
 const downloaded = await restored.getEvidenceFile(ws.id, reviewed.id);
 assert.deepEqual(Buffer.from(downloaded.bytes), original.bytes);
 assert.deepEqual(downloaded.evidence, original.reviewed);
 assert.deepEqual(await restored.store.activity.chain(ws.id), original.activity);
 assert.equal(await restored.store.workspaces.rev(ws.id), original.revision);
 assert.equal((await restored.verifyAuditTrail(ws.id)).valid, true);
 console.log(JSON.stringify({ check: 'quiesced local backup restore', referencedBlobs: manifest.blobs.length, exactBinaryRestored: true, boundReviewRestored: true, auditAndRevisionUnchanged: true }));
} finally { await restored.store.close(); }
