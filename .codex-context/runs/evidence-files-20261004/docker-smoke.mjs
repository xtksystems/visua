import { chromium, expect as baseExpect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const expect = baseExpect.configure({ timeout: 30_000 });
const origin = 'http://localhost:8787';
const phase = process.argv[2];
if (!['create', 'restart'].includes(phase)) throw new Error('Choose create or restart phase');
const fixturePath = new URL('./docker-smoke-fixture.json', import.meta.url);
const body = Buffer.from([0, 255, 13, 10, ...Buffer.from('Visua deployment fixture, no customer data')]);
const hash = createHash('sha256').update(body).digest('hex');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ baseURL: origin, viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const result = { ok: false, phase, origin, checks: {}, fixtureCleaned: false };
let fixture, csrf;
try {
  expect((await context.request.get('/api/ready')).status()).toBe(200);
  const login = await context.request.post('/api/auth/dev/login', { data: { email: 'morgan.lee@northwind-health.example' } });
  expect(login.ok()).toBe(true);
  const me = await login.json();
  csrf = me.csrf;
  const headers = { 'x-visua-csrf': csrf };
  if (phase === 'create') {
    const existing = await (await context.request.get('/api/workspaces')).json();
    result.checks.existingAuditChains = [];
    for (const item of existing) {
      const check = await (await context.request.get(`/api/workspaces/${item.workspace.id}/activity/verify`)).json();
      expect(check.valid).toBe(true);
      result.checks.existingAuditChains.push({ valid: check.valid, events: check.events });
    }
    const created = await context.request.post('/api/workspaces', { headers, data: { name: `Evidence deployment ${Date.now()}`, frameworks: ['nist-csf-2.0'], profile: { industry: 'saas', size: '11-50' } } });
    expect(created.status()).toBe(201);
    const workspace = (await created.json()).workspace;
    fixture = { workspace, title: 'Deployment file persistence fixture' };
    await writeFile(fixturePath, JSON.stringify(fixture, null, 2));
    await page.goto(`/w/${workspace.slug}/evidence`);
    await page.getByRole('button', { name: 'Upload evidence', exact: true }).click();
    const upload = page.getByRole('dialog', { name: 'Upload evidence', exact: true });
    await upload.getByLabel('Evidence file', { exact: true }).setInputFiles({ name: 'deployment-fixture.bin', mimeType: 'application/octet-stream', buffer: body });
    await upload.getByLabel('Evidence title', { exact: true }).fill(fixture.title);
    await upload.getByLabel('Collection date', { exact: true }).fill('2026-01-01');
    await upload.getByLabel('Valid until', { exact: true }).fill('2030-12-31');
    await upload.getByLabel('Search requirements to link', { exact: true }).fill('PR.AA-01');
    await upload.getByRole('button', { name: 'Add PR.AA-01 requirement', exact: true }).click();
    const response = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/evidence/files'));
    await upload.getByRole('button', { name: 'Upload for review', exact: true }).click();
    const uploaded = await response;
    expect(uploaded.status()).toBe(201);
    fixture.evidence = await uploaded.json();
    expect(fixture.evidence.sha256).toBe(hash);
    await writeFile(fixturePath, JSON.stringify(fixture, null, 2));
  } else {
    fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
    await page.goto(`/w/${fixture.workspace.slug}/evidence`);
    await page.getByRole('button', { name: fixture.title, exact: true }).click();
  }
  const dialog = page.getByRole('dialog', { name: fixture.title, exact: true });
  await expect(dialog.getByRole('button', { name: 'Download file', exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download file', exact: true }).click();
  const downloaded = await download;
  expect(downloaded.suggestedFilename()).toBe('deployment-fixture.bin');
  expect(await readFile(await downloaded.path())).toEqual(body);
  result.checks.exactBytesAndFilename = true;
  if (phase === 'create') {
    await dialog.getByRole('button', { name: 'Accept', exact: true }).click();
    await expect(dialog.getByRole('region', { name: 'Review history' })).toContainText('accepted');
  }
  const detail = await (await context.request.get(`/api/workspaces/${fixture.workspace.id}/evidence/${fixture.evidence.id}`)).json();
  expect(detail).toMatchObject({ status: 'accepted', sha256: hash, artifact: fixture.evidence.artifact });
  expect(detail.reviewHistory.at(-1).scope.sha256).toBe(hash);
  result.checks.immutableReferenceAndReview = true;
  const chain = await (await context.request.get(`/api/workspaces/${fixture.workspace.id}/activity/verify`)).json();
  expect(chain.valid).toBe(true);
  result.checks.audit = { valid: chain.valid, events: chain.events };
  expect(errors).toEqual([]);
  result.checks.noPageErrors = true;
  result.ok = true;
} finally {
  if (fixture && csrf && (phase === 'restart' || !result.ok)) {
    const removed = await context.request.delete(`/api/workspaces/${fixture.workspace.id}`, { headers: { 'x-visua-csrf': csrf } });
    result.fixtureCleaned = removed.ok();
    if (!removed.ok()) throw new Error('Deployment fixture cleanup failed');
  }
  await context.close();
  await browser.close();
}
console.log(JSON.stringify(result, null, 2));
