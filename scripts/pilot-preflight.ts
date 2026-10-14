/** Read-only hosted configuration inspection. Stdout is always one JSON object. */
import { inspectPilotConfig } from "../apps/server/src/operations/pilot-preflight.ts";

const args = process.argv.slice(2);
const usage = "node scripts/pilot-preflight.ts [--help]";
if (args.length === 1 && args[0] === "--help") {
  console.log(JSON.stringify({
    usage,
    profile: "empty-install-hosted",
    description: "Inspect process environment only; no credentials are resolved and no services are contacted. Configuration success does not establish production readiness.",
    exitCodes: { "0": "Configuration ready, or help displayed", "1": "Configuration invalid", "2": "Invalid command usage" },
  }));
} else if (args.length) {
  console.log(JSON.stringify({ error: "This command accepts only --help or no arguments.", usage }));
  process.exitCode = 2;
} else {
  const report = inspectPilotConfig(process.env);
  console.log(JSON.stringify(report));
  process.exitCode = report.configReady ? 0 : 1;
}
