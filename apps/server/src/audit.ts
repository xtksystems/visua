import { createHash } from "node:crypto";
import type { ActivityEvent } from "@visua/core";

export const GENESIS = "0".repeat(64);

/** Stable JSON for artifact digests and the existing audit chain. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function chainHash(prevHash: string, event: ActivityEvent): string {
  const { hash: _ignored, ...body } = event;
  void _ignored;
  return createHash("sha256").update(prevHash).update(canonical(body)).digest("hex");
}
