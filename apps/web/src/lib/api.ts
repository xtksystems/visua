/** Minimal typed API client: same-origin session cookie, CSRF header on writes, sign-in prompt on 401. */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let csrfToken = "";
/** The session's CSRF token (from /api/auth/me); sent with every state-changing request. */
export const setCsrfToken = (token: string | undefined) => {
  csrfToken = token ?? "";
};

const unauthorizedListeners = new Set<() => void>();
/** Called when the server says the session is gone (expired, signed out elsewhere). */
export const onUnauthorized = (fn: () => void) => {
  unauthorizedListeners.add(fn);
  return () => void unauthorizedListeners.delete(fn);
};

async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (method !== "GET" && csrfToken) headers["x-visua-csrf"] = csrfToken;
  const res = await fetch(`/api${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, credentials: "same-origin", signal });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? (JSON.parse(text) as unknown) : undefined;
  } catch {
    data = undefined;
  }
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth/")) for (const fn of unauthorizedListeners) fn();
    const message = (data as { error?: string } | undefined)?.error ?? `${res.status} ${res.statusText}`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export interface DownloadResponse {
  blob: Blob;
  filename: string;
  manifestSha256: string | null;
  auditCheckpoint: string | null;
}

/** Binary responses share the same cookie, cancellation and sign-in failure handling. */
async function downloadResponse(path: string, signal?: AbortSignal): Promise<DownloadResponse> {
  const res = await fetch(`/api${path}`, { credentials: "same-origin", signal });
  if (!res.ok) {
    if (res.status === 401) for (const fn of unauthorizedListeners) fn();
    const data = await res.json().catch(() => undefined) as { error?: string } | undefined;
    throw new ApiError(res.status, data?.error ?? "The download failed. Try again.");
  }
  const filename = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "download";
  return { blob: await res.blob(), filename: filename.replace(/[\\/\u0000-\u001f\u007f]/g, "_"), manifestSha256: res.headers.get("x-visua-manifest-sha256"), auditCheckpoint: res.headers.get("x-visua-audit-checkpoint") };
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>("GET", path, undefined, signal),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
  upload: async <T>(path: string, form: FormData): Promise<T> => {
    const res = await fetch(`/api${path}`, { method: "POST", headers: { "x-visua-csrf": csrfToken }, body: form, credentials: "same-origin" });
    const data = await res.json() as T & { error?: string };
    if (!res.ok) {
      if (res.status === 401) for (const fn of unauthorizedListeners) fn();
      throw new ApiError(res.status, data.error ?? "The upload failed. Try again.");
    }
    return data;
  },
  download: async (path: string): Promise<Blob> => (await downloadResponse(path)).blob,
  downloadResponse,
};

export const corpusFileUrl = (path: string, page?: number) => `/api/corpus/file/${path.split("/").map(encodeURIComponent).join("/")}${page ? `#page=${page}` : ""}`;
export const exportUrl = (ws: string, kind: string) => `/api/workspaces/${encodeURIComponent(ws)}/exports/${kind}`;
