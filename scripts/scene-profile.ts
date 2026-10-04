/** Reproducible WebGL work counts against an already-running demo server.
 * node scripts/scene-profile.ts --url http://localhost:8815 --out .screens/profile.json
 * Software rendering measures submitted work, not hardware GPU throughput.
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
const option = (name: string) => process.argv[process.argv.indexOf(`--${name}`) + 1];
const baseURL = process.argv.includes("--url") ? option("url") : "http://localhost:8815";
const out = process.argv.includes("--out") ? option("out")! : ".screens/scene-profile.json";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
try {
  const login = await context.request.post("/api/auth/dev/login", { data: { email: "morgan.lee@northwind-health.example" } });
  if (!login.ok()) throw new Error(`Demo login failed: ${login.status()}`);
  await context.addInitScript(() => {
    const w = window as unknown as { gpu: { frames: number; calls: number; frameCalls: number; maxCalls: number } };
    w.gpu = { frames: 0, calls: 0, frameCalls: 0, maxCalls: 0 };
    const proto = WebGL2RenderingContext.prototype;
    const clear = proto.clear;
    proto.clear = function (mask) {
      w.gpu.maxCalls = Math.max(w.gpu.maxCalls, w.gpu.frameCalls);
      w.gpu.frameCalls = 0;
      w.gpu.frames++;
      return clear.call(this, mask);
    };
    for (const name of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"] as const) {
      const original = proto[name] as (...args: number[]) => void;
      Object.defineProperty(proto, name, { value: function (this: WebGL2RenderingContext, ...args: number[]) {
        w.gpu.calls++;
        w.gpu.frameCalls++;
        return original.apply(this, args);
      }, configurable: true });
    }
  });
  const results = [];
  for (const [name, path, action] of [
    ["nexus", "/crosswalk", ""],
    ["nexus-selected", "/crosswalk?group=nist-csf-2.0%3APR.AA", ""],
    ["observatory-csf", "/observatory/nist-csf-2.0", ""],
    ["observatory-sp80053", "/observatory/nist-sp-800-53-r5", ""],
    ["terrain-sp80053", "/observatory/nist-sp-800-53-r5", "Terrain"],
  ]) {
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(`/w/northwind-health${path}`);
    await page.locator('.scene-label--sector[data-shown="true"]').first().waitFor();
    if (action) await page.getByRole("button", { name: action, exact: true }).click();
    await page.waitForTimeout(3000);
    const sample = await page.evaluate(async () => {
      const w = window as unknown as { gpu: { frames: number; calls: number; frameCalls: number; maxCalls: number } };
      const maxCallsPerFrame = Math.max(w.gpu.maxCalls, w.gpu.frameCalls);
      const start = { ...w.gpu };
      const begin = performance.now();
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { maxCallsPerFrame, idleFrames: w.gpu.frames - start.frames, idleDrawCalls: w.gpu.calls - start.calls, sampleMs: Math.round(performance.now() - begin) };
    });
    results.push({ name, ...sample, errors });
    await page.close();
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ renderer: "Chromium SwiftShader", viewport: "1440x900", reducedMotion: true, results }, null, 2) + "\n");
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
