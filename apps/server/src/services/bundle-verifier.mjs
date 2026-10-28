#!/usr/bin/env node
// Standalone, dependency-free verifier. Use a separately trusted copy for untrusted bundles.
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, opendir, realpath } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const MAX_BYTES = 64 * 1024 * 1024, MAX_FILES = 512, GENESIS = '0'.repeat(64);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).filter(k => value[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const safePath = value => typeof value === 'string' && value.length < 200 && /^[a-z0-9-]+(?:\/[a-z0-9-]+)*\.[a-z0-9]+$/.test(value);
const entityDigests = snapshot => ['states', 'evidence', 'tasks', 'policies', 'checks', 'activity'].flatMap(kind => snapshot[kind].map(entity => ({ kind, id: kind === 'states' ? entity.nodeId : entity.id, sha256: digest(canonical(entity)) })));

export async function verifyBundle(directory, pins = {}) {
  const root = await realpath(directory);
  assert((await lstat(root)).isDirectory(), 'Bundle root must be a directory');
  let total = 0;
  async function read(path, limit = MAX_BYTES) {
    assert(safePath(path), `Unsafe path: ${path}`);
    let current = root;
    for (const part of path.split('/')) {
      current = join(current, part);
      assert(!(await lstat(current)).isSymbolicLink(), `Symlink rejected: ${path}`);
    }
    assert((await realpath(current)).startsWith(root + sep), `Path escapes bundle: ${path}`);
    const before = await lstat(current);
    assert(before.isFile(), `Expected a regular file: ${path}`);
    // Nonblocking open also protects against replacement with a FIFO after preflight.
    const handle = await open(current, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const stat = await handle.stat();
      assert(stat.isFile(), `Expected a regular file: ${path}`);
      assert(stat.dev === before.dev && stat.ino === before.ino && stat.size === before.size, `File changed while opening: ${path}`);
      assert(stat.size <= limit && total + stat.size <= MAX_BYTES, `Verification byte bound exceeded: ${path}`);
      total += stat.size;
      // Read at most the preflight size plus one byte, even if a file grows concurrently.
      const buffer = Buffer.alloc(stat.size + 1);
      let length = 0;
      while (length < buffer.length) {
        const result = await handle.read(buffer, length, buffer.length - length, null);
        if (!result.bytesRead) break;
        length += result.bytesRead;
      }
      assert(length === stat.size && (await handle.stat()).size === stat.size, `File changed during verification: ${path}`);
      return buffer.subarray(0, length);
    } finally { await handle.close(); }
  }
  const manifestBytes = await read('manifest.json', 2 * 1024 * 1024);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  assert(manifestBytes.toString('utf8') === canonical(manifest) + '\n', 'Manifest must be canonical JSON; duplicate keys or noncanonical encoding rejected');
  assert(manifest.format === 'visua-auditor-bundle' && manifest.version === 1, 'Unsupported manifest');
  assert(typeof manifest.workspaceId === 'string' && manifest.workspaceId.length > 0, 'Invalid workspace');
  assert(Number.isSafeInteger(manifest.checkpoint?.seq) && manifest.checkpoint.seq >= 0 && hash(manifest.checkpoint.hash), 'Invalid checkpoint');
  assert(Array.isArray(manifest.files) && manifest.files.length <= MAX_FILES, 'Invalid file count');
  assert(Array.isArray(manifest.artifacts) && manifest.artifacts.length <= 1000 && manifest.artifacts.filter(a => a.kind !== 'not-recorded').length <= 256, 'Invalid artifact count');
  assert(Array.isArray(manifest.entities) && manifest.entities.length <= 20000, 'Invalid entity count');
  const manifestSha256 = digest(manifestBytes);
  if (pins.manifestSha256 !== undefined) assert(hash(pins.manifestSha256) && pins.manifestSha256 === manifestSha256, 'External manifest hash mismatch');
  if (pins.checkpoint !== undefined) assert(pins.checkpoint.workspaceId === manifest.workspaceId && pins.checkpoint.seq === manifest.checkpoint.seq && pins.checkpoint.hash === manifest.checkpoint.hash, 'External checkpoint mismatch');
  const files = new Map(), paths = new Set(['manifest.json']);
  for (const file of manifest.files) {
    assert(safePath(file.path) && !paths.has(file.path), `Unsafe or duplicate file: ${file.path}`);
    assert(Number.isSafeInteger(file.size) && file.size >= 0 && hash(file.sha256) && typeof file.purpose === 'string', 'Malformed file record');
    paths.add(file.path);
    const bytes = await read(file.path);
    assert(bytes.length === file.size && digest(bytes) === file.sha256, `File digest mismatch: ${file.path}`);
    files.set(file.path, bytes);
  }
  // Reject hidden additions and every symlink, including files not in the manifest.
  let entries = 0;
  async function walk(path, prefix = '') {
    for await (const entry of await opendir(path)) {
      assert(++entries <= MAX_FILES * 2, 'Directory entry bound exceeded');
      const name = prefix + entry.name;
      if (entry.isDirectory()) { assert(/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(name), 'Unsafe directory'); await walk(join(path, entry.name), name + '/'); }
      else assert(entry.isFile() && paths.has(name), `Unlisted file or symlink: ${name}`);
    }
  }
  await walk(root);
  function json(path) { assert(files.has(path), `Missing required file: ${path}`); return JSON.parse(files.get(path).toString('utf8')); }
  for (const path of ['index.html', 'verify.mjs', 'readme.txt']) assert(files.has(path), `Missing required file: ${path}`);
  const snapshot = json('snapshot.json'), sources = json('sources.json');
  assert(snapshot.schemaVersion === 1 && snapshot.workspace?.id === manifest.workspaceId && snapshot.revision === manifest.revision && snapshot.capturedAt === manifest.capturedAt && snapshot.asOf === manifest.asOf, 'Snapshot identity mismatch');
  assert(canonical(snapshot.auditCheckpoint) === canonical(manifest.checkpoint), 'Snapshot checkpoint mismatch');
  json('policy-versions.json');
  const reports = json('reports.json');
  assert(Array.isArray(reports) && reports.length <= 32, 'Invalid report inventory');
  for (const report of reports) assert(typeof report.name === 'string' && (report.path === undefined ? typeof report.unavailable === 'string' : safePath(report.path) && report.path.startsWith('reports/') && files.has(report.path)), 'Missing or malformed report reference');
  for (const kind of ['states', 'evidence', 'tasks', 'policies', 'checks', 'activity']) {
    assert(Array.isArray(snapshot[kind]) && snapshot[kind].length <= 20000, `Invalid ${kind}`);
    const ids = snapshot[kind].map(e => kind === 'states' ? e.nodeId : e.id);
    assert(ids.every(id => typeof id === 'string') && new Set(ids).size === ids.length, `Duplicate or invalid ${kind} identity`);
  }
  assert(canonical(entityDigests(snapshot)) === canonical(manifest.entities), 'Entity digests mismatch');
  let seq = 0, previous = GENESIS;
  for (const event of snapshot.activity) {
    assert(event.workspaceId === manifest.workspaceId && event.seq === ++seq && event.prevHash === previous, 'Audit sequence or predecessor mismatch');
    const { hash: recordedHash, ...body } = event;
    assert(hash(recordedHash) && recordedHash === digest(previous + canonical(body)), 'Audit event hash mismatch');
    previous = recordedHash;
  }
  assert(seq === manifest.checkpoint.seq && previous === manifest.checkpoint.hash, 'Audit checkpoint mismatch');
  const artifacts = new Map();
  for (const artifact of manifest.artifacts) {
    assert(typeof artifact.evidenceId === 'string' && !artifacts.has(artifact.evidenceId), 'Duplicate artifact reference');
    artifacts.set(artifact.evidenceId, artifact);
  }
  assert(artifacts.size === snapshot.evidence.length, 'Artifact inventory mismatch');
  for (const evidence of snapshot.evidence) {
    const artifact = artifacts.get(evidence.id);
    assert(artifact, 'Missing evidence artifact reference');
    let expected;
    if (evidence.artifact) expected = { kind: 'file', sha256: evidence.artifact.sha256, size: evidence.artifact.size };
    else {
      let encoded;
      if (evidence.source === 'connector') {
        if (evidence.data && typeof evidence.data.checkId === 'string' && evidence.data.observed !== undefined) encoded = canonical({ checkId: evidence.data.checkId, observed: evidence.data.observed, observedAt: evidence.collectedAt });
      } else if (evidence.content !== undefined || evidence.data !== undefined) encoded = canonical({ content: evidence.content, data: evidence.data });
      if (encoded !== undefined) expected = { kind: 'inline', sha256: digest(encoded), size: Buffer.byteLength(encoded) };
    }
    if (!expected) {
      assert(artifact.kind === 'not-recorded' && artifact.path === undefined && artifact.sha256 === undefined && artifact.size === undefined && evidence.sha256 === undefined, 'Unrecorded artifact has a misleading digest or file reference');
      continue;
    }
    assert(expected.sha256 === evidence.sha256 && artifact.kind === expected.kind && artifact.sha256 === expected.sha256 && artifact.size === expected.size, 'Evidence artifact identity mismatch');
    assert(artifact.path === `artifacts/${digest(evidence.id)}.${expected.kind === 'file' ? 'bin' : 'json'}`, 'Invalid artifact path');
    const bytes = files.get(artifact.path);
    assert(bytes && bytes.length === expected.size && digest(bytes) === expected.sha256, 'Missing or altered evidence artifact');
  }
  const { capturedAt: _capturedAt, ...stableSnapshot } = snapshot;
  assert(hash(manifest.contentSha256) && digest(canonical({ snapshot: stableSnapshot, artifacts: manifest.artifacts, sources })) === manifest.contentSha256, 'Content digest mismatch');
  return { integrity: 'verified', manifestSha256, contentSha256: manifest.contentSha256, workspaceId: manifest.workspaceId, checkpoint: manifest.checkpoint, externalManifestPinChecked: pins.manifestSha256 !== undefined, externalCheckpointPinChecked: pins.checkpoint !== undefined, authenticity: 'Unsigned bundle checks establish internal consistency only. An independently trusted pin binds only what it covers; an audit checkpoint does not authenticate snapshot or artifact contents.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(resolve(process.argv[1]))).href) {
  try {
    const [directory, ...args] = process.argv.slice(2);
    assert(directory, 'Usage: node verify.mjs EXTRACTED_DIRECTORY [--manifest-sha256 HASH] [--checkpoint WORKSPACE:SEQ:HASH]');
    const pins = {};
    while (args.length) {
      const flag = args.shift(), value = args.shift();
      assert(value && (flag === '--manifest-sha256' || flag === '--checkpoint'), 'Unknown or incomplete option');
      if (flag === '--manifest-sha256') { assert(pins.manifestSha256 === undefined, 'Duplicate pin'); pins.manifestSha256 = value; }
      else {
        const match = /^(.*):(\d+):([a-f0-9]{64})$/.exec(value);
        assert(match && pins.checkpoint === undefined, 'Invalid or duplicate checkpoint pin');
        pins.checkpoint = { workspaceId: match[1], seq: Number(match[2]), hash: match[3] };
      }
    }
    console.log(JSON.stringify(await verifyBundle(directory, pins), null, 2));
  } catch (error) { console.error(`Integrity verification failed: ${error.message}`); process.exitCode = 1; }
}
