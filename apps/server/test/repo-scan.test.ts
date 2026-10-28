import { constants } from "node:fs";
import * as fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { REPO_ROOT } from "@visua/frameworks";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRepoScanConnector, loadScanRoots, repoScanConnector } from "../src/connectors/repo-scan.ts";
import type { CheckOutput } from "../src/connectors/index.ts";

vi.mock("node:fs/promises", async (original) => {
  const actual = await original<typeof import("node:fs/promises")>();
  return { ...actual, open: vi.fn(actual.open), opendir: vi.fn(actual.opendir), lstat: vi.fn(actual.lstat) };
});

let base: string;
let root: string;
let outside: string;
const secret = "AKIA" + "A".repeat(16);
const check = (results: CheckOutput[], id: string) => results.find((result) => result.checkId === id)!;
const run = (path: unknown = root, signal?: AbortSignal) => createRepoScanConnector({ roots: [root] }).run({ path }, signal);
const write = async (path: string, content = "safe fixture") => { await fs.mkdir(resolve(path, ".."), { recursive: true }); await fs.writeFile(path, content); };

beforeEach(async () => {
  base = await fs.mkdtemp(join(tmpdir(), "visua-repo-scan-"));
  root = join(base, "repo");
  outside = join(base, "repo-sibling");
  await fs.mkdir(root);
  await fs.mkdir(outside);
});

afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.mocked(fs.open).mockRestore();
  vi.mocked(fs.opendir).mockRestore();
  vi.mocked(fs.lstat).mockRestore();
  await fs.rm(base, { recursive: true, force: true });
});

describe("operator scan roots", () => {
  it("defaults only developer mode to the project, and respects production, OIDC and an explicit empty list", () => {
    expect(loadScanRoots({})).toEqual([REPO_ROOT]);
    expect(loadScanRoots({ NODE_ENV: "production" })).toEqual([]);
    expect(loadScanRoots({ VISUA_AUTH_MODE: "oidc" })).toEqual([]);
    expect(loadScanRoots({ VISUA_REPO_SCAN_ROOTS: "[]" })).toEqual([]);
    expect(loadScanRoots({ NODE_ENV: "production", VISUA_REPO_SCAN_ROOTS: JSON.stringify([root, root]) })).toEqual([root]);
  });

  it.each(["", "not json", "{}", "null", '["relative"]', '["/"]', '["/tmp/.."]', '[""]', "[12]", '["/tmp/\\u0000bad"]'])("rejects malformed root configuration %s", (roots) => {
    expect(() => loadScanRoots({ VISUA_REPO_SCAN_ROOTS: roots })).toThrow(/VISUA_REPO_SCAN_ROOTS/);
  });

  it("copies explicit roots and refuses disabled scans", async () => {
    const roots = [root];
    const connector = createRepoScanConnector({ roots });
    roots[0] = outside;
    expect(check(await connector.run({ path: root }), "secrets").outcome).toBe("pass");
    expect(await createRepoScanConnector({ roots: [] }).run({ path: root })).toMatchObject([{ checkId: "repo-exists", outcome: "error" }]);
    expect(() => createRepoScanConnector({ roots: ["/"] })).toThrow();
  });

  it("accepts a repository below a configured root", async () => {
    expect(check(await createRepoScanConnector({ roots: [base] }).run({ path: root }), "secrets").outcome).toBe("pass");
    expect(check(await createRepoScanConnector({ roots: [join(base, "missing"), root] }).run({ path: root }), "secrets").outcome).toBe("pass");
  });

  it("resolves default connector operator configuration at run time", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VISUA_REPO_SCAN_ROOTS", undefined);
    expect(await repoScanConnector.run({ path: root })).toMatchObject([{ checkId: "repo-exists", outcome: "error" }]);
    vi.stubEnv("VISUA_REPO_SCAN_ROOTS", JSON.stringify([root]));
    expect(check(await repoScanConnector.run({ path: root }), "secrets").outcome).toBe("pass");
    vi.stubEnv("VISUA_REPO_SCAN_ROOTS", "[]");
    expect(await repoScanConnector.run({ path: root })).toMatchObject([{ checkId: "repo-exists", outcome: "error" }]);
  });

  it("does not turn an operator symlink to the filesystem root into unrestricted scanning", async () => {
    const alias = join(base, "alias");
    await fs.symlink("/", alias);
    const results = await createRepoScanConnector({ roots: [alias] }).run({ path: outside });
    expect(results).toMatchObject([{ checkId: "repo-exists", outcome: "error" }]);
  });

  it("rejects direct outside and separator-prefix sibling paths", async () => {
    for (const path of [base, outside]) expect(await run(path)).toMatchObject([{ checkId: "repo-exists", outcome: "error" }]);
    expect(fs.lstat).not.toHaveBeenCalled();
  });

  it.each([undefined, "", " ", ".", "relative", 12])("rejects an invalid requested path %s", async (path) => {
    expect(await createRepoScanConnector({ roots: [root] }).run({ path })).toMatchObject([{ checkId: "repo-exists", outcome: "error" }]);
  });

  it("rejects traversal even when normalization would stay within a root", async () => {
    expect(await run(root + "/child/../")).toMatchObject([{ checkId: "repo-exists", outcome: "error" }]);
  });

  it("rejects a symlink repository root and a symlink ancestor", async () => {
    await fs.symlink(outside, join(root, "escape"));
    await fs.mkdir(join(outside, "child"));
    expect(await run(join(root, "escape"))).toMatchObject([{ checkId: "repo-exists", outcome: "error" }]);
    expect(await run(join(root, "escape", "child"))).toMatchObject([{ checkId: "repo-exists", outcome: "error" }]);
    expect(await createRepoScanConnector({ roots: [join(root, "escape")] }).run({ path: join(root, "escape") })).toMatchObject([{ checkId: "repo-exists", outcome: "error" }]);
  });
});

