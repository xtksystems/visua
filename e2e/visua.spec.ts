import { expect, test, type Page } from "@playwright/test";

const WS = "/w/northwind-health";
const MORGAN = "morgan.lee@northwind-health.example";

/** Developer sign-in (the e2e server runs in developer mode); returns the session's CSRF token. */
async function signIn(page: Page, email = MORGAN): Promise<string> {
  const res = await page.request.post("/api/auth/dev/login", { data: { email } });
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { csrf: string }).csrf;
}

/** Collect console errors and uncaught exceptions for the duration of a test. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

test("home shows the workspace, its frameworks and next best actions", async ({ page }) => {
  await signIn(page);
  const errors = watchErrors(page);
  await page.goto(WS);
  await expect(page.getByRole("heading", { level: 1, name: "Northwind Health" })).toBeVisible();
  for (const name of ["CSF 2.0", "SOC 2", "SP 800-53", "RMF"]) await expect(page.getByRole("main").getByText(name).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Next best actions" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("mission control opens each framework's own program page", async ({ page }) => {
  await signIn(page);
  await page.goto(WS);
  await expect(page.getByRole("heading", { level: 1, name: "Northwind Health" })).toBeVisible();
  const expected: [string, string][] = [
    ["NIST CSF 2.0", "/profile"],
    ["SOC 2 (TSC 2017)", "/soc2"],
    ["SP 800-53 Rev. 5", "/rmf"],
    ["NIST RMF", "/rmf"],
    ["NIST AI RMF", "/ai"],
    ["State AI laws", "/laws"],
  ];
  for (const [name, path] of expected) {
    const card = page.locator(".panel").filter({ has: page.getByRole("heading", { level: 3, name, exact: true }) });
    await expect(card.getByRole("link", { name: /Program/ })).toHaveAttribute("href", `${WS}${path}`);
  }
  await page.locator(".panel").filter({ has: page.getByRole("heading", { level: 3, name: "State AI laws", exact: true }) }).getByRole("link", { name: /Program/ }).click();
  await expect(page).toHaveURL(new RegExp(`${WS}/laws$`));
});

test("Observatory renders the 3D scene with its keyboard-accessible 2D twin", async ({ page }) => {
  await signIn(page);
  const errors = watchErrors(page);
  await page.goto(`${WS}/observatory/nist-csf-2.0`);
  await expect(page.locator(".observatory__canvas canvas")).toBeVisible();
  const tree = page.getByRole("tree", { name: "Framework outline" });
  await expect(tree).toBeVisible();
  await tree.locator(".outline__row", { hasText: "GV" }).first().click();
  await expect(page.locator("aside.inspector")).toBeVisible();
  // Deep link to an outcome opens its inspector with the official text and a page citation.
  await page.goto(`${WS}/observatory/nist-csf-2.0?select=${encodeURIComponent("nist-csf-2.0:PR.AA-01")}`);
  const inspector = page.getByRole("complementary", { name: "PR.AA-01 details" });
  await expect(inspector).toContainText("Identities and credentials for authorized users, services, and hardware are managed by the organization");
  await expect(inspector).toContainText(/p\. \d+/);
  expect(errors).toEqual([]);
});

/**
 * Opens the CSF Observatory counting WebGL program links, and returns the count once loading has
 * settled plus a step runner: a step (a selection) must link nothing. Linking a program blocks
 * the frame that first draws its material: 60 to 100 ms when the selection halo, its path and
 * agent comets appeared on the first click.
 */
