/** Repository hygiene scans stay within operator-approved local directories. */
import { constants, type Stats } from "node:fs";
import { lstat, open, opendir, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { REPO_ROOT } from "@visua/frameworks";
import type { CheckOutput, ConnectorKind } from "./index.ts";

const MAX_ENTRIES = 4_000;
const MAX_FILE_BYTES = 512_000;
const MAX_TOTAL_BYTES = 32 * 1024 * 1024;
const SCAN_MS = 15_000;
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".venv", "venv", "__pycache__", "corpus", ".next", "target"]);
const SECRET_PATTERNS: [string, RegExp][] = [
  ["AWS access key id", /\bAKIA[0-9A-Z]{16}\b/],
  ["Private key block", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ["Anthropic API key", /\bsk-ant-[A-Za-z0-9_-]{20,}\b/],
  ["Stripe live key", /\bsk_live_[A-Za-z0-9]{20,}\b/],
];
const TEXT_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|ya?ml|toml|env|ini|cfg|conf|py|rb|go|java|kt|cs|php|sh|tf|md|txt|properties|xml)$/i;

function validateRoots(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((root) => typeof root !== "string" || !root.trim() || !isAbsolute(root) || root.includes("\0") || resolve(root) === sep)) {
    throw new Error("VISUA_REPO_SCAN_ROOTS must be a JSON array of absolute directories other than the filesystem root");
  }
  return [...new Set((value as string[]).map((root) => resolve(root)))];
}

/** An explicit empty list disables scans, including in developer mode. */
export function loadScanRoots(env: NodeJS.ProcessEnv = process.env): string[] {
  if (env["VISUA_REPO_SCAN_ROOTS"] !== undefined) {
    let roots: unknown;
    try { roots = JSON.parse(env["VISUA_REPO_SCAN_ROOTS"]); }
    catch { throw new Error("VISUA_REPO_SCAN_ROOTS must be a JSON array of absolute directories"); }
    return validateRoots(roots);
  }
  return env["NODE_ENV"] === "production" || env["VISUA_AUTH_MODE"] === "oidc" ? [] : [REPO_ROOT];
}

const confined = (root: string, path: string) => path === root || path.startsWith(root + sep);
const sameFile = (a: Stats, b: Stats) => a.dev === b.dev && a.ino === b.ino && a.mode === b.mode;
const isText = (path: string) => TEXT_EXT.test(path) || /\.env/.test(path);
class Interrupted extends Error {}

interface ScanState {
  root?: string;
  error?: string;
  incomplete?: string;
  visited: number;
  bytes: number;
  skipped: number;
  files: Set<string>;
  findings: { file: string; kind: string }[];
}

/**
 * Recheck canonical confinement and inode identity around every path operation.
 * O_NOFOLLOW protects the opened file's final component. Node has no portable
 * dirfd-relative openat API: an adversarial concurrent replacement of ancestor
 * directories can still race these checks. Operator roots must therefore live
 * on filesystems whose directory structure is controlled by trusted operators.
 */
async function inspect(path: string, root: string, check: () => void): Promise<Stats | undefined> {
  check();
  if (!confined(root, path)) return undefined;
  const before = await lstat(path);
  check();
  if (before.isSymbolicLink() || (!before.isDirectory() && !before.isFile())) return undefined;
  const canonical = await realpath(path);
  check();
  if (canonical !== path || !confined(root, canonical)) return undefined;
  const after = await lstat(path);
  check();
  return sameFile(before, after) && !after.isSymbolicLink() ? after : undefined;
}

async function findRoot(input: unknown, roots: readonly string[], check: () => void): Promise<string> {
  if (typeof input !== "string" || !input.trim() || !isAbsolute(input) || input.includes("\0") || input.split(sep).includes("..")) {
    throw new Error("Repository path must be a nonempty absolute path without traversal");
  }
  if (!roots.length) throw new Error("Repository scanning is disabled: no operator roots are configured");
  const requested = resolve(input);
  for (const allowed of roots) {
    check();
    let canonical: string;
    try { canonical = await realpath(allowed); }
    catch { check(); continue; }
    check();
    if (canonical === sep) continue;
    const base = confined(allowed, requested) ? allowed : confined(canonical, requested) ? canonical : undefined;
    if (!base) continue;
    const candidate = resolve(canonical, relative(base, requested));
    if (!confined(canonical, candidate)) continue;
    // Inspect tenant paths only after matching an operator-approved boundary.
    // The requested repository itself must not be a symlink, even configured.
    if ((await lstat(requested)).isSymbolicLink()) throw new Error("Repository path must not be a symlink");
    check();
    const stat = await inspect(candidate, canonical, check);
    if (stat?.isDirectory()) return candidate;
    throw new Error("Repository path must be a directory without symlink components");
  }
  throw new Error("Repository path is outside the operator-approved roots");
}

