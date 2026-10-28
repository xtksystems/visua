import { randomUUID } from "node:crypto";
import { expect, test as base, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { evidenceReviewScope } from "../packages/core/src/evidence.ts";
import type { RequirementEvidenceLineage } from "../packages/core/src/status.ts";
import type { Me } from "../apps/web/src/lib/auth.ts";
import type { Evidence, WorkspaceSummary } from "../apps/web/src/lib/types.ts";

const CSF = "nist-csf-2.0:PR.AA-01";
const SOC = "aicpa-tsc-2017:CC6.1";
const OWNER = "morgan.lee@northwind-health.example";
const VIEWER = "jordan.park@northwind-health.example";
const CONTRIBUTOR = "sam.ortiz@northwind-health.example";
const DAY = 86_400_000;
type Workspace = { id: string; slug: string; csrf: string; ownerId: string; now: number };
async function write<T>(request: APIRequestContext, method: "post" | "patch", path: string, csrf: string, data: unknown): Promise<T> {
  const response = await request[method](`/api${path}`, { headers: { "x-visua-csrf": csrf }, data });
  expect(response.ok(), await response.text()).toBe(true);
  return await response.json() as T;
}
async function login(request: APIRequestContext, email: string) {
  const previous = await (await request.get("/api/auth/me")).json() as Me | null;
  return write<Me>(request, "post", "/auth/dev/login", previous?.csrf ?? "", { email });
}
const test = base.extend<{ lifecycle: Workspace }>({
  lifecycle: async ({ page }, use) => {
    const me = await login(page.request, OWNER);
    const tenant = await write<{ id: string }>(page.request, "post", "/tenants", me.csrf!, { name: `Lifecycle ${randomUUID()}` });
    await write(page.request, "post", `/tenants/${tenant.id}/members`, me.csrf!, { email: VIEWER, role: "viewer" });
    await write(page.request, "post", `/tenants/${tenant.id}/members`, me.csrf!, { email: CONTRIBUTOR, role: "contributor" });
    const summary = await write<WorkspaceSummary>(page.request, "post", "/workspaces", me.csrf!, { name: `Lifecycle ${randomUUID()}`, frameworks: ["nist-csf-2.0", "aicpa-tsc-2017"], profile: { industry: "saas", size: "11-50" } });
    await use({ id: summary.workspace.id, slug: summary.workspace.slug, csrf: me.csrf!, ownerId: me.user.id, now: Date.now() });
    const cleanup = await login(page.request, OWNER);
    const response = await page.request.delete(`/api/workspaces/${summary.workspace.id}`, { headers: { "x-visua-csrf": cleanup.csrf! } });
    expect(response.ok(), await response.text()).toBe(true);
    if (me.activeTenant) await write(page.request, "post", "/auth/tenant", cleanup.csrf!, { tenantId: me.activeTenant.id });
  },
});
const code = (id: string) => id.split(":").slice(1).join(":");
const requirementPath = (ws: Workspace, id: string, evidence = false) => `/w/${ws.slug}/observatory/${id.split(":")[0]}?select=${encodeURIComponent(id)}${evidence ? "&detail=evidence" : ""}`;
const lineage = (page: Page) => page.getByRole("region", { name: "Requirement evidence lineage", exact: true });
async function createInline(page: Page, ws: Workspace, title: string, requirementIds = [CSF]) {
  return write<Evidence>(page.request, "post", `/workspaces/${ws.id}/evidence`, ws.csrf, { title, requirementIds, content: `Recorded artifact: ${title}`, collectedAt: new Date(ws.now - DAY).toISOString(), assurance: { kind: "operating", scope: "Production identity access records" } });
}
async function submitUpload(page: Page, dialog: Locator, title: string) {
  await dialog.getByLabel("Evidence file", { exact: true }).setInputFiles({ name: "access.log", mimeType: "text/plain", buffer: Buffer.from(`Observed access record: ${title}`) });
  await dialog.getByLabel("Evidence title", { exact: true }).fill(title);
  const pending = page.waitForResponse(response => response.request().method() === "POST" && response.url().endsWith("/evidence/files"));
  await dialog.getByRole("button", { name: "Upload for review", exact: true }).click();
  const response = await pending;
  expect(response.status(), await response.text()).toBe(201);
  return await response.json() as Evidence;
}
async function evaluateAt(page: Page, at: string) {
  const region = lineage(page);
  await region.getByText("Evaluate a different time", { exact: true }).click();
  await region.getByLabel("Evaluation time (UTC)").fill(at.slice(0, 16));
  await region.getByRole("button", { name: "Evaluate time", exact: true }).click();
  await expect(region.locator("time").first()).toHaveAttribute("datetime", `${at.slice(0, 16)}:00.000Z`);
}

for (const id of [CSF, SOC]) {
  test(`${code(id)} assign, upload, reject, replace, accept, verify, expire and refresh retains history`, async ({ page, lifecycle }, testInfo) => {
    // This journey crosses the Observatory and three artifact dialogs several times.
    test.setTimeout(180_000);
    const tomorrow = new Date(lifecycle.now + DAY).toISOString().slice(0, 10);
    const evaluation = new Date(lifecycle.now + 3 * DAY).toISOString();
    await page.goto(requirementPath(lifecycle, id));
    const inspector = page.getByRole("complementary", { name: `${code(id)} details`, exact: true });
    await inspector.getByLabel("Assign owner", { exact: true }).selectOption(`member:${lifecycle.ownerId}`);
    const assignmentResponse = page.waitForResponse(response => response.request().method() === "PATCH" && response.url().endsWith(`/requirements/${encodeURIComponent(id)}`));
    await inspector.getByRole("button", { name: "Save owner", exact: true }).click();
    const assignment = await assignmentResponse;
    expect(assignment.ok(), await assignment.text()).toBe(true);
    expect(await assignment.json()).toMatchObject({ ownerUserId: lifecycle.ownerId });
    await expect(inspector.getByRole("button", { name: "Save owner", exact: true })).toBeDisabled();
    await inspector.getByRole("radiogroup", { name: "Current level", exact: true }).getByRole("radio", { name: "4", exact: true }).click();
    await expect(inspector.getByRole("radiogroup", { name: "Current level", exact: true }).getByRole("radio", { name: "4", exact: true })).toHaveAttribute("aria-checked", "true");
    await page.goto(`/w/${lifecycle.slug}/evidence`);
    await page.getByRole("button", { name: "Upload evidence", exact: true }).click();
    const upload = page.getByRole("dialog", { name: "Upload evidence", exact: true });
    await upload.getByLabel("Search requirements to link", { exact: true }).fill(code(id));
    await upload.getByRole("button", { name: `Add ${code(id)} requirement`, exact: true }).click();
    await upload.getByLabel("Assurance type", { exact: true }).selectOption("operating");
    await upload.getByLabel("Assurance scope", { exact: true }).fill("Production identity access records");
    await upload.getByLabel("Valid until", { exact: true }).fill(tomorrow);
    const original = await submitUpload(page, upload, `${code(id)} incomplete observation`);
    const originalDialog = page.getByRole("dialog", { name: original.title, exact: true });
    await expect(originalDialog.getByRole("region", { name: "Collection and assurance" })).toContainText("Uploaded");
    await originalDialog.getByRole("button", { name: "Reject", exact: true }).click();
    const reject = page.getByRole("dialog", { name: "Reject evidence", exact: true });
    await expect(reject.getByRole("button", { name: "Confirm rejection", exact: true })).toBeDisabled();
    await reject.getByLabel("Rejection reason", { exact: true }).fill("Missing privileged account activity for the recorded scope.");
    await reject.getByRole("button", { name: "Confirm rejection", exact: true }).click();
    await expect(originalDialog.getByRole("region", { name: "Review history" })).toContainText("Missing privileged account activity");
    await originalDialog.getByRole("button", { name: "Upload replacement", exact: true }).click();
    const replacementUpload = page.getByRole("dialog", { name: "Upload replacement", exact: true });
    await expect(replacementUpload.getByLabel("Assurance scope", { exact: true })).toHaveValue("Production identity access records");
    await replacementUpload.getByLabel("Valid until", { exact: true }).fill(tomorrow);
    const replacement = await submitUpload(page, replacementUpload, `${code(id)} complete observation`);
    expect(replacement.supersedesId).toBe(original.id);
    const replacementDialog = page.getByRole("dialog", { name: replacement.title, exact: true });
    await replacementDialog.getByRole("button", { name: "Accept", exact: true }).click();
    await expect(replacementDialog.getByRole("region", { name: "Review history" })).toContainText("accepted");
    await page.goto(requirementPath(lifecycle, id));
    await inspector.getByRole("button", { name: "Mark verified", exact: true }).click();
    await expect(inspector.locator(".inspector__head")).toContainText("Verified");
    await inspector.getByRole("tab", { name: /^Evidence/ }).click();
    await expect(lineage(page)).toContainText("Verified");
    await evaluateAt(page, evaluation);
    await expect(lineage(page)).toContainText("At risk");
    await expect(lineage(page).locator(`[data-evidence-id="${replacement.id}"]`)).toContainText("Validity: Expired");
    await lineage(page).getByRole("link", { name: replacement.title, exact: true }).click();
    await page.getByRole("dialog", { name: replacement.title, exact: true }).getByRole("button", { name: "Upload replacement", exact: true }).click();
    const refresh = await submitUpload(page, page.getByRole("dialog", { name: "Upload replacement", exact: true }), `${code(id)} refreshed observation`);
    await page.goto(requirementPath(lifecycle, id, true));
    await evaluateAt(page, evaluation);
    await expect(lineage(page)).toContainText("At risk"); // A pending successor cannot hide expiry.
    await lineage(page).getByRole("link", { name: refresh.title, exact: true }).first().click();
    await page.getByRole("dialog", { name: refresh.title, exact: true }).getByRole("button", { name: "Accept", exact: true }).click();
    await expect(page.getByRole("dialog", { name: refresh.title, exact: true }).getByRole("region", { name: "Review history" })).toContainText("accepted");
    await page.goto(requirementPath(lifecycle, id, true));
    await evaluateAt(page, evaluation);
    await expect(lineage(page)).toContainText("Verified");
    await expect(lineage(page).locator(`[data-evidence-id="${replacement.id}"]`)).toContainText("Superseded");
    await expect(lineage(page).locator(`[data-evidence-id="${original.id}"]`)).toContainText("Review: Rejected");
    await page.screenshot({ path: testInfo.outputPath("desktop-evidence-lineage.png"), fullPage: true });
    const history = await (await page.request.get(`/api/workspaces/${lifecycle.id}/evidence/${original.id}`)).json() as Evidence;
    expect(history.reviewHistory?.[0]?.note).toContain("Missing privileged account activity");
    const state = await (await page.request.get(`/api/workspaces/${lifecycle.id}/requirements/${encodeURIComponent(id)}`)).json() as { state: { ownerUserId: string; verifiedAt: string; statusOverride?: string } };
    expect(state.state.ownerUserId).toBe(lifecycle.ownerId);
    expect(state.state.verifiedAt).toBeTruthy();
    expect(state.state.statusOverride).toBeUndefined();
  });
}

test("assurance edits require renewed review, stale inspected acceptance conflicts, and withdrawal requires a recorded reason", async ({ page, lifecycle }) => {
  const item = await createInline(page, lifecycle, "Scoped identity observation", [CSF, SOC]);
  await write(page.request, "patch", `/workspaces/${lifecycle.id}/evidence/${item.id}`, lifecycle.csrf, { decision: "accepted", expectedScope: evidenceReviewScope(item), expectedReviewId: item.reviewHistory?.at(-1)?.id ?? null });
  await page.goto(`/w/${lifecycle.slug}/evidence?evidence=${item.id}`);
  const dialog = page.getByRole("dialog", { name: item.title, exact: true });
  await dialog.getByRole("button", { name: "Edit assurance and links", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Edit assurance and links", exact: true });
  await edit.getByLabel("Assurance scope", { exact: true }).fill("Production identity access records, including privileged accounts");
  await edit.getByRole("button", { name: "Save for renewed review", exact: true }).click();
  await expect(dialog.getByRole("region", { name: "Evidence review and validity" })).toContainText("Pending review");
  await expect(dialog.getByRole("region", { name: "Review history" })).toContainText("accepted");
  await write(page.request, "patch", `/workspaces/${lifecycle.id}/evidence/${item.id}`, lifecycle.csrf, { assurance: { kind: "operating", scope: "A concurrently narrowed scope" } });
  await expect(dialog.getByRole("region", { name: "Collection and assurance" })).toContainText("including privileged accounts");
  await dialog.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("changed since");
  await dialog.getByRole("button", { name: "Reload evidence", exact: true }).click();
  await expect(dialog.getByRole("region", { name: "Collection and assurance" })).toContainText("A concurrently narrowed scope");
  await dialog.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(dialog.getByRole("region", { name: "Evidence review and validity" })).toContainText("Review: Accepted");
  await dialog.getByRole("button", { name: "Withdraw evidence", exact: true }).click();
  const withdraw = page.getByRole("dialog", { name: "Withdraw evidence", exact: true });
  await expect(withdraw.getByRole("button", { name: "Confirm withdrawal", exact: true })).toBeDisabled();
  await withdraw.getByLabel("Withdrawal reason", { exact: true }).fill("Source export was incomplete; recollection required.");
  await withdraw.getByRole("button", { name: "Confirm withdrawal", exact: true }).click();
  await expect(dialog.getByRole("region", { name: "Evidence review and validity" })).toContainText("Review: Withdrawn");
  await expect(dialog.getByRole("region", { name: "Review history" })).toContainText("Source export was incomplete");
  const updated = await (await page.request.get(`/api/workspaces/${lifecycle.id}/evidence/${item.id}`)).json() as Evidence;
  expect(updated.reviewHistory?.map(entry => entry.decision)).toEqual(["accepted", "accepted", "withdrawn"]);
});

test("lineage remains metadata-only, labels legacy unknowns, retries errors and fits a phone", async ({ page, lifecycle }, testInfo) => {
  const item = await createInline(page, lifecycle, "Legacy observation with unrecorded origin");
  const bodyReads: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname === `/api/workspaces/${lifecycle.id}/evidence/${item.id}`) bodyReads.push(request.url()); });
  let failing = true;
  await page.route("**/evidence/lineage?**", async route => {
    if (failing) { await route.fulfill({ status: 503, json: { error: "Lineage unavailable" } }); return; }
    const response = await route.fetch();
    const data = await response.json() as RequirementEvidenceLineage;
    // Present an old persisted record's absent fields without fabricating provenance from its links.
    for (const row of data.items) { delete row.evidence.provenance; delete row.evidence.assurance; row.unknowns = ["Collection provenance not recorded", "Assurance scope not recorded"]; }
    await route.fulfill({ response, json: data });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(requirementPath(lifecycle, CSF, true));
  await expect(lineage(page).getByRole("alert")).toContainText("Lineage unavailable");
  await expect(lineage(page).getByText("No evidence is linked to this requirement.", { exact: true })).toHaveCount(0);
  failing = false;
  await lineage(page).getByRole("button", { name: "Retry lineage", exact: true }).click();
  await expect(lineage(page)).toContainText("Origin not recorded");
  await expect(lineage(page)).toContainText("Collection provenance not recorded");
  expect(bodyReads).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await lineage(page).getByRole("link", { name: item.title, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: item.title, exact: true });
  await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();
  await expect(dialog).toContainText(`Recorded artifact: ${item.title}`);
  expect(bodyReads).toHaveLength(1);
  await page.screenshot({ path: testInfo.outputPath("phone-evidence-dialog.png"), fullPage: true });
  await dialog.getByRole("button", { name: "Edit assurance and links", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(dialog.getByRole("button", { name: "Edit assurance and links", exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

for (const [role, email] of [["viewer", VIEWER], ["contributor", CONTRIBUTOR]] as const) {
  test(`${role} lifecycle actions follow capabilities and lineage remains readable`, async ({ page, lifecycle }) => {
    const item = await createInline(page, lifecycle, `${role} observation`);
    await login(page.request, email);
    await page.goto(`/w/${lifecycle.slug}/evidence?evidence=${item.id}`);
    const dialog = page.getByRole("dialog", { name: item.title, exact: true });
    await expect(dialog).toContainText("Production identity access records");
    await expect(dialog.getByRole("button", { name: "Edit assurance and links", exact: true })).toHaveCount(role === "contributor" ? 1 : 0);
    await expect(dialog.getByRole("button", { name: "Upload replacement", exact: true })).toHaveCount(role === "contributor" ? 1 : 0);
    await expect(dialog.getByRole("button", { name: /^(Accept|Reject|Withdraw evidence)$/ })).toHaveCount(0);
    await page.goto(requirementPath(lifecycle, CSF, true));
    await expect(lineage(page)).toContainText(item.title);
  });
}

test("an in-flight lineage response from workspace A cannot populate workspace B", async ({ page, lifecycle }) => {
  const old = await createInline(page, lifecycle, "Workspace A private observation");
  const other = await write<WorkspaceSummary>(page.request, "post", "/workspaces", lifecycle.csrf, { name: `Other lifecycle ${randomUUID()}`, frameworks: ["nist-csf-2.0"], profile: { industry: "saas", size: "11-50" } });
  const second: Workspace = { ...lifecycle, id: other.workspace.id, slug: other.workspace.slug };
  const current = await createInline(page, second, "Workspace B observation");
  let release!: () => void;
  let started!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const pending = new Promise<void>(resolve => { started = resolve; });
  await page.route(`**/api/workspaces/${lifecycle.id}/evidence/lineage?**`, async route => {
    const response = await route.fetch();
    started();
    await held;
    await route.fulfill({ response }).catch(() => undefined); // The keyed selection aborts A's obsolete request.
  });
  try {
    await page.goto(requirementPath(lifecycle, CSF, true));
    await pending;
    await expect(lineage(page).getByRole("status")).toContainText("Loading evidence lineage");
    await page.evaluate(path => { history.pushState({}, "", path); window.dispatchEvent(new PopStateEvent("popstate")); }, requirementPath(second, CSF, true));
    await expect(lineage(page)).toContainText(current.title);
    release();
    await expect(lineage(page)).not.toContainText(old.title);
    await expect(lineage(page).getByRole("link", { name: current.title, exact: true })).toHaveAttribute("href", new RegExp(`/w/${second.id}/evidence`));
  } finally {
    release();
    await page.goto(`/w/${lifecycle.slug}/evidence`);
    const response = await page.request.delete(`/api/workspaces/${second.id}`, { headers: { "x-visua-csrf": lifecycle.csrf } });
    expect(response.ok(), await response.text()).toBe(true);
  }
});

test("a fixed pending snapshot cannot accept after a concurrent withdrawal with unchanged artifact scope", async ({ page, lifecycle }) => {
  const item = await createInline(page, lifecycle, "Concurrent withdrawal observation");
  await page.goto(`/w/${lifecycle.slug}/evidence?evidence=${item.id}`);
  const dialog = page.getByRole("dialog", { name: item.title, exact: true });
  await expect(dialog.getByRole("button", { name: "Accept", exact: true })).toBeVisible();
  const accepted = await write<Evidence>(page.request, "patch", `/workspaces/${lifecycle.id}/evidence/${item.id}`, lifecycle.csrf, {
    decision: "accepted", expectedScope: evidenceReviewScope(item), expectedReviewId: null,
  });
  const withdrawn = await write<Evidence>(page.request, "patch", `/workspaces/${lifecycle.id}/evidence/${item.id}`, lifecycle.csrf, {
    decision: "withdrawn", note: "Another review found the source record unreliable.", expectedScope: evidenceReviewScope(accepted), expectedReviewId: accepted.reviewHistory!.at(-1)!.id,
  });
  expect(evidenceReviewScope(withdrawn)).toEqual(evidenceReviewScope(item));
  await expect(dialog.getByRole("region", { name: "Evidence review and validity" })).toContainText("Pending review");
  await dialog.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await dialog.getByRole("button", { name: "Reload evidence", exact: true }).click();
  await expect(dialog.getByRole("region", { name: "Evidence review and validity" })).toContainText("Withdrawn");
  await expect(dialog.getByRole("region", { name: "Review history" })).toContainText("Another review found the source record unreliable.");
  const final = await (await page.request.get(`/api/workspaces/${lifecycle.id}/evidence/${item.id}`)).json() as Evidence;
  expect(final.status).toBe("withdrawn");
  expect(final.reviewHistory?.map(entry => entry.decision)).toEqual(["accepted", "withdrawn"]);
});
