import type { Store } from "./storage/store.ts";

/** Bound HTTP latency and share a stuck query rather than queueing one per probe. */
export function readinessProbe(store: Store, timeoutMs = 1000): () => Promise<boolean> {
  let inFlight: Promise<boolean> | undefined;
  return async () => {
    inFlight ??= store.driver.query("SELECT 1")
      .then(() => true, () => false)
      .finally(() => { inFlight = undefined; });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        inFlight,
        new Promise<boolean>((done) => { timeout = setTimeout(() => done(false), timeoutMs); }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  };
}
