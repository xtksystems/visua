/**
 * Screenshot harness: signs in to the Northwind Health demo, visits every page and
 * 3D view at three screen sizes, and saves screenshots to .screens/<label>/ (git-ignored)
 * with a contact sheet (index.html) and a report of horizontal overflow and console
 * errors per shot. Not part of the default e2e suite.
 *
 *   pnpm screens                         build the web app, start a seeded server, shoot everything
 *   pnpm screens --out before            name the run (default: "latest")
 *   pnpm screens --only laws,threats     only shots whose name contains one of these
 *   pnpm screens --sizes 390x844         only these sizes (default: 1440x900,1024x768,390x844)
 *   pnpm screens --no-build              reuse apps/web/dist
 *   pnpm screens --url http://localhost:8787   shoot a server that is already running
 *   pnpm screens --docs                  refresh the README images in docs/images instead
 */
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WS_SLUG = "northwind-health";
const WS = `/w/${WS_SLUG}`;
const OWNER = "morgan.lee@northwind-health.example";

// ------------------------------------------------------------------ options

function option(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);
const label = option("out") ?? "latest";
const only = option("only")?.split(",").filter(Boolean);
const sizes = (option("sizes") ?? "1440x900,1024x768,390x844").split(",").map((s) => {
  const [width, height] = s.split("x").map(Number);
  return { width: width!, height: height!, name: s };
});
const OUT = join(ROOT, ".screens", label);
const DOCS = flag("docs");

// ------------------------------------------------------------------ server

