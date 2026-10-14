/** Disposable local fixtures only. Stop every app writer before backupAndRestore(). */
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { chmod, lstat, mkdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const require = createRequire(new URL("../../apps/server/package.json", import.meta.url));
const { Client } = require("pg");
const { S3Client, CreateBucketCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } = require("@aws-sdk/client-s3");
const POSTGRES_IMAGE = "postgres:17";
const MINIO_IMAGE = "quay.io/minio/minio:RELEASE.2025-04-22T22-12-26Z";
const OWNER_LABEL = "com.visua.pilot.owner";
const MAX_BYTES = 64 * 1024 * 1024;
const MAX_OBJECTS = 100;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

// Never expose Docker stderr: it can contain environment variables or connection URLs.
function docker(args, label, { timeoutMs = 15_000, maxBytes = 1024 * 1024, input } = {}) {
  return new Promise((accept, reject) => {
    const child = spawn("docker", args, { stdio: [input ? "pipe" : "ignore", "pipe", "pipe"] });
    const chunks = [];
    let outputBytes = 0;
    let diagnostic = "";
    let failure;
    const fail = (message) => { failure ??= new Error(`${label}: ${message}`); child.kill("SIGKILL"); };
    const timer = setTimeout(() => fail("Docker command timed out"), timeoutMs);
    child.stdout.on("data", (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > maxBytes) fail("Docker output exceeded fixture limit");
      else chunks.push(chunk);
    });
    child.stderr.on("data", (chunk) => {
      if (diagnostic.length < 4096) diagnostic += chunk.toString("utf8").slice(0, 4096 - diagnostic.length);
    });
    child.on("error", () => { failure = new Error(`${label}: Docker CLI could not execute`); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (failure) return reject(failure);
      if (code !== 0) {
        const missing = /No such (?:object|container|image)/i.test(diagnostic);
        const unavailable = /Cannot connect|connection refused|daemon is not running/i.test(diagnostic);
        const error = new Error(`${label}: ${missing ? "Docker object is absent" : unavailable ? "Docker daemon unavailable" : `Docker exited with code ${code ?? "unknown"}`}`);
        error.code = missing ? "DOCKER_OBJECT_ABSENT" : "DOCKER_FAILED";
        return reject(error);
      }
      accept(Buffer.concat(chunks));
    });
    if (input) {
      child.stdin.on("error", () => { /* Early exit is reported by the close handler. */ });
      child.stdin.end(input);
    }
  });
}

async function waitReady(check, label) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    try { if (await check()) return; } catch { /* Fresh containers can briefly refuse connections. */ }
    await delay(300);
  }
  throw new Error(`${label} did not become ready within 45 seconds`);
}

async function privateWrite(path, bytes) {
  await writeFile(path, bytes, { mode: 0o600, flag: "wx" });
}

/**
 * Returned URLs and credentials are for child-process configuration, never logging.
 * Only `report` and the backup report contain safe metadata suitable for output.
 * Startup/recovery errors carry `resourceState: { report, close }` for cleanup retries.
 */
