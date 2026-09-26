/** Who is signed in, what they may do, and the sign-in configuration. */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import type { Capability, Role } from "@visua/core";
import { api, ApiError, setCsrfToken } from "./api.ts";
import { useWorkspace } from "./queries.ts";

export interface Me {
  authMode: "dev" | "oidc";
  principal: "user" | "token";
  user: { id: string; email: string; name: string };
  method: string;
  csrf?: string;
  tenantScope: string | null;
  activeTenant: { id: string; slug: string; name: string; role: Role; capabilities: Capability[]; settings: { requireSso?: boolean } } | null;
  organizations: { id: string; slug: string; name: string; role: Role }[];
}

export interface AuthConfig {
  mode: "dev" | "oidc";
  platform: { name: string } | null;
  sso: boolean;
  personas: { email: string; name: string; organizations: { name: string; role: Role }[] }[];
}

export const meKey = ["auth", "me"] as const;

async function fetchMe(): Promise<Me | null> {
  try {
    const me = await api.get<Me | null>("/auth/me");
    setCsrfToken(me?.csrf);
    return me;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      setCsrfToken(undefined);
      return null;
    }
    throw err;
  }
}

/** The signed-in principal, or null when signed out. */
export function useMe() {
  return useQuery({ queryKey: meKey, queryFn: fetchMe, staleTime: 60_000, retry: false });
}

export const useAuthConfig = () => useQuery({ queryKey: ["auth", "config"], queryFn: () => api.get<AuthConfig>("/auth/config"), staleTime: Infinity });

/** Forget everything cached for the previous principal and load the new one. */
export function useResetSession() {
  const qc = useQueryClient();
  return async () => {
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "auth" });
    await qc.fetchQuery({ queryKey: meKey, queryFn: fetchMe, staleTime: 0 });
  };
}

/**
 * Whether the signed-in principal may do something in the current workspace
 * (its organization's role), or in the active organization outside one.
 * The server enforces the same rule; this only shapes the interface.
 */
export function useCan(capability: Capability): boolean {
  const { ws } = useParams();
  const summary = useWorkspace(ws);
  const me = useMe();
  if (ws) return !!summary.data?.access?.capabilities.includes(capability);
  return !!me.data?.activeTenant?.capabilities.includes(capability);
}

export const ROLE_NAMES: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  approver: "Approver",
  contributor: "Contributor",
  auditor: "Auditor",
  viewer: "Viewer",
};