async function readText(path: string, expected: Stats, state: ScanState, check: () => void): Promise<string | undefined> {
  if (expected.size > MAX_FILE_BYTES) { state.incomplete ??= "individual file byte limit reached"; return undefined; }
  if (state.bytes + expected.size > MAX_TOTAL_BYTES) { state.incomplete ??= "total byte limit reached"; return undefined; }
  check();
  // NONBLOCK also prevents a raced replacement by a FIFO from blocking open().
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    check();
    const opened = await handle.stat();
    check();
    const current = await inspect(path, state.root!, check);
    if (!opened.isFile() || !current?.isFile() || !sameFile(expected, opened) || !sameFile(current, opened) || opened.size > MAX_FILE_BYTES) {
      state.incomplete ??= "a file changed during scanning";
      return undefined;
    }
    if (state.bytes + opened.size > MAX_TOTAL_BYTES) { state.incomplete ??= "total byte limit reached"; return undefined; }
    const content = Buffer.alloc(opened.size);
    let offset = 0;
    while (offset < content.length) {
      check();
      const { bytesRead } = await handle.read(content, offset, Math.min(64 * 1024, content.length - offset), offset);
      state.bytes += bytesRead;
      check();
      if (!bytesRead) break;
      offset += bytesRead;
    }
    const after = await handle.stat();
    check();
    const finalPath = await inspect(path, state.root!, check);
    if (offset !== opened.size || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || after.ctimeMs !== opened.ctimeMs || !finalPath || !sameFile(after, finalPath)) {
      state.incomplete ??= "a file changed during scanning";
      return undefined;
    }
    return content.toString("utf8");
  } finally { await handle.close(); }
}

async function scan(state: ScanState, check: () => void): Promise<void> {
  const stack = [state.root!];
  state.visited = 1;
  while (stack.length) {
    check();
    const path = stack.pop()!;
    let dir: Awaited<ReturnType<typeof opendir>> | undefined;
    try {
      const before = await inspect(path, state.root!, check);
      if (!before?.isDirectory()) { state.incomplete ??= "a directory changed during scanning"; continue; }
      dir = await opendir(path, { bufferSize: 1 });
      check();
      const after = await inspect(path, state.root!, check);
      if (!after || !sameFile(before, after)) { state.incomplete ??= "a directory changed during scanning"; continue; }
      for (;;) {
        check();
        if (state.visited >= MAX_ENTRIES) { state.incomplete ??= "entry limit reached"; return; }
        const entry = await dir.read();
        check();
        if (!entry) break;
        state.visited++;
        if (entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory()) || (entry.isDirectory() && SKIP_DIRS.has(entry.name))) { state.skipped++; continue; }
        const full = join(path, entry.name);
        let stat: Stats | undefined;
        try { stat = await inspect(full, state.root!, check); }
        catch (error) { if (error instanceof Interrupted) throw error; state.incomplete ??= "an entry could not be inspected"; continue; }
        if (!stat) { state.skipped++; state.incomplete ??= "an entry changed during scanning"; continue; }
        if (stat.isDirectory()) { stack.push(full); continue; }
        const file = relative(state.root!, full).split(sep).join("/");
        state.files.add(file);
        if (!isText(file)) continue;
        let content: string | undefined;
        try { content = await readText(full, stat, state, check); }
        catch (error) { if (error instanceof Interrupted) throw error; state.incomplete ??= "a file could not be read safely"; continue; }
        if (content === undefined) {
          if (state.incomplete === "total byte limit reached") return;
          continue;
        }
        for (const [kind, pattern] of SECRET_PATTERNS) {
          if (pattern.test(content)) state.findings.push({ file, kind });
          if (state.findings.length >= 20) { state.incomplete ??= "finding limit reached"; return; }
        }
      }
    } catch (error) {
      if (error instanceof Interrupted) throw error;
      state.incomplete ??= "a directory could not be read safely";
    } finally { if (dir) await dir.close(); }
  }
}

