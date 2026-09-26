/**
 * Tenancy and access control. A tenant is an organization (a company, or a
 * consultancy's client); users belong to tenants through memberships, each
 * with one role. Roles map to capabilities; the API checks capabilities.
 */

export const ROLES = ["owner", "admin", "approver", "contributor", "auditor", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export type Capability =
  /** See workspaces, frameworks, tasks, evidence, activity. */
  | "workspace.read"
  /** Download reports, OSCAL, CSVs and PBC lists. */
  | "workspace.export"
  /** Assess requirements (levels, priority, owner, notes), manage tasks, upload evidence, draft policies, run agents and connectors. */
  | "work.write"
  /** Decide agent proposals, approve policies, accept evidence, mark requirements not applicable or verified, categorize, tailor and authorize. */
  | "work.approve"
  /** Create and delete workspaces; enable frameworks; set scope, autonomy and the trust center. */
  | "workspace.configure"
  /** Manage members (except owners), API tokens, and run SSO connections (enable, disable, provisioning). */
  | "tenant.manage"
  /** Manage owners and organization-wide security settings, including which identity provider SSO trusts. */
  | "tenant.own";

const READ: Capability[] = ["workspace.read"];
const AUDIT: Capability[] = [...READ, "workspace.export"];
const WRITE: Capability[] = [...AUDIT, "work.write"];
const APPROVE: Capability[] = [...WRITE, "work.approve"];
const ADMIN: Capability[] = [...APPROVE, "workspace.configure", "tenant.manage"];

export const ROLE_CAPABILITIES: Record<Role, readonly Capability[]> = {
  owner: [...ADMIN, "tenant.own"],
  admin: ADMIN,
  approver: APPROVE,
  contributor: WRITE,
  auditor: AUDIT,
  viewer: READ,
};

export const ROLE_LABELS: Record<Role, { name: string; description: string }> = {
  owner: { name: "Owner", description: "Full control, including owners, organization security settings and SSO identity providers." },
  admin: { name: "Admin", description: "Workspaces, frameworks, members, API tokens and running single sign-on." },
  approver: { name: "Approver", description: "Decides agent proposals, approves policies and evidence, scopes and verifies requirements, records authorization decisions." },
  contributor: { name: "Contributor", description: "Assesses requirements, runs agents and connectors, manages tasks, evidence and drafts." },
  auditor: { name: "Auditor", description: "Read-only access with exports and audit-trail verification." },
  viewer: { name: "Viewer", description: "Read-only access to dashboards and the 3D views." },
};

export function can(role: Role | undefined, capability: Capability): boolean {
  return !!role && ROLE_CAPABILITIES[role].includes(capability);
}

/** Rank for "may this role grant that role" checks: nobody grants above their own rank. */
export const roleRank = (role: Role): number => ROLES.length - ROLES.indexOf(role);

export interface TenantSettings {
  /** Only sessions from this tenant's own SSO connection may access it. */
  requireSso?: boolean;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  settings: TenantSettings;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  /** Lower-case. */
  email: string;
  name: string;
  disabled?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  tenantId: string;
  userId: string;
  role: Role;
  addedBy?: string;
  createdAt: string;
  updatedAt: string;
}