async function observatoryCountingLinks(page: Page, settle?: () => Promise<void>) {
  await page.addInitScript(() => {
    const w = window as unknown as { __links: number };
    w.__links = 0;
    for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
      const link = proto.linkProgram;
      proto.linkProgram = function (program) {
        w.__links++;
        return link.call(this, program);
      };
    }
  });
  await signIn(page);
  await page.goto(`${WS}/observatory/nist-csf-2.0`);
  await expect(page.locator(".observatory__canvas canvas")).toBeVisible();
  const links = () =>
    page.evaluate(async () => {
      for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame);
      return (window as unknown as { __links: number }).__links;
    });
  const effects = () => page.locator(".observatory__canvas canvas").getAttribute("data-effects");
  await settle?.();
  // Loaded: the program count holds still across a few samples.
  let loaded = -1;
  for (let still = 0, sample = 0; still < 3 && sample < 30; sample++) {
    const now = await links();
    still = now === loaded ? still + 1 : 0;
    loaded = now;
  }
  expect(loaded).toBeGreaterThan(0);
  // When the performance monitor drops post-processing during a step (slow frames), every
  // material recompiles for the screen and the step says nothing about the selection: the scene
  // warms up again, and the step is taken again (it happens at most once).
  const step = async (label: string, act: () => Promise<void>) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const before = await effects();
      const count = await links();
      await act();
      const after = await links();
      if ((await effects()) === before) {
        expect(after, `programs linked by ${label}`).toBe(count);
        return;
      }
      await links();
    }
    throw new Error(`Post-processing kept changing during ${label}`);
  };
  const selections = async () => {
    // Drill into a function, open one of its outcomes, then a sibling, then back up to the parent.
    await page.getByRole("tree", { name: "Framework outline" }).getByRole("treeitem").first().focus();
    await step("the first selection", async () => {
      await page.keyboard.press("Enter");
      await page.keyboard.press("Enter");
      await expect(page.locator("aside.inspector")).toBeVisible();
    });
    await step("selecting a sibling", () => page.keyboard.press("ArrowRight"));
    await step("selecting the parent", () => page.keyboard.press("Escape"));
  };
  return { effects, selections };
}

test("Observatory compiles its shaders before the first selection, not on it", async ({ page }) => {
  const { selections } = await observatoryCountingLinks(page);
  await selections();
});

