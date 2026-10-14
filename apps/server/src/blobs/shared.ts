import { createHash, randomUUID } from "node:crypto";

export const MAX_BLOB_BYTES = 10 * 1024 * 1024;
export const BLOB_OPERATION_TIMEOUT_MS = 15_000;

export interface BlobScope { tenantId: string; workspaceId: string }
export interface BlobReference { id: string; sha256: string; size: number }
export interface BlobStore {
  put(scope: BlobScope, bytes: Uint8Array): Promise<BlobReference>;
  get(scope: BlobScope, reference: BlobReference): Promise<Uint8Array>;
  delete(scope: BlobScope, id: string): Promise<void>;
}

export type BlobStoreErrorCode = "invalid_input" | "not_found" | "integrity" | "unavailable" | "timeout" | "configuration";
const MESSAGES: Record<BlobStoreErrorCode, string> = {
  invalid_input: "Invalid evidence file or storage reference.",
  not_found: "Evidence file is unavailable.",
  integrity: "Evidence file failed its integrity check.",
  unavailable: "Evidence file storage is unavailable.",
  timeout: "Evidence file storage timed out.",
  configuration: "Evidence file storage configuration is invalid.",
};

/** Deliberately omit backend errors, causes, paths, endpoints and credentials. */
export class BlobStoreError extends Error {
  readonly code: BlobStoreErrorCode;
  constructor(code: BlobStoreErrorCode) {
    super(MESSAGES[code]);
    this.name = "BlobStoreError";
    this.code = code;
  }
}

const COMPONENT = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function checkedScope(scope: BlobScope): BlobScope {
  if (!scope || typeof scope.tenantId !== "string" || typeof scope.workspaceId !== "string" || scope.tenantId.trim() !== scope.tenantId || scope.workspaceId.trim() !== scope.workspaceId || !COMPONENT.test(scope.tenantId) || !COMPONENT.test(scope.workspaceId)) {
    throw new BlobStoreError("invalid_input");
  }
  return { tenantId: scope.tenantId, workspaceId: scope.workspaceId };
}
export function checkedId(id: string): string {
  if (typeof id !== "string" || id.length !== 36 || !ID.test(id)) throw new BlobStoreError("invalid_input");
  return id;
}
export function checkedReference(reference: BlobReference): BlobReference {
  if (!reference || typeof reference.sha256 !== "string" || reference.sha256.length !== 64 || !/^[0-9a-f]{64}$/.test(reference.sha256) || !Number.isSafeInteger(reference.size) || reference.size < 1 || reference.size > MAX_BLOB_BYTES) {
    throw new BlobStoreError("invalid_input");
  }
  return { id: checkedId(reference.id), sha256: reference.sha256, size: reference.size };
}
export const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
export function verify(bytes: Uint8Array, reference: BlobReference): Uint8Array {
  if (bytes.byteLength !== reference.size || bytes.byteLength > MAX_BLOB_BYTES || digest(bytes) !== reference.sha256) throw new BlobStoreError("integrity");
  return bytes;
}
export function safeError(error: unknown): BlobStoreError {
  if (error instanceof BlobStoreError) return error;
  return new BlobStoreError("unavailable");
}
export function isMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: string; name?: string; $metadata?: { httpStatusCode?: number } };
  return value.code === "ENOENT" || value.name === "NoSuchKey" || value.name === "NotFound" || value.$metadata?.httpStatusCode === 404;
}

/** One budget spans PUT and its independent verification GET, including streams. */
export class BlobOperation {
  readonly controller = new AbortController();
  readonly signal = this.controller.signal;
  readonly deadline: number;
  readonly timer: ReturnType<typeof setTimeout>;
  constructor(milliseconds: number) {
    this.deadline = Date.now() + milliseconds;
    this.timer = setTimeout(() => this.controller.abort(), milliseconds);
    this.timer.unref();
  }
  check(): void {
    if (this.signal.aborted || Date.now() >= this.deadline) throw new BlobStoreError("timeout");
  }
  async run<T>(work: () => Promise<T>): Promise<T> {
    this.check();
    let onAbort: () => void = () => {};
    const timeout = new Promise<never>((_, reject) => {
      onAbort = () => reject(new BlobStoreError("timeout"));
      this.signal.addEventListener("abort", onAbort, { once: true });
    });
    try {
      const result = await Promise.race([work(), timeout]);
      this.check();
      return result;
    } finally { this.signal.removeEventListener("abort", onAbort); }
  }
  close(): void { clearTimeout(this.timer); }
}

export abstract class VerifiedBlobStore implements BlobStore {
  protected readonly operationTimeoutMs: number;
  constructor(operationTimeoutMs = BLOB_OPERATION_TIMEOUT_MS) {
    if (!Number.isSafeInteger(operationTimeoutMs) || operationTimeoutMs < 1 || operationTimeoutMs > BLOB_OPERATION_TIMEOUT_MS) throw new BlobStoreError("configuration");
    this.operationTimeoutMs = operationTimeoutMs;
  }
  protected abstract write(scope: BlobScope, reference: BlobReference, bytes: Uint8Array, operation: BlobOperation): Promise<void>;
  protected abstract read(scope: BlobScope, reference: BlobReference, operation: BlobOperation): Promise<Uint8Array>;
  protected abstract remove(scope: BlobScope, id: string, operation: BlobOperation): Promise<void>;

  async put(input: BlobScope, inputBytes: Uint8Array): Promise<BlobReference> {
    const scope = checkedScope(input);
    if (!(inputBytes instanceof Uint8Array) || inputBytes.byteLength < 1 || inputBytes.byteLength > MAX_BLOB_BYTES) throw new BlobStoreError("invalid_input");
    const bytes = Uint8Array.from(inputBytes);
    const reference = { id: randomUUID(), sha256: digest(bytes), size: bytes.byteLength };
    const operation = new BlobOperation(this.operationTimeoutMs);
    try {
      await this.write(scope, reference, bytes, operation);
      verify(await this.read(scope, reference, operation), reference);
      operation.check();
      return reference;
    } catch (error) {
      // A failed PUT may already have persisted bytes. Cleanup has its own bound.
      const cleanup = new BlobOperation(Math.min(this.operationTimeoutMs, 2_000));
      try { await this.remove(scope, reference.id, cleanup); } catch { /* Best effort. */ }
      finally { cleanup.close(); }
      throw operation.signal.aborted ? new BlobStoreError("timeout") : safeError(error);
    } finally { operation.close(); }
  }
  async get(input: BlobScope, inputReference: BlobReference): Promise<Uint8Array> {
    const scope = checkedScope(input);
    const reference = checkedReference(inputReference);
    const operation = new BlobOperation(this.operationTimeoutMs);
    try {
      const bytes = verify(await this.read(scope, reference, operation), reference);
      operation.check();
      return bytes;
    }
    catch (error) { throw operation.signal.aborted ? new BlobStoreError("timeout") : safeError(error); }
    finally { operation.close(); }
  }
  async delete(input: BlobScope, inputId: string): Promise<void> {
    const scope = checkedScope(input);
    const id = checkedId(inputId);
    const operation = new BlobOperation(this.operationTimeoutMs);
    try { await this.remove(scope, id, operation); }
    catch (error) { throw operation.signal.aborted ? new BlobStoreError("timeout") : safeError(error); }
    finally { operation.close(); }
  }
}
