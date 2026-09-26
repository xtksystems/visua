/**
 * U.S. state AI laws view: jurisdictions → laws with their status, dates,
 * enforcement and safe harbors, the roles each law defines, what the
 * workspace said applies, and progress on the obligations in scope.
 */
import { groupStatus, type Status, type Workspace } from "@visua/core";
import { STATE_LAWS_ID } from "@visua/frameworks";
import { NotFoundError, type VisuaService } from "./visua.ts";

const norm = (role: string) => role.trim().toLowerCase().replace(/\s+/g, "-");

export async function lawsOverview(svc: VisuaService, ws: Workspace) {
  const index = svc.registry.framework(STATE_LAWS_ID);
  if (!index) throw new NotFoundError("U.S. state AI laws are not ingested — run `pnpm ingest`");
  const settings = svc.frameworkSettings(ws, STATE_LAWS_ID);
  const enabled = !!settings?.enabled;
  const [score, states] = enabled ? await Promise.all([svc.score(ws.id, STATE_LAWS_ID), svc.store.states.map(ws.id, STATE_LAWS_ID)]) : [null, new Map()];
  const today = new Date().toISOString().slice(0, 10);
  const timeline: { date: string; lawCode: string; lawId: string; label: string; obligations: number; past: boolean }[] = [];

  const jurisdictions = index.roots().map((j) => ({
    id: j.id,
    code: j.code,
    name: j.title,
    laws: index.childrenOf(j.id).map((l) => {
      const a = (l.attributes ?? {}) as Record<string, unknown>;
      const lawId = String(a["lawId"]);
      const obligations = index.childrenOf(l.id);
      const appliesTo = (a["appliesTo"] as { role: string; condition: string }[] | undefined) ?? [];
      const roleCounts = new Map<string, number>();
      for (const o of obligations) for (const r of (o.attributes?.["roles"] as string[] | undefined) ?? []) roleCounts.set(r, (roleCounts.get(r) ?? 0) + 1);
      for (const x of appliesTo) if (!roleCounts.has(norm(x.role))) roleCounts.set(norm(x.role), 0);
      // A role can have several definitions (California's "platform": large online platforms and GenAI hosting platforms).
      const roles = [...roleCounts.entries()].map(([role, count]) => ({
        role,
        obligations: count,
        definition: appliesTo.filter((x) => norm(x.role) === role).map((x) => x.condition).join("\n\n") || undefined,
      }));
      const s = score?.scores.get(l.id);
      const byDate = new Map<string, number>();
      for (const o of obligations) {
        const d = (o.attributes?.["effective"] as string | undefined) ?? (a["effective"] as string | undefined);
        if (d) byDate.set(d, (byDate.get(d) ?? 0) + 1);
      }
      for (const [date, n] of byDate) timeline.push({ date, lawCode: l.code, lawId, label: l.title, obligations: n, past: date <= today });
      const applicability = settings?.law?.applicability[lawId] ?? null;
      const inScope = obligations.filter((o) => states.get(o.id)?.applicable);
      return {
        id: l.id,
        lawId,
        code: l.code,
        title: l.title,
        citation: l.citation,
        summary: l.text,
        status: a["status"] as string,
        statusNote: a["statusNote"] as string | undefined,
        enacted: a["enacted"] as string | undefined,
        effective: a["effective"] as string | undefined,
        sunset: a["sunset"] as string | undefined,
        enforcement: a["enforcement"] as Record<string, unknown> | undefined,
        safeHarbors: (a["safeHarbors"] as { text: string; section: string; references?: string[]; note?: string }[] | undefined) ?? [],
        roles,
        applicability,
        obligations: obligations.length,
        inScope: inScope.length,
        readiness: s && s.total ? s.readiness : 0,
        gaps: s?.gaps ?? 0,
        counts: s?.counts,
        status_: (s ? groupStatus(s) : null) as Status | null,
        upcoming: [...byDate.keys()].filter((d) => d > today).sort()[0] ?? null,
      };
    }),
  }));
  timeline.sort((x, y) => x.date.localeCompare(y.date) || x.lawCode.localeCompare(y.lawCode));
  return {
    enabled,
    framework: index.graph.framework,
    readiness: score?.overall.readiness ?? 0,
    gaps: score?.overall.gaps ?? 0,
    total: score?.overall.total ?? 0,
    obligations: index.assessable.length,
    laws: jurisdictions.reduce((n, j) => n + j.laws.length, 0),
    jurisdictions,
    timeline,
    today,
  };
}
