/**
 * Agent runtime entry point: resolves the mode (Claude or offline), builds
 * the workspace context for the model, and runs the agent against a host.
 */
import { levelLabel } from "@visua/core";
import { AGENTS } from "./agents.ts";
import { claudeEnabled, runWithClaude } from "./claude.ts";
import type { AgentHost, AgentRequest, AgentResult } from "./host.ts";
import { runOffline } from "./offline.ts";

/** Compact, deterministic workspace context for the first user turn. */
export function workspaceContext(host: AgentHost, request: AgentRequest): string {
  const ws = host.workspace();
  const p = ws.profile;
  const lines = [
    `<workspace name="${ws.name}">`,
    `Industry: ${p.industry}; size: ${p.size}; security team: ${p.securityTeamSize}; environments: ${p.environments.join(", ")}.`,
    `Data: ${p.dataTypes.join(", ") || "none declared"}; drivers: ${p.drivers.join(", ") || "none declared"}; CSF tier (self-assessed): ${p.maturityTier}; guidance mode: ${p.guidance}.`,
  ];
  for (const f of ws.frameworks.filter((x) => x.enabled)) {
    const index = host.registry.framework(f.frameworkId);
    if (!index) continue;
    const score = host.score(f.frameworkId);
    const fam = index.graph.framework.family;
    lines.push(
      `Framework ${index.graph.framework.shortName} (${f.frameworkId}): readiness ${Math.round(score.overall.readiness * 100)}%, ` +
        `${score.overall.gaps} gaps, evidence coverage ${Math.round(score.overall.evidenceCoverage * 100)}%, default target ${levelLabel(fam, f.defaultTarget)}.`,
    );
  }
  lines.push("</workspace>");
  const input = Object.entries(request.input).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (input.length) lines.push(`<run_input>${JSON.stringify(Object.fromEntries(input))}</run_input>`);
  if (typeof request.input["taskId"] === "string") {
    const task = host.tasks().find((t) => t.id === request.input["taskId"]);
    if (task) {
      lines.push(
        `<task id="${task.id}" status="${task.status}" kind="${task.kind}">${task.title}\n${task.description}\nChecklist:\n` +
          task.checklist.map((c) => `- [${c.done ? "x" : " "}] (${c.id}) ${c.text}`).join("\n") +
          `\nRequirements: ${task.requirementIds.join(", ")}</task>`,
      );
    }
  }
  return lines.join("\n");
}

export async function executeAgent(host: AgentHost, request: AgentRequest): Promise<AgentResult> {
  const def = AGENTS[request.agent];
  if (!def) throw new Error(`Unknown agent '${request.agent}'`);
  if (claudeEnabled()) {
    return runWithClaude(host, def, workspaceContext(host, request), request.goal);
  }
  return runOffline(host, request.agent, request.goal, request.input);
}
