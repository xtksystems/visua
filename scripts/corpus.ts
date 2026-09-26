/**
 * Official documentation corpus: integrity check and sync.
 *
 *   node scripts/corpus.ts verify
 *       Hash-check every local document against its manifest (SHA-256).
 *       Exits 1 when a present file does not match, or when a redistributable
 *       (public-domain) document is missing.
 *
 *   node scripts/corpus.ts sync [corpus…] [--include-restricted]
 *       Download missing documents from the official URLs in the manifests and
 *       verify them. Restricted documents (AICPA, `.local/`) are skipped unless
 *       --include-restricted is given: they are © their publishers and are
 *       fetched only for this installation's own use under the publisher's
 *       terms (see corpus/README.md).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CORPUS = resolve(dirname(fileURLToPath(import.meta.url)), "../corpus");

interface Doc {
  id: string;
  title: string;
  path: string;
  url: string;
  sha256: string;
  bytes: number;
  license?: string;
}
interface Manifest {
  framework: string;
  documents: Doc[];
}

const manifests: Manifest[] = readdirSync(CORPUS, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(resolve(CORPUS, d.name, "manifest.json")))
  .map((d) => JSON.parse(readFileSync(resolve(CORPUS, d.name, "manifest.json"), "utf8")) as Manifest);

const restricted = (m: Manifest, d: Doc) => m.framework === "aicpa-soc2" || d.path.split("/").includes(".local");
const sha256 = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");

function verify(): number {
  let bad = 0;
  for (const m of manifests) {
    const counts = { ok: 0, missing: 0, restrictedAbsent: 0, mismatch: 0 };
    for (const d of m.documents) {
      const file = resolve(CORPUS, d.path);
      if (!existsSync(file)) {
        if (restricted(m, d)) counts.restrictedAbsent++;
        else {
          counts.missing++;
          console.log(`  missing   ${d.path}`);
        }
        continue;
      }
      if (sha256(readFileSync(file)) === d.sha256) counts.ok++;
      else {
        counts.mismatch++;
        console.log(`  MISMATCH  ${d.path}`);
      }
    }
    bad += counts.missing + counts.mismatch;
    console.log(`${m.framework}: ${counts.ok} verified, ${counts.mismatch} mismatched, ${counts.missing} missing${counts.restrictedAbsent ? `, ${counts.restrictedAbsent} restricted not present (expected in fresh clones)` : ""}`);
  }
  return bad ? 1 : 0;
}

async function sync(only: string[], includeRestricted: boolean): Promise<number> {
  let failures = 0;
  for (const m of manifests) {
    if (only.length && !only.includes(m.framework)) continue;
    for (const d of m.documents) {
      const file = resolve(CORPUS, d.path);
      if (existsSync(file)) continue;
      if (restricted(m, d) && !includeRestricted) {
        console.log(`  skip (restricted) ${d.path}`);
        continue;
      }
      if (restricted(m, d)) console.log(`  ${d.id}: ${d.license ?? "restricted"} — fetching for this installation's own use`);
      try {
        const res = await fetch(d.url, { redirect: "follow" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const hash = sha256(buf);
        if (hash !== d.sha256) throw new Error(`SHA-256 ${hash.slice(0, 12)}… does not match the manifest (${d.sha256.slice(0, 12)}…) — the publisher may have reissued the file`);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, buf);
        console.log(`  fetched ${d.path} (${(buf.length / 1024).toFixed(0)} KB)`);
      } catch (err) {
        failures++;
        console.log(`  FAILED  ${d.path}: ${(err as Error).message}`);
      }
    }
  }
  return failures ? 1 : 0;
}

const [command, ...rest] = process.argv.slice(2);
const flags = rest.filter((a) => a.startsWith("--"));
const args = rest.filter((a) => !a.startsWith("--"));
if (command === "verify") process.exit(verify());
else if (command === "sync") process.exit(await sync(args, flags.includes("--include-restricted")));
else {
  console.log("usage: node scripts/corpus.ts verify | sync [corpus…] [--include-restricted]");
  process.exit(2);
}
