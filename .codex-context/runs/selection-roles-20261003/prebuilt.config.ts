import config from "/Users/artem/visua/playwright.config.ts";
export default {
  ...config,
  testDir: "/Users/artem/visua/e2e",
  outputDir: "/Users/artem/visua/test-results",
  webServer: {
    ...config.webServer,
    cwd: "/Users/artem/visua",
    command: "node --disable-warning=ExperimentalWarning apps/server/src/index.ts",
  },
};
