import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("pilot rehearsal partial startup cleanup", () => {
  it.each(["persistent", "retry-success"])("reports %s cleanup accurately and removes only its owned fixture", mode => {
    const fixture = fileURLToPath(new URL("./fixtures/pilot-startup-failure.mjs", import.meta.url));
    const child = spawnSync(process.execPath, [fixture, mode], {
      env: { PATH: process.env["PATH"] }, encoding: "utf8", timeout: 15_000,
    });
    expect(child.error).toBeUndefined();
    expect(child.status, child.stderr).toBe(0);
    expect(JSON.parse(child.stdout)).toEqual({ mode, status: "passed", realDockerCalls: 0, removals: 2 });
  });
});
