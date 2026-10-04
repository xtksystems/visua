/** Proposal cards: agents propose, people dispose. */
import { Check, Eye, X } from "lucide-react";
import { useState } from "react";
import { useWorkspaceId } from "../../lib/workspace.ts";
import { api } from "../../lib/api.ts";
import { useCan } from "../../lib/auth.ts";
import { truncate } from "../../lib/format.ts";
import { Markdown } from "../../lib/markdown.tsx";
import { useWsMutation } from "../../lib/queries.ts";
import type { Proposal } from "../../lib/types.ts";
import { AgentBadge, CitationBlock, CodeTag, Dialog, toast } from "../ui/index.tsx";

const TYPE_LABEL: Record<string, string> = {
  "set-level": "Assessment",
  "set-target": "Target",
  "set-applicability": "Scope",
  "create-task": "New task",
  "update-task": "Task update",
  "create-evidence": "Evidence",
  "review-evidence": "Evidence review",
  "create-policy": "Policy draft",
  "create-risk": "Risk",
  "set-rmf": "RMF settings",
};

export function ProposalCard({ proposal, compact }: { proposal: Proposal; compact?: boolean }) {
  const ws = useWorkspaceId();
  const [open, setOpen] = useState(false);
  const canDecide = useCan("work.approve");
  const decide = useWsMutation(ws, (decision: "approved" | "rejected") => api.post<Proposal>(`/workspaces/${encodeURIComponent(ws)}/proposals/${proposal.id}/decision`, { decision }));
  const act = (decision: "approved" | "rejected") =>
    decide.mutate(decision, {
      onSuccess: (p) => toast(p.status === "applied" ? `Applied: ${truncate(p.title, 60)}` : p.status === "rejected" ? "Proposal rejected" : `Could not apply: ${p.rationale.split("Apply failed:")[1] ?? ""}`, p.status === "failed" ? "error" : "info"),
      onError: (e) => toast((e as Error).message, "error"),
    });
  const pending = proposal.status === "pending";
  const body = typeof proposal.payload["body"] === "string" ? (proposal.payload["body"] as string) : undefined;
  const note = typeof proposal.payload["note"] === "string" ? (proposal.payload["note"] as string) : undefined;
  const checklist = Array.isArray(proposal.payload["checklist"]) ? (proposal.payload["checklist"] as string[]) : [];
  return (
    <div className="panel panel--raised" style={{ padding: 12, borderColor: pending ? "var(--color-tertiary-container)" : undefined }}>
      <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            <AgentBadge label={TYPE_LABEL[proposal.type] ?? proposal.type} />
            <span className="muted" style={{ fontSize: 12 }}>
              confidence {proposal.confidence}
            </span>
            {!pending && (
              <span className="mono" style={{ fontSize: 11, color: proposal.status === "applied" ? "var(--color-status-implemented)" : proposal.status === "rejected" ? "var(--color-on-surface-muted)" : "var(--color-status-at-risk)" }}>
                {proposal.status}
                {proposal.decidedBy ? ` by ${proposal.decidedBy}` : ""}
              </span>
            )}
          </div>
          <div style={{ fontWeight: 500, marginTop: 6 }}>{proposal.title}</div>
          {!compact && <div className="muted" style={{ fontSize: 13, marginTop: 4, whiteSpace: "pre-line" }}>{truncate(proposal.rationale, 320)}</div>}
          {proposal.nodeIds.length > 0 && (
            <div className="row row--wrap" style={{ gap: 4, marginTop: 8 }}>
              {proposal.nodeIds.slice(0, compact ? 4 : 12).map((id) => (
                <CodeTag key={id} id={id} />
              ))}
              {proposal.nodeIds.length > (compact ? 4 : 12) ? <span className="muted" style={{ fontSize: 12 }}>+{proposal.nodeIds.length - (compact ? 4 : 12)}</span> : null}
            </div>
          )}
        </div>
        <div className="stack" style={{ gap: 6 }}>
          {(body || note || checklist.length || proposal.citations.length) ? (
            <button className="btn btn--sm" onClick={() => setOpen(true)}>
              <Eye size={13} /> Review
            </button>
          ) : null}
          {pending && !canDecide && (
            <span className="muted" style={{ fontSize: 12 }} title="Approvers, admins and owners decide proposals">
              Awaiting an approver
            </span>
          )}
          {pending && canDecide && (
            <>
              <button className="btn btn--agent btn--sm" onClick={() => act("approved")} disabled={decide.isPending}>
                <Check size={13} /> Approve
              </button>
              <button className="btn btn--quiet btn--sm" onClick={() => act("rejected")} disabled={decide.isPending}>
                <X size={13} /> Reject
              </button>
            </>
          )}
        </div>
      </div>
      {open && (
        <Dialog
          wide
          title={proposal.title}
          onClose={() => setOpen(false)}
          footer={
            pending && canDecide ? (
              <>
                <button className="btn" onClick={() => (act("rejected"), setOpen(false))}>
                  Reject
                </button>
                <button className="btn btn--agent" onClick={() => (act("approved"), setOpen(false))}>
                  Approve and apply
                </button>
              </>
            ) : undefined
          }
        >
          <div className="stack" style={{ gap: 12 }}>
            <div className="muted" style={{ whiteSpace: "pre-line" }}>{proposal.rationale}</div>
            {checklist.length > 0 && (
              <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
                {checklist.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ol>
            )}
            {proposal.citations.map((c, i) => (
              <CitationBlock key={i} citation={c} />
            ))}
            {body && (
              <div className="panel" style={{ maxHeight: "50vh", overflow: "auto" }}>
                <Markdown text={body} />
              </div>
            )}
            {note && note.length > 80 && (
              <div className="panel" style={{ maxHeight: "50vh", overflow: "auto" }}>
                <Markdown text={note} />
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
