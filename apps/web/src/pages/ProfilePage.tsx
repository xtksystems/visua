/** CSF profile: comparable levels, scoped requirement detail, and a separate tier assessment. */
import { PRIORITY_WEIGHT } from "@visua/core";
import { useQueryClient } from "@tanstack/react-query";
import { Download, ExternalLink } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CodeTag, StatusBar, StatusChip, StatusLegend, TabPanel, Tabs, toast } from "../components/ui/index.tsx";
import { useWorkspaceId } from "../lib/workspace.ts";
import { useCan } from "../lib/auth.ts";
import { api, corpusFileUrl, exportUrl } from "../lib/api.ts";
import { keys, useFrameworkState, useGraph, useMeta, useWorkspace, useWsMutation } from "../lib/queries.ts";
import { profileCategories, readProfileQuery, sortProfileCategories, writeProfileQuery, type ProfileCategory, type ProfileSort } from "../lib/profile.ts";
import type { Meta, WorkspaceSummary } from "../lib/types.ts";
import "./profile.css";

const FW = "nist-csf-2.0";
const level = (value: number | null) => value === null ? "—" : value.toFixed(1);
const position = (value: number) => `${(value / 4) * 100}%`;

function LoadError({ title, error, retry }: { title: string; error: unknown; retry: () => unknown }) {
  return <div className="panel stack" role="alert"><h2>{title}</h2><p>{error instanceof Error ? error.message : "The request failed."}</p><button className="btn" onClick={() => { void retry(); }}>Retry</button></div>;
}

