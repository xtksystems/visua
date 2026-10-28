#!/usr/bin/env node
/** Disposable local rehearsal. Never accepts an existing database or deployment URL. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, writeFile, chmod } from 'node:fs/promises';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { request } from '@playwright/test';
import { startMockIdp } from '../apps/server/test/mock-idp.ts';
import { evidenceReviewScope } from '../packages/core/src/evidence.ts';
import { verifyBundle } from '../apps/server/src/services/bundle-verifier.mjs';
import { startResources } from './pilot/resources.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(new URL('../apps/server/package.json', import.meta.url));
const { unzipSync } = require('fflate');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const delay = ms => new Promise(done => setTimeout(done, ms));
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') {
  console.log('Usage: node scripts/pilot-rehearsal.mjs [--requests 80] [--concurrency 4]\nCreates disposable PostgreSQL/MinIO fixtures, rehearses OIDC and evidence recovery, and writes a private .check/pilot-* report. Requires cached fixture images and installed pnpm dependencies. No hosted deployment is contacted.');
  process.exit(0);
}
const options = { requests: 80, concurrency: 4 };
const seen = new Set();
for (let i = 0; i < args.length; i += 2) {
  const key = args[i]?.slice(2), raw = args[i + 1];
  if (!args[i]?.startsWith('--') || !Object.hasOwn(options, key) || seen.has(key) || !/^\d+$/.test(raw ?? '')) {
    console.error('Invalid arguments. Use --help.'); process.exit(2);
  }
  seen.add(key); options[key] = Number(raw);
}
if (!Number.isSafeInteger(options.requests) || options.requests < 16 || options.requests > 400 ||
    !Number.isSafeInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 8) {
  console.error('Requests must be 16–400 and concurrency 1–8.'); process.exit(2);
}

await mkdir(join(root, '.check'), { recursive: true });
const workDir = await mkdtemp(join(root, '.check/pilot-'));
await chmod(workDir, 0o700);
const report = {
  status: 'running', startedAt: new Date().toISOString(), fixture: 'local-production-mode-rehearsal',
  workload: { ...options, appProcesses: 2, tenants: 1, workspaces: 1, frameworks: ['nist-csf-2.0', 'aicpa-tsc-2017'], users: 4, evidenceFiles: 1, evidenceBytes: 65536 },
  checks: [], limitations: [
    'Loopback HTTP, a local mock IdP, and cached MinIO/PostgreSQL fixture images; no hosted TLS, DNS, provider IAM, or real identity-provider recovery validated.',
    'Closed-loop synthetic reads on one small workspace measure this local run only. No sustained saturation, hosted capacity, recovery objective, or pilot-user acceptance claim.',
    'Recovery restores application SQL and S3 object bytes into a new database/prefix. Cluster roles, remote provider configuration, key custody, retention, and offsite recovery remain operator work.',
  ],
};
let stage = 'resource-startup', resources, idp;
const applications = [], clients = [];
const secret = randomBytes(48).toString('base64url');
let interrupted = false;
const interrupt = () => { interrupted = true; for (const app of applications) app.child.kill('SIGTERM'); };
process.once('SIGINT', interrupt); process.once('SIGTERM', interrupt);
const totalTimer = setTimeout(interrupt, 8 * 60_000);

async function freePort() {
  const listener = createServer();
  await new Promise((done, fail) => { listener.once('error', fail); listener.listen(0, '127.0.0.1', done); });
  const port = listener.address().port;
  await new Promise((done, fail) => listener.close(error => error ? fail(error) : done()));
  return port;
}

async function startApplication(databaseUrl, prefix = 'evidence') {
  assert(!interrupted, 'Rehearsal interrupted');
  const port = await freePort(), baseURL = `http://127.0.0.1:${port}`;
  // Allowlist the child environment: inherited database/provider/agent credentials
  // must never redirect a rehearsal to an existing service.
  const env = {
    PATH: process.env.PATH, NODE_ENV: 'production', VISUA_AGENT_MODE: 'offline',
    VISUA_PORT: String(port), VISUA_HOST: '127.0.0.1', VISUA_PUBLIC_URL: baseURL,
    VISUA_AUTH_MODE: 'oidc', VISUA_SECRET: secret, VISUA_SEED: '0', VISUA_SCORE_HISTORY: 'off',
    VISUA_DIAGNOSTICS_INTERVAL_MS: '1000', VISUA_SHUTDOWN_MS: '10000',
    VISUA_DATABASE_URL: databaseUrl, VISUA_BLOB_STORE: 's3', VISUA_BLOB_S3_BUCKET: resources.s3.bucket,
    VISUA_BLOB_S3_REGION: resources.s3.region, VISUA_BLOB_S3_ENDPOINT: resources.s3.endpoint,
    VISUA_BLOB_S3_FORCE_PATH_STYLE: 'true', VISUA_BLOB_S3_PREFIX: prefix,
    AWS_ACCESS_KEY_ID: resources.s3.accessKeyId, AWS_SECRET_ACCESS_KEY: resources.s3.secretAccessKey,
    AWS_EC2_METADATA_DISABLED: 'true', VISUA_OIDC_ISSUER: idp.issuer,
    VISUA_OIDC_CLIENT_ID: idp.clientId, VISUA_OIDC_CLIENT_SECRET: idp.clientSecret,
    VISUA_OIDC_ALLOW_HTTP: '1', VISUA_OIDC_PRIVATE_ISSUERS: '127.0.0.1',
    VISUA_SSO_DOMAIN_VERIFICATION: 'off', VISUA_SSO_DOMAIN_RECHECK_HOURS: '0',
    VISUA_BOOTSTRAP_OWNER_EMAIL: 'owner@pilot.example', VISUA_BOOTSTRAP_ORG_NAME: 'Disposable pilot rehearsal',
  };
  const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'apps/server/src/index.ts'], {
    cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const app = { child, baseURL, diagnostics: undefined, stopped: false };
  applications.push(app);
  let pending = '';
  child.stdout.on('data', chunk => {
    pending = (pending + chunk.toString()).slice(-65536);
    const lines = pending.split('\n'); pending = lines.pop();
    for (const line of lines) if (line.startsWith('[visua] diagnostics ')) {
      try { app.diagnostics = JSON.parse(line.slice('[visua] diagnostics '.length)); } catch { /* Ignore partial diagnostic records. */ }
    }
  });
  // Discard provider error text rather than persist credential-bearing diagnostics.
  child.stderr.resume();
  app.exited = new Promise(done => {
    child.once('error', () => done({ code: null, signal: 'spawn-error' }));
    child.once('exit', (code, signal) => done({ code, signal }));
  });
  app.stop = async () => {
    if (app.stopped) return;
    app.stopped = true;
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    let timer;
    const result = await Promise.race([app.exited, new Promise(done => { timer = setTimeout(() => done(null), 12000); })]);
    clearTimeout(timer);
    if (!result) { child.kill('SIGKILL'); await app.exited; throw new Error('Application shutdown deadline exceeded'); }
    assert.equal(result.code, 0, 'Application did not shut down cleanly');
  };
  const deadline = performance.now() + 45000;
  while (performance.now() < deadline && !interrupted) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error('Application startup failed');
    try { const r = await fetch(`${baseURL}/api/ready`, { signal: AbortSignal.timeout(1500) }); const body = await r.json(); if (r.ok && body.ok) return app; } catch { /* Bounded startup polling. */ }
    await delay(150);
  }
  throw new Error('Application readiness deadline exceeded');
}

