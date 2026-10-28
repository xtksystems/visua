/** Prepared-response records are separate from assessment activity and its hash chain. */
import { z } from "zod";
import { Repo } from "./repo.ts";

const identifier = z.string().min(1).max(200).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const size = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

/** Only bounded metadata selected by the server; never an actor, path, URL or body. */
export const AccessInputSchema = z.object({
  kind: z.enum(["auditor-view", "export", "evidence-download"]),
  resource: identifier.optional(),
  revision: size.optional(),
  manifestSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  bytes: size.optional(),
}).strict();

export const AccessPrincipalSchema = z.object({
  id: identifier,
  label: z.string().min(1).max(512).regex(/^[^\u0000-\u001f\u007f]+$/),
});

export type AccessInput = z.infer<typeof AccessInputSchema>;
export interface AccessRecord extends AccessInput {
  id: string;
  workspaceId: string;
  tenantId: string;
  at: string;
  principalId: string;
  principalLabel: string;
  /** Preparation succeeded. This does not attest that the client received bytes. */
  outcome: "prepared";
}

type AccessRow = {
  id: string; workspace_id: string; tenant_id: string; at: string;
  principal_id: string; principal_label: string; kind: AccessInput["kind"]; outcome: "prepared";
  resource: string | null; revision: number | string | null; manifest_sha256: string | null; bytes: number | string | null;
};

/** Append-only through VisuaService; workspace deletion is handled by the foreign key. */
export class AccessTable extends Repo {
  async append(record: AccessRecord): Promise<void> {
    await this.db.execute(`INSERT INTO workspace_access (id, workspace_id, tenant_id, at, principal_id, principal_label, kind, outcome, resource, revision, manifest_sha256, bytes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [record.id, record.workspaceId, record.tenantId, record.at, record.principalId, record.principalLabel, record.kind, record.outcome, record.resource ?? null, record.revision ?? null, record.manifestSha256 ?? null, record.bytes ?? null]);
  }

  /** Newest first, with a stable id tie-breaker and a hard bound even for internal callers. */
  async recent(workspaceId: string, limit = 100): Promise<AccessRecord[]> {
    const bounded = Number.isFinite(limit) ? Math.max(1, Math.min(200, Math.floor(limit))) : 100;
    const rows = await this.db.query<AccessRow>(`SELECT id, workspace_id, tenant_id, at, principal_id, principal_label, kind, outcome, resource, revision, manifest_sha256, bytes FROM workspace_access WHERE workspace_id = ? ORDER BY at DESC, id DESC LIMIT ?`, [workspaceId, bounded]);
    return rows.map(row => ({
      id: row.id, workspaceId: row.workspace_id, tenantId: row.tenant_id, at: row.at,
      principalId: row.principal_id, principalLabel: row.principal_label, kind: row.kind, outcome: row.outcome,
      ...(row.resource === null ? {} : { resource: row.resource }),
      ...(row.revision === null ? {} : { revision: Number(row.revision) }),
      ...(row.manifest_sha256 === null ? {} : { manifestSha256: row.manifest_sha256 }),
      ...(row.bytes === null ? {} : { bytes: Number(row.bytes) }),
    }));
  }
}