function BulletChart({ rows, selected, onSelect }: { rows: ProfileCategory[]; selected: string | null; onSelect: (id: string) => void }) {
  return (
    <section className="panel profile-chart" aria-label="Category comparison">
      <div className="profile-chart__head">
        <h2>Current vs target profile</h2>
        <p className="muted">Mean implementation level by category, on the same 0–4 scale. Select a category to inspect its requirements.</p>
        <div className="profile-legend" aria-label="Chart legend">
          <span><i className="profile-legend__current" aria-hidden="true" />Current</span>
          <span><i className="profile-legend__target" aria-hidden="true" />Target</span>
          <span><i className="profile-legend__gap" aria-hidden="true" />Gap between means</span>
        </div>
      </div>
      <div className="profile-chart__scroll" role="region" aria-label="Scrollable category comparison" tabIndex={0}>
        <table className="profile-chart__table" aria-label="Current and target profile by category">
          <thead><tr>
            <th scope="col">Category</th>
            <th scope="col" className="profile-chart__scale"><span className="sr-only">Implementation level, 0 to 4</span><span className="profile-axis" aria-hidden="true">{[0, 1, 2, 3, 4].map((tick) => <span key={tick} style={{ left: position(tick) }}>{tick}</span>)}</span></th>
            <th scope="col">Current</th><th scope="col">Target</th><th scope="col">Mean gap</th><th scope="col">Below target</th><th scope="col">In scope</th>
          </tr></thead>
          <tbody>{rows.map((row) => <tr key={row.node.id} data-category-id={row.node.id} className={selected === row.node.id ? "is-selected" : undefined}>
            <th scope="row"><button className="profile-category" aria-label={`View requirements for ${row.node.code}`} aria-pressed={selected === row.node.id} onClick={() => onSelect(row.node.id)}>
              <span><span className="mono">{row.node.code}</span> · {row.node.title}</span>
              <span className="muted profile-category__context">{row.functionNode?.title}{row.unavailable ? ` · ${row.unavailable} assessments unavailable` : !row.requirements.length ? " · No in-scope outcomes" : ""}</span>
            </button></th>
            <td className="profile-chart__scale"><span className="profile-track" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((tick) => <span key={tick} className="profile-track__grid" style={{ left: position(tick) }} />)}
              {row.current !== null && row.target !== null && <>
                {row.target > row.current && <span className="profile-track__gap" style={{ left: position(row.current), width: position(row.target - row.current) }} />}
                <span className="profile-track__bar" style={{ width: position(row.current) }} />
                <span className="profile-track__target" style={{ left: position(row.target) }} />
              </>}
            </span><span className="sr-only">{row.current === null ? "Not scored" : `Current ${level(row.current)}, target ${level(row.target)}, gap ${level(row.gap)}`}</span></td>
            <td>{level(row.current)}</td><td>{level(row.target)}</td><td>{level(row.gap)}</td><td>{row.unavailable ? "—" : row.belowTarget}</td><td>{row.requirements.length}{row.unavailable ? " known" : ""}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="profile-chart__note muted">Means include only current in-scope outcomes. Mean gap is the positive difference between target and current means; individual shortfalls can remain even when the means match. Below target counts those outcomes. An empty or unavailable scope has no level.</p>
    </section>
  );
}

function RequirementDetail({ row, headingRef, onClose }: { row: ProfileCategory; headingRef: React.RefObject<HTMLHeadingElement | null>; onClose: () => void }) {
  return <section className="panel profile-detail" aria-label="Category requirements">
    <div className="row row--wrap"><h2 ref={headingRef} tabIndex={-1}>{row.node.code} · {row.node.title}</h2><span className="spacer" /><button className="btn btn--quiet" onClick={onClose}>Close requirements</button></div>
    <p className="muted">{row.requirements.length} in-scope outcomes · {row.excluded} excluded{row.unavailable ? ` · ${row.unavailable} assessments unavailable` : ""}. Evidence counts accepted artifacts with a current matching review and a valid collection window.</p>
    {row.unavailable > 0 && <p role="note">Some assessment data is unavailable. Category means are withheld until every outcome’s scope is known.</p>}
    {row.requirements.length ? <div className="profile-detail__scroll" role="region" aria-label="Scoped requirement table" tabIndex={0}>
      <table className="profile-detail__table" aria-label="Requirements in selected category"><thead><tr><th scope="col">Requirement</th><th scope="col">Current</th><th scope="col">Target</th><th scope="col">Gap</th><th scope="col">Status</th><th scope="col">Valid evidence</th></tr></thead>
        <tbody>{row.requirements.map(({ node, state }) => <tr key={node.id} data-requirement-id={node.id}>
          <th scope="row"><CodeTag id={node.id} /><span className="profile-requirement-title">{node.title}</span></th><td>{state.current}</td><td>{state.target}</td><td>{Math.max(0, state.target - state.current)}</td><td><StatusChip status={state.status} /></td><td>{state.evidence ? `${state.evidence} accepted ${state.evidence === 1 ? "artifact" : "artifacts"}` : "Missing evidence"}</td>
        </tr>)}</tbody>
      </table>
    </div> : <p>No current in-scope outcomes in this category.</p>}
  </section>;
}

function TierAssessment({ meta, existing, answers, dirty, canWrite, pending, error, onAnswer, onSave }: {
  meta: Meta; existing: WorkspaceSummary["workspace"]["tierAssessment"]; answers: Record<string, number>; dirty: boolean;
  canWrite: boolean; pending: boolean; error: unknown; onAnswer: (id: string, value: number) => void; onSave: () => void;
}) {
  const { dimensions: dims, names } = meta.tiers;
  const complete = dims.length > 0 && dims.every((dimension) => (answers[dimension.id] ?? 0) >= 1 && (answers[dimension.id] ?? 0) <= dimension.statements.length);
  return <div className="panel profile-tiers">
    <div className="panel__head row--wrap"><h2>CSF Tiers self-assessment</h2><span className="spacer" /><a className="muted" href={corpusFileUrl("nist-csf-2.0/core/NIST.CSWP.29.pdf", 29)} target="_blank" rel="noreferrer">NIST CSWP 29, Appendix B, Table 2 <ExternalLink size={12} /></a></div>
    {existing && <div className="grid grid--3 profile-tier-results">{[["Governance", existing.governanceTier], ["Management", existing.managementTier], ["Overall", existing.overallTier]].map(([label, tier]) => <div key={label as string} className="metric"><span className="eyebrow">{label}</span><span className="metric__value">Tier {tier}</span><span className="metric__sub">{names[(tier as number) - 1]}</span></div>)}</div>}
    <p className="muted">Choose the statement that best describes your organization today. The statements are NIST’s notional illustration of the Tiers, quoted verbatim. A Tier is credited only when practices consistently meet it (floor of the mean), and the overall Tier is the lower of governance and management.</p>
    {!canWrite && <p className="muted" role="note">Read-only access. Contributors and above record tier assessments.</p>}
    <div className="stack profile-tier-questions">{dims.map((dimension) => <fieldset disabled={!canWrite || pending} key={dimension.id}>
      <legend>{dimension.question} <span className="eyebrow">{dimension.area}</span></legend>
      <div className="grid grid--4 profile-tier-options">{dimension.statements.map((statement, index) => {
        const checked = answers[dimension.id] === index + 1;
        return <label key={index} className={`profile-tier-option${checked ? " is-selected" : ""}`}>
          <input type="radio" name={dimension.id} className="sr-only" checked={checked} onChange={() => onAnswer(dimension.id, index + 1)} />
          <span className="profile-tier-option__label">Tier {index + 1} · {names[index]}</span>{statement}
        </label>;
      })}</div>
    </fieldset>)}</div>
    {!!error && <p role="alert" className="profile-error">Could not save the assessment. {error instanceof Error ? error.message : "Try again."} Your answers are retained.</p>}
    <div className="row row--wrap profile-tier-actions"><span className="muted">{dims.filter((dimension) => answers[dimension.id]).length}/{dims.length} answered{dirty ? " · Unsaved changes" : ""}</span><span className="spacer" /><button className="btn btn--primary" disabled={!canWrite || !complete || pending} onClick={onSave}>{pending ? "Saving assessment…" : "Save assessment"}</button></div>
  </div>;
}

function ProfileWorkspace({ ws }: { ws: string }) {
  const canExport = useCan("workspace.export");
  const canWrite = useCan("work.write");
  const queryClient = useQueryClient();
  const workspace = useWorkspace(ws);
  const enabled = !!workspace.data?.workspace.frameworks.find((framework) => framework.frameworkId === FW)?.enabled;
  const graph = useGraph(FW);
  const state = useFrameworkState(ws, enabled ? FW : undefined, { refetchInterval: 60_000 });
  const meta = useMeta();
  const [params, setParams] = useSearchParams();
  const { tab, sort, category } = readProfileQuery(params);
  const tabsId = useId();
  const sortId = useId();
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const focusDetail = useRef(false);
  const existing = workspace.data?.workspace.tierAssessment;
  // Tier drafts and the pending save outlive a tab panel, but never a workspace identity.
  const [answers, setAnswers] = useState<Record<string, number>>(() => ({ ...existing?.answers }));
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (!dirty) setAnswers({ ...existing?.answers }); }, [existing, dirty]);
  const save = useWsMutation(ws, () => api.post<WorkspaceSummary>(`/workspaces/${encodeURIComponent(ws)}/tiers`, { answers }));
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const categories = useMemo(() => profileCategories(graph.data?.nodes ?? [], state.data?.units ?? {}, enabled), [graph.data, state.data, enabled]);
  const rows = useMemo(() => sortProfileCategories(categories, sort), [categories, sort]);
  const selected = categories.find((row) => row.node.id === category);
  const update = (patch: Parameters<typeof writeProfileQuery>[1]) => setParams(writeProfileQuery(new URLSearchParams(window.location.search), patch));
  useEffect(() => {
    if (!focusDetail.current || !selected || tab !== "profile") return;
    focusDetail.current = false;
    detailHeading.current?.focus();
    detailHeading.current?.scrollIntoView({ block: "nearest" });
  }, [selected, tab]);
  const failure = workspace.error ?? graph.error ?? (enabled ? state.error : null);
  const pending = !workspace.data || !graph.data || (enabled && !state.data);
  const overall = enabled && !failure ? state.data?.overall : undefined;
  const unknown = categories.reduce((sum, row) => sum + row.unavailable, 0);
  const scopedRequirements = categories.flatMap((row) => row.requirements);
  const denominator = scopedRequirements.reduce((sum, item) => sum + PRIORITY_WEIGHT[item.state.priority], 0);
  const counts = { "not-started": 0, "in-progress": 0, implemented: 0, verified: 0, "at-risk": 0, "not-applicable": 0 };
  for (const { state: requirement } of scopedRequirements) counts[requirement.status]++;
  return <div className="page profile-page">
    <header className="page__header"><div><div className="eyebrow">NIST CSF 2.0</div><h1>Organizational Profile & Tiers</h1><p>Compare your Current Profile with your Target Profile, then inspect the requirements behind each gap. Assess organizational Tiers separately.</p></div>
      <div className="page__actions">{canExport && <><a className="btn" href={exportUrl(ws, "csf-profile.csv")}><Download size={14} /> Organizational Profile (CSV)</a><a className="btn" href={exportUrl(ws, "readiness.md")}><Download size={14} /> Implementation report</a></>}<Link className="btn btn--primary" to={`/w/${encodeURIComponent(ws)}/observatory/${FW}`}>Open in 3D</Link></div>
    </header>
    <Tabs id={tabsId} label="Profile and tiers" tabs={[{ id: "profile", label: "Profile" }, { id: "tiers", label: "Tiers" }]} value={tab} onChange={(value) => update({ tab: value })} />
    <TabPanel groupId={tabsId} id="profile" active={tab === "profile"}>
      {failure ? <LoadError title="Unable to load the CSF profile" error={failure} retry={() => Promise.all([workspace.refetch(), graph.refetch(), ...(enabled ? [state.refetch()] : [])])} /> : pending ? <p role="status">Loading current profile and scope…</p> : <>
        {!enabled && <p className="panel" role="note">NIST CSF 2.0 is not enabled in this workspace. Categories are shown as a guide without assessment levels.</p>}
        {overall && !unknown && <section className="panel profile-summary" aria-label="CSF profile metrics"><div className="profile-summary__values">
          <div><div className="eyebrow">Implementation progress</div><div className="metric__value">{overall.total ? `${Math.round(overall.readiness * 100)}%` : "—"}</div><p className="muted">{overall.total} in-scope outcomes</p></div>
          <div><div className="eyebrow">Mean level</div><div className="profile-summary__mean">{overall.total ? `${overall.current.toFixed(1)} → ${overall.target.toFixed(1)}` : "—"}</div><p className="muted">Current → Target · 0–4</p></div>
          <div className="profile-summary__status"><StatusBar counts={counts} height={10} /><StatusLegend counts={counts} /></div>
        </div><details className="profile-definitions"><summary>How profile metrics are calculated</summary><dl>
          <dt>Implementation progress</dt><dd>For each in-scope outcome, divide current level by target and cap the ratio at 100%. Average using priority weights: critical 4, high 3, medium 2, low 1. The denominator is {denominator} priority-weight units across {overall.total} outcomes. A zero target contributes 100% only when current level is above zero; otherwise it contributes 0%.</dd>
          <dt>Scope and levels</dt><dd>NIST CSF 2.0 only. Disabled, withdrawn, excluded and not-applicable outcomes do not count. Category current and target levels are unweighted means on the 0–4 scale. An empty scope shows no percentage or mean.</dd>
          <dt>Progress and proof</dt><dd>Recorded implementation does not establish evidence coverage. The requirement detail shows accepted evidence with a current matching review, whose collection has started and validity has not expired. Requirement status comes from the current server assessment, including any explicit override.</dd>
          <dt>Updated</dt><dd>{state.data?.asOf ? new Date(state.data.asOf).toLocaleString() : "Observation time unavailable"}. This profile refreshes every minute and after workspace changes.</dd>
        </dl></details></section>}
        {unknown > 0 && <p className="panel" role="note">{unknown} outcome assessments are unavailable. Affected category means and overall metrics are withheld.</p>}
        <div className="profile-controls"><label htmlFor={sortId}>Sort categories</label><select id={sortId} className="select" value={sort} onChange={(event) => update({ sort: event.target.value as ProfileSort })}><option value="function">Function and category</option><option value="gap">Largest mean gap</option><option value="current">Lowest current level</option><option value="target">Highest target level</option></select></div>
        {selected && <RequirementDetail row={selected} headingRef={detailHeading} onClose={() => { update({ category: null }); requestAnimationFrame(() => { if (active.current) document.querySelector<HTMLButtonElement>(`button[aria-label="View requirements for ${selected.node.code}"]`)?.focus(); }); }} />}
        {category && !selected && <div className="panel" role="note"><p>The selected category is not in the CSF profile.</p><button className="btn" onClick={() => update({ category: null })}>Show all categories</button></div>}
        <BulletChart rows={rows} selected={category} onSelect={(id) => { focusDetail.current = true; update({ category: id }); if (category === id) { detailHeading.current?.focus(); detailHeading.current?.scrollIntoView({ block: "nearest" }); focusDetail.current = false; } }} />
      </>}
    </TabPanel>
    <TabPanel groupId={tabsId} id="tiers" active={tab === "tiers"}>
      {workspace.error || meta.error ? <LoadError title="Unable to load the tier assessment" error={workspace.error ?? meta.error} retry={() => Promise.all([workspace.refetch(), meta.refetch()])} /> : !workspace.data || !meta.data ? <p role="status">Loading tier assessment…</p> : <TierAssessment meta={meta.data} existing={existing} answers={answers} dirty={dirty} canWrite={canWrite} pending={save.isPending} error={save.error} onAnswer={(id, value) => { setDirty(true); setAnswers((previous) => ({ ...previous, [id]: value })); }} onSave={() => save.mutate(undefined, { onSuccess: (data) => { if (!active.current) return; queryClient.setQueryData(keys.workspace(ws), data); setAnswers({ ...data.workspace.tierAssessment?.answers }); setDirty(false); toast("Tier assessment recorded in the audit trail"); } })} />}
    </TabPanel>
  </div>;
}

export function ProfilePage() {
  const ws = useWorkspaceId();
  return <ProfileWorkspace key={ws} ws={ws} />;
}