async function signIn(app, role, connection = 'platform') {
  assert(!interrupted, 'Rehearsal interrupted');
  const api = await request.newContext({ baseURL: app.baseURL, timeout: 20000 });
  const client = { api, role, csrf: undefined, me: undefined }; clients.push(client);
  idp.signInAs({ sub: `pilot-${role}`, email: `${role}@pilot.example`, email_verified: true, name: `Pilot ${role}` });
  const start = await api.get(`/api/auth/oidc/start?connection=${encodeURIComponent(connection)}`, { maxRedirects: 0 });
  assert.equal(start.status(), 302, 'OIDC initiation failed');
  const callback = await idp.authorize(start.headers().location);
  const done = await api.get(callback, { maxRedirects: 0 });
  assert.equal(done.status(), 302, 'OIDC callback failed');
  const response = await api.get('/api/auth/me');
  client.me = await response.json(); client.csrf = client.me.csrf;
  assert.equal(client.me.activeTenant?.role, role, 'Restored or provisioned role differs');
  assert(client.csrf, 'No CSRF token after sign-in');
  return client;
}

async function json(client, method, path, data, expected = 200) {
  assert(!interrupted, 'Rehearsal interrupted');
  const response = await client.api[method](`/api${path}`, {
    headers: { 'x-visua-csrf': client.csrf }, ...(data === undefined ? {} : { data }),
  });
  assert.equal(response.status(), expected, `Unexpected ${method} response status`);
  return response.json();
}

