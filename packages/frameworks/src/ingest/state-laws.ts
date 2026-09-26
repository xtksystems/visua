/**
 * U.S. state AI laws as a framework of the "law" family:
 *
 *   jurisdiction (Texas, California, …) → law → obligation (the unit of work)
 *
 * Built from corpus/us-state-ai-laws/obligations.json (see STRUCTURE.md in that
 * folder). Obligation text is quoted from the enrolled statute or the adopted
 * regulation with its section and page. Titles and suggested evidence are
 * Visua's short summaries, labeled as such. Nothing here is legal advice.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FrameworkGraph, RequirementNode } from "@visua/core";
import { LAW_SCALE } from "@visua/core";
import { CORPUS_DIR } from "../paths.ts";

export const STATE_LAWS_ID = "us-state-ai-laws";

interface LawSource {
  retrieved: string;
  disclaimer: string;
  laws: {
    id: string;
    jurisdiction: string;
    title: string;
    shortName?: string;
    citation: string;
    status: string;
    statusNote?: string;
    enacted?: string | null;
    effective?: string | null;
    sunset?: string | null;
    appliesTo: { role: string; condition: string }[];
    enforcement?: Record<string, unknown>;
    safeHarbors?: { text: string; section: string; references?: string[]; note?: string }[];
    sources: { documentId: string; section?: string }[];
    obligations: {
      id: string;
      title: string;
      text: string;
      section: string;
      documentId: string;
      page?: number | null;
      pageEnd?: number | null;
      role: string;
      effective?: string | null;
      until?: string | null;
      category: string;
      evidence?: string[];
      notes?: string;
    }[];
  }[];
}

const STATE_CODES: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE",
  Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY",
  Louisiana: "LA", Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO",
  Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "New York City": "NYC", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA",
  "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
};

const BILL = /\b(H\.?\s?B\.?|S\.?\s?B\.?|A\.?\s?B\.?|Local Law)\s*(\d+(?:-\d+)?)/i;
const billCode = (text: string) => {
  const m = BILL.exec(text);
  return m ? `${m[1]!.replace(/[.\s]/g, "").toUpperCase().replace("LOCALLAW", "LL")}${m[2]}` : undefined;
};

/**
 * Codes for laws whose rules below would give a long or ambiguous code: the name the
 * law is known by, or the bill plus the act it enacts when one bill enacts two acts.
 * Codes are node ids, so they must never change once published.
 */
const CODE_OVERRIDES: Record<string, string> = {
  "ny-raise-act": "NY-RAISE",
  "ny-ai-companion-models": "NY-AI-COMPANION",
  "ny-safe-by-design-ai-companions": "NY-SAFE-BY-DESIGN",
  "il-ai-video-interview": "IL-AIVIA",
  "me-ai-chatbot-disclosure": "ME-CHATBOT",
  "ut-content-provenance": "UT-HB276-PROVENANCE",
  "ut-digital-voyeurism": "UT-HB276-VOYEURISM",
};

/**
 * Short, stable law codes: an override, else a single-acronym id ("tx-traiga" →
 * TX-TRAIGA), else the bill in the title ("(SB 243)" → CA-SB243), else a regulation's
 * acronym ("ca-ccpa-admt-regs" → CA-CCPA-ADMT), else the first bill in the citation.
 */
export function lawCode(law: { id: string; title: string; citation: string; shortName?: string; jurisdiction: string }): string {
  const state = STATE_CODES[law.jurisdiction] ?? law.id.split("-")[0]!.toUpperCase();
  if (CODE_OVERRIDES[law.id]) return CODE_OVERRIDES[law.id]!;
  if (law.shortName) return `${state}-${law.shortName.replace(/\s+/g, "").toUpperCase()}`;
  const parts = law.id.split("-").slice(1);
  if (parts.length === 1) return `${state}-${parts[0]!.toUpperCase()}`;
  const titled = /\(([^)]*)\)/.exec(law.title)?.[1];
  const fromTitle = titled ? billCode(titled) : undefined;
  if (fromTitle) return `${state}-${fromTitle}`;
  if (parts.at(-1) === "regs") return `${state}-${parts.slice(0, -1).join("-").toUpperCase()}`;
  const fromCitation = billCode(law.citation);
  if (fromCitation) return `${state}-${fromCitation}`;
  return `${state}-${parts.join("-").toUpperCase()}`;
}

/** Role tokens an obligation applies to ("developer, deployer" → ["developer", "deployer"]). */
export const roleTokens = (role: string) =>
  role
    .split(/[,/]| and /)
    .map((r) => r.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean);

