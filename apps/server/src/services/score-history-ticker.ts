/** Own timers and drain the active capture before closing storage. */
export function startScoreHistory(
  run: () => Promise<void>,
  { everyMs = 15 * 60_000, firstMs = 30_000, log = (message: string) => console.warn(message) }: { everyMs?: number; firstMs?: number; log?: (message: string) => void } = {},
): () => Promise<void> {
  let running: Promise<void> | undefined;
  let stopped = false;
  const tick = () => {
    if (stopped || running) return;
    running = Promise.resolve().then(run).catch((error: unknown) => log(`[visua] Score history tick failed: ${(error as Error).message}`)).finally(() => { running = undefined; });
  };
  const first = setTimeout(tick, firstMs);
  const every = setInterval(tick, everyMs);
  first.unref?.(); every.unref?.();
  return async () => { stopped = true; clearTimeout(first); clearInterval(every); await running; };
}