export async function startResources(workDir) {
  const started = Date.now();
  const nonce = randomBytes(12).toString("hex");
  const root = resolve(workDir);
  await mkdir(root, { recursive: true, mode: 0o700 });
  if (!(await lstat(root)).isDirectory()) throw new Error("Resource workDir must be a real directory");
  await chmod(root, 0o700);
  const privateDir = join(root, `resources-${nonce}`);
  await mkdir(privateDir, { mode: 0o700 });
  const credentials = [];
  const attempted = [];
  const report = { startedAt: new Date(started).toISOString(), storage: "disposable tmpfs", containers: [], cleanup: { status: "pending" } };
  let s3Client;
  let closePromise;
  let closed = false;
  let backupUsed = false;
  const shutdown = new AbortController();

  async function close() {
    if (closePromise) return closePromise;
    closed = true;
    shutdown.abort();
    closePromise = (async () => {
      s3Client?.destroy();
      const failures = [];
      for (const resource of [...attempted].reverse()) {
        try {
          const identity = JSON.parse((await docker(["inspect", "--type", "container", "--format",
            `{"id":{{json .Id}},"owner":{{json (index .Config.Labels "${OWNER_LABEL}")}}}`, resource.name], "Inspect owned cleanup target")).toString());
          if (identity.owner !== nonce || (resource.id && identity.id !== resource.id)) throw new Error("Cleanup target ownership did not match");
          await docker(["rm", "--force", identity.id], "Remove owned fixture", { timeoutMs: 20_000 });
        } catch (error) {
          if (error.code !== "DOCKER_OBJECT_ABSENT") failures.push(error);
        }
      }
      for (const path of credentials) {
        try { await rm(path, { force: true }); } catch { failures.push(new Error("Temporary credential removal failed")); }
      }
      report.cleanup = { status: failures.length ? "failed" : "complete", completedAt: new Date().toISOString() };
      if (failures.length) throw new AggregateError(failures, "Disposable resource cleanup failed; inspect safe nested errors");
    })();
    try { await closePromise; } catch (error) { closePromise = undefined; throw error; }
  }

  async function failAndClose(error) {
    let failure = error;
    try { await close(); } catch (cleanupError) { failure = new AggregateError([error, cleanupError], "Resource operation and cleanup both failed"); }
    // A failed start never returns the full handle. Preserve only safe metadata and
    // the retry operation so the caller can report the eventual cleanup truthfully.
    failure.resourceState = { report, close };
    throw failure;
  }

  async function createContainer(kind, image, env, containerPort, destination) {
    const envFile = join(privateDir, `${kind}.env`);
    credentials.push(envFile);
    await privateWrite(envFile, Object.entries(env).map(([key, value]) => `${key}=${value}\n`).join(""));
    const resource = { name: `visua-pilot-${kind}-${nonce}`, image };
    attempted.push(resource);
    report.containers.push(resource);
    const output = await docker(["run", "--detach", "--rm", "--pull=never", "--name", resource.name,
      "--label", `${OWNER_LABEL}=${nonce}`, "--env-file", envFile,
      "--publish", `127.0.0.1::${containerPort}`,
      "--mount", `type=tmpfs,destination=${destination},tmpfs-size=536870912`, image,
      ...(kind === "s3" ? ["server", "/data", "--address", ":9000"] : [])], `Start ${kind} fixture`, { timeoutMs: 30_000 });
    resource.id = output.toString().trim();
    const detail = JSON.parse((await docker(["inspect", "--type", "container", "--format",
      '{"imageId":{{json .Image}},"ports":{{json .NetworkSettings.Ports}}}', resource.name], `Inspect ${kind} fixture`)).toString());
    const bindings = detail.ports[`${containerPort}/tcp`];
    if (bindings?.length !== 1 || bindings[0].HostIp !== "127.0.0.1" || !/^\d+$/.test(bindings[0].HostPort)) throw new Error("Fixture must publish one loopback-only port");
    const port = Number(bindings[0].HostPort);
    if (port < 1 || port > 65535) throw new Error("Invalid fixture port");
    Object.assign(resource, { imageId: detail.imageId, host: "127.0.0.1", port });
    return { ...resource, port };
  }

  try {
    report.docker = JSON.parse((await docker(["info", "--format",
      '{"id":{{json .ID}},"name":{{json .Name}},"serverVersion":{{json .ServerVersion}},"operatingSystem":{{json .OperatingSystem}}}'], "Inspect Docker runtime")).toString());
    report.images = [];
    for (const image of [POSTGRES_IMAGE, MINIO_IMAGE]) {
      try {
        const metadata = JSON.parse((await docker(["image", "inspect", "--format", '{"id":{{json .Id}},"repoDigests":{{json .RepoDigests}}}', image], "Inspect cached fixture image")).toString());
        report.images.push({ image, ...metadata });
      } catch (error) {
        if (error.code === "DOCKER_OBJECT_ABSENT") throw new Error(`Required cached image is missing: ${image}. Install this fixture image before running the rehearsal; no automatic pulls are allowed.`);
        throw error;
      }
    }
    const password = randomBytes(32).toString("base64url");
    const pg = await createContainer("pg", POSTGRES_IMAGE, { POSTGRES_USER: "visua", POSTGRES_PASSWORD: password, POSTGRES_DB: "visua_pilot" }, 5432, "/var/lib/postgresql/data");
    const databaseUrl = (database) => `postgresql://visua:${password}@127.0.0.1:${pg.port}/${database}`;
    await waitReady(async () => {
      const client = new Client({ connectionString: databaseUrl("visua_pilot"), connectionTimeoutMillis: 2000, query_timeout: 2000 });
      client.on("error", () => {});
      try { await client.connect(); return (await client.query("SELECT 1 AS ready")).rows[0]?.ready === 1; }
      finally { await client.end().catch(() => {}); }
    }, "PostgreSQL");

    const accessKeyId = `visua${randomBytes(12).toString("hex")}`;
    const secretAccessKey = randomBytes(32).toString("base64url");
    const minio = await createContainer("s3", MINIO_IMAGE, { MINIO_ROOT_USER: accessKeyId, MINIO_ROOT_PASSWORD: secretAccessKey }, 9000, "/data");
    const s3 = { endpoint: `http://127.0.0.1:${minio.port}`, bucket: "visua-pilot", region: "us-east-1", accessKeyId, secretAccessKey };
    await waitReady(async () => (await fetch(`${s3.endpoint}/minio/health/ready`, { signal: AbortSignal.timeout(2000) })).ok, "MinIO");
    s3Client = new S3Client({ region: s3.region, endpoint: s3.endpoint, forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey }, ignoreConfiguredEndpointUrls: true,
      followRegionRedirects: false, maxAttempts: 2, requestHandler: { connectionTimeout: 2000, requestTimeout: 10_000 } });
    try { await s3Client.send(new CreateBucketCommand({ Bucket: s3.bucket }), { abortSignal: AbortSignal.timeout(10_000) }); }
    catch { throw new Error("Could not create private fixture bucket"); }
    report.readyInMs = Date.now() - started;
    report.s3 = { endpoint: s3.endpoint, bucket: s3.bucket, region: s3.region, prefix: "evidence", privacy: "fresh bucket; no public policy or ACL configured" };

    async function backupAndRestore() {
      if (closed || backupUsed) throw new Error("Backup requires open resources and can run only once");
      backupUsed = true;
      const backupStarted = Date.now();
      const deadline = AbortSignal.any([AbortSignal.timeout(120_000), shutdown.signal]);
      const restoredDatabase = `restore_${nonce}`;
      const backupDir = join(privateDir, "backup");
      try {
        await mkdir(backupDir, { mode: 0o700 });
        const archive = await docker(["exec", pg.name, "pg_dump", "--username", "visua", "--dbname", "visua_pilot", "--format=custom"], "Dump fixture database", { timeoutMs: 30_000, maxBytes: MAX_BYTES });
        await privateWrite(join(backupDir, "database.dump"), archive);
        await docker(["exec", pg.name, "createdb", "--username", "visua", "--template=template0", restoredDatabase], "Create recovery database");
        await docker(["exec", "--interactive", pg.name, "pg_restore", "--username", "visua", "--dbname", restoredDatabase,
          "--exit-on-error", "--no-owner", "--no-privileges"], "Restore fixture database", { timeoutMs: 30_000, input: archive });

        const send = async (command, label, signal = deadline) => {
          try {
            return await s3Client.send(command, { abortSignal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]) });
          } catch { throw new Error(`${label} failed or exceeded its bounded timeout`); }
        };
        const objects = [];
        const tokens = new Set();
        let token;
        let listedBytes = 0;
        do {
          const page = await send(new ListObjectsV2Command({ Bucket: s3.bucket, Prefix: "evidence/", MaxKeys: MAX_OBJECTS + 1, ...(token ? { ContinuationToken: token } : {}) }), "List evidence objects");
          for (const object of page.Contents ?? []) {
            if (typeof object.Key !== "string" || !object.Key.startsWith("evidence/") || !Number.isSafeInteger(object.Size) || object.Size < 0) throw new Error("Invalid evidence object metadata");
            objects.push({ key: object.Key, size: object.Size });
            listedBytes += object.Size;
            if (objects.length > MAX_OBJECTS || listedBytes > MAX_BYTES) throw new Error("Evidence backup exceeds 100 objects or 64 MiB");
          }
          token = page.IsTruncated ? page.NextContinuationToken : undefined;
          if (page.IsTruncated && (!token || tokens.has(token))) throw new Error("Invalid evidence listing continuation");
          if (token) tokens.add(token);
        } while (token);
        objects.sort((a, b) => a.key.localeCompare(b.key));
        if (new Set(objects.map(({ key }) => key)).size !== objects.length) throw new Error("Duplicate evidence object keys");
        let readBytes = 0;
        const read = async (key, size) => {
          const signal = AbortSignal.any([deadline, AbortSignal.timeout(10_000)]);
          const response = await send(new GetObjectCommand({ Bucket: s3.bucket, Key: key }), "Read evidence bytes", signal);
          const body = response.Body;
          const abort = () => body?.destroy?.();
          signal.addEventListener("abort", abort, { once: true });
          if (signal.aborted) abort();
          try {
            if (!body || response.ContentLength !== size) throw new Error("Evidence object size changed during recovery");
            const chunks = [];
            let bytes = 0;
            for await (const chunk of body) {
              if (signal.aborted) throw new Error("Evidence read deadline exceeded");
              bytes += chunk.length;
              readBytes += chunk.length;
              if (bytes > size || readBytes > MAX_BYTES) throw new Error("Evidence reads exceed the declared size or total 64 MiB limit");
              chunks.push(chunk);
            }
            if (signal.aborted || bytes !== size) throw new Error("Incomplete evidence bytes");
            return Buffer.concat(chunks);
          } catch { throw new Error("Evidence bytes could not be read within integrity and timeout bounds"); }
          finally { signal.removeEventListener("abort", abort); body?.destroy?.(); }
        };
        const manifest = [];
        for (const { key, size } of objects) {
          const bytes = await read(key, size);
          const sourceSha256 = sha256(bytes);
          const sourceKeySha256 = sha256(key);
          const restoredKey = `recovery/${key.slice("evidence/".length)}`;
          const blobFile = `${sourceKeySha256}.blob`;
          await privateWrite(join(backupDir, blobFile), bytes);
          await send(new PutObjectCommand({ Bucket: s3.bucket, Key: restoredKey, Body: bytes,
            ContentLength: size, ContentType: "application/octet-stream", ChecksumSHA256: Buffer.from(sourceSha256, "hex").toString("base64") }), "Write recovery bytes");
          const restoredSha256 = sha256(await read(restoredKey, size));
          if (restoredSha256 !== sourceSha256) throw new Error("Recovered evidence digest did not match");
          manifest.push({ key, restoredKey, blobFile, sourceKeySha256, restoredKeySha256: sha256(restoredKey), bytes: size, sourceSha256, restoredSha256 });
        }
        const safeManifest = manifest.map(({ key, restoredKey, blobFile, ...safe }) => safe);
        const digestManifest = (field) => sha256(JSON.stringify(safeManifest.map((object) => ({ keySha256: object.sourceKeySha256, bytes: object.bytes, sha256: object[field] }))));
        const backupReport = {
          startedAt: new Date(backupStarted).toISOString(), completedAt: new Date().toISOString(), durationMs: Date.now() - backupStarted,
          dump: { sha256: sha256(archive), bytes: archive.length },
          objectCount: manifest.length, objectBytes: listedBytes, readBytes,
          sourceObjectsSha256: digestManifest("sourceSha256"), restoredObjectsSha256: digestManifest("restoredSha256"), objects: safeManifest,
          sourcePrefix: "evidence", restoredPrefix: "recovery", restoredDatabase,
          artifacts: { directory: `resources-${nonce}/backup`, archive: "database.dump", manifest: "manifest.json", report: "report.json" },
          limits: { objects: MAX_OBJECTS, totalReadBytes: MAX_BYTES, objectRequestMs: 10_000, backupMs: 120_000 },
          consistency: "Caller must stop all app writers before backup. Current evidence/ objects were copied; the caller separately verifies app references, restored downloads, reviews, audit chain and auditor bundle. This is not a coordinated production snapshot.",
        };
        await privateWrite(join(backupDir, "manifest.json"), `${JSON.stringify({ ...backupReport, objects: manifest }, null, 2)}\n`);
        await privateWrite(join(backupDir, "report.json"), `${JSON.stringify(backupReport, null, 2)}\n`);
        report.backup = backupReport;
        return { databaseUrl: databaseUrl(restoredDatabase), s3Prefix: "recovery", report: backupReport };
      } catch (error) { return failAndClose(error); }
    }

    return { postgresUrl: databaseUrl("visua_pilot"), s3, backupAndRestore, close, report };
  } catch (error) { return failAndClose(error); }
}
