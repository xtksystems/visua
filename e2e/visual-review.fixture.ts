import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { expect, test as base, type APIRequestContext, type Page } from "@playwright/test";
import type { Me } from "../apps/web/src/lib/auth.ts";
import type { WorkspaceSummary } from "../apps/web/src/lib/types.ts";

export const CSF = "nist-csf-2.0", SP = "nist-sp-800-53-r5", AI = "nist-ai-rmf";
export const REQUIREMENT = `${CSF}:PR.AA-01`, GROUP = `${CSF}:PR.AA`, CONTROL = `${SP}:AC-1`;
export const OWNER = "morgan.lee@northwind-health.example", VIEWER = "jordan.park@northwind-health.example";
export type VisualWorkspace = { id: string; slug: string; csrf: string; ownerId: string };

export async function signIn(request: APIRequestContext, email = OWNER): Promise<Me> {
  const previous = await (await request.get("/api/auth/me")).json() as Me | null;
  const response = await request.post("/api/auth/dev/login", { data: { email }, headers: previous?.csrf ? { "x-visua-csrf": previous.csrf } : undefined });
  expect(response.ok()).toBe(true);
  return await response.json() as Me;
}
export async function write<T>(request: APIRequestContext, ws: VisualWorkspace, method: "post" | "patch", path: string, data: unknown): Promise<T> {
  const response = await request[method](`/api/workspaces/${ws.id}${path}`, { headers: { "x-visua-csrf": ws.csrf }, data });
  expect(response.ok(), await response.text()).toBe(true);
  return await response.json() as T;
}
export const test = base.extend<{ visual: VisualWorkspace }>({
  visual: async ({ page }, use) => {
    const me = await signIn(page.request);
    const created = await page.request.post("/api/workspaces", { headers: { "x-visua-csrf": me.csrf! }, data: {
      name: `Visual review ${randomUUID()}`, frameworks: [CSF, SP, AI], planInitialTasks: false,
      profile: { industry: "saas", size: "11-50" },
    } });
    expect(created.ok()).toBe(true);
    const { workspace } = await created.json() as WorkspaceSummary;
    await use({ id: workspace.id, slug: workspace.slug, csrf: me.csrf!, ownerId: me.user.id });
    const cleanup = await signIn(page.request);
    const removed = await page.request.delete(`/api/workspaces/${workspace.id}`, { headers: { "x-visua-csrf": cleanup.csrf! } });
    expect(removed.ok()).toBe(true);
  },
});
export async function capture(page: Page, name: string) {
  await mkdir(".screens/visual-followthrough-20261013", { recursive: true });
  await page.screenshot({ path: `.screens/visual-followthrough-20261013/${name}.png`, animations: "disabled" });
}
