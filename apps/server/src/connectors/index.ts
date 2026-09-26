/**
 * Monitoring connectors produce check results that become evidence and feed
 * requirement status. Each check declares the requirements it evidences in
 * every framework Visua models, so one run updates CSF, SOC 2 and SP 800-53.
 */
import type { CheckOutcome } from "@visua/core";
import { repoScanConnector } from "./repo-scan.ts";
import { webPostureConnector } from "./web-posture.ts";

export interface RequirementRefs {
  csf?: string[];
  soc2?: string[];
  sp80053?: string[];
}

export interface CheckOutput {
  checkId: string;
  title: string;
  outcome: CheckOutcome;
  detail: string;
  observed: Record<string, unknown>;
  requirements: RequirementRefs;
}

export interface ConnectorKind {
  kind: string;
  name: string;
  description: string;
  configFields: { key: string; label: string; placeholder: string; required: boolean }[];
  run(config: Record<string, unknown>, signal?: AbortSignal): Promise<CheckOutput[]>;
}

export const CONNECTOR_KINDS: ConnectorKind[] = [webPostureConnector, repoScanConnector];

export function connectorKind(kind: string): ConnectorKind | undefined {
  return CONNECTOR_KINDS.find((k) => k.kind === kind);
}

export const FRAMEWORK_OF_REF: Record<keyof RequirementRefs, string> = {
  csf: "nist-csf-2.0",
  soc2: "aicpa-tsc-2017",
  sp80053: "nist-sp-800-53-r5",
};
