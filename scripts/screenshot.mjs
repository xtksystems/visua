import { chromium } from "@playwright/test";
const [,, url, out, waitMs = "4000", actions = ""] = process.argv;
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 960 }, deviceScaleFactor: 1 });
const logs = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`${m.type()}: ${m.text()}`); });
page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(Number(waitMs));
for (const a of actions.split(";").filter(Boolean)) {
  const i = a.indexOf("=");
  const kind = a.slice(0, i);
  const arg = a.slice(i + 1);
  if (kind === "click") await page.click(arg);
  if (kind === "key") await page.keyboard.press(arg);
  if (kind === "wait") await page.waitForTimeout(Number(arg));
  if (kind === "type") await page.keyboard.type(arg);
  if (kind === "scroll") {
    const [selector, y] = arg.split("|");
    await page.evaluate(([sel, top]) => document.querySelector(sel)?.scrollTo({ top: Number(top) }), [selector, y]);
    await page.waitForTimeout(400);
  }
}
await page.screenshot({ path: out });
console.log(logs.slice(0, 20).join("\n") || "no console errors");
await browser.close();
