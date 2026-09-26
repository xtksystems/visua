/** React Query hooks — server state. SSE events invalidate these keys (see events.ts). */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUi } from "../state/ui.ts";
import { api } from "./api.ts";
import { familyOf, frameworkOf } from "./format.ts";
import type {
  ActivityEvent,
  CheckResult,
  Connector,
  Evidence,
  FrameworkStateBundle,
  LeanGraph,
  Meta,
  NodeDetail,
  Policy,
  Proposal,
  Risk,
  RunWithProposals,
  SearchResult,
  Task,
  WorkspaceSummary,
} from "./types.ts";

export const keys = {
  meta: ["meta"] as const,
  workspaces: ["workspaces"] as const,
  workspace: (ws: string) => ["ws", ws] as const,
  graph: (fw: string) => ["graph", fw] as const,
  state: (ws: string, fw: string) => ["ws", ws, "state", fw] as const,
  node: (ws: string, id: string) => ["ws", ws, "node", id] as const,
  tasks: (ws: string) => ["ws", ws, "tasks"] as const,
  evidence: (ws: string) => ["ws", ws, "evidence"] as const,
  policies: (ws: string) => ["ws", ws, "policies"] as const,
  risks: (ws: string) => ["ws", ws, "risks"] as const,
  connectors: (ws: string) => ["ws", ws, "connectors"] as const,
  checks: (ws: string) => ["ws", ws, "checks"] as const,
  runs: (ws: string) => ["ws", ws, "runs"] as const,
  run: (ws: string, id: string) => ["ws", ws, "run", id] as const,
  proposals: (ws: string) => ["ws", ws, "proposals"] as const,
  activity: (ws: string) => ["ws", ws, "activity"] as const,
  audit: (ws: string) => ["ws", ws, "audit"] as const,
  search: (q: string) => ["search", q] as const,
};

const enc = encodeURIComponent;

export const useMeta = () => useQuery({ queryKey: keys.meta, queryFn: () => api.get<Meta>("/meta"), staleTime: Infinity });
export const useWorkspaces = () => useQuery({ queryKey: keys.workspaces, queryFn: () => api.get<WorkspaceSummary[]>("/workspaces") });
export const useWorkspace = (ws: string | undefined) =>
  useQuery({ queryKey: keys.workspace(ws ?? ""), queryFn: () => api.get<WorkspaceSummary>(`/workspaces/${enc(ws!)}`), enabled: !!ws });
export const useGraph = (fw: string | undefined) =>
  useQuery({ queryKey: keys.graph(fw ?? ""), queryFn: () => api.get<LeanGraph>(`/frameworks/${enc(fw!)}`), enabled: !!fw, staleTime: Infinity });
export const useFrameworkState = (ws: string | undefined, fw: string | undefined) => {
  // Threat catalogs carry derived coverage, counted down to the chosen link status.
  const min = useUi((s) => s.threatMin);
  const threat = !!fw && familyOf(fw) === "threat";
  return useQuery({
    queryKey: threat ? [...keys.state(ws ?? "", fw ?? ""), min] : keys.state(ws ?? "", fw ?? ""),
    queryFn: () => api.get<FrameworkStateBundle>(`/workspaces/${enc(ws!)}/frameworks/${enc(fw!)}/state${threat ? `?min=${min}` : ""}`),
    enabled: !!ws && !!fw,
    placeholderData: keepPreviousData,
  });
};
export const useNodeDetail = (ws: string | undefined, id: string | undefined) => {
  const min = useUi((s) => s.threatMin);
  const threat = !!id && familyOf(frameworkOf(id)) === "threat";
  return useQuery({
    queryKey: threat ? [...keys.node(ws ?? "", id ?? ""), min] : keys.node(ws ?? "", id ?? ""),
    queryFn: () => api.get<NodeDetail>(`/workspaces/${enc(ws!)}/requirements/${enc(id!)}${threat ? `?min=${min}` : ""}`),
    enabled: !!ws && !!id,
    // Changing the link filter refetches the same node: keep showing it (and the open tab) meanwhile.
    placeholderData: (prev) => (prev?.node.id === id ? prev : undefined),
  });
};
export const useTasks = (ws: string | undefined) => useQuery({ queryKey: keys.tasks(ws ?? ""), queryFn: () => api.get<Task[]>(`/workspaces/${enc(ws!)}/tasks`), enabled: !!ws });
export const useEvidence = (ws: string | undefined) => useQuery({ queryKey: keys.evidence(ws ?? ""), queryFn: () => api.get<Evidence[]>(`/workspaces/${enc(ws!)}/evidence`), enabled: !!ws });
export const usePolicies = (ws: string | undefined) => useQuery({ queryKey: keys.policies(ws ?? ""), queryFn: () => api.get<Policy[]>(`/workspaces/${enc(ws!)}/policies`), enabled: !!ws });
export const useRisks = (ws: string | undefined) => useQuery({ queryKey: keys.risks(ws ?? ""), queryFn: () => api.get<Risk[]>(`/workspaces/${enc(ws!)}/risks`), enabled: !!ws });
export const useConnectors = (ws: string | undefined) => useQuery({ queryKey: keys.connectors(ws ?? ""), queryFn: () => api.get<Connector[]>(`/workspaces/${enc(ws!)}/connectors`), enabled: !!ws });
export const useChecks = (ws: string | undefined) => useQuery({ queryKey: keys.checks(ws ?? ""), queryFn: () => api.get<CheckResult[]>(`/workspaces/${enc(ws!)}/checks`), enabled: !!ws });
export const useRuns = (ws: string | undefined) => useQuery({ queryKey: keys.runs(ws ?? ""), queryFn: () => api.get<RunWithProposals[]>(`/workspaces/${enc(ws!)}/runs`), enabled: !!ws });
export const useRun = (ws: string | undefined, id: string | undefined) =>
  useQuery({ queryKey: keys.run(ws ?? "", id ?? ""), queryFn: () => api.get<RunWithProposals>(`/workspaces/${enc(ws!)}/runs/${enc(id!)}`), enabled: !!ws && !!id });
export const useProposals = (ws: string | undefined, status?: string) =>
  useQuery({ queryKey: [...keys.proposals(ws ?? ""), status ?? "all"], queryFn: () => api.get<Proposal[]>(`/workspaces/${enc(ws!)}/proposals${status ? `?status=${status}` : ""}`), enabled: !!ws });
export const useActivity = (ws: string | undefined, limit = 100) =>
  useQuery({ queryKey: [...keys.activity(ws ?? ""), limit], queryFn: () => api.get<ActivityEvent[]>(`/workspaces/${enc(ws!)}/activity?limit=${limit}`), enabled: !!ws });
export const useAuditVerification = (ws: string | undefined) =>
  useQuery({ queryKey: keys.audit(ws ?? ""), queryFn: () => api.get<{ valid: boolean; events: number; brokenAt?: number; head?: string }>(`/workspaces/${enc(ws!)}/activity/verify`), enabled: !!ws });
export const useSearch = (q: string) =>
  useQuery({ queryKey: keys.search(q), queryFn: () => api.get<SearchResult>(`/search?q=${enc(q)}`), enabled: q.trim().length >= 2, placeholderData: keepPreviousData });

/** Generic mutation that refreshes the whole workspace on success. */
export function useWsMutation<TVars, TResult = unknown>(ws: string | undefined, fn: (vars: TVars) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ws", ws ?? ""] });
      void qc.invalidateQueries({ queryKey: keys.workspaces });
    },
  });
}