describe("confined repository signals", () => {
  it("preserves six check IDs and requirement mappings for an ordinary repository", async () => {
    for (const path of ["SECURITY.md", "CODEOWNERS", ".github/workflows/test.yml", ".github/dependabot.yml", "pnpm-lock.yaml", "app.ts"]) await write(join(root, path));
    const results = await run();
    expect(results.map((result) => result.checkId)).toEqual(["security-policy", "code-owners", "ci-pipeline", "dependency-updates", "lockfile", "secrets"]);
    expect(results.map((result) => result.outcome)).toEqual(Array(6).fill("pass"));
    expect(results.map((result) => result.requirements)).toEqual([
      { csf: ["ID.RA-08"], soc2: ["CC2.3"], sp80053: ["RA-5(11)"] },
      { csf: ["PR.PS-06"], soc2: ["CC8.1"], sp80053: ["CM-3"] },
      { csf: ["PR.PS-06"], soc2: ["CC8.1"], sp80053: ["SA-11"] },
      { csf: ["ID.RA-01", "PR.PS-02"], soc2: ["CC7.1"], sp80053: ["RA-5", "SI-2"] },
      { csf: ["PR.PS-06"], soc2: ["CC8.1"], sp80053: ["SA-10"] },
      { csf: ["PR.AA-01", "PR.DS-01"], soc2: ["CC6.1"], sp80053: ["IA-5"] },
    ]);
    expect(check(results, "secrets").observed).toMatchObject({ complete: true });
    for (const call of vi.mocked(fs.open).mock.calls) expect(Number(call[1]) & constants.O_NOFOLLOW).toBe(constants.O_NOFOLLOW);
  });

  it("reports secret kind and location without credential bytes", async () => {
    await write(join(root, "app.ts"), secret);
    const results = await run();
    expect(check(results, "secrets")).toMatchObject({ outcome: "fail", observed: { findings: [{ file: "app.ts", kind: "AWS access key id" }] } });
    expect(JSON.stringify(results)).not.toContain(secret);
  });

  it("does not follow escaping file links, directory links, or loops", async () => {
    await write(join(outside, "secret.txt"), secret);
    await fs.symlink(join(outside, "secret.txt"), join(root, "linked.txt"));
    await fs.symlink(outside, join(root, "linked-dir"));
    await fs.symlink(root, join(root, "loop"));
    const result = check(await run(), "secrets");
    expect(result).toMatchObject({ outcome: "pass", observed: { findings: [], entriesSkipped: 3, bytesRead: 0 } });
    expect(fs.open).not.toHaveBeenCalled();
    expect(vi.mocked(fs.opendir).mock.calls).toHaveLength(1);
  });

  it("ignores symlinks for every policy, ownership, dependency, CI and lockfile signal", async () => {
    for (const name of ["SECURITY.md", "CODEOWNERS", "renovate.json", ".gitlab-ci.yml", "pnpm-lock.yaml"]) {
      await write(join(outside, name));
      await fs.symlink(join(outside, name), join(root, name));
    }
    await write(join(outside, "workflows/test.yml"));
    await fs.mkdir(join(root, ".github"));
    await fs.symlink(join(outside, "workflows"), join(root, ".github/workflows"));
    const results = await run();
    expect(results.map((result) => result.outcome)).toEqual(["warn", "warn", "fail", "warn", "warn", "pass"]);
    expect(fs.open).not.toHaveBeenCalled();
  });

  it("ignores a workflow file symlink and directory masquerading as SECURITY.md", async () => {
    await write(join(outside, "workflow.yml"));
    await fs.mkdir(join(root, ".github/workflows"), { recursive: true });
    await fs.symlink(join(outside, "workflow.yml"), join(root, ".github/workflows/test.yml"));
    await fs.mkdir(join(root, "SECURITY.md"));
    const results = await run();
    expect(check(results, "security-policy").outcome).toBe("warn");
    expect(check(results, "ci-pipeline").outcome).toBe("fail");
  });

  it("skips FIFOs and device links without trying to open them", async () => {
    execFileSync("mkfifo", [join(root, "pipe.txt")]);
    await fs.symlink("/dev/null", join(root, "device.txt"));
    const result = check(await run(), "secrets");
    expect(result).toMatchObject({ outcome: "pass", observed: { entriesSkipped: 2, bytesRead: 0 } });
    expect(fs.open).not.toHaveBeenCalled();
  });

  it("refuses a file replaced by an escaping symlink at open time", async () => {
    const path = join(root, "app.txt");
    await write(path);
    await write(join(outside, "secret.txt"), secret);
    const actualOpen = vi.mocked(fs.open).getMockImplementation()!;
    vi.mocked(fs.open).mockImplementationOnce(async (...args) => {
      await fs.rm(path);
      await fs.symlink(join(outside, "secret.txt"), path);
      return actualOpen(...args);
    });
    expect(check(await run(), "secrets")).toMatchObject({ outcome: "warn", observed: { complete: false, findings: [], bytesRead: 0 } });
  });
});

