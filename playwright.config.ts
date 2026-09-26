import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests against the production bundle served by the API, with an
 * in-memory database seeded with the Northwind Health demo and offline agents.
 * WebGL runs on SwiftShader so the 3D scenes render in headless CI.
 */
const PORT = 8799;

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 900 },
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm --filter @visua/web build && node --disable-warning=ExperimentalWarning apps/server/src/index.ts",
    url: `http://localhost:${PORT}/api/health`,
    env: { VISUA_PORT: String(PORT), VISUA_DB: ":memory:", VISUA_AGENT_MODE: "offline" },
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
