import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { evidenceReviewScope } from '../../../packages/core/src/evidence.ts';

const root = new URL('./', import.meta.url);
const screenshots = new URL('../../../.screens/evidence-lifecycle-delivery-20261013/', import.meta.url).pathname;
await mkdir(screenshots, { recursive: true });
const report = { status: 'running', checks: [], browserErrors: [] };
const browser = await chromium.launch();
const context = await browser.newContext({ baseURL: 'http://localhost:8787', viewport: { width: 1440, height: 900 } });
let ws, csrf;
const data = async (method, path, body) => {
  const response = await context.request[method](`/api${path}`, {
    ...(body === undefined ? {} : { data: body }),
    ...(csrf ? { headers: { 'x-visua-csrf': csrf } } : {}),
  });
  assert(response.ok(), `${method} ${path}: ${response.status()}`);
  return response.json();
};
const review = (e, decision, note) => data('patch', `/workspaces/${ws}/evidence/${e.id}`, {
  decision, note, expectedScope: evidenceReviewScope(e), expectedReviewId: e.reviewHistory?.at(-1)?.id ?? null,
});
try {
  csrf = (await data('post', '/auth/dev/login', { email: 'morgan.lee@northwind-health.example' })).csrf;
  const original = await data('get', '/workspaces/northwind-health');
  assert.equal((await data('get', `/workspaces/${original.workspace.id}/activity/verify`)).valid, true);
  const created = await data('post', '/workspaces', { name: 'Evidence lifecycle delivery smoke', frameworks: ['nist-csf-2.0', 'aicpa-tsc-2017'], planInitialTasks: false, profile: { industry: 'saas', size: '11-50' } });
  ws = created.workspace.id;
  const requirementIds = ['nist-csf-2.0:PR.AA-01', 'aicpa-tsc-2017:CC6.1'];
  const assurance = { kind: 'operating', scope: 'Synthetic deployment observation' };
  const bytes = Buffer.from('Synthetic deployment artifact; no customer data.');
  const upload = async (title, supersedesId, validUntil) => {
    const response = await context.request.post(`/api/workspaces/${ws}/evidence/files`, {
      headers: { 'x-visua-csrf': csrf }, multipart: {
        file: { name: 'observation.txt', mimeType: 'text/plain', buffer: bytes },
        metadata: JSON.stringify({ title, requirementIds, assurance, supersedesId, collectedAt: '2026-01-01', validUntil }),
      },
    });
    assert.equal(response.status(), 201);
    return response.json();
  };
  const old = await upload('Earlier observation', undefined, '2026-01-31');
  assert.equal(old.provenance.origin, 'upload');
  const rejected = await review(old, 'rejected', 'Incomplete synthetic observation');
  const next = await upload('Current observation', old.id);
  const accepted = await review(next, 'accepted');
  for (const id of requirementIds) {
    await data('patch', `/workspaces/${ws}/requirements/${encodeURIComponent(id)}`, { current: 4, target: 4, verifiedAt: new Date().toISOString() });
    const lineage = await data('get', `/workspaces/${ws}/evidence/lineage?requirementId=${encodeURIComponent(id)}`);
    assert.equal(lineage.status, 'verified');
    assert.deepEqual(lineage.items.find(item => item.evidence.id === old.id).effective.supersededByIds, [next.id]);
    assert(lineage.items.every(item => item.evidence.content === undefined && item.evidence.data === undefined));
  }
  const download = await context.request.get(`/api/workspaces/${ws}/evidence/${next.id}/file`);
  assert(download.ok()); assert((await download.body()).equals(bytes));
  const withdrawn = await review(accepted, 'withdrawn', 'Synthetic withdrawal race');
  const stale = await context.request.patch(`/api/workspaces/${ws}/evidence/${next.id}`, { headers: { 'x-visua-csrf': csrf }, data: { decision: 'accepted', expectedScope: evidenceReviewScope(accepted), expectedReviewId: accepted.reviewHistory.at(-1).id } });
  assert.equal(stale.status(), 400);
  await review(withdrawn, 'accepted');
  assert.deepEqual((await data('get', `/workspaces/${ws}/evidence/${old.id}`)).reviewHistory, rejected.reviewHistory);
  report.checks.push('File upload, original source, rejection, compatible replacement, acceptance, exact download, CSF/SOC2 lineage and stale-review refusal passed');
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.on('pageerror', error => report.browserErrors.push(error.message));
  await page.goto(`/w/${ws}/observatory/nist-csf-2.0?select=${encodeURIComponent(requirementIds[0])}&detail=evidence`);
  await expect(page.getByRole('region', { name: 'Requirement evidence lineage', exact: true })).toContainText('Current observation');
  await page.screenshot({ path: `${screenshots}lineage-desktop.png`, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/w/${ws}/evidence?evidence=${next.id}`);
  const dialog = page.getByRole('dialog', { name: 'Current observation', exact: true });
  await expect(dialog).toContainText('Synthetic deployment observation');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: `${screenshots}artifact-phone.png`, animations: 'disabled' });
  assert.deepEqual(report.browserErrors, []);
  assert.equal((await data('get', `/workspaces/${ws}/activity/verify`)).valid, true);
  report.checks.push('Desktop lineage and 390px artifact detail render; audit chain remains valid');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = String(error); process.exitCode = 1;
} finally {
  if (ws) try { await data('delete', `/workspaces/${ws}`); report.syntheticWorkspaceRemoved = true; }
  catch (error) { report.cleanupError = String(error); process.exitCode = 1; }
  await browser.close();
  await writeFile(new URL('live-lifecycle-result.json', root), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
