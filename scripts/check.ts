/**
 * Local CI: every check the repository expects before a change lands, in one command,
 * with a summary and a non-zero exit code when anything fails. Each step's full output
 * goes to .check/<step>.log (git-ignored); a failing step's tail is printed.
 *
 *   pnpm check                 everything: licensing guard, typecheck, unit tests on SQLite
 *                              and Postgres, e2e, corpus hashes, DESIGN.md lint
 *   pnpm check --quick         licensing guard, typecheck and unit tests on SQLite only
 *   pnpm check --no-e2e        skip the Playwright suite
 *   pnpm check --no-postgres   skip the Postgres run
 *
 * The Postgres run uses VISUA_TEST_DATABASE_URL when it is set. Otherwise it starts a
 * throwaway postgres:17 container on a free local port and removes it afterwards, so it
 * never touches another database on this machine. Without either, the step fails:
 * pass --no-postgres to skip it deliberately.
 */
import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LOGS = join(ROOT, ".check");
const flag = (name: string) => process.argv.includes(`--${name}`);
const quick = flag("quick");
const withE2e = !quick && !flag("no-e2e");
const withPostgres = !quick && !flag("no-postgres");

type Outcome = "passed" | "failed" | "skipped";
interface Result {
  name: string;
  outcome: Outcome;
  seconds: number;
  note?: string;
}
const results: Result[] = [];

// ------------------------------------------------------------------ running steps

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Runs a command with its output in .check/<step>.log; resolves with the exit code. */
function run(name: string, command: string, args: string[], env: NodeJS.ProcessEnv = {}): Promise<{ code: number; log: string }> {
  const log = join(LOGS, `${slug(name)}.log`);
  const out = createWriteStream(log);
  return new Promise((done) => {
    const child = spawn(command, args, { cwd: ROOT, env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", ...env }, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.pipe(out, { end: false });
    child.stderr.pipe(out, { end: false });
    child.on("close", (code) => out.end(() => done({ code: code ?? 1, log })));
  });
}

function tail(log: string, lines = 40): string {
  return readFileSync(log, "utf8").trimEnd().split("\n").slice(-lines).join("\n");
}

/** Vitest's and Playwright's own count line, for the summary. */
function counts(log: string): string | undefined {
  const text = readFileSync(log, "utf8").replace(/\x1b\[[0-9;]*m/g, "");
  const vitest = text.match(/^\s*Tests\s+(.+?)\s*$/m)?.[1];
  if (vitest) return vitest.replace(/\s+\(\d+\)$/, "");
  const playwright = [...text.matchAll(/^\s*(\d+ (?:passed|failed|flaky|skipped))/gm)].map((m) => m[1]);
  return playwright.length ? playwright.join(", ") : undefined;
}

async function step(name: string, command: string, args: string[], env: NodeJS.ProcessEnv = {}): Promise<void> {
  process.stdout.write(`▸ ${name} … `);
  const started = Date.now();
  const { code, log } = await run(name, command, args, env);
  const seconds = (Date.now() - started) / 1000;
  const outcome: Outcome = code === 0 ? "passed" : "failed";
  results.push({ name, outcome, seconds, note: counts(log) });
  console.log(`${outcome} (${seconds.toFixed(0)}s)`);
  if (outcome === "failed") console.log(`\n${tail(log)}\n  full log: ${relative(ROOT, log)}\n`);
}

function skip(name: string, note: string): void {
  results.push({ name, outcome: "skipped", seconds: 0, note });
  console.log(`▸ ${name} … skipped (${note})`);
}

function fail(name: string, note: string): void {
  results.push({ name, outcome: "failed", seconds: 0, note });
  console.log(`▸ ${name} … failed (${note})`);
}

// ------------------------------------------------------------------ licensing guard

/** Licensed text must never be tracked: no file in the index may match an ignore rule. */
function licensingGuard(): void {
  const name = "Licensing guard";
  const res = spawnSync("git", ["ls-files", "--cached", "--ignored", "--exclude-standard"], { cwd: ROOT, encoding: "utf8" });
  const tracked = res.stdout.split("\n").filter(Boolean);
  if (res.status !== 0) fail(name, `git ls-files exited with ${res.status}`);
  else if (tracked.length) {
    fail(name, `${tracked.length} git-ignored file(s) are tracked or staged`);
    console.log(tracked.map((f) => `    ${f}`).join("\n"));
  } else {
    results.push({ name, outcome: "passed", seconds: 0, note: "no git-ignored file tracked or staged" });
    console.log(`▸ ${name} … passed`);
  }
}

// ------------------------------------------------------------------ Postgres

interface Postgres {
  url: string;
  stop(): void;
}

function docker(...args: string[]) {
  return spawnSync("docker", args, { encoding: "utf8" });
}

/** A throwaway postgres:17 container on a free 127.0.0.1 port, or a reason why not. */
async function throwawayPostgres(): Promise<Postgres | string> {
  if (docker("info", "--format", "{{.ServerVersion}}").status !== 0) return "Docker is not running and VISUA_TEST_DATABASE_URL is not set";
  const name = `visua-check-${process.pid}`;
  const started = docker("run", "-d", "--rm", "--name", name, "-e", "POSTGRES_USER=visua", "-e", "POSTGRES_PASSWORD=visua", "-e", "POSTGRES_DB=visua_test", "-p", "127.0.0.1::5432", "postgres:17");
  if (started.status !== 0) return `docker run failed: ${started.stderr.trim()}`;
  const stop = () => void docker("rm", "-f", name);
  const port = docker("port", name, "5432/tcp").stdout.trim().split(":").pop();
  // pg_isready answers during the image's first-start restart too; a query through the
  // published port only succeeds once the final server is up.
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const ready = docker("exec", name, "psql", "-h", "127.0.0.1", "-U", "visua", "-d", "visua_test", "-Atc", "select 1");
    if (ready.status === 0 && port) return { url: `postgres://visua:visua@127.0.0.1:${port}/visua_test`, stop };
    await new Promise((r) => setTimeout(r, 500));
  }
  stop();
  return "the Postgres container did not become ready within 60 s";
}

// ------------------------------------------------------------------ main

mkdirSync(LOGS, { recursive: true });
const began = Date.now();
let pgHandle: Postgres | undefined;
const cleanup = () => pgHandle?.stop();
process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});

