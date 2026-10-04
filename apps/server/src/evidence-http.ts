/** Bounded multipart uploads; file names never participate in storage paths. */
import { MAX_BLOB_BYTES } from "./blobs/index.ts";

export class EvidenceUploadError extends Error {
  readonly status: 400 | 413 | 415 | 503;
  constructor(message: string, status: 400 | 413 | 415 | 503 = 400) {
    super(message);
    this.status = status;
  }
}

const MAX_REQUEST_BYTES = MAX_BLOB_BYTES + 65_536;
const MAX_UPLOADS = 4;
let activeUploads = 0;

/** Bound concurrent buffering and storage work, including uploads without Content-Length. */
export async function withEvidenceUpload<T>(fn: () => Promise<T>): Promise<T> {
  if (activeUploads >= MAX_UPLOADS) throw new EvidenceUploadError("Uploads are busy. Try again shortly.", 503);
  activeUploads++;
  try { return await fn(); } finally { activeUploads--; }
}

export async function evidenceUpload(request: Request): Promise<{ file: File; metadata: unknown }> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("multipart/form-data;")) throw new EvidenceUploadError("Upload a file with multipart form data.", 415);
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length)))) throw new EvidenceUploadError("Invalid upload size.");
  if (length !== null && Number(length) > MAX_REQUEST_BYTES) throw new EvidenceUploadError("Files must be 10 MiB or smaller.", 413);
  if (!request.body) throw new EvidenceUploadError("Choose a file to upload.");
  const reader = request.body.getReader();
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]);
  const chunks: Uint8Array[] = [];
  let size = 0;
  const abort = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener("abort", abort, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_REQUEST_BYTES) throw new EvidenceUploadError("Files must be 10 MiB or smaller.", 413);
      chunks.push(chunk.value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    if (error instanceof EvidenceUploadError) throw error;
    throw new EvidenceUploadError("The upload was interrupted. Try again.");
  } finally {
    signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let form: FormData;
  try { form = await new Response(bytes, { headers: { "content-type": type } }).formData(); }
  catch { throw new EvidenceUploadError("The upload form is malformed."); }
  const entries = [...form.entries()];
  if (entries.length !== 2 || form.getAll("file").length !== 1 || form.getAll("metadata").length !== 1) throw new EvidenceUploadError("Include exactly one file and its metadata.");
  const file = form.get("file");
  const metadata = form.get("metadata");
  if (!(file instanceof File) || typeof metadata !== "string" || metadata.length > 32_768) throw new EvidenceUploadError("Include a file and valid metadata.");
  if (!file.size) throw new EvidenceUploadError("Choose a file with content.");
  if (file.size > MAX_BLOB_BYTES) throw new EvidenceUploadError("Files must be 10 MiB or smaller.", 413);
  if (!file.name.trim() || file.name.length > 300 || /[\x00-\x1f\x7f/\\]/.test(file.name)) throw new EvidenceUploadError("Use a file name without path separators or control characters.");
  try { return { file, metadata: JSON.parse(metadata) as unknown }; }
  catch { throw new EvidenceUploadError("File metadata must be valid JSON."); }
}

export function evidenceDisposition(name: string): string {
  const safe = Buffer.from(name, "utf8").toString("utf8").replace(/[\x00-\x1f\x7f/\\]/g, "_");
  const ascii = safe.replace(/[^\x20-\x7e]|[";]/g, "_") || "evidence";
  const encoded = encodeURIComponent(safe).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
