import { BlobStoreError, VerifiedBlobStore, type BlobOperation, type BlobReference, type BlobScope } from "./shared.ts";

export class MemoryBlobStore extends VerifiedBlobStore {
  private readonly objects = new Map<string, Uint8Array>();
  private key(scope: BlobScope, id: string): string { return `${scope.tenantId}/${scope.workspaceId}/${id}`; }
  protected async write(scope: BlobScope, reference: BlobReference, bytes: Uint8Array, operation: BlobOperation): Promise<void> {
    operation.check();
    this.objects.set(this.key(scope, reference.id), Uint8Array.from(bytes));
  }
  protected async read(scope: BlobScope, reference: BlobReference, operation: BlobOperation): Promise<Uint8Array> {
    operation.check();
    const bytes = this.objects.get(this.key(scope, reference.id));
    if (!bytes) throw new BlobStoreError("not_found");
    return Uint8Array.from(bytes);
  }
  protected async remove(scope: BlobScope, id: string, operation: BlobOperation): Promise<void> {
    operation.check();
    this.objects.delete(this.key(scope, id));
  }
}
