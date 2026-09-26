/** A cookie-keeping API client for tests: signs in like the browser does (session cookie + CSRF header). */
import type { Hono } from "hono";
import type { AppEnv } from "../src/auth/http.ts";

export interface Res<T> {
  status: number;
  json: T;
  text: string;
  headers: Headers;
}

export class TestClient {
  cookie = "";
  csrf = "";
  bearer = "";
  readonly app: Hono<AppEnv>;

  constructor(app: Hono<AppEnv>) {
    this.app = app;
  }

  async request<T = unknown>(method: string, path: string, body?: unknown, extra: Record<string, string> = {}): Promise<Res<T>> {
    const headers: Record<string, string> = { ...(body !== undefined ? { "content-type": "application/json" } : {}) };
    if (this.cookie) headers["cookie"] = this.cookie;
    if (this.csrf && method !== "GET" && method !== "HEAD") headers["x-visua-csrf"] = this.csrf;
    if (this.bearer) headers["authorization"] = `Bearer ${this.bearer}`;
    const res = await this.app.request(path, { method, headers: { ...headers, ...extra }, body: body !== undefined ? JSON.stringify(body) : undefined });
    const set = res.headers.get("set-cookie");
    if (set) {
      const m = /((?:__Host-)?visua_session)=([^;]*)/.exec(set);
      if (m) this.cookie = m[2] ? `${m[1]}=${m[2]}` : "";
    }
    const text = await res.text();
    let json: T;
    try {
      json = JSON.parse(text) as T;
    } catch {
      json = undefined as T;
    }
    return { status: res.status, json, text, headers: res.headers };
  }

  get = <T = unknown>(path: string) => this.request<T>("GET", path);
  post = <T = unknown>(path: string, body?: unknown) => this.request<T>("POST", path, body ?? {});
  patch = <T = unknown>(path: string, body: unknown) => this.request<T>("PATCH", path, body);
  put = <T = unknown>(path: string, body: unknown) => this.request<T>("PUT", path, body);
  del = <T = unknown>(path: string) => this.request<T>("DELETE", path);

  async devLogin(email: string, name?: string): Promise<Res<{ csrf: string; user: { id: string; email: string }; activeTenant: { id: string; role: string } | null }>> {
    const res = await this.post<{ csrf: string; user: { id: string; email: string }; activeTenant: { id: string; role: string } | null }>("/api/auth/dev/login", { email, name });
    if (res.status === 200) this.csrf = res.json.csrf;
    return res;
  }
}
