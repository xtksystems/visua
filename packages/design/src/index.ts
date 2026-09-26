export { designSystem } from "../generated/tokens.ts";
export type { ColorToken, TypographyTokenName, ComponentName } from "../generated/tokens.ts";
export { parseDesignSystem, toCss, toTypeScript, sections } from "./parse.ts";
export type { DesignSystem, TypographyToken } from "./parse.ts";

import { designSystem } from "../generated/tokens.ts";

/** Implementation status values shared across every framework in Visua. */
export const STATUSES = [
  "not-started",
  "in-progress",
  "implemented",
  "verified",
  "at-risk",
  "not-applicable",
] as const;
export type StatusToken = (typeof STATUSES)[number];

/** Status → scene color, straight from DESIGN.md `status-*` tokens. */
export function statusColor(status: StatusToken): string {
  return designSystem.colors[`status-${status}` as keyof typeof designSystem.colors];
}

/** Framework identity color from DESIGN.md `framework-*` tokens. */
export function frameworkColor(framework: "csf" | "soc2" | "rmf"): string {
  return designSystem.colors[`framework-${framework}` as keyof typeof designSystem.colors];
}

/** Hex color (#RRGGBB or #RRGGBBAA) → [r, g, b] in 0..1 for WebGL materials. */
export function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255;
  return [n(0), n(2), n(4)];
}
