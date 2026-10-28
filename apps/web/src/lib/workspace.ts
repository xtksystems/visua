import { createContext, useContext } from "react";

/** URL aliases resolve once; workspace state, mutations and events use this id. */
export interface WorkspaceIdentity {
  id: string;
  slug: string;
  route: string;
}

export const WorkspaceContext = createContext<WorkspaceIdentity | null>(null);

export function useWorkspaceId(): string {
  return useContext(WorkspaceContext)?.id ?? "";
}

/** Shell children may still receive a URL alias for navigation. */
export function useResolvedWorkspaceId(requested: string | undefined): string | undefined {
  const identity = useContext(WorkspaceContext);
  return identity && (requested === identity.id || requested === identity.slug || requested === identity.route)
    ? identity.id : requested;
}
