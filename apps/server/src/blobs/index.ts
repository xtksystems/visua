import { fileURLToPath } from "node:url";
import { BlobStoreError, type BlobStore } from "./shared.ts";
import { LocalBlobStore } from "./local.ts";
import { MemoryBlobStore } from "./memory.ts";
import { S3BlobStore } from "./s3.ts";

export { BlobStoreError, MAX_BLOB_BYTES, BLOB_OPERATION_TIMEOUT_MS } from "./shared.ts";
export type { BlobStore, BlobScope, BlobReference, BlobStoreErrorCode } from "./shared.ts";
export { LocalBlobStore } from "./local.ts";
export { MemoryBlobStore } from "./memory.ts";
export { S3BlobStore } from "./s3.ts";
export type { S3BlobStoreOptions } from "./s3.ts";

export function createBlobStore(env: NodeJS.ProcessEnv = process.env, options: { memory?: boolean } = {}): BlobStore {
  const backend = env["VISUA_BLOB_STORE"];
  if (backend === undefined && options.memory) return new MemoryBlobStore();
  if (backend === undefined || backend === "local") return new LocalBlobStore(env["VISUA_BLOB_DIR"] ?? fileURLToPath(new URL("../../../../data/blobs", import.meta.url)));
  if (backend !== "s3") throw new BlobStoreError("configuration");
  const bucket = env["VISUA_BLOB_S3_BUCKET"];
  const region = env["VISUA_BLOB_S3_REGION"];
  const style = env["VISUA_BLOB_S3_FORCE_PATH_STYLE"];
  if (!bucket || !region || (style !== undefined && style !== "true" && style !== "false" && style !== "1" && style !== "0")) throw new BlobStoreError("configuration");
  return new S3BlobStore({
    bucket, region,
    endpoint: env["VISUA_BLOB_S3_ENDPOINT"],
    prefix: env["VISUA_BLOB_S3_PREFIX"],
    forcePathStyle: style === "true" || style === "1",
  });
}