async function bundle(client, ws, label, bytes, checkpoint) {
  const response = await client.api.get(`/api/workspaces/${ws}/exports/auditor-bundle.zip`);
  assert.equal(response.status(), 200, 'Auditor export failed');
  const archive = await response.body(), headers = response.headers();
  assert(archive.byteLength < 64 * 1024 * 1024, 'ZIP exceeded fixture bound');
  const files = unzipSync(archive), directory = join(workDir, label);
  await mkdir(directory, { mode: 0o700 });
  let total = 0;
  for (const [path, content] of Object.entries(files)) {
    assert(/^[a-z0-9-]+(?:\/[a-z0-9-]+)*\.[a-z0-9]+$/.test(path), 'Unexpected ZIP path');
    total += content.byteLength; assert(total <= 64 * 1024 * 1024, 'ZIP contents exceeded fixture bound');
    await mkdir(dirname(join(directory, path)), { recursive: true, mode: 0o700 });
    await writeFile(join(directory, path), content, { mode: 0o600, flag: 'wx' });
  }
  assert(Object.values(files).some(content => Buffer.from(content).equals(bytes)), 'Original file bytes absent from bundle');
  const manifestSha256 = headers['x-visua-manifest-sha256'];
  assert.equal(hash(files['manifest.json']), manifestSha256, 'Receipt hash differs');
  const receipt = headers['x-visua-audit-checkpoint'].split(':');
  const pin = { workspaceId: receipt[0], seq: Number(receipt[1]), hash: receipt[2] };
  if (checkpoint) assert.deepEqual(pin, checkpoint, 'Recovery changed assessment audit checkpoint');
  const verification = await verifyBundle(directory, { manifestSha256, checkpoint: pin });
  const manifest = JSON.parse(Buffer.from(files['manifest.json']).toString('utf8'));
  const snapshot = JSON.parse(Buffer.from(files['snapshot.json']).toString('utf8'));
  await writeFile(join(workDir, `${label}-receipt.json`), JSON.stringify({ manifestSha256, checkpoint: pin }, null, 2), { mode: 0o600, flag: 'wx' });
  return { manifestSha256, checkpoint: pin, contentSha256: verification.contentSha256, entityDigestsSha256: hash(JSON.stringify(manifest.entities)), recordedRequirements: snapshot.states.length, archiveBytes: archive.length, externalPinsChecked: verification.externalManifestPinChecked && verification.externalCheckpointPinChecked };
}

