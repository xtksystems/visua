/**
 * AI governance view for the NIST AI RMF: the AI system inventory, readiness per
 * function (GOVERN, MAP, MEASURE, MANAGE) and — when any inventoried system is
 * generative — coverage of the NIST AI 600-1 Generative AI Profile risks through
 * the AI RMF outcomes its actions attach to.
 */
import { groupStatus, type ProfileAction, type Status, type Workspace } from "@visua/core";
import { NotFoundError, type VisuaService } from "./visua.ts";

export const AI_RMF = "nist-ai-rmf";

export async function aiOverview(svc: VisuaService, ws: Workspace) {
  const index = svc.registry.framework(AI_RMF);
  if (!index) throw new NotFoundError("The NIST AI RMF is not ingested — run `pnpm ingest`");
  const settings = svc.frameworkSettings(ws, AI_RMF);
  const enabled = !!settings?.enabled;
  const systems = settings?.ai?.systems ?? [];
  const [score, states] = enabled ? await Promise.all([svc.score(ws.id, AI_RMF), svc.store.states.map(ws.id, AI_RMF)]) : [null, new Map()];

  const functions = index.roots().map((f) => {
    const s = score?.scores.get(f.id);
    return {
      id: f.id,
      code: f.code,
      title: f.title,
      text: f.text,
      readiness: s?.readiness ?? 0,
      gaps: s?.gaps ?? 0,
      total: s?.total ?? index.assessableUnder(f.id).length,
      counts: s?.counts,
      status: s ? groupStatus(s) : ("not-started" as Status),
    };
  });

  const generativeSystems = systems.filter((s) => s.generative && s.lifecycle !== "retired");
  const profile = index.graph.profiles?.find((p) => p.appliesWhen === "generative");
  const risks = (profile?.risks ?? []).map((risk) => {
    const nodes = index.assessable.filter((n) => ((n.attributes?.["profileActions"] as ProfileAction[] | undefined) ?? []).some((a) => a.profileId === profile!.id && a.risks.includes(risk.id)));
    const actions = nodes.reduce((sum, n) => sum + ((n.attributes?.["profileActions"] as ProfileAction[]) ?? []).filter((a) => a.profileId === profile!.id && a.risks.includes(risk.id)).length, 0);
    let weighted = 0;
    let gaps = 0;
    for (const n of nodes) {
      const st = states.get(n.id);
      if (!st || !st.applicable) continue;
      weighted += st.target > 0 ? Math.min(st.current / st.target, 1) : 0;
      if (st.target > st.current) gaps++;
    }
    return {
      id: risk.id,
      title: risk.title,
      description: risk.description,
      citation: risk.citation,
      actions,
      outcomes: nodes.map((n) => n.id),
      readiness: nodes.length ? weighted / nodes.length : 0,
      gaps,
    };
  });

  return {
    enabled,
    framework: index.graph.framework,
    readiness: score?.overall.readiness ?? 0,
    gaps: score?.overall.gaps ?? 0,
    total: score?.overall.total ?? index.assessable.length,
    systems,
    functions,
    genAi: profile
      ? { profileId: profile.id, title: profile.title, documentId: profile.documentId, active: generativeSystems.length > 0, generativeSystems: generativeSystems.map((s) => s.name), risks }
      : null,
  };
}
