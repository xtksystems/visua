import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import {
  BlobStoreError, MAX_BLOB_BYTES, VerifiedBlobStore, isMissing,
  type BlobOperation, type BlobReference, type BlobScope,
} from "./shared.ts";

export interface S3BlobStoreOptions {
  bucket: string;
  region: string;
  endpoint?: string;
  prefix?: string;
  forcePathStyle?: boolean;
  operationTimeoutMs?: number;
}

/** Bucket privacy, policy, encryption and lifecycle are the operator's responsibility. */
export class S3BlobStore extends VerifiedBlobStore {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;
  constructor(options: S3BlobStoreOptions) {
    super(options.operationTimeoutMs);
    if (options.bucket.trim() !== options.bucket || options.region.trim() !== options.region || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(options.bucket) || options.bucket.includes("..") || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(options.region)) throw new BlobStoreError("configuration");
    if (options.endpoint !== undefined) {
      let endpoint: URL;
      try { endpoint = new URL(options.endpoint); } catch { throw new BlobStoreError("configuration"); }
      if (!["http:", "https:"].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== "/") throw new BlobStoreError("configuration");
    }
    this.bucket = options.bucket;
    this.prefix = options.prefix ?? "evidence";
    if (this.prefix.trim() !== this.prefix || this.prefix.length > 512 || (this.prefix && (this.prefix.split("/").length > 8 || this.prefix.split("/").some((part) => !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(part))))) throw new BlobStoreError("configuration");
    // Only operator configuration selects the endpoint; connector/tenant egress
    // permissions and ambient AWS_ENDPOINT_URL settings do not change it.
    this.client = new S3Client({
      region: options.region,
      ...(options.endpoint ? { endpoint: options.endpoint } : {}),
      forcePathStyle: options.forcePathStyle ?? false,
      ignoreConfiguredEndpointUrls: true,
      followRegionRedirects: false,
      maxAttempts: 2,
      requestHandler: { connectionTimeout: 3_000, requestTimeout: this.operationTimeoutMs },
      // Credentials intentionally use the SDK's standard provider chain.
    });
  }

  private key(scope: BlobScope, id: string): string {
    return [this.prefix, scope.tenantId, scope.workspaceId, id].filter(Boolean).join("/");
  }
  protected async write(scope: BlobScope, reference: BlobReference, bytes: Uint8Array, operation: BlobOperation): Promise<void> {
    await operation.run(() => this.client.send(new PutObjectCommand({
      Bucket: this.bucket, Key: this.key(scope, reference.id), Body: bytes,
      ContentLength: bytes.byteLength, ContentType: "application/octet-stream",
      ChecksumSHA256: Buffer.from(reference.sha256, "hex").toString("base64"),
      // No ACL, filename, public URL, or client-provided metadata.
    }), { abortSignal: operation.signal }));
  }

  protected async read(scope: BlobScope, reference: BlobReference, operation: BlobOperation): Promise<Uint8Array> {
    let stream: Readable | undefined;
    const abort = () => { stream?.destroy(new BlobStoreError("timeout")); };
    try {
      const response = await operation.run(() => this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: this.key(scope, reference.id) }), { abortSignal: operation.signal }));
      if (!(response.Body instanceof Readable)) throw new BlobStoreError("unavailable");
      stream = response.Body;
      operation.signal.addEventListener("abort", abort, { once: true });
      operation.check();
      if (response.ContentLength !== undefined && (response.ContentLength !== reference.size || response.ContentLength > MAX_BLOB_BYTES)) throw new BlobStoreError("integrity");
      return await operation.run(async () => {
        const bytes = Buffer.alloc(reference.size);
        let offset = 0;
        for await (const chunk of stream!) {
          operation.check();
          if (!(chunk instanceof Uint8Array) || chunk.byteLength > reference.size - offset || offset + chunk.byteLength > MAX_BLOB_BYTES) throw new BlobStoreError("integrity");
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        if (offset !== reference.size) throw new BlobStoreError("integrity");
        return bytes;
      });
    } catch (error) {
      if (isMissing(error)) throw new BlobStoreError("not_found");
      throw error;
    } finally {
      operation.signal.removeEventListener("abort", abort);
      stream?.destroy();
    }
  }

  protected async remove(scope: BlobScope, id: string, operation: BlobOperation): Promise<void> {
    try {
      await operation.run(() => this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: this.key(scope, id) }), { abortSignal: operation.signal }));
    } catch (error) { if (!isMissing(error)) throw error; }
  }

  /** Call during shutdown when this concrete adapter is owned by the process. */
  destroy(): void { this.client.destroy(); }
}