export function ingestStateLaws(corpusDir = CORPUS_DIR): FrameworkGraph | undefined {
  const file = resolve(corpusDir, "us-state-ai-laws", "obligations.json");
  if (!existsSync(file)) return undefined;
  const src = JSON.parse(readFileSync(file, "utf8")) as LawSource;
  const fw = STATE_LAWS_ID;
  const nodes: RequirementNode[] = [];
  const jurisdictions = [...new Set(src.laws.map((l) => l.jurisdiction))].sort((a, b) => a.localeCompare(b));
  const codes = new Set<string>();
  for (const [ji, j] of jurisdictions.entries()) {
    const jcode = STATE_CODES[j] ?? j.slice(0, 2).toUpperCase();
    const jid = `${fw}:${jcode}`;
    const laws = src.laws.filter((l) => l.jurisdiction === j);
    nodes.push({
      id: jid,
      frameworkId: fw,
      code: jcode,
      kind: "jurisdiction",
      parentId: null,
      depth: 0,
      order: ji,
      title: j,
      text: `${laws.length} AI law${laws.length === 1 ? "" : "s"} or regulation${laws.length === 1 ? "" : "s"} tracked for ${j}.`,
      assessable: false,
      citation: { documentId: laws[0]!.sources[0]?.documentId ?? laws[0]!.obligations[0]!.documentId, locator: j },
      attributes: { label: jcode },
    });
    for (const [li, law] of laws.entries()) {
      const code = lawCode(law);
      // Codes are node ids: two laws must never share one (add an override instead).
      if (codes.has(code)) throw new Error(`State AI laws: ${law.id} would reuse the code ${code}; add it to CODE_OVERRIDES`);
      codes.add(code);
      const lid = `${fw}:${code}`;
      nodes.push({
        id: lid,
        frameworkId: fw,
        code,
        kind: "law",
        parentId: jid,
        depth: 1,
        order: li,
        title: law.title,
        text: `${law.citation}. Status: ${law.status}${law.effective ? `, effective ${law.effective}` : ""}${law.sunset ? `, sunsets ${law.sunset}` : ""}.`,
        assessable: false,
        citation: { documentId: law.sources[0]?.documentId ?? law.obligations[0]!.documentId, locator: law.citation },
        attributes: {
          label: code,
          lawId: law.id,
          jurisdiction: j,
          status: law.status,
          statusNote: law.statusNote,
          enacted: law.enacted ?? undefined,
          effective: law.effective ?? undefined,
          sunset: law.sunset ?? undefined,
          // One entry per role token ("developer, deployer" defines both), in the obligations' vocabulary.
          appliesTo: law.appliesTo.flatMap((a) => roleTokens(a.role).map((role) => ({ role, condition: a.condition }))),
          enforcement: law.enforcement,
          safeHarbors: law.safeHarbors ?? [],
          sources: law.sources,
        },
      });
      for (const [oi, o] of law.obligations.entries()) {
        const ocode = `${code}-${String(oi + 1).padStart(2, "0")}`;
        nodes.push({
          id: `${fw}:${ocode}`,
          frameworkId: fw,
          code: ocode,
          kind: "obligation",
          parentId: lid,
          depth: 2,
          order: oi,
          title: o.title,
          text: o.text,
          assessable: true,
          citation: { documentId: o.documentId, locator: o.section, page: o.page ?? undefined },
          attributes: {
            label: ocode,
            obligationId: o.id,
            lawId: law.id,
            jurisdiction: j,
            section: o.section,
            role: o.role,
            roles: roleTokens(o.role),
            category: o.category,
            effective: o.effective ?? law.effective ?? undefined,
            until: o.until ?? undefined,
            pageEnd: o.pageEnd ?? undefined,
            suggestedEvidence: o.evidence ?? [],
            notes: o.notes,
          },
        });
      }
    }
  }
  const obligations = nodes.filter((n) => n.assessable).length;
  return {
    framework: {
      id: fw,
      family: "law",
      shortName: "State AI laws",
      badge: "State AI laws",
      name: "U.S. state AI laws",
      publisher: "State legislatures and agencies (compiled by Visua)",
      version: src.retrieved,
      published: src.retrieved,
      description: `${src.laws.length} state AI laws and regulations with ${obligations} obligations, quoted from the enrolled statutes and adopted regulations.`,
      levels: [
        { kind: "jurisdiction", label: "Jurisdiction", pluralLabel: "Jurisdictions" },
        { kind: "law", label: "Law", pluralLabel: "Laws" },
        { kind: "obligation", label: "Obligation", pluralLabel: "Obligations" },
      ],
      assessableKind: "obligation",
      sources: [...new Set(src.laws.flatMap((l) => l.sources.map((s) => s.documentId)))].map((documentId) => ({ documentId })),
      unitLabel: "obligation",
      unitLabelPlural: "obligations",
      contentNotice: `${src.disclaimer} Obligation text is quoted from the official statute or regulation with its section; titles and suggested evidence are Visua summaries. Laws change: check the status and effective dates, and consult counsel.`,
    },
    nodes,
  };
}

/** The level scale obligations use (re-exported for the ingest report). */
export const STATE_LAW_SCALE = LAW_SCALE;
