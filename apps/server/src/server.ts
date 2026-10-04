import { existsSync } from "node:fs";
import type { Server, ServerResponse } from "node:http";
import type { Socket } from "node:net";
import { resolve } from "node:path";
import { createAdaptorServer } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { REPO_ROOT } from "@visua/frameworks";
import { createApp } from "./app.ts";
import { loadAuthConfig } from "./auth/config.ts";
import { AuthService, RECHECK_BATCH } from "./auth/service.ts";
import { startDomainRechecks } from "./auth/recheck-ticker.ts";
import { createService, databaseUrl, type ServiceOptions } from "./context.ts";
import { initializeWorkspace, loadStartupConfig } from "./startup.ts";
import { loadScanRoots } from "./connectors/repo-scan.ts";

async function withinShutdownDeadline(work: Promise<void>, milliseconds: number, force = () => {}): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          force();
          reject(new Error(`Shutdown exceeded ${milliseconds} ms`));
        }, milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

/** Own the listener and storage together, including cleanup if startup fails. */
export async function startServer({ env = process.env, ...options }: ServiceOptions & { env?: NodeJS.ProcessEnv } = {}) {
  // Reject invalid authentication before opening or migrating a database.
  const authConfig = loadAuthConfig(env);
  const config = loadStartupConfig(env, authConfig.mode);
  const connectorRoots = options.connectorRoots ?? loadScanRoots(env);
  const svc = await createService({ ...options, connectorRoots, database: options.database ?? databaseUrl(env) });
  let stopRechecks = async () => {};
  try {
    if (!svc.registry.indexes.size) throw new Error("No framework data found. Run `pnpm ingest` to build it from the local corpus.");
    const auth = new AuthService(svc, authConfig);
    await initializeWorkspace(svc, auth, config.seed);
    const shutdown = new AbortController();
    const lifecycle = { stopping: false, signal: shutdown.signal };
    const app = createApp(svc, auth, lifecycle);
    const webDist = resolve(REPO_ROOT, "apps/web/dist");
    if (existsSync(webDist)) {
      app.use("/assets/*", async (c, next) => {
        await next();
        if (c.res.ok) c.header("Cache-Control", "public, max-age=31536000, immutable");
      });
      app.use("/*", serveStatic({ root: webDist }));
      app.get("*", serveStatic({ path: resolve(webDist, "index.html") }));
    }
    const handlers = new Set<Promise<unknown>>();
    const server = createAdaptorServer({ fetch: (request, bindings) => {
      const handler = Promise.resolve(app.fetch(request, bindings))
        .finally(() => handlers.delete(handler));
      handlers.add(handler);
      return handler;
    } }) as Server;
    const responses = new Map<Socket, Set<ServerResponse>>();
    server.on("request", (req, res) => {
      const active = responses.get(req.socket) ?? new Set<ServerResponse>();
      responses.set(req.socket, active);
      active.add(res);
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        active.delete(res);
        if (active.size) return;
        responses.delete(req.socket);
        // Headers of streams may already be sent, so changing keep-alive alone is insufficient.
        if (lifecycle.stopping) req.socket.end();
      };
      res.once("finish", finish);
      res.once("close", finish);
    });
    await new Promise<void>((done, reject) => {
      server.once("error", reject);
      server.listen(config.port, config.hostname, () => {
        server.removeListener("error", reject);
        done();
      });
    });
    if (auth.domainRechecksEnabled) {
      stopRechecks = startDomainRechecks(async () => {
        while (!lifecycle.stopping && (await auth.recheckDueDomains()) === RECHECK_BATCH);
      });
    }
    let stopped: Promise<void> | undefined;
    const stop = () => {
      if (stopped) return stopped;
      lifecycle.stopping = true;
      shutdown.abort();
      const rechecks = stopRechecks();
      const requests = new Promise<void>((done, reject) => server.close((err) => err ? reject(err) : done()));
      server.closeIdleConnections();
      stopped = withinShutdownDeadline((async () => {
        await Promise.all([requests, rechecks]);
        // A disconnected client does not mean its handler has stopped writing.
        while (handlers.size) await Promise.allSettled([...handlers]);
        await svc.drainRuns();
        await svc.store.close();
      })(), config.shutdownMs, () => server.closeAllConnections());
      return stopped;
    };
    return { svc, auth, app, server, config, stop };
  } catch (err) {
    try {
      await withinShutdownDeadline((async () => {
        await stopRechecks();
        await svc.drainRuns();
        await svc.store.close();
      })(), config.shutdownMs);
    } catch (cleanupError) {
      throw new AggregateError([err, cleanupError], "Startup failed and cleanup did not complete");
    }
    throw err;
  }
}
