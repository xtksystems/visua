/** Track uncancellable operations until they physically finish, even after abort. */
import { AsyncLocalStorage } from "node:async_hooks";

const pendingWork = new AsyncLocalStorage<Set<Promise<void>>>();

export function trackPendingWork(): () => void {
  const pending = pendingWork.getStore();
  if (!pending) return () => {};
  let finish!: () => void;
  const task = new Promise<void>((resolve) => { finish = resolve; });
  pending.add(task);
  return () => { pending.delete(task); finish(); };
}

export function withWorkScope<T>(work: () => Promise<T>): Promise<T> {
  const pending = new Set<Promise<void>>();
  return pendingWork.run(pending, async () => {
    try {
      return await work();
    } finally {
      while (pending.size) await Promise.all([...pending]);
    }
  });
}