try {
  licensingGuard();
  await step("Typecheck", "pnpm", ["typecheck"]);
  await step("Unit tests (SQLite)", "pnpm", ["test"], { VISUA_TEST_DATABASE_URL: "" });

  if (!withPostgres) skip("Unit tests (Postgres)", quick ? "--quick" : "--no-postgres");
  else {
    const given = process.env["VISUA_TEST_DATABASE_URL"];
    const pg = given ? { url: given, stop: () => undefined } : await throwawayPostgres();
    if (typeof pg === "string") fail("Unit tests (Postgres)", `${pg}; pass --no-postgres to skip`);
    else {
      pgHandle = pg;
      await step("Unit tests (Postgres)", "pnpm", ["test"], { VISUA_TEST_DATABASE_URL: pg.url });
      cleanup();
      pgHandle = undefined;
    }
  }

  if (withE2e) await step("End-to-end (Playwright)", "pnpm", ["test:e2e"]);
  else skip("End-to-end (Playwright)", quick ? "--quick" : "--no-e2e");

  if (quick) {
    skip("Corpus hashes", "--quick");
    skip("DESIGN.md lint", "--quick");
  } else {
    await step("Corpus hashes", "pnpm", ["corpus:verify"]);
    await step("DESIGN.md lint", "pnpm", ["design:lint"]);
  }
} finally {
  cleanup();
}

const failed = results.filter((r) => r.outcome === "failed");
const width = Math.max(...results.map((r) => r.name.length));
const mark: Record<Outcome, string> = { passed: "✓", failed: "✗", skipped: "–" };
console.log(`\n${"─".repeat(width + 30)}`);
for (const r of results) console.log(`${mark[r.outcome]} ${r.name.padEnd(width)}  ${r.outcome.padEnd(7)} ${r.seconds ? `${r.seconds.toFixed(0).padStart(4)}s` : "     "}  ${r.note ?? ""}`);
console.log(`${"─".repeat(width + 30)}\n${failed.length ? `${failed.length} failed` : "All checks passed"} in ${((Date.now() - began) / 1000).toFixed(0)}s · logs in ${relative(ROOT, LOGS)}/`);
process.exit(failed.length ? 1 : 0);
