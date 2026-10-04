import { constants, type Stats } from "node:fs";
import { lstat, mkdir, open, realpath, unlink } from "node:fs/promises";
import { join, parse, resolve, sep } from "node:path";
import {
  BlobStoreError, MAX_BLOB_BYTES, VerifiedBlobStore, isMissing,
  type BlobOperation, type BlobReference, type BlobScope,
} from "./shared.ts";

const sameFile = (a: Stats, b: Stats) => a.dev === b.dev && a.ino === b.ino && a.mode === b.mode;
const privateMode = (stat: Stats) => (stat.mode & 0o077) === 0;
const regularPrivateFile = (stat: Stats) => stat.isFile() && stat.nlink === 1 && privateMode(stat);

/**
 * Root and all its parents are operator-controlled. Node has no portable openat
 * API: inode/canonical checks and O_NOFOLLOW refuse symlinks and special files,
 * but cannot defend against an operator racing replacement of ancestor dirs.
 * Filesystem calls cannot be cancelled by Node; check the deadline around every
 * call, retain fd ownership until it finishes, and cap reads/writes to 10 MiB.
 */
export class LocalBlobStore extends VerifiedBlobStore {
  private readonly directory: string;
  constructor(directory: string, options: { operationTimeoutMs?: number } = {}) {
    super(options.operationTimeoutMs);
    if (typeof directory !== "string" || !directory.trim() || directory.includes("\0") || directory.length > 4_096) throw new BlobStoreError("configuration");
    this.directory = resolve(directory);
    if (this.directory === parse(this.directory).root || this.directory.split(sep).length > 64) throw new BlobStoreError("configuration");
  }

  private async inspectDirectory(path: string, operation: BlobOperation, requirePrivate: boolean): Promise<Stats> {
    operation.check();
    const before = await lstat(path);
    operation.check();
    if (!before.isDirectory() || before.isSymbolicLink() || (requirePrivate && !privateMode(before))) throw new BlobStoreError("unavailable");
    const canonical = await realpath(path);
    operation.check();
    const after = await lstat(path);
    operation.check();
    if (canonical !== path || !sameFile(before, after)) throw new BlobStoreError("unavailable");
    return after;
  }

  private async directoryFor(scope: BlobScope, operation: BlobOperation, create: boolean): Promise<string> {
    // Walk components individually; recursive mkdir would silently follow links.
    const root = parse(this.directory).root;
    let current = root;
    const components = this.directory.slice(root.length).split(sep);
    const lastRoot = components.length - 1;
    components.push(scope.tenantId, scope.workspaceId);
    for (let index = 0; index < components.length; index++) {
      current = join(current, components[index]!);
      operation.check();
      if (create) {
        try { await mkdir(current, { mode: 0o700 }); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
      }
      await this.inspectDirectory(current, operation, index >= lastRoot);
    }
    return current;
  }

  private async inspectFile(path: string, operation: BlobOperation): Promise<Stats> {
    operation.check();
    const before = await lstat(path);
    operation.check();
    if (!regularPrivateFile(before)) throw new BlobStoreError("unavailable");
    const canonical = await realpath(path);
    operation.check();
    const after = await lstat(path);
    operation.check();
    if (canonical !== path || !sameFile(before, after) || !regularPrivateFile(after)) throw new BlobStoreError("unavailable");
    return after;
  }

  protected async write(scope: BlobScope, reference: BlobReference, bytes: Uint8Array, operation: BlobOperation): Promise<void> {
    const directory = await this.directoryFor(scope, operation, true);
    const path = join(directory, reference.id);
    operation.check();
    const handle = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW | constants.O_NONBLOCK, 0o600);
    try {
      operation.check();
      const opened = await handle.stat();
      if (!regularPrivateFile(opened) || !sameFile(opened, await this.inspectFile(path, operation))) throw new BlobStoreError("unavailable");
      let offset = 0;
      while (offset < bytes.byteLength) {
        operation.check();
        const { bytesWritten } = await handle.write(bytes, offset, Math.min(64 * 1024, bytes.byteLength - offset), offset);
        operation.check();
        if (!bytesWritten) throw new BlobStoreError("unavailable");
        offset += bytesWritten;
      }
      await handle.sync();
      operation.check();
    } finally { await handle.close(); }
  }

  protected async read(scope: BlobScope, reference: BlobReference, operation: BlobOperation): Promise<Uint8Array> {
    try {
      const directory = await this.directoryFor(scope, operation, false);
      const path = join(directory, reference.id);
      const before = await this.inspectFile(path, operation);
      if (before.size !== reference.size || before.size < 1 || before.size > MAX_BLOB_BYTES) throw new BlobStoreError("integrity");
      const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      try {
        operation.check();
        const opened = await handle.stat();
        operation.check();
        if (!regularPrivateFile(opened) || !sameFile(before, opened) || opened.size !== reference.size || !sameFile(opened, await this.inspectFile(path, operation))) throw new BlobStoreError("integrity");
        // The extra byte catches growth without ever consuming an unbounded file.
        const bytes = Buffer.alloc(reference.size + 1);
        let offset = 0;
        while (offset < bytes.length) {
          operation.check();
          const { bytesRead } = await handle.read(bytes, offset, Math.min(64 * 1024, bytes.length - offset), offset);
          operation.check();
          if (!bytesRead) break;
          offset += bytesRead;
        }
        const after = await handle.stat();
        const current = await this.inspectFile(path, operation);
        if (offset !== reference.size || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || after.ctimeMs !== opened.ctimeMs || !sameFile(after, current)) throw new BlobStoreError("integrity");
        return bytes.subarray(0, offset);
      } finally { await handle.close(); }
    } catch (error) {
      if (isMissing(error)) throw new BlobStoreError("not_found");
      throw error;
    }
  }

  protected async remove(scope: BlobScope, id: string, operation: BlobOperation): Promise<void> {
    try {
      const directory = await this.directoryFor(scope, operation, false);
      const path = join(directory, id);
      await this.inspectFile(path, operation);
      operation.check();
      await unlink(path);
      operation.check();
    } catch (error) { if (!isMissing(error)) throw error; }
  }
}