test("Observatory still compiles no shader on a selection once slow frames drop post-processing", async ({ page }) => {
  const canvas = page.locator(".observatory__canvas canvas");
  const { effects, selections } = await observatoryCountingLinks(page, async () => {
    // Slow the page down until the performance monitor turns bloom and vignette off.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 20 });
    await expect(canvas).toHaveAttribute("data-effects", "false", { timeout: 60_000 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  });
  expect(await effects()).toBe("false");
  await selections();
});

test("Crosswalk Nexus selects a group and lists authoritative mappings", async ({ page }) => {
  await signIn(page);
  const errors = watchErrors(page);
  await page.goto(`${WS}/crosswalk`);
  await expect(page.locator(".observatory__canvas canvas")).toBeVisible();
  await expect(page.getByText("Do the work once, see where it counts")).toBeVisible();
  await page.getByRole("textbox", { name: "Find a requirement group" }).fill("PR.AA");
  await page.getByRole("listitem").filter({ hasText: "PR.AA" }).first().click();
  await expect(page).toHaveURL(/group=nist-csf-2\.0%3APR\.AA/);
  await expect(page.getByRole("note").first()).toContainText("not evidence");
  await expect(page.locator(".xw-row").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("RMF program: lifecycle, FIPS 199 categorization and authorization record", async ({ page }) => {
  await signIn(page);
  const errors = watchErrors(page);
  await page.goto(`${WS}/rmf`);
  await expect(page.getByRole("tablist", { name: "RMF steps" }).getByRole("tab")).toHaveCount(7);
  await expect(page.getByText("Categorize · FIPS 199")).toBeVisible();
  await expect(page.getByText(/SC = \{\(confidentiality/)).toBeVisible();
  await expect(page.getByText("Authorize · Task R-4")).toBeVisible();
  expect(errors).toEqual([]);
});

test("SOC 2 program: scope, observation window and DC 200 checklist", async ({ page }) => {
  await signIn(page);
  const errors = watchErrors(page);
  await page.goto(`${WS}/soc2`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Type 2 readiness");
  await expect(page.getByText("Examination scope")).toBeVisible();
  await expect(page.getByText("System description · DC 200")).toBeVisible();
  await expect(page.getByText("DC8", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("agents propose, people approve: an offline Copilot run completes with citations", async ({ page }) => {
  const csrf = await signIn(page);
  const request = page.request;
  const run = await request.post("/api/workspaces/northwind-health/runs?wait=1", { data: { agent: "copilot", goal: "What does GV.SC-07 require?", input: {} }, headers: { "x-visua-csrf": csrf } });
  expect(run.ok()).toBe(true);
  const body = (await run.json()) as { id: string; status: string };
  expect(body.status).toBe("completed");
  const detail = (await (await request.get(`/api/workspaces/northwind-health/runs/${body.id}`)).json()) as { steps: { type: string; citations?: { documentId: string; page?: number }[] }[] };
  const citations = detail.steps.flatMap((s) => s.citations ?? []);
  expect(citations.length).toBeGreaterThan(0);
  expect(citations.some((c) => c.documentId && c.page)).toBe(true);
  await page.goto(`${WS}/agents/${body.id}`);
  await expect(page.getByText("What does GV.SC-07 require?").first()).toBeVisible();
});

test("public trust center shows only computed facts, for the frameworks chosen in Settings", async ({ page }) => {
  await page.goto("/trust/northwind-health");
  await expect(page.getByText("Trust center · powered by Visua")).toBeVisible();
  await expect(page.getByText(/Readiness is not an audit opinion/)).toBeVisible();
  await expect(page.getByText("NIST CSF 2.0", { exact: true })).toBeVisible();
  // State AI laws are private by default; an owner can publish them in Settings.
  await expect(page.getByText("State AI laws", { exact: true })).toHaveCount(0);
  await signIn(page);
  await page.goto(`${WS}/settings`);
  const laws = page.getByRole("switch", { name: "Publish State AI laws readiness on the trust center" });
  await expect(laws).toHaveAttribute("aria-checked", "false");
  await expect(page.getByRole("switch", { name: "Publish NIST CSF 2.0 readiness on the trust center" })).toHaveAttribute("aria-checked", "true");
  await laws.click();
  await expect(laws).toHaveAttribute("aria-checked", "true");
  await page.goto("/trust/northwind-health");
  await expect(page.getByText("State AI laws", { exact: true })).toBeVisible();
  await page.goto(`${WS}/settings`);
  await laws.click();
  await expect(laws).toHaveAttribute("aria-checked", "false");
});

test("AI governance: inventory, AI RMF functions and Generative AI Profile risks", async ({ page }) => {
  await signIn(page);
  const meta = (await (await page.request.get("/api/meta")).json()) as { frameworks: { id: string }[] };
  test.skip(!meta.frameworks.some((f) => f.id === "nist-ai-rmf"), "NIST AI RMF corpus not ingested");
  const errors = watchErrors(page);
  await page.goto(`${WS}/ai`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("AI RMF readiness");
  await expect(page.getByText("AI system inventory")).toBeVisible();
  await expect(page.getByRole("row", { name: /Clinical note summarizer/ })).toBeVisible();
  for (const fn of ["GOVERN", "MAP", "MEASURE", "MANAGE"]) await expect(page.getByText(fn, { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Generative AI Profile (NIST AI 600-1)")).toBeVisible();
  await expect(page.getByText("Confabulation").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("sign-in: developer personas open the workspace with their organization role", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(`${WS}/agents`);
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.getByRole("list", { name: "Demo personas" }).getByRole("button", { name: /Priya Shah/ }).click();
  await expect(page).toHaveURL(new RegExp(`${WS}/agents$`));
  await expect(page.locator(".topbar .role-badge")).toHaveText("Approver");
  expect(errors).toEqual([]);
});

test("roles: a viewer sees everything read-only and cannot decide or export", async ({ page }) => {
  await signIn(page, "jordan.park@northwind-health.example");
  await page.goto(`${WS}/agents`);
  await expect(page.locator(".topbar .role-badge")).toHaveText("Viewer · read-only");
  await expect(page.getByRole("heading", { name: "Launch an agent" })).toHaveCount(0);
  await page.getByRole("tab", { name: /Approvals inbox/ }).click();
  await expect(page.getByText("Awaiting an approver").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^Approve/ })).toHaveCount(0);
  await page.goto(`${WS}/reports`);
  await expect(page.getByRole("note").filter({ hasText: "Exports are available" })).toBeVisible();
  const res = await page.request.get("/api/workspaces/northwind-health/exports/readiness.md");
  expect(res.status()).toBe(403);
});

test("tenant separation: another organization cannot see Northwind Health", async ({ page }) => {
  await signIn(page, "taylor.brooks@contoso-bank.example");
  expect((await page.request.get("/api/workspaces/northwind-health")).status()).toBe(404);
  const list = (await (await page.request.get("/api/workspaces")).json()) as unknown[];
  expect(list).toHaveLength(0);
  await page.goto(WS);
  // Contoso Bank has no workspace yet: its owner is sent to onboarding, never into Northwind.
  await expect(page).toHaveURL(/\/onboarding$/);
});

test("organization admin: members, roles and a one-time API token", async ({ page }) => {
  const errors = watchErrors(page);
  await signIn(page);
  await page.goto(`${WS}/organization`);
  await expect(page.getByRole("heading", { level: 1, name: "Northwind Health" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "priya.shah@northwind-health.example" })).toContainText("Approver");
  await page.getByLabel("Email").fill("new.analyst@northwind-health.example");
  await page.getByRole("button", { name: "Add member" }).click();
  await expect(page.getByRole("row").filter({ hasText: "new.analyst@northwind-health.example" })).toBeVisible();
  await page.getByRole("tab", { name: "API tokens" }).click();
  await page.getByLabel("Token name").fill("CI evidence upload");
  await page.getByRole("button", { name: "Create token" }).click();
  await expect(page.getByRole("status").filter({ hasText: "will not be shown again" })).toContainText("vsa_");
  await page.getByRole("tab", { name: "Audit trail" }).click();
  await expect(page.getByText("Chain intact")).toBeVisible();
  expect(errors).toEqual([]);
});

test("threat views: ATLAS matrix, coverage from linked requirements, and the Nexus threat ring", async ({ page }) => {
  await signIn(page);
  const errors = watchErrors(page);
  await page.goto(`${WS}/threats`);
  await expect(page.getByRole("heading", { level: 1, name: /AI threats/ })).toBeVisible();
  const matrix = page.getByRole("group", { name: /MITRE ATLAS matrix/ });
  await expect(matrix).toBeVisible();
  await expect(matrix.getByText("Reconnaissance", { exact: true })).toBeVisible();
  // One tab stop; arrow keys move within a tactic and across tactics, Enter opens.
  const recon = matrix.getByRole("group", { name: /Reconnaissance/ });
  await recon.getByRole("button").first().focus();
  await page.keyboard.press("ArrowDown");
  const firstTechnique = await page.evaluate(() => document.activeElement?.getAttribute("data-key"));
  expect(firstTechnique).toMatch(/^mitre-atlas:AML\.T\d{4}$/);
  await page.keyboard.press("ArrowRight");
  const neighbor = await page.evaluate(() => document.activeElement?.getAttribute("data-key"));
  expect(neighbor).not.toBe(firstTechnique);
  expect(await matrix.locator('[tabindex="0"]').count()).toBe(1);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("complementary", { name: new RegExp(`${neighbor!.split(":")[1]!.replace(".", "\\.")} details`) })).toBeVisible();
  // A technique opens the coverage inspector: never a status of its own, always the linked requirements.
  await matrix.getByRole("button", { name: /LLM Prompt Injection/ }).first().click();
  const inspector = page.getByRole("complementary", { name: /AML\.T0051 details/ });
  await expect(inspector.getByText(/Partly covered|Covered|Open/).first()).toBeVisible();
  await inspector.getByRole("tab", { name: /Linked requirements/ }).click();
  await expect(inspector.getByText("Draft").first()).toBeVisible();
  // Final links only: ATLAS has no final link to a requirement.
  await inspector.getByRole("button", { name: "Final only" }).click();
  await expect(inspector.getByText("No linked requirement at the chosen link status.")).toBeVisible();
  await inspector.getByRole("button", { name: "All published links" }).click();
  // OWASP LLM Top 10: the 2026 edition, with the 2025 entry each one replaces.
  await page.getByRole("tab", { name: /OWASP LLM Top 10/ }).click();
  await expect(page.getByText("LLM04:2026")).toBeVisible();
  await expect(page.getByText("was LLM03:2025")).toBeVisible();
  // The Nexus shows the inner threat ring and its detail.
  await page.goto(`${WS}/crosswalk?group=${encodeURIComponent("mitre-atlas:AML.TA0004")}`);
  await expect(page.locator(".observatory__canvas canvas")).toBeVisible();
  await expect(page.getByText("MITRE ATLAS · threat ring")).toBeVisible();
  await expect(page.getByRole("button", { name: /Threat ring/ })).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});

test("state AI laws: roles decide scope, upcoming obligations count apart, obligations open in 3D", async ({ page }) => {
  const csrf = await signIn(page);
  const meta = (await (await page.request.get("/api/meta")).json()) as { frameworks: { id: string }[] };
  test.skip(!meta.frameworks.some((f) => f.id === "us-state-ai-laws"), "State AI laws corpus not ingested");
  const errors = watchErrors(page);
  await page.goto(`${WS}/laws`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("State AI laws");
  await expect(page.getByText(/26 laws and regulations, 187 obligations/)).toBeVisible();
  const timeline = page.getByRole("list", { name: "Effective-date timeline of the tracked laws" });
  await expect(timeline).toBeVisible();
  // Each month says what takes effect, on hover and keyboard focus; the list view gives every date.
  // Arrive by keyboard: a page without window focus (headless Chromium on macOS) moves focus on
  // element.focus() without firing focus events, so a bare focus() tests nothing a person does.
  const months = timeline.getByRole("listitem");
  await months.nth(1).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(months.first()).toBeFocused();
  await expect(page.locator(".law-timeline__tip")).toContainText(/obligations? (in force since|take effect)/);
  await page.getByRole("group", { name: "Timeline view" }).getByRole("button", { name: "List" }).click();
  await expect(page.getByRole("table", { name: "Effective dates of the tracked laws" }).getByRole("row", { name: /CA-SB243/ }).first()).toBeVisible();
  await page.getByRole("group", { name: "Timeline view" }).getByRole("button", { name: "Chart" }).click();
  // The demo records Northwind as a developer and deployer under TRAIGA.
  const traiga = page.getByRole("article", { name: /Texas Responsible Artificial Intelligence Governance Act/ });
  await expect(traiga.getByRole("checkbox", { name: /^developer/ })).toBeChecked();
  // Colorado's ADMT Act applies from 2027: its obligations in scope are upcoming and not counted today.
  await expect(page.getByRole("article", { name: /Colorado Automated Decision-Making Technology Act/ })).toContainText(/take effect from 2027-01-01.*not counted in today's readiness/);
  // A law nobody decided on stays one line until opened; recording a role brings its obligations into scope.
  await page.getByLabel("Filter laws").fill("SB 243");
  await page.getByRole("button", { name: /CA-SB243/ }).click();
  const sb243 = page.getByRole("article", { name: /Companion Chatbots \(SB 243\)/ });
  await expect(sb243).toContainText(/0 in force · 0 of \d+ in scope/);
  await sb243.getByRole("checkbox", { name: /^operator/ }).check();
  await sb243.getByLabel("Basis for CA-SB243 applicability").fill("Our patient companion app is offered to California residents.");
  await sb243.getByRole("button", { name: "Record applicability" }).click();
  await expect(sb243.getByText(/^Decided \d{4}-\d{2}-\d{2} by /)).toBeVisible();
  await expect(sb243).toContainText(/[1-9]\d* in force · [1-9]\d* of \d+ in scope/);
  // Each obligation is quoted from the statute, with its section and page.
  await sb243.getByRole("button", { name: /\d+ obligations/ }).click();
  await sb243.getByRole("link", { name: "CA-SB243-02", exact: true }).click();
  await expect(page).toHaveURL(/\/observatory\/us-state-ai-laws/);
  const inspector = page.getByRole("complementary", { name: "CA-SB243-02 details" });
  await expect(inspector).toContainText("§ 22602");
  await expect(inspector).toContainText(/p\. \d+/);
  expect(errors).toEqual([]);
  // Leave the demo as it was.
  const overview = (await (await page.request.get("/api/workspaces/northwind-health/laws")).json()) as { jurisdictions: { laws: { code: string; lawId: string }[] }[] };
  const lawId = overview.jurisdictions.flatMap((j) => j.laws).find((l) => l.code === "CA-SB243")!.lawId;
  expect((await page.request.put(`/api/workspaces/northwind-health/laws/${lawId}/applicability`, { data: { roles: [] }, headers: { "x-visua-csrf": csrf } })).ok()).toBe(true);
});

test("Observatory: a threat catalog shows coverage from linked requirements, never an assessment", async ({ page }) => {
  await signIn(page);
  const meta = (await (await page.request.get("/api/meta")).json()) as { frameworks: { id: string }[] };
  test.skip(!meta.frameworks.some((f) => f.id === "mitre-atlas"), "Threat catalogs not ingested");
  const errors = watchErrors(page);
  await page.goto(`${WS}/observatory/mitre-atlas`);
  await expect(page.locator(".observatory__canvas canvas")).toBeVisible();
  // Coverage takes the place of status: two lenses, and a legend that says where coverage comes from.
  await expect(page.getByRole("group", { name: "Lens" }).getByRole("button")).toHaveCount(2);
  await expect(page.getByText(/derived from linked requirements, never assessed/)).toBeVisible();
  await expect(page.getByRole("tree", { name: "Framework outline" }).getByText("Reconnaissance", { exact: true })).toBeVisible();
  // A technique: coverage from its linked requirements and their link status, and no level to set.
  await page.goto(`${WS}/observatory/mitre-atlas?select=${encodeURIComponent("mitre-atlas:AML.T0051")}`);
  const inspector = page.getByRole("complementary", { name: "AML.T0051 details" });
  await expect(inspector).toContainText("LLM Prompt Injection");
  await expect(inspector).toContainText("not an assessment of it");
  await expect(inspector.getByRole("radiogroup")).toHaveCount(0);
  await expect(inspector.getByRole("group", { name: "Assessment" })).toHaveCount(0);
  // The other catalogs are one choice away.
  await page.getByRole("combobox", { name: "Framework" }).first().selectOption("owasp-llm-top10");
  await expect(page).toHaveURL(/\/observatory\/owasp-llm-top10/);
  await expect(page.locator(".observatory__canvas canvas")).toBeVisible();
  expect(errors).toEqual([]);
});

test("phones: the rail folds into a menu", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.goto(WS);
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav).toBeHidden();
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: "State AI laws" }).click();
  await expect(page).toHaveURL(new RegExp(`${WS}/laws$`));
  await expect(nav).toBeHidden();
});

test("no page, panel or table scrolls sideways at 1024px or on a phone (the ATLAS matrix scrolls in its own box)", async ({ page }) => {
  await signIn(page);
  const paths = ["", "/plan", "/evidence", "/organization", "/reports", "/settings", "/profile", "/rmf", "/soc2", "/ai", "/laws", "/threats"].map((p) => `${WS}${p}`);
  for (const [width, height] of [
    [1024, 768],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    for (const path of [...paths, "/onboarding"]) {
      await page.goto(path);
      await page.locator("h1").first().waitFor();
      await page.waitForTimeout(300);
      const sideways = await page.evaluate(() => {
        const out: string[] = [];
        if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push("the document");
        for (const el of document.querySelectorAll<HTMLElement>("body *")) {
          if (el.closest(".atlas-matrix")) continue;
          const { overflowX } = getComputedStyle(el);
          if ((overflowX === "auto" || overflowX === "scroll") && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
            out.push(`${el.tagName.toLowerCase()}${[...el.classList].map((c) => `.${c}`).join("")} (${el.scrollWidth}px in ${el.clientWidth}px)`);
          }
        }
        return out;
      });
      expect(sideways, `${path} at ${width}px`).toEqual([]);
    }
  }
});

test("3D scenes: labels stay inside the canvas, clear of the HUD and of each other", async ({ page }) => {
  // Ten scenes, each measured only once its camera has landed: at SwiftShader's frame rate that
  // takes about a minute on an idle arm64 Mac, and several on a busy one (four frames can take
  // 5 to 13 seconds under heavy load).
  test.setTimeout(600_000);
  await signIn(page);
  const meta = (await (await page.request.get("/api/meta")).json()) as { frameworks: { id: string }[] };
  const scenes = [...["nist-csf-2.0", "nist-sp-800-53-r5", "mitre-atlas", "us-state-ai-laws"].filter((id) => meta.frameworks.some((f) => f.id === id)).map((id) => `/observatory/${id}`), "/crosswalk"];
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
  ] as const) {
    await page.setViewportSize({ width, height });
    for (const fw of scenes) {
      await page.goto(`${WS}${fw}`);
      await expect(page.locator(".observatory__canvas canvas")).toBeVisible();
      await expect(page.locator(".scene-label--sector").filter({ visible: true }).first()).toBeVisible();
      // Measure once the camera has landed. Labels are placed again on every frame the camera moves,
      // so the layout is sampled a few rendered frames apart, not a fixed time apart: a software
      // renderer can stall for a second on its first frames (SwiftShader on arm64 does), and a
      // stalled scene looks as still as a settled one.
      const layout = () =>
        page.evaluate(async () => {
          for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame);
          return [...document.querySelectorAll<HTMLElement>(".scene-label")]
            .filter((l) => l.style.visibility === "visible")
            .map((l) => {
              const r = l.getBoundingClientRect();
              return `${l.textContent}@${Math.round(r.left)},${Math.round(r.top)}`;
            })
            .join("|");
        });
      // Bounded in samples (at least 400 ms and four rendered frames apart), not seconds: under
      // heavy load four frames can take 5 to 13 seconds, and the test's own time limit is the backstop.
      let previous = "";
      let still = 0;
      for (let sample = 0; sample < 12 && still < 2; sample++) {
        if (sample) await page.waitForTimeout(400);
        const now = await layout();
        still = now === previous ? still + 1 : 0;
        previous = now;
      }
      expect(still, `${fw} at ${width}x${height}: labels settle`).toBeGreaterThanOrEqual(2);
      const report = await page.evaluate(() => {
        const canvas = document.querySelector(".observatory__canvas canvas")!.getBoundingClientRect();
        const panels = [...document.querySelectorAll("[data-hud]")].map((e) => e.getBoundingClientRect());
        const labels = [...document.querySelectorAll<HTMLElement>(".scene-label")].filter((l) => l.style.visibility === "visible").map((l) => ({ text: l.textContent ?? "", r: l.getBoundingClientRect(), sector: l.classList.contains("scene-label--sector") }));
        const hit = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        const problems: string[] = [];
        labels.forEach((l, i) => {
          if (l.r.left < canvas.left || l.r.right > canvas.right || l.r.top < canvas.top || l.r.bottom > canvas.bottom) problems.push(`outside the canvas: ${l.text}`);
          if (panels.some((p) => hit(l.r, p))) problems.push(`under a panel: ${l.text}`);
          for (const other of labels.slice(i + 1)) if (hit(l.r, other.r)) problems.push(`overlaps: ${l.text} / ${other.text}`);
        });
        return { problems, sectors: labels.filter((l) => l.sector).length };
      });
      expect(report.problems, `${fw} at ${width}x${height}`).toEqual([]);
      // Twenty SP 800-53 families: where a family's title does not fit, its code does.
      expect(report.sectors, `${fw} at ${width}x${height}: sectors labeled`).toBeGreaterThanOrEqual(fw.endsWith("800-53-r5") ? 12 : 4);
    }
  }
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("the Observatory opens on its outline, the 3D scene one tap away", async ({ page }) => {
    await signIn(page);
    const errors = watchErrors(page);
    await page.goto(`${WS}/observatory/nist-csf-2.0`);
    await expect(page.getByRole("tree", { name: "Framework outline" })).toBeVisible();
    await expect(page.locator(".observatory__canvas canvas")).toHaveCount(0);
    await page.getByRole("tree", { name: "Framework outline" }).locator(".outline__row", { hasText: "GV" }).first().click();
    await expect(page.locator("aside.inspector")).toBeVisible();
    await page.getByRole("button", { name: "Close inspector" }).click();
    await page.getByRole("button", { name: "3D", exact: true }).click();
    await expect(page.locator(".observatory__canvas canvas")).toBeVisible();
    await page.getByRole("button", { name: "Show the outline" }).click();
    await expect(page.getByRole("tree", { name: "Framework outline" })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
