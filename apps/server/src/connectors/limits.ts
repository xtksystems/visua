/** Limits are server policy; tenant connector configuration cannot increase them. */
import { withWorkScope } from "../work-scope.ts";
export const CONNECTOR_CONCURRENCY = 4;
export const CONNECTOR_TIMEOUT_MS = 30_000;
let active = 0;

export class ConnectorCapacityError extends Error {}

export async function withConnectorBudget<T>(work: (signal: AbortSignal) => Promise<T>, parentSignal?: AbortSignal): Promise<T> {
  parentSignal?.throwIfAborted();
  if (active >= CONNECTOR_CONCURRENCY) throw new ConnectorCapacityError("Four connector runs are already active. Try again after one finishes.");
  active++;
  const deadline = AbortSignal.timeout(CONNECTOR_TIMEOUT_MS);
  const signal = parentSignal ? AbortSignal.any([parentSignal, deadline]) : deadline;
  // Keep the slot until underlying work stops, even if it ignores cancellation.
  // Attach the caller's abort listener before work can synchronously abort it.
  const task = Promise.resolve().then(() => withWorkScope(async () => { signal.throwIfAborted(); return work(signal); })).finally(() => { active--; });
  return new Promise<T>((resolve, reject) => {
    const aborted = () => reject(signal.reason);
    signal.addEventListener("abort", aborted, { once: true });
    task.then(resolve, reject).finally(() => signal.removeEventListener("abort", aborted));
  });
}
