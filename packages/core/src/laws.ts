import type { RequirementNode } from "./types.ts";

/**
 * When a statutory obligation binds: upcoming before its effective date, in force from
 * it, ended after its `until` date (a sunset or a replaced provision). Dates are
 * ISO days (YYYY-MM-DD) compared as strings; `today` is today's date in UTC.
 */
export type ObligationTiming = "upcoming" | "in-force" | "ended";

export function obligationTiming(node: Pick<RequirementNode, "attributes">, today: string): ObligationTiming {
  const effective = node.attributes?.["effective"] as string | undefined;
  const until = node.attributes?.["until"] as string | undefined;
  if (until && until < today) return "ended";
  if (effective && effective > today) return "upcoming";
  return "in-force";
}