async function waitForHealth(base: string, child?: ChildProcess): Promise<void> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null) throw new Error(`The server exited with code ${child.exitCode}`);
    try {
      if ((await fetch(`${base}/api/health`)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No server at ${base}`);
}

async function startServer(): Promise<{ base: string; stop: () => void }> {
  const given = option("url");
  if (given) {
    await waitForHealth(given);
    return { base: given.replace(/\/$/, ""), stop: () => {} };
  }
  if (!flag("no-build")) {
    console.log("Building the web app…");
    const build = spawnSync("pnpm", ["--filter", "@visua/web", "build"], { cwd: ROOT, stdio: "inherit" });
    if (build.status !== 0) throw new Error("The web build failed");
  }
  const port = Number(process.env["VISUA_SCREENS_PORT"] ?? 8813);
  const child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "apps/server/src/index.ts"], {
    cwd: ROOT,
    env: { ...process.env, VISUA_PORT: String(port), VISUA_DB: ":memory:", VISUA_AGENT_MODE: "offline" },
    stdio: ["ignore", "ignore", "inherit"],
  });
  const base = `http://localhost:${port}`;
  await waitForHealth(base, child);
  return { base, stop: () => child.kill() };
}

// ------------------------------------------------------------------ shots

type Kind = "page" | "scene";
interface Shot {
  name: string;
  path: string;
  kind: Kind;
  signedOut?: boolean;
  /** Runs after the page settles and before the screenshot. */
  act?: (page: Page) => Promise<void>;
}

interface Meta {
  frameworks: { id: string; family: string }[];
}

const THREAT_SELECTION: Record<string, string> = {
  "mitre-atlas": "mitre-atlas:AML.T0051",
  "owasp-llm-top10": "owasp-llm-top10:LLM04",
  "owasp-agentic-top10": "owasp-agentic-top10:ASI01",
  "nist-ai-100-2": "nist-ai-100-2:NISTAML.018",
};
const SCENE_SELECTION: Record<string, string> = {
  "nist-csf-2.0": "nist-csf-2.0:PR.AA-01",
  "nist-sp-800-53-r5": "nist-sp-800-53-r5:AC-2",
  "us-state-ai-laws": "us-state-ai-laws:CA-SB243-02",
  "mitre-atlas": "mitre-atlas:AML.T0051",
};

function shots(meta: Meta, runId: string | undefined): Shot[] {
  const has = (id: string) => meta.frameworks.some((f) => f.id === id);
  const list: Shot[] = [
    { name: "login", path: "/login", kind: "page", signedOut: true },
    { name: "trust-center", path: `/trust/${WS_SLUG}`, kind: "page", signedOut: true },
    { name: "home", path: WS, kind: "page" },
    { name: "onboarding", path: "/onboarding", kind: "page" },
    { name: "settings", path: `${WS}/settings`, kind: "page" },
    { name: "organization", path: `${WS}/organization`, kind: "page" },
    { name: "reports", path: `${WS}/reports`, kind: "page" },
    { name: "plan", path: `${WS}/plan`, kind: "page" },
    { name: "evidence", path: `${WS}/evidence`, kind: "page" },
    { name: runId ? "agents-run" : "agents", path: runId ? `${WS}/agents/${runId}` : `${WS}/agents`, kind: "page" },
    { name: "policies", path: `${WS}/policies`, kind: "page" },
    { name: "csf-profile", path: `${WS}/profile`, kind: "page" },
    ...(has("aicpa-tsc-2017") ? [{ name: "soc2", path: `${WS}/soc2`, kind: "page" as Kind }] : []),
    { name: "rmf", path: `${WS}/rmf`, kind: "page" },
    ...(has("nist-ai-rmf") ? [{ name: "ai-governance", path: `${WS}/ai`, kind: "page" as Kind }] : []),
    ...(has("us-state-ai-laws") ? [{ name: "state-ai-laws", path: `${WS}/laws`, kind: "page" as Kind }] : []),
  ];
  for (const f of meta.frameworks) list.push({ name: `observatory-${f.id}`, path: `${WS}/observatory/${f.id}`, kind: "scene" });
  for (const [fw, id] of Object.entries(SCENE_SELECTION)) {
    if (has(fw)) list.push({ name: `observatory-${fw}-inspector`, path: `${WS}/observatory/${fw}?select=${encodeURIComponent(id)}`, kind: "scene" });
  }
  // Phones open the Observatory on its outline; this shot switches to the 3D scene.
  list.push({
    name: "observatory-nist-csf-2.0-3d",
    path: `${WS}/observatory/nist-csf-2.0`,
    kind: "scene",
    act: async (page) => {
      const button = page.getByRole("button", { name: "3D", exact: true });
      if (await button.count()) {
        await button.click();
        await page.locator(".observatory__canvas canvas").first().waitFor({ timeout: 20_000 });
        await page.waitForTimeout(2500);
      }
    },
  });
  list.push(
    { name: "nexus-threat-ring", path: `${WS}/crosswalk`, kind: "scene" },
    {
      name: "nexus-no-threat-ring",
      path: `${WS}/crosswalk`,
      kind: "scene",
      act: async (page) => {
        const toggle = page.getByRole("button", { name: /Threat ring/ });
        if (await toggle.count()) {
          await toggle.first().click();
          await page.waitForTimeout(1200);
        }
      },
    },
    { name: "nexus-threat-selected", path: `${WS}/crosswalk?group=${encodeURIComponent("mitre-atlas:AML.TA0004")}`, kind: "scene" },
    { name: "nexus-group-selected", path: `${WS}/crosswalk?group=${encodeURIComponent("nist-csf-2.0:PR.AA")}`, kind: "scene" },
  );
  for (const [catalog, id] of Object.entries(THREAT_SELECTION)) {
    if (has(catalog)) list.push({ name: `threats-${catalog}`, path: `${WS}/threats/${catalog}?select=${encodeURIComponent(id)}`, kind: "page" });
  }
  // The longest list: LLM04:2026's linked requirements, grouped by publication and route.
  if (has("owasp-llm-top10"))
    list.push({
      name: "threats-owasp-llm-top10-linked",
      path: `${WS}/threats/owasp-llm-top10?select=${encodeURIComponent(THREAT_SELECTION["owasp-llm-top10"]!)}`,
      kind: "page",
      act: async (page) => {
        await page.getByRole("tab", { name: /Linked requirements/ }).click();
        await page.waitForTimeout(500);
      },
    });
  return only ? list.filter((s) => only.some((o) => s.name.includes(o))) : list;
}

/** The README's images: the same views every time, so a refresh shows only what changed. */
interface DocShot {
  file: string;
  path: string;
  kind: Kind;
  width: number;
  height: number;
  act?: (page: Page) => Promise<void>;
}
const DOC_SHOTS: DocShot[] = [
  { file: "observatory-csf.jpg", path: `${WS}/observatory/nist-csf-2.0`, kind: "scene", width: 1600, height: 960 },
  { file: "crosswalk-nexus.jpg", path: `${WS}/crosswalk`, kind: "scene", width: 1600, height: 960 },
  { file: "observatory-800-53.jpg", path: `${WS}/observatory/nist-sp-800-53-r5`, kind: "scene", width: 1600, height: 960 },
  { file: "home.jpg", path: WS, kind: "page", width: 1600, height: 960 },
  { file: "rmf.jpg", path: `${WS}/rmf`, kind: "page", width: 1600, height: 960 },
  { file: "ai-governance.jpg", path: `${WS}/ai`, kind: "page", width: 1600, height: 960 },
  { file: "soc2.jpg", path: `${WS}/soc2`, kind: "page", width: 1600, height: 960 },
  {
    file: "threats-atlas.jpg",
    path: `${WS}/threats/mitre-atlas?select=${encodeURIComponent("mitre-atlas:AML.T0051")}`,
    kind: "page",
    width: 1440,
    height: 900,
    act: async (page) => {
      await page.locator(".atlas-matrix").evaluate((el) => el.scrollIntoView({ block: "start" }));
      await page.locator(".page").first().evaluate((el) => el.scrollBy(0, -170));
      await page.waitForTimeout(400);
    },
  },
  { file: "nexus-threat-ring.jpg", path: `${WS}/crosswalk?group=${encodeURIComponent("owasp-llm-top10:LLM01")}`, kind: "scene", width: 1440, height: 900 },
];

// ------------------------------------------------------------------ checks

interface Overflow {
  element: string;
  scrollWidth: number;
  clientWidth: number;
}

/** Elements that scroll (or are clipped) horizontally: the page must not, apart from deliberate containers. */
async function horizontalOverflow(page: Page): Promise<Overflow[]> {
  return page.evaluate(() => {
    const describe = (el: Element) => {
      const cls = [...el.classList].slice(0, 3).join(".");
      const aria = el.getAttribute("aria-label");
      return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${cls ? `.${cls}` : ""}${aria ? `[aria-label="${aria.slice(0, 40)}"]` : ""}`;
    };
    const out: { element: string; scrollWidth: number; clientWidth: number }[] = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > window.innerWidth + 1) out.push({ element: "document", scrollWidth: doc.scrollWidth, clientWidth: window.innerWidth });
    for (const el of document.querySelectorAll("body *")) {
      const style = getComputedStyle(el);
      if (!["auto", "scroll"].includes(style.overflowX)) continue;
      if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) out.push({ element: describe(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
    }
    return out;
  });
}

// ------------------------------------------------------------------ run

interface Result {
  shot: string;
  size: string;
  file: string;
  full?: string;
  overflow: Overflow[];
  errors: string[];
  ms: number;
}

async function context(browser: Browser, base: string, size: (typeof sizes)[number], signedIn: boolean): Promise<BrowserContext> {
  const mobile = size.width < 600;
  const ctx = await browser.newContext({ baseURL: base, viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1, reducedMotion: "reduce", isMobile: mobile, hasTouch: mobile });
  if (signedIn) {
    const res = await ctx.request.post("/api/auth/dev/login", { data: { email: OWNER } });
    if (!res.ok()) throw new Error(`Developer sign-in failed: ${res.status()} ${await res.text()}`);
  }
  return ctx;
}

async function shoot(page: Page, shot: Shot, size: (typeof sizes)[number]): Promise<Result> {
  const started = Date.now();
  const errors: string[] = [];
  const onError = (e: Error) => errors.push(`pageerror: ${e.message}`);
  const onConsole = (m: { type(): string; text(): string }) => {
    if (m.type() === "error") errors.push(m.text());
  };
  page.on("pageerror", onError);
  page.on("console", onConsole);
  await page.goto(shot.path, { waitUntil: "load" });
  // Server-sent events keep the network busy: wait for the content, then let it settle.
  if (shot.kind === "scene") await page.locator(".observatory__canvas canvas").first().waitFor({ timeout: 20_000 }).catch(() => {});
  else await page.locator("h1, h2").first().waitFor({ timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(shot.kind === "scene" ? 2500 : 700);
  if (shot.act) await shot.act(page);
  const dir = join(OUT, size.name);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${shot.name}.png`);
  await page.screenshot({ path: file });
  const overflow = await horizontalOverflow(page);
  let full: string | undefined;
  if (shot.kind === "page") {
    // The whole page: grow the viewport to the height of whatever scrolls vertically.
    const height = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, ...[...document.querySelectorAll(".page, .threats__main, main")].map((el) => el.scrollHeight + el.getBoundingClientRect().top)));
    if (height > size.height + 8) {
      await page.setViewportSize({ width: size.width, height: Math.min(Math.ceil(height), 9000) });
      await page.waitForTimeout(400);
      full = join(dir, `${shot.name}--full.png`);
      await page.screenshot({ path: full });
      await page.setViewportSize({ width: size.width, height: size.height });
    }
  }
  page.off("pageerror", onError);
  page.off("console", onConsole);
  return { shot: shot.name, size: size.name, file, full, overflow, errors, ms: Date.now() - started };
}

function contactSheet(results: Result[]): string {
  const names = [...new Set(results.map((r) => r.shot))];
  const cols = sizes.map((s) => s.name);
  const cell = (r: Result | undefined) => {
    if (!r) return "<td></td>";
    const rel = (p: string) => relative(OUT, p).split("\\").join("/");
    const notes = [...r.overflow.map((o) => `↔ ${o.element} ${o.scrollWidth}>${o.clientWidth}`), ...r.errors.map((e) => `⚠ ${e}`)];
    return `<td><a href="${rel(r.full ?? r.file)}"><img loading="lazy" src="${rel(r.file)}" alt="${r.shot} at ${r.size}"></a>${notes.length ? `<ul>${notes.map((n) => `<li>${n.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</li>`).join("")}</ul>` : ""}</td>`;
  };
  return `<!doctype html><meta charset="utf-8"><title>Visua screens · ${label}</title>
<style>body{font:13px system-ui;margin:16px;background:#111;color:#ddd}table{border-collapse:collapse}td,th{border:1px solid #333;padding:6px;vertical-align:top}img{max-width:420px;max-height:300px;display:block}ul{margin:4px 0 0;padding-left:16px;max-width:420px;color:#f99}th{position:sticky;top:0;background:#222}</style>
<h1>Visua screens · ${label}</h1>
<table><tr><th>Shot</th>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>
${names.map((n) => `<tr><th>${n}</th>${cols.map((c) => cell(results.find((r) => r.shot === n && r.size === c))).join("")}</tr>`).join("\n")}
</table>`;
}

const server = await startServer();
// Many 3D pages in a row: keep Chromium from blocking WebGL for the origin after context losses.
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-domain-blocking-for-3d-apis"] });
const t0 = Date.now();
const results: Result[] = [];
try {
  if (DOCS) {
    for (const d of DOC_SHOTS) {
      const ctx = await context(browser, server.base, { width: d.width, height: d.height, name: `${d.width}x${d.height}` }, true);
      const page = await ctx.newPage();
      await page.goto(d.path, { waitUntil: "load" });
      if (d.kind === "scene") await page.locator(".observatory__canvas canvas").first().waitFor({ timeout: 20_000 });
      else await page.locator("h1, h2").first().waitFor({ timeout: 20_000 });
      await page.waitForTimeout(d.kind === "scene" ? 3500 : 1000);
      if (d.act) await d.act(page);
      const file = join(ROOT, "docs", "images", d.file);
      await page.screenshot({ path: file, type: "jpeg", quality: 84 });
      console.log(`  ${relative(ROOT, file)}`);
      await ctx.close();
    }
  } else {
    const probe = await context(browser, server.base, sizes[0]!, true);
    const meta = (await (await probe.request.get("/api/meta")).json()) as Meta;
    const runs = (await (await probe.request.get(`/api/workspaces/${WS_SLUG}/runs?limit=20`)).json()) as { id: string; status: string; agent: string }[];
    const run = runs.find((r) => r.agent === "auditor-prep") ?? runs.find((r) => r.status === "completed") ?? runs[0];
    await probe.close();
    const list = shots(meta, run?.id);
    console.log(`${list.length} shots × ${sizes.length} sizes → ${relative(ROOT, OUT)}/`);
    for (const size of sizes) {
      const signedIn = await context(browser, server.base, size, true);
      const signedOut = await context(browser, server.base, size, false);
      for (const shot of list) {
        // A fresh tab per shot: each 3D view gets its own WebGL context, released when the tab closes.
        const page = await (shot.signedOut ? signedOut : signedIn).newPage();
        try {
          const r = await shoot(page, shot, size);
          results.push(r);
          const notes = [r.overflow.length ? `${r.overflow.length} horizontal overflow` : "", r.errors.length ? `${r.errors.length} console error(s)` : ""].filter(Boolean).join(", ");
          console.log(`  ${size.name.padEnd(9)} ${shot.name.padEnd(40)} ${notes || "ok"}`);
        } catch (err) {
          console.log(`  ${size.name.padEnd(9)} ${shot.name.padEnd(40)} FAILED: ${(err as Error).message.split("\n")[0]}`);
          results.push({ shot: shot.name, size: size.name, file: "", overflow: [], errors: [`harness: ${(err as Error).message.split("\n")[0]}`], ms: 0 });
        } finally {
          await page.close();
        }
      }
      await signedIn.close();
      await signedOut.close();
    }
  }
} finally {
  await browser.close();
  server.stop();
}
// The README images need no report.
if (DOCS) process.exit(0);
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "report.json"), JSON.stringify(results.map((r) => ({ ...r, file: relative(OUT, r.file), full: r.full ? relative(OUT, r.full) : undefined })), null, 2));
writeFileSync(join(OUT, "index.html"), contactSheet(results));
const flagged = results.filter((r) => r.overflow.length || r.errors.length);
console.log(`\n${results.length} screenshots in ${relative(ROOT, OUT)}/ (contact sheet: index.html) in ${Math.round((Date.now() - t0) / 1000)} s`);
if (flagged.length) {
  console.log(`${flagged.length} with notes:`);
  for (const r of flagged) {
    for (const o of r.overflow) console.log(`  ↔ ${r.size} ${r.shot}: ${o.element} scrolls ${o.scrollWidth}px in ${o.clientWidth}px`);
    for (const e of r.errors) console.log(`  ⚠ ${r.size} ${r.shot}: ${e.slice(0, 200)}`);
  }
}
