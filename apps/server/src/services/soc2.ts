/**
 * SOC 2 system description support (AICPA DC 200). Visua drafts only facts it
 * can derive from the workspace record — scope, exclusions with their
 * rationale, controls and evidence on file, changes during the period — and
 * marks everything else as needing management's input. It never writes the
 * description for management.
 */
import { isEvidenceValid, type Workspace } from "@visua/core";
import { TSC_ID } from "@visua/frameworks";
import { NotFoundError, type VisuaService } from "./visua.ts";

export type DescriptionStatus = "drafted" | "needs-input" | "not-applicable";

export async function soc2Description(svc: VisuaService, ws: Workspace) {
  const settings = svc.frameworkSettings(ws, TSC_ID)?.soc2;
  const index = svc.registry.framework(TSC_ID);
  if (!settings || !index) throw new NotFoundError("SOC 2 is not enabled for this workspace");
  const [states, tasks, allEvidence, allPolicies, connectors, risks, activity] = await Promise.all([
    svc.store.states.list(ws.id, TSC_ID),
    svc.store.tasks.list(ws.id),
    svc.store.evidence.list(ws.id),
    svc.store.policies.list(ws.id),
    svc.store.connectors.list(ws.id),
    svc.store.risks.list(ws.id),
    svc.store.activity.list(ws.id),
  ]);
  const evidence = allEvidence.filter((e) => isEvidenceValid(e));
  const policies = allPolicies.filter((p) => p.status === "approved" || p.status === "published");
  const inCategories = index.assessable.filter((n) => settings.categories.includes(String(n.attributes?.["category"]) as never));
  const applicable = inCategories.filter((n) => states.find((s) => s.nodeId === n.id)?.applicable !== false);
  const excluded = inCategories
    .map((n) => ({ n, s: states.find((s) => s.nodeId === n.id) }))
    .filter((x) => x.s && !x.s.applicable && x.s.userExclusion);
  const withTasks = applicable.filter((n) => tasks.some((t) => t.requirementIds.includes(n.id))).length;
  const withEvidence = applicable.filter((n) => evidence.some((e) => e.requirementIds.includes(n.id))).length;
  const start = settings.observationStart ? new Date(settings.observationStart).getTime() : 0;
  const end = settings.observationEnd ? new Date(settings.observationEnd).getTime() : Date.now();
  const changes = activity
    .filter((a) => {
      const t = new Date(a.at).getTime();
      return t >= start && t <= end && ["framework", "policy", "connector"].includes(a.entity) && a.actor !== "system";
    });

  const derive = (id: string): { status: DescriptionStatus; facts: string[] } => {
    switch (id) {
      case "DC1":
        return ws.description?.trim() ? { status: "drafted", facts: [`Workspace description: ${ws.description.trim()}`] } : { status: "needs-input", facts: [] };
      case "DC2":
        return policies.length
          ? { status: "needs-input", facts: [`${policies.length} approved polic${policies.length === 1 ? "y" : "ies"} state system requirements: ${policies.map((p) => p.title).slice(0, 6).join("; ")}`, "Service commitments made to customers (contracts, SLAs, public statements) must be added by management."] }
          : { status: "needs-input", facts: [] };
      case "DC3": {
        const facts = [
          connectors.length ? `Monitored components: ${connectors.map((c) => c.name).join("; ")}` : "",
          `People: security team of ${ws.profile.securityTeamSize}; owners assigned on ${states.filter((s) => s.owner).length} criteria`,
          policies.length ? `Procedures: ${policies.length} approved policies` : "",
          ws.profile.dataTypes.length ? `Data: ${ws.profile.dataTypes.join(", ")}` : "",
          `Environments: ${ws.profile.environments.join(", ")}`,
        ].filter(Boolean);
        return { status: "drafted", facts };
      }
      case "DC4": {
        const serious = risks.filter((r) => r.status !== "closed" && r.likelihood * r.impact >= 15);
        return { status: "needs-input", facts: serious.length ? serious.map((r) => `Open high risk (not necessarily an incident): ${r.title}`) : ["Visua has no incident register — management must confirm whether any system incidents occurred."] };
      }
      case "DC5":
        return {
          status: "drafted",
          facts: [
            `${applicable.length} applicable criteria across ${settings.categories.join(", ")}`,
            `${withTasks} have implementation work items; ${withEvidence} have accepted, current evidence`,
            ...(policies.length ? [`Related policies: ${policies.map((p) => p.title).slice(0, 5).join("; ")}`] : []),
          ],
        };
      case "DC6":
        return { status: "needs-input", facts: [] };
      case "DC7":
        return { status: "needs-input", facts: [] };
      case "DC8":
        return {
          status: "drafted",
          facts: excluded.length ? excluded.map((x) => `${x.n.code} not relevant — ${x.s!.userExclusion!.rationale}`) : ["No applicable criterion has been marked not relevant."],
        };
      case "DC9":
        if (settings.reportType !== "type2") return { status: "not-applicable", facts: ["Type 1 reports describe the system as of a date."] };
        return { status: "drafted", facts: changes.length ? changes.slice(0, 8).map((a) => `${a.at.slice(0, 10)} — ${a.summary}`) : ["No framework, policy or monitoring changes recorded during the period."] };
      default:
        return { status: "needs-input", facts: [] };
    }
  };

  const doc = svc.registry.documents.get("dc200-2018-rev-ig-2022");
  return {
    source: { documentId: "dc200-2018-rev-ig-2022", title: doc?.title ?? "AICPA DC 200 — 2018 Description Criteria for a Description of a Service Organization's System in a SOC 2 Report (revised implementation guidance, 2022)", path: doc?.path },
    items: svc.registry.descriptionCriteria.map((d) => ({ ...d, derived: derive(d.id) })),
  };
}
