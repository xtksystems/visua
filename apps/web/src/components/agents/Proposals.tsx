/** Proposal decisions are bound to the server snapshot the person reviewed. */
import { CheckCheck, Eye, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ProposalBatchPreview, ProposalBatchResult, ProposalChange, ProposalPreview } from "@visua/core";
import { useWorkspaceId } from "../../lib/workspace.ts";
import { api, ApiError } from "../../lib/api.ts";
import { useCan } from "../../lib/auth.ts";
import { truncate } from "../../lib/format.ts";
import { useWsMutation } from "../../lib/queries.ts";
import type { Proposal } from "../../lib/types.ts";
import { AgentBadge, CitationBlock, CodeTag, Dialog, toast } from "../ui/index.tsx";
import "./proposals.css";

const TYPE_LABEL: Record<string, string> = {
  "set-level": "Assessment", "set-target": "Target", "set-applicability": "Scope",
  "create-task": "New task", "update-task": "Task update", "create-evidence": "Evidence",
  "review-evidence": "Evidence review", "create-policy": "Policy draft", "create-risk": "Risk", "set-rmf": "RMF settings",
};
const TECHNICAL_FIELDS = new Set(["workspaceId", "id", "sha256", "agentRunId", "slug", "contentRequirementIds"]);

function label(field: string): string {
  const known: Record<string, string> = { nodeId: "Requirement", nodeIds: "Requirements", requirementIds: "Requirements", id: "ID", current: "Implementation level", level: "Implementation level", targetLevel: "Target level", userExclusion: "User exclusion", rmf: "RMF settings" };
  return known[field] ?? field.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function Value({ value }: { value: unknown }): ReactNode {
  if (value === undefined || value === null || value === "") return <span className="muted">Not set</span>;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? <ul className="proposal-values">{value.map((item, i) => <li key={i}><Value value={item} /></li>)}</ul> : <span className="muted">None</span>;
  if (typeof value === "object") return <dl className="proposal-fields">{Object.entries(value).map(([key, item]) => <div key={key}><dt>{label(key)}</dt><dd><Value value={item} /></dd></div>)}</dl>;
  return <span className="proposal-value">{String(value)}</span>;
}

function ChangeFields({ change, fields }: { change: ProposalChange; fields: string[] }) {
  if (!fields.length) return null;
  return <>
    <div className="proposal-change__head" aria-hidden="true"><span>Field</span><span>Current</span><span>Proposed</span></div>
    <dl className="proposal-change__fields">
      {fields.map((field) => (
        <div className="proposal-change__row" key={field}>
          <dt>{label(field)}</dt>
          <dd><span className="proposal-change__mobile-label">Current</span>{change.current === null ? <span className="muted">Does not exist</span> : <Value value={change.current[field]} />}</dd>
          <dd><span className="proposal-change__mobile-label">Proposed</span><Value value={change.proposed[field]} /></dd>
        </div>
      ))}
    </dl>
  </>;
}

function PreviewContent({ preview }: { preview: ProposalPreview }) {
  const p = preview.proposal;
  return (
    <div className="proposal-review__content">
      <div className="row row--wrap proposal-review__tags">
        <AgentBadge label={TYPE_LABEL[p.type] ?? p.type} />
        <span className="muted">{p.status === "pending" ? "Awaiting a decision" : p.status}</span>
      </div>
      <p className="proposal-review__rationale">{p.rationale}</p>
      <section className="proposal-review__section" aria-label="Changes to apply">
        <h3>Changes to apply</h3>
        {preview.changes.length === 0 && <p className="muted">No applicable changes are available.</p>}
        {preview.changes.map((change, index) => {
          const fields = [...new Set([...Object.keys(change.current ?? {}), ...Object.keys(change.proposed)])];
          const meaningfulFields = fields.filter((field) => !TECHNICAL_FIELDS.has(field));
          const technicalFields = fields.filter((field) => TECHNICAL_FIELDS.has(field));
          return (
            <div className="proposal-change" key={`${change.entityType}:${change.entityId ?? index}`}>
              <h4>{change.label}</h4>
              {change.current === null && <p className="muted">Creates a new {change.entityType.replace(/-/g, " ")}.</p>}
              <ChangeFields change={change} fields={meaningfulFields} />
              {change.generatedFields.length > 0 && <p className="muted">Identifiers and timestamps are assigned when applied.</p>}
              {(technicalFields.length > 0 || change.generatedFields.length > 0) && <details className="proposal-change__technical">
                <summary>Technical fields</summary>
                <ChangeFields change={change} fields={technicalFields} />
                {change.generatedFields.length > 0 && <div className="proposal-change__generated"><p className="muted">Fields set when applied:</p><ul className="proposal-values">{change.generatedFields.map((field) => <li key={field}><code>{field}</code></li>)}</ul></div>}
              </details>}
            </div>
          );
        })}
      </section>
      <section className="proposal-review__section" aria-label="Affected requirements">
        <h3>Affected requirements ({preview.affectedRequirementIds.length})</h3>
        <div className="row row--wrap proposal-review__tags">{preview.affectedRequirementIds.map((id) => <CodeTag key={id} id={id} />)}</div>
        {!preview.affectedRequirementIds.length && <p className="muted">No requirement changes or links are identified for this proposal.</p>}
      </section>
      <section className="proposal-review__section" aria-label="Supporting sources">
        <h3>Supporting sources</h3>
        {preview.sources.map((source, index) => <details className="proposal-source" key={`${source.kind}:${source.id}:${index}`}><summary>{source.label}</summary><Value value={source.detail} /></details>)}
        {preview.citations.map((citation, i) => <CitationBlock key={i} citation={citation} />)}
        {!preview.sources.length && !preview.citations.length && <p className="muted">No supporting sources were supplied.</p>}
      </section>
      <section className="proposal-review__section" aria-label="Unknowns and limitations">
        <h3>Unknowns and limitations</h3>
        {preview.unresolvedQuestions.length ? <ul className="proposal-values">{preview.unresolvedQuestions.map((question, i) => <li key={i}>{question}</li>)}</ul> : <p className="muted">No additional unknowns were identified by this preview. Review the supporting sources before deciding.</p>}
        <p className="muted proposal-confidence">Agent-reported confidence: {p.confidence}. This is a qualitative estimate, not verification.</p>
      </section>
    </div>
  );
}

type ReviewTarget = { workspaceId: string; proposalId: string; expectedRunId: string; runId?: never } | { workspaceId: string; runId: string; proposalId?: never; expectedRunId?: never };
type Snapshot = { kind: "single"; preview: ProposalPreview } | { kind: "batch"; preview: ProposalBatchPreview };
type DecisionResult = { kind: "single"; proposal: Proposal } | { kind: "batch"; result: ProposalBatchResult };

/** Mounted per workspace/selection, with no subscription that can replace the review. */
export function ProposalReviewDialog({ target, onClose }: { target: ReviewTarget; onClose: () => void }) {
  const [identity] = useState(() => ({ ...target }));
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [stale, setStale] = useState(false);
  const [result, setResult] = useState<DecisionResult>();
  const canDecide = useCan("work.approve");
  const alive = useRef(true);
  const submitting = useRef(false);
  const base = `/workspaces/${encodeURIComponent(identity.workspaceId)}`;
  const decision = useWsMutation(identity.workspaceId, async (args: { snapshot: Snapshot; decision: "approved" | "rejected" }): Promise<DecisionResult> => {
    if (args.snapshot.kind === "single") {
      const { proposal, reviewToken } = args.snapshot.preview;
      return { kind: "single", proposal: await api.post<Proposal>(`${base}/proposals/${encodeURIComponent(proposal.id)}/decision`, { decision: args.decision, ...(args.decision === "approved" ? { reviewToken } : {}) }) };
    }
    const { runId, proposalIds, reviewToken } = args.snapshot.preview;
    return { kind: "batch", result: await api.post<ProposalBatchResult>(`${base}/runs/${encodeURIComponent(runId)}/approve-all`, { proposalIds, reviewToken }) };
  });
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    const load = async (): Promise<Snapshot> => identity.proposalId
      ? { kind: "single", preview: await api.get<ProposalPreview>(`${base}/proposals/${encodeURIComponent(identity.proposalId)}/preview`, controller.signal) }
      : { kind: "batch", preview: await api.get<ProposalBatchPreview>(`${base}/runs/${encodeURIComponent(identity.runId!)}/approval-preview`, controller.signal) };
    void load().then((next) => {
      if (controller.signal.aborted) return;
      // A preview from a different identity must never become a decision target.
      if (next.kind === "single" ? next.preview.proposal.id !== identity.proposalId || next.preview.proposal.workspaceId !== identity.workspaceId || next.preview.proposal.runId !== identity.expectedRunId : next.preview.runId !== identity.runId || next.preview.proposals.some((p) => p.proposal.workspaceId !== identity.workspaceId || p.proposal.runId !== identity.runId)) {
        throw new Error("The review does not match this workspace and selection. Close it and try again.");
      }
      setSnapshot(next);
      setStale(false);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load the review.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [base, identity, refresh]);

  const act = async (choice: "approved" | "rejected") => {
    if (!snapshot || submitting.current || loading || result || !canDecide || (choice === "approved" && stale)) return;
    submitting.current = true;
    setError(undefined);
    try {
      const outcome = await decision.mutateAsync({ snapshot, decision: choice });
      if (outcome.kind === "single") toast(outcome.proposal.status === "applied" ? "Proposal applied" : outcome.proposal.status === "rejected" ? "Proposal rejected" : "Proposal was not applied", outcome.proposal.status === "failed" ? "error" : "info");
      if (alive.current) setResult(outcome);
    } catch (cause) {
      if (alive.current) {
        setError(cause instanceof Error ? cause.message : "The decision could not be saved. Try again.");
        if (cause instanceof ApiError && cause.status === 409) setStale(true);
      }
    } finally {
      submitting.current = false;
    }
  };
  const busy = decision.isPending;
  const previews = snapshot ? snapshot.kind === "single" ? [snapshot.preview] : snapshot.preview.proposals : [];
  const affected = [...new Set(previews.flatMap((p) => p.affectedRequirementIds))];
  const approvable = snapshot?.kind === "single" ? snapshot.preview.canApprove && snapshot.preview.proposal.status === "pending" : previews.some((p) => p.canApprove && p.proposal.status === "pending");
  const title = snapshot?.kind === "single" ? snapshot.preview.proposal.title : identity.proposalId ? "Review proposal changes" : "Review all pending proposals";
  const close = () => { if (!submitting.current) onClose(); };
  return (
    <Dialog wide title={title} onClose={close} footer={
      <div className="proposal-review__actions">
        {result ? <button className="btn" onClick={close}>Done</button> : <>
          <button className="btn" onClick={close} disabled={busy}>Cancel</button>
          {snapshot?.kind === "single" && canDecide && snapshot.preview.proposal.status === "pending" && <button className="btn" disabled={busy || loading} onClick={() => void act("rejected")}>Reject proposal</button>}
          {canDecide && approvable && <button className="btn btn--agent" disabled={busy || loading || stale} onClick={() => void act("approved")}>
            {busy ? "Saving decision…" : snapshot?.kind === "batch" ? `Approve reviewed ${previews.length}` : "Approve and apply"}
          </button>}
        </>}
      </div>
    }>
      <div className="proposal-review" aria-busy={loading || busy}>
        {loading && <p role="status">Loading the current changes and supporting sources…</p>}
        {error && <div className="toast toast--error" role="alert"><p>{error}</p>{stale && <p>The review is out of date. Refresh the preview and review the changes again before approving.</p>}</div>}
        {!result && !loading && (error || stale) && <button className="btn" disabled={busy} onClick={() => setRefresh((n) => n + 1)}>{snapshot ? "Refresh preview" : "Retry loading review"}</button>}
        {result && <div className="proposal-result" role="status">
          {result.kind === "single" ? <>
            <h3>{result.proposal.status === "applied" ? "Proposal applied" : result.proposal.status === "rejected" ? "Proposal rejected" : "Proposal was not applied"}</h3>
            {result.proposal.status === "failed" && <p>{result.proposal.rationale.split("Apply failed:")[1]?.trim() || "The server could not apply this proposal. Review the run before trying another decision."}</p>}
          </> : <>
            <h3>{result.result.applied} applied · {result.result.failed} failed · {result.result.skipped} skipped</h3>
            <p>{result.result.total} reviewed proposals processed. Failed or skipped changes were not applied.</p>
            <ul className="proposal-values">{result.result.results.map((item) => <li key={item.proposalId}><strong>{previews.find((p) => p.proposal.id === item.proposalId)?.proposal.title ?? item.proposalId}</strong>: {item.status}{item.message ? ` — ${item.message}` : ""}</li>)}</ul>
          </>}
        </div>}
        {snapshot?.kind === "batch" && <section className="proposal-batch-summary" aria-label="Batch review summary">
          <h3>{previews.length} proposals · {previews.reduce((count, p) => count + p.changes.length, 0)} changes · {affected.length} affected requirements</h3>
          <p>This review contains a fixed set of proposals. New arrivals are excluded. Any changes to this reviewed set require a fresh review.</p>
          <div className="row row--wrap proposal-review__tags">{affected.map((id) => <CodeTag key={id} id={id} />)}</div>
          {!previews.length && <p>No pending proposals remain in this run.</p>}
          {snapshot.preview.conflicts.length > 0 && <div className="proposal-review__limitations"><h4>Conflicting changes will be skipped</h4><ul className="proposal-values">{snapshot.preview.conflicts.map((conflict, i) => <li key={i}>{conflict.reason}</li>)}</ul></div>}
        </section>}
        {previews.map((preview) => <article className="proposal-review__item" key={preview.proposal.id}>
          {snapshot?.kind === "batch" && <h3>{preview.proposal.title}</h3>}
          <PreviewContent preview={preview} />
        </article>)}
        {snapshot && !canDecide && <p className="muted">An approver, admin or owner can decide these proposals.</p>}
        {snapshot && canDecide && !approvable && !result && <p className="muted">No changes in this review can currently be approved.</p>}
        {snapshot && <details className="proposal-review__technical"><summary>Review details</summary><dl className="proposal-fields"><div><dt>Workspace revision</dt><dd>{snapshot.preview.workspaceRevision}</dd></div><div><dt>Review token</dt><dd className="mono">{snapshot.preview.reviewToken}</dd></div><div><dt>Proposal IDs</dt><dd className="mono">{previews.map((p) => p.proposal.id).join(", ")}</dd></div></dl></details>}
      </div>
    </Dialog>
  );
}

export function ReviewAllProposals({ runId, count }: { runId: string; count: number }) {
  const ws = useWorkspaceId();
  const [open, setOpen] = useState(false);
  return <>
    {count > 1 && <button className="btn btn--agent btn--sm" onClick={() => setOpen(true)}><CheckCheck size={13} /> Review all {count}</button>}
    {open && <ProposalReviewDialog key={`${ws}:${runId}`} target={{ workspaceId: ws, runId }} onClose={() => setOpen(false)} />}
  </>;
}

export function ProposalCard({ proposal, compact }: { proposal: Proposal; compact?: boolean }) {
  const ws = useWorkspaceId();
  const [open, setOpen] = useState(false);
  const rejecting = useRef(false);
  const canDecide = useCan("work.approve");
  const decide = useWsMutation(ws, (target: { workspaceId: string; proposalId: string }) => api.post<Proposal>(`/workspaces/${encodeURIComponent(target.workspaceId)}/proposals/${encodeURIComponent(target.proposalId)}/decision`, { decision: "rejected" }));
  const reject = async () => {
    if (rejecting.current) return;
    rejecting.current = true;
    try {
      const result = await decide.mutateAsync({ workspaceId: ws, proposalId: proposal.id });
      toast(result.status === "rejected" ? "Proposal rejected" : `Proposal is ${result.status}`);
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not reject the proposal", "error");
    } finally { rejecting.current = false; }
  };
  const pending = proposal.status === "pending";
  return (
    <article className="panel panel--raised proposal-card" data-proposal-id={proposal.id}>
      <div className="proposal-card__main">
        <div className="row row--wrap proposal-review__tags">
          <AgentBadge label={TYPE_LABEL[proposal.type] ?? proposal.type} />
          {!pending && <span className={`proposal-card__status proposal-card__status--${proposal.status}`}>{proposal.status}{proposal.decidedBy ? ` by ${proposal.decidedBy}` : ""}</span>}
        </div>
        <h3>{proposal.title}</h3>
        {!compact && <p className="muted">{truncate(proposal.rationale, 240)}</p>}
        <div className="row row--wrap proposal-review__tags">{proposal.nodeIds.slice(0, compact ? 4 : 8).map((id) => <CodeTag key={id} id={id} />)}{proposal.nodeIds.length > (compact ? 4 : 8) && <span className="muted">+{proposal.nodeIds.length - (compact ? 4 : 8)}</span>}</div>
        <p className="muted proposal-confidence">Agent-reported confidence: {proposal.confidence}</p>
      </div>
      <div className="proposal-card__actions">
        <button className="btn btn--sm" disabled={decide.isPending} onClick={() => setOpen(true)}><Eye size={13} /> Review changes</button>
        {pending && !canDecide && <span className="muted">Awaiting an approver</span>}
        {pending && canDecide && <button className="btn btn--quiet btn--sm" disabled={decide.isPending} onClick={() => void reject()}><X size={13} /> Reject</button>}
      </div>
      {open && <ProposalReviewDialog key={`${ws}:${proposal.id}`} target={{ workspaceId: ws, proposalId: proposal.id, expectedRunId: proposal.runId }} onClose={() => setOpen(false)} />}
    </article>
  );
}
