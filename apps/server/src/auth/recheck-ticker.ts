/**
 * Runs SSO domain re-checks on a timer (every instance runs one; the claims in
 * AuthService.recheckDueDomains keep instances from looking up the same domain). A run
 * still in progress makes the next tick skip; a failed run is logged and the ticker goes on.
 * The timers do not keep the process alive.
 */
export function startDomainRechecks(
  run: () => Promise<unknown>,
  { everyMs = 10 * 60_000, firstMs = 30_000, log = (m: string) => console.warn(m) }: { everyMs?: number; firstMs?: number; log?: (message: string) => void } = {},
): () => Promise<void> {
  let running: Promise<void> | undefined;
  let stopped = false;
  const tick = () => {
    if (running || stopped) return;
    running = Promise.resolve().then(run)
      .then(() => undefined)
      .catch((err: unknown) => log(`[visua] SSO domain re-check failed: ${(err as Error).message}`))
      .finally(() => { running = undefined; });
  };
  const first = setTimeout(() => void tick(), firstMs);
  const every = setInterval(() => void tick(), everyMs);
  first.unref?.();
  every.unref?.();
  return async () => {
    stopped = true;
    clearTimeout(first);
    clearInterval(every);
    await running;
  };
}
