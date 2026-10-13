/** Offline recovery helper; see docs/operations.md before use. */
import { parseArgs } from "node:util";
import { createLocalBackup, restoreLocalBackup, verifyLocalBackup } from "../apps/server/src/operations/local-backup.ts";
const { values, positionals } = parseArgs({ allowPositionals: true, options: {
  database: { type: "string" }, blobs: { type: "string" }, output: { type: "string" }, backup: { type: "string" }, quiesced: { type: "boolean", default: false },
} });
const required = (value: string | undefined, name: string) => { if (!value) throw new Error(`Supply --${name}`); return value; };
try {
  const command = positionals[0];
  if (positionals.length !== 1) throw new Error("Choose create, verify, or restore");
  const result = command === "create"
    ? await createLocalBackup({ database: required(values.database, "database"), blobs: required(values.blobs, "blobs"), output: required(values.output, "output"), quiesced: values.quiesced })
    : command === "verify" ? await verifyLocalBackup(required(values.backup, "backup"))
    : command === "restore" ? await restoreLocalBackup({ backup: required(values.backup, "backup"), database: required(values.database, "database"), blobs: required(values.blobs, "blobs") })
    : (() => { throw new Error("Choose create, verify, or restore"); })();
  console.log(JSON.stringify({ status: "complete", command, databaseSha256: result.database.sha256, referencedFiles: result.blobs.length }));
} catch (error) { console.error(error instanceof Error ? error.message : "Local backup operation failed"); process.exitCode = 1; }