function results(state: ScanState): CheckOutput[] {
  if (!state.root) return [{ checkId: "repo-exists", title: "Repository is accessible", outcome: "error", detail: state.error ?? state.incomplete ?? "Repository is not an accessible approved directory", observed: {}, requirements: {} }];
  const any = (paths: string[]) => paths.find((path) => state.files.has(path));
  const disclosure = any(["SECURITY.md", ".github/SECURITY.md", "docs/SECURITY.md"]);
  const owners = any(["CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS"]);
  const workflows = [...state.files].filter((path) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(path)).map((path) => path.slice(".github/workflows/".length));
  const otherCi = any([".gitlab-ci.yml", "azure-pipelines.yml", ".circleci/config.yml", "Jenkinsfile", "bitbucket-pipelines.yml"]);
  const depBot = any([".github/dependabot.yml", ".github/dependabot.yaml", "renovate.json", ".github/renovate.json", "renovate.json5"]);
  const lock = any(["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "poetry.lock", "Pipfile.lock", "go.sum", "Cargo.lock", "Gemfile.lock", "composer.lock"]);
  return [
    {
      checkId: "security-policy", title: "Vulnerability disclosure policy (SECURITY.md)", outcome: disclosure ? "pass" : "warn",
      detail: disclosure ? `Found ${disclosure}` : "No SECURITY.md — add a disclosure policy so researchers know how to report issues",
      observed: { file: disclosure ?? null }, requirements: { csf: ["ID.RA-08"], soc2: ["CC2.3"], sp80053: ["RA-5(11)"] },
    },
    {
      checkId: "code-owners", title: "Code ownership and review routing (CODEOWNERS)", outcome: owners ? "pass" : "warn",
      detail: owners ? `Found ${owners}` : "No CODEOWNERS file — changes may merge without an accountable reviewer",
      observed: { file: owners ?? null }, requirements: { csf: ["PR.PS-06"], soc2: ["CC8.1"], sp80053: ["CM-3"] },
    },
    {
      checkId: "ci-pipeline", title: "Automated build and test pipeline", outcome: workflows.length || otherCi ? "pass" : "fail",
      detail: workflows.length ? `${workflows.length} GitHub Actions workflow(s): ${workflows.join(", ")}` : otherCi ? `Found ${otherCi}` : "No CI configuration found",
      observed: { workflows, otherCi: otherCi ?? null }, requirements: { csf: ["PR.PS-06"], soc2: ["CC8.1"], sp80053: ["SA-11"] },
    },
    {
      checkId: "dependency-updates", title: "Automated dependency vulnerability updates", outcome: depBot ? "pass" : "warn",
      detail: depBot ? `Found ${depBot}` : "No Dependabot/Renovate configuration — vulnerable dependencies may go unpatched",
      observed: { file: depBot ?? null }, requirements: { csf: ["ID.RA-01", "PR.PS-02"], soc2: ["CC7.1"], sp80053: ["RA-5", "SI-2"] },
    },
    {
      checkId: "lockfile", title: "Dependency versions are pinned (lockfile)", outcome: lock ? "pass" : "warn",
      detail: lock ? `Found ${lock}` : "No lockfile — builds may pull unreviewed dependency versions",
      observed: { file: lock ?? null }, requirements: { csf: ["PR.PS-06"], soc2: ["CC8.1"], sp80053: ["SA-10"] },
    },
    {
      checkId: "secrets", title: "No credentials committed to the repository", outcome: state.findings.length ? "fail" : state.incomplete ? "warn" : "pass",
      detail: state.findings.length ? `${state.findings.length} potential secret(s): ${state.findings.slice(0, 5).map((finding) => `${finding.kind} in ${finding.file}`).join("; ")}` : state.incomplete ? `Secret scan incomplete: ${state.incomplete}` : "No high-confidence secret patterns found",
      observed: { findings: state.findings, complete: !state.incomplete, reason: state.incomplete ?? null, entriesVisited: state.visited, bytesRead: state.bytes, entriesSkipped: state.skipped },
      requirements: { csf: ["PR.AA-01", "PR.DS-01"], soc2: ["CC6.1"], sp80053: ["IA-5"] },
    },
  ];
}

export function createRepoScanConnector({ roots }: { roots?: readonly string[] } = {}): ConnectorKind {
  const explicit = roots === undefined ? undefined : validateRoots(roots);
  return {
    kind: "repo-scan", name: "Repository Hygiene",
    description: "Scans an operator-approved local repository for disclosure policy, code ownership, CI, dependency automation, lockfiles and committed secrets.",
    configFields: [{ key: "path", label: "Repository path on the Visua server", placeholder: "/srv/repos/app", required: true }],
    async run(config, signal) {
      const approved = explicit ?? loadScanRoots();
      const state: ScanState = { visited: 0, bytes: 0, skipped: 0, files: new Set(), findings: [] };
      const controller = new AbortController();
      const deadline = performance.now() + SCAN_MS;
      const interrupt = (reason: string) => { state.incomplete ??= reason; controller.abort(); };
      const cancel = () => interrupt("scan cancelled");
      const timer = setTimeout(() => interrupt("time limit reached"), SCAN_MS);
      signal?.addEventListener("abort", cancel, { once: true });
      if (signal?.aborted) cancel();
      const check = () => {
        if (performance.now() >= deadline) interrupt("time limit reached");
        if (controller.signal.aborted) throw new Interrupted();
      };
      try {
        if (!constants.O_NOFOLLOW) throw new Error("Safe no-follow repository scanning is unavailable on this platform");
        state.root = await findRoot(config["path"], approved, check);
        await scan(state, check);
      } catch (error) {
        if (!(error instanceof Interrupted)) {
          if (state.root) state.incomplete ??= "scan could not finish safely";
          else state.error = error instanceof Error && /^(Repository path|Repository scanning|Safe no-follow)/.test(error.message) ? error.message : "Repository is not an accessible approved directory";
        }
      } finally {
        // Node filesystem calls cannot be cancelled. Await in-flight operations
        // and handle cleanup so the registry retains its concurrency slot. A
        // hung filesystem may exceed 15 seconds; the registry bounds caller wait.
        clearTimeout(timer);
        signal?.removeEventListener("abort", cancel);
      }
      return results(state);
    },
  };
}

export const repoScanConnector = createRepoScanConnector();
