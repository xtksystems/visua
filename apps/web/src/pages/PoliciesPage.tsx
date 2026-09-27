/** Policies: versioned lifecycle (draft → in review → approved → published), agent drafting. */
import { ArrowLeft, CheckCircle2, Edit3, FileText, Send, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useRunAgent } from "../components/inspector/Inspector.tsx";
import { AgentBadge, CodeTag, Dialog, Empty, toast } from "../components/ui/index.tsx";
import { api } from "../lib/api.ts";
import { useCan } from "../lib/auth.ts";
import { relativeTime } from "../lib/format.ts";
import { Markdown } from "../lib/markdown.tsx";
import { useGraph, usePolicies, useWorkspace, useWsMutation } from "../lib/queries.ts";
import type { Policy } from "../lib/types.ts";

const STATUS_COLOR: Record<Policy["status"], string> = {
  draft: "var(--color-on-surface-muted)",
  "in-review": "var(--color-tertiary)",
  approved: "var(--color-status-implemented)",
  published: "var(--color-status-verified)",
  retired: "var(--color-status-not-applicable)",
};

function DraftDialog({ onClose }: { onClose: () => void }) {
  const { ws = "" } = useParams();
  const workspace = useWorkspace(ws);
  const fw = workspace.data?.frameworks[0]?.id ?? "nist-csf-2.0";
  const graph = useGraph(fw);
  const run = useRunAgent();
  const groups = (graph.data?.nodes ?? []).filter((n) => !n.assessable && n.depth === 1);
  const [pick, setPick] = useState<string>("");
  useEffect(() => {
    if (!pick && groups[0]) setPick(groups[0].id);
  }, [groups, pick]);
  return (
    <Dialog
      title="Draft a policy with the Policy Author"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--agent" disabled={!pick} onClick={() => (run("policy-author", "Draft the policy that governs the selected category", { nodeIds: [pick], framework: fw }), onClose())}>
            <Sparkles size={14} /> Draft policy
          </button>
        </>
      }
    >
      <div className="field">
        <label>Which area should the policy govern?</label>
        <select className="select" value={pick} onChange={(e) => setPick(e.target.value)}>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.code} — {g.title}
            </option>
          ))}
        </select>
        <span className="field__hint">The draft is composed from the official outcomes and implementation examples, tailored to your organization, with a requirements mapping across frameworks. You review and approve it.</span>
      </div>
    </Dialog>
  );
}

export function PoliciesPage() {
  const { ws = "" } = useParams();
  const { data: policies = [] } = usePolicies(ws);
  const [selected, setSelected] = useState<string | null>(null);
  // Narrow screens show the list until a policy is opened (desktop shows both panes).
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [drafting, setDrafting] = useState(false);
  const policy = policies.find((p) => p.id === selected) ?? policies[0];
  const update = useWsMutation(ws, (patch: Partial<Policy>) => api.patch<Policy>(`/workspaces/${encodeURIComponent(ws)}/policies/${policy!.id}`, patch));
  useEffect(() => {
    setEditing(false);
  }, [policy?.id]);
  const canApprove = useCan("work.approve");
  const act = (patch: Partial<Policy>, msg: string) => update.mutate(patch, { onSuccess: () => toast(msg), onError: (e) => toast((e as Error).message, "error") });
  return (
    <div className="page master-detail" data-pane={opened ? "detail" : "list"} style={{ ["--master" as string]: "380px" }}>
      <aside className="stack master-detail__master">
        <div className="row">
          <h1 style={{ fontFamily: "var(--font-headline-lg-family)", fontSize: 24, fontWeight: 600, flex: 1 }}>Policies</h1>
          <button className="btn btn--agent btn--sm" onClick={() => setDrafting(true)}>
            <Sparkles size={13} /> Draft
          </button>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>
          Approved policies automatically become evidence for the requirements they govern, valid until their next review date.
        </p>
        {policies.map((p) => (
          <button key={p.id} className={`runrow ${policy?.id === p.id ? "is-selected" : ""}`} onClick={() => (setSelected(p.id), setOpened(true))}>
            <div className="row" style={{ gap: 8 }}>
              <FileText size={14} />
              <strong style={{ flex: 1 }}>{p.title}</strong>
              <span className="mono" style={{ fontSize: 11, color: STATUS_COLOR[p.status] }}>
                {p.status}
              </span>
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              v{p.version} · {p.requirementIds.length} requirement(s) · updated {relativeTime(p.updatedAt)} {p.origin === "agent" ? "· " : ""}
              {p.origin === "agent" ? <AgentBadge label="drafted by agent" /> : null}
            </div>
          </button>
        ))}
        {!policies.length && <Empty title="No policies yet">Ask the Policy Author to draft your first one.</Empty>}
      </aside>
      <section className="master-detail__detail">
        <button className="btn btn--quiet btn--sm master-detail__back" onClick={() => setOpened(false)}>
          <ArrowLeft size={14} aria-hidden /> All policies
        </button>
        {policy ? (
          <div className="stack" style={{ gap: 16, maxWidth: 900 }}>
            <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div className="eyebrow">
                  Version {policy.version} · <span style={{ color: STATUS_COLOR[policy.status] }}>{policy.status}</span>
                  {policy.approvedBy ? ` · approved by ${policy.approvedBy} ${relativeTime(policy.approvedAt)}` : ""}
                </div>
                <h2 style={{ fontFamily: "var(--font-headline-lg-family)", fontSize: 26, fontWeight: 600, marginTop: 6 }}>{policy.title}</h2>
              </div>
              {!editing && (
                <button
                  className="btn"
                  onClick={() => {
                    setDraft(policy.body);
                    setEditing(true);
                  }}
                >
                  <Edit3 size={14} /> Edit
                </button>
              )}
              {policy.status === "draft" && (
                <button className="btn" onClick={() => act({ status: "in-review" }, "Submitted for review")}>
                  <Send size={14} /> Submit for review
                </button>
              )}
              {(policy.status === "draft" || policy.status === "in-review") && canApprove && (
                <button className="btn btn--primary" onClick={() => act({ status: "approved" }, "Policy approved — recorded as evidence for its requirements")}>
                  <CheckCircle2 size={14} /> Approve
                </button>
              )}
              {policy.status === "approved" && canApprove && (
                <button className="btn btn--primary" onClick={() => act({ status: "published" }, "Policy published")}>
                  Publish
                </button>
              )}
            </div>
            <div className="row row--wrap" style={{ gap: 4 }}>
              {policy.requirementIds.map((id) => (
                <CodeTag key={id} id={id} />
              ))}
            </div>
            {editing ? (
              <div className="stack" style={{ gap: 8 }}>
                <textarea className="textarea mono" style={{ minHeight: "55vh", fontSize: 13 }} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Policy body (Markdown)" />
                <div className="row" style={{ justifyContent: "flex-end" }}>
                  <button className="btn" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                  <button
                    className="btn btn--primary"
                    onClick={() =>
                      update.mutate(
                        { body: draft },
                        {
                          onSuccess: (p) => {
                            setEditing(false);
                            toast(p.version > policy.version ? `Saved as v${p.version} — re-approval required` : "Saved");
                          },
                        },
                      )
                    }
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="panel">
                <Markdown text={policy.body} />
              </div>
            )}
          </div>
        ) : (
          <Empty title="Select a policy" />
        )}
      </section>
      {drafting && <DraftDialog onClose={() => setDrafting(false)} />}
    </div>
  );
}
