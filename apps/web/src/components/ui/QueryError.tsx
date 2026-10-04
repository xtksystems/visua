import type { ReactNode } from "react";

/** Keep a failed destination visible and retryable without redirecting it. */
export function QueryError({ title = "Unable to load this page", error, retry, children }: { title?: string; error: unknown; retry: () => unknown; children?: ReactNode }) {
  return (
    <div className="page stack" role="alert">
      <h1>{title}</h1>
      <p className="muted">{error instanceof Error ? error.message : "The request failed. Try again."}</p>
      <div className="row row--wrap">
        <button className="btn" onClick={() => { void retry(); }}>Retry</button>
        {children}
      </div>
    </div>
  );
}
