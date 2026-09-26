import type { FrameworkFamily, TrustCenterSettings } from "./types.ts";

/**
 * Whether the public trust center publishes a framework's readiness: the workspace's
 * own choice when it made one. By default every framework is published except the
 * state AI laws, whose obligations are legal-compliance tracking rather than a security
 * attestation (and reveal which laws an organization considers itself subject to).
 * Threat catalogs are never enabled, so never published.
 */
export function trustCenterPublishes(settings: TrustCenterSettings, frameworkId: string, family: FrameworkFamily): boolean {
  if (family === "threat") return false;
  return settings.frameworks?.[frameworkId] ?? family !== "law";
}