try {
  resources = await startResources(workDir); report.resources = resources.report;
  idp = await startMockIdp('visua-pilot', randomBytes(32).toString('base64url'));
  stage = 'production-oidc-bootstrap';
  const first = await startApplication(resources.postgresUrl);
  const owner = await signIn(first, 'owner');
  assert.deepEqual(await json(owner, 'get', '/workspaces'), [], 'Unexpected seeded workspace');
  const refused = await owner.api.post('/api/auth/dev/login', { data: { email: 'owner@pilot.example' } });
  assert.equal(refused.status(), 403, 'Production allowed developer sign-in');
  const tenant = owner.me.activeTenant.id;
  for (const role of ['contributor', 'approver', 'auditor']) await json(owner, 'post', `/tenants/${tenant}/members`, { email: `${role}@pilot.example`, role }, 201);
  const sso = await json(owner, 'post', `/tenants/${tenant}/sso`, {
    name: 'Local rehearsal IdP', issuer: idp.issuer, clientId: idp.clientId, clientSecret: idp.clientSecret,
    domains: ['pilot.example'], jitProvisioning: false,
  }, 201);
  const second = await startApplication(resources.postgresUrl);
  const contributor = await signIn(first, 'contributor');
  const approver = await signIn(second, 'approver');
  const auditor = await signIn(second, 'auditor');
  report.checks.push('Empty production bootstrap, developer login refusal, four OIDC roles, and a second application process on shared PostgreSQL');

  stage = 'evidence-workflow';
  const created = await json(owner, 'post', '/workspaces', { name: 'Disposable pilot workspace', frameworks: report.workload.frameworks, profile: { industry: 'saas', size: '11-50' }, planInitialTasks: false }, 201);
  const ws = created.workspace.id, requirements = ['nist-csf-2.0:PR.AA-01', 'aicpa-tsc-2017:CC6.1'];
  const task = await json(owner, 'post', `/workspaces/${ws}/tasks`, { title: 'Collect dated access observation', requirementIds: requirements, assignee: { type: 'person', id: contributor.me.user.id } }, 201);
  assert((await json(contributor, 'get', `/workspaces/${ws}/tasks`)).some(item => item.id === task.id && item.assignee.id === contributor.me.user.id), 'Assignment did not persist');
  const bytes = Buffer.alloc(report.workload.evidenceBytes); for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251;
  const uploaded = await contributor.api.post(`/api/workspaces/${ws}/evidence/files`, {
    headers: { 'x-visua-csrf': contributor.csrf }, multipart: {
      file: { name: 'synthetic-access-observation.bin', mimeType: 'application/octet-stream', buffer: bytes },
      metadata: JSON.stringify({ title: 'Synthetic access observation', requirementIds: requirements, collectedAt: new Date().toISOString(), assurance: { kind: 'operating', scope: 'Disposable rehearsal only' } }),
    },
  });
  assert.equal(uploaded.status(), 201, 'S3 upload failed'); const evidence = await uploaded.json();
  const review = { decision: 'accepted', expectedScope: evidenceReviewScope(evidence), expectedReviewId: null };
  await json(contributor, 'patch', `/workspaces/${ws}/evidence/${evidence.id}`, review, 403);
  const accepted = await json(approver, 'patch', `/workspaces/${ws}/evidence/${evidence.id}`, review);
  assert.equal(accepted.status, 'accepted');
  await json(auditor, 'patch', `/workspaces/${ws}/evidence/${evidence.id}`, { title: 'Forbidden' }, 403);
  const downloaded = await auditor.api.get(`/api/workspaces/${ws}/evidence/${evidence.id}/file`);
  assert.equal(downloaded.status(), 200); assert((await downloaded.body()).equals(bytes));
  const audit = await json(auditor, 'get', `/workspaces/${ws}/activity/verify`);
  report.originalBundle = await bundle(auditor, ws, 'original-bundle', bytes);
  assert(report.originalBundle.externalPinsChecked);
  report.workload.recordedRequirements = report.originalBundle.recordedRequirements;
  report.checks.push('Member assignment, signed S3 upload, contributor approval refusal, approver acceptance, auditor write refusal, exact download and offline bundle verification');

  stage = 'bounded-concurrent-reads';
  const actors = [owner, contributor, approver, auditor], paths = ['', '/attention', '/evidence', '/tasks'];
  let next = 0; const samples = [], started = performance.now();
  await Promise.all(Array.from({ length: options.concurrency }, async (_, worker) => {
    while (true) {
      const index = next++; if (index >= options.requests) break;
      assert(!interrupted, 'Rehearsal interrupted');
      const before = performance.now();
      const response = await actors[index % actors.length].api.get(`/api/workspaces/${ws}${paths[Math.floor(index / actors.length) % paths.length]}`);
      await response.body(); samples.push({ ms: performance.now() - before, status: response.status(), worker });
    }
  }));
  const elapsedMs = performance.now() - started, times = samples.map(s => s.ms).sort((a, b) => a - b);
  const percentile = p => times[Math.max(0, Math.ceil(times.length * p) - 1)];
  report.measurement = { mode: 'closed-loop HTTP reads', requests: samples.length, concurrency: options.concurrency, elapsedMs, requestsPerSecond: samples.length * 1000 / elapsedMs, p50Ms: percentile(.5), p95Ms: percentile(.95), maxMs: times.at(-1), statusCounts: samples.reduce((counts, item) => { counts[item.status] = (counts[item.status] ?? 0) + 1; return counts; }, {}) };
  assert.equal(samples.length, options.requests); assert(samples.every(item => item.status === 200), 'Read workload returned failures');
  assert.deepEqual(await json(owner, 'get', `/workspaces/${ws}/activity/verify`), audit, 'Read workload changed assessment audit');
  report.checks.push('Bounded four-role concurrent reads with unchanged assessment audit');

  stage = 'quiesced-recovery';
  await Promise.all([first.stop(), second.stop()]);
  report.processDiagnostics = [first.diagnostics, second.diagnostics];
  const restoreStarted = performance.now();
  const restored = await resources.backupAndRestore(); report.recovery = restored.report;
  const recovered = await startApplication(restored.databaseUrl, restored.s3Prefix);
  const recoveredOwner = await signIn(recovered, 'owner', sso.id);
  const recoveredAuditor = await signIn(recovered, 'auditor', sso.id);
  const after = await json(recoveredAuditor, 'get', `/workspaces/${ws}/evidence/${evidence.id}`);
  assert.deepEqual(after, accepted, 'Recovery changed evidence or its reviews');
  const restoredBytes = await recoveredAuditor.api.get(`/api/workspaces/${ws}/evidence/${evidence.id}/file`);
  assert.equal(restoredBytes.status(), 200); assert((await restoredBytes.body()).equals(bytes));
  assert.deepEqual(await json(recoveredOwner, 'get', `/workspaces/${ws}/activity/verify`), audit, 'Recovery changed audit history');
  report.restoredBundle = await bundle(recoveredAuditor, ws, 'restored-bundle', bytes, report.originalBundle.checkpoint);
  assert.equal(report.restoredBundle.entityDigestsSha256, report.originalBundle.entityDigestsSha256, 'Recovery changed exported assessment entities');
  const records = await json(recoveredAuditor, 'get', `/workspaces/${ws}/access`);
  assert(records.some(record => record.manifestSha256 === report.originalBundle.manifestSha256), 'Original access record absent after restore');
  report.recovery.elapsedThroughVerificationMs = performance.now() - restoreStarted;
  report.recovery.evidenceSha256 = hash(bytes);
  report.checks.push('Fresh PostgreSQL restore and S3 prefix, exact reviewed bytes/history, unchanged checkpoint, retained access records, encrypted organization SSO login and new verified auditor bundle');
  report.status = 'passed';
} catch (error) {
  // Startup can fail after allocating resources, including during its first
  // cleanup attempt. Preserve the safe report and cleanup handle for finally.
  if (!resources && error?.resourceState) {
    resources = error.resourceState;
    report.resources = resources.report;
  }
  report.status = 'failed'; report.failure = { stage, kind: error?.name ?? 'Error', source: error?.stack?.match(/pilot-rehearsal\.mjs:\d+:\d+/)?.[0] };
  process.exitCode = 1;
} finally {
  clearTimeout(totalTimer);
  const cleanup = [];
  for (const client of clients) try { await client.api.dispose(); } catch { cleanup.push('HTTP context'); }
  for (const app of applications) try { await app.stop(); } catch { cleanup.push('Application process'); }
  if (idp) try { await idp.close(); } catch { cleanup.push('Test identity provider'); }
  if (resources) try { await resources.close(); } catch { cleanup.push('Owned Docker resources'); }
  if (cleanup.length) { report.status = 'failed'; report.cleanupFailures = cleanup; process.exitCode = 1; }
  if (interrupted) { report.status = 'failed'; report.interrupted = true; process.exitCode = 1; }
  report.completedAt = new Date().toISOString(); report.cleanupComplete = cleanup.length === 0;
  await writeFile(join(workDir, 'report.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', interrupt);
  console.log(JSON.stringify({ ...report, reportPath: join(workDir, 'report.json') }, null, 2));
}