describe("bounded scans", () => {
  it("warns rather than passes when a text file exceeds the per-file cap", async () => {
    await fs.writeFile(join(root, "large.txt"), Buffer.alloc(512_001, "a"));
    expect(check(await run(), "secrets")).toMatchObject({ outcome: "warn", observed: { complete: false, reason: "individual file byte limit reached", bytesRead: 0 } });
    expect(fs.open).not.toHaveBeenCalled();
  });

  it("allows exactly the per-file cap and scans its final bytes", async () => {
    await fs.writeFile(join(root, "boundary.txt"), " ".repeat(512_000 - secret.length) + secret);
    expect(check(await run(), "secrets")).toMatchObject({ outcome: "fail", observed: { bytesRead: 512_000 } });
  });

  it("stops reading at the 32MiB total cap", async () => {
    const content = Buffer.alloc(512_000, "a");
    for (let start = 0; start < 66; start += 6) await Promise.all(Array.from({ length: 6 }, (_, index) => fs.writeFile(join(root, `${start + index}.txt`), content)));
    const result = check(await run(), "secrets");
    expect(result).toMatchObject({ outcome: "warn", observed: { complete: false, reason: "total byte limit reached", bytesRead: 65 * 512_000 } });
    expect(Number(result.observed["bytesRead"])).toBeLessThanOrEqual(32 * 1024 * 1024);
  });

  it("counts directories and skipped links toward the 4000-entry cap", async () => {
    for (let start = 0; start < 4_010; start += 50) await Promise.all(Array.from({ length: Math.min(50, 4_010 - start) }, (_, index) => {
      const number = start + index;
      return number % 2 ? fs.symlink(outside, join(root, `link-${number}`)) : fs.mkdir(join(root, `dir-${number}`));
    }));
    expect(check(await run(), "secrets")).toMatchObject({ outcome: "warn", observed: { complete: false, reason: "entry limit reached", entriesVisited: 4_000, bytesRead: 0 } });
  });

  it("honors an already-aborted signal before filesystem work", async () => {
    expect(await run(root, AbortSignal.abort())).toMatchObject([{ checkId: "repo-exists", outcome: "error" }]);
    expect(fs.lstat).not.toHaveBeenCalled();
    expect(fs.open).not.toHaveBeenCalled();
  });

  it.each(["deadline", "abort"])("waits for handle cleanup on %s and returns an incomplete result", async (mode) => {
    await write(join(root, "app.txt"));
    const actualOpen = vi.mocked(fs.open).getMockImplementation()!;
    let release!: () => void;
    let opened!: () => void;
    const blocked = new Promise<void>((done) => { release = done; });
    const ready = new Promise<void>((done) => { opened = done; });
    let close: ReturnType<typeof vi.spyOn> | undefined;
    vi.mocked(fs.open).mockImplementationOnce(async (...args) => {
      const handle = await actualOpen(...args);
      close = vi.spyOn(handle, "close");
      opened();
      await blocked;
      return handle;
    });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const controller = new AbortController();
    let settled = false;
    const pending = run(root, controller.signal).then((value) => { settled = true; return value; });
    await ready;
    if (mode === "deadline") await vi.advanceTimersByTimeAsync(15_000);
    else controller.abort();
    await Promise.resolve();
    expect(settled).toBe(false);
    release();
    vi.useRealTimers();
    const result = check(await pending, "secrets");
    expect(result).toMatchObject({ outcome: "warn", observed: { complete: false, reason: mode === "deadline" ? "time limit reached" : "scan cancelled", bytesRead: 0 } });
    expect(close).toHaveBeenCalledOnce();
  });
});
