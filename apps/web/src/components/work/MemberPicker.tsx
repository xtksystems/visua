import { useWorkspaceMembers } from "../../lib/queries.ts";
import { useWorkspaceId } from "../../lib/workspace.ts";

export type MemberAssignment = { type: "person" | "agent" | "external"; id: string; name: string };

/** Explicit member identity, with a compatible path for external owner labels. */
export function MemberPicker({ label, value, onChange, disabled, externalLabel = "External owner" }: {
  label: string;
  value: MemberAssignment | undefined;
  onChange: (next: MemberAssignment | undefined) => void;
  disabled?: boolean;
  externalLabel?: string;
}) {
  const members = useWorkspaceMembers(useWorkspaceId());
  const current = value?.type === "person" && members.data?.some((m) => m.id === value.id);
  const retained = value && value.type !== "external" && !current;
  const selected = !value ? "" : value.type === "external" ? "external" : current ? `member:${value.id}` : "retained";
  return (
    <div className="stack" style={{ gap: 6, minWidth: 0 }}>
      <label className="field">
        <span className="label">{label}</span>
        <select className="select" aria-label={label} value={selected} disabled={disabled || members.isLoading || !!members.error} onChange={(event) => {
          const key = event.target.value;
          if (!key) onChange(undefined);
          else if (key === "external") onChange({ type: "external", id: "external", name: "" });
          else {
            const member = members.data?.find((m) => `member:${m.id}` === key);
            if (member) onChange({ type: "person", id: member.id, name: member.name });
          }
        }}>
          <option value="">Unassigned</option>
          {(members.data ?? []).map((member) => <option key={member.id} value={`member:${member.id}`}>{member.name}</option>)}
          <option value="external">External owner</option>
          {retained && <option value="retained">{value.name} ({value.type === "agent" ? "agent" : "legacy or former member"})</option>}
        </select>
      </label>
      {(!value || value.type === "external") && <label className="field">
        <span className="label">{externalLabel}</span>
        <input className="input" value={value?.name ?? ""} disabled={disabled} maxLength={200} placeholder="Unassigned" onChange={(event) => onChange(event.target.value ? { type: "external", id: "external", name: event.target.value } : undefined)} />
      </label>}
      {members.isLoading && <span className="muted">Loading members…</span>}
      {members.error && <div role="alert">Could not load members. <button type="button" className="btn btn--sm" disabled={disabled || members.isFetching} onClick={() => void members.refetch()}>Retry members</button></div>}
    </div>
  );
}
