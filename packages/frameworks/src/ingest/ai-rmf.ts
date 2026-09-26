/**
 * NIST AI Risk Management Framework (AI RMF 1.0, NIST AI 100-1) ingestion, with the
 * AI RMF Playbook and the NIST AI 600-1 Generative AI Profile.
 *
 *   corpus/nist-ai-rmf/ai-rmf-core.json      functions → categories → subcategories (verbatim, page-cited)
 *   corpus/nist-ai-rmf/ai-rmf-playbook.json  About, Suggested Actions, Transparency & Documentation per subcategory
 *   corpus/nist-ai-rmf/genai-profile.json    12 GAI risks and the profile's actions, each tied to a subcategory
 *
 * All three are extracted from NIST publications (U.S. Government works, public domain).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FrameworkGraph, FrameworkProfile, ProfileAction, RequirementNode } from "@visua/core";
import { CORPUS_DIR } from "../paths.ts";

export const AI_RMF_ID = "nist-ai-rmf";
export const GENAI_PROFILE_ID = "nist-ai-600-1";

interface Source {
  documentId: string;
  title?: string;
  version?: string;
}

interface CoreJson {
  source: Source;
  functions: { id: string; code?: string; title?: string; text?: string; page?: number }[];
  categories: { id: string; function: string; text: string; page?: number }[];
  subcategories: { id: string; category: string; function: string; text: string; page?: number }[];
}

interface PlaybookJson {
  source: Source;
  entries: { id: string; about?: string; suggestedActions?: string[]; transparencyDocumentation?: string[]; references?: string[] }[];
}

interface GenAiJson {
  source: Source;
  risks: { id: string; title: string; description: string; page?: number }[];
  actions: { id: string; subcategory: string; text: string; risks: string[]; page?: number }[];
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;
const TITLE: Record<string, string> = { GOVERN: "Govern", MAP: "Map", MEASURE: "Measure", MANAGE: "Manage" };
/** Two-letter function tags used by NIST AI 600-1 (GV, MP, MS, MG) — compact labels for dense 3D views. */
const TAG: Record<string, string> = { GOVERN: "GV", MAP: "MP", MEASURE: "MS", MANAGE: "MG" };
const shortLabel = (id: string) => id.replace(/^(GOVERN|MAP|MEASURE|MANAGE) /, (_, f: string) => `${TAG[f]}-`);

/** Numeric-aware ordering for ids like "GOVERN 1.10" vs "GOVERN 1.2". */
function byId(a: string, b: string): number {
  const na = a.match(/\d+/g)?.map(Number) ?? [];
  const nb = b.match(/\d+/g)?.map(Number) ?? [];
  for (let i = 0; i < Math.max(na.length, nb.length); i++) {
    const d = (na[i] ?? -1) - (nb[i] ?? -1);
    if (d) return d;
  }
  return a.localeCompare(b);
}

export function ingestAiRmf(dir = resolve(CORPUS_DIR, "nist-ai-rmf")): FrameworkGraph | null {
  const corePath = resolve(dir, "ai-rmf-core.json");
  if (!existsSync(corePath)) return null;
  const core = readJson<CoreJson>(corePath);
  const playbookPath = resolve(dir, "ai-rmf-playbook.json");
  const playbook = existsSync(playbookPath) ? readJson<PlaybookJson>(playbookPath) : null;
  const genaiPath = resolve(dir, "genai-profile.json");
  const genai = existsSync(genaiPath) ? readJson<GenAiJson>(genaiPath) : null;
  const coreDoc = core.source.documentId;

  const nodes: RequirementNode[] = [];
  const order = ["GOVERN", "MAP", "MEASURE", "MANAGE"];
  const functions = [...core.functions].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  functions.forEach((f, fi) => {
    const fid = `${AI_RMF_ID}:${f.id}`;
    nodes.push({
      id: fid,
      frameworkId: AI_RMF_ID,
      code: f.id,
      kind: "function",
      parentId: null,
      depth: 0,
      order: fi,
      title: f.title ?? TITLE[f.id] ?? f.id,
      text: f.text ?? f.title ?? f.id,
      citation: { documentId: coreDoc, locator: `AI RMF Core — ${f.id}`, page: f.page },
      assessable: false,
    });
    core.categories
      .filter((c) => c.function === f.id)
      .sort((a, b) => byId(a.id, b.id))
      .forEach((c, ci) => {
        const cid = `${AI_RMF_ID}:${c.id}`;
        nodes.push({
          id: cid,
          frameworkId: AI_RMF_ID,
          code: c.id,
          kind: "category",
          parentId: fid,
          depth: 1,
          order: ci,
          title: "",
          text: c.text,
          attributes: { label: shortLabel(c.id) },
          citation: { documentId: coreDoc, locator: `AI RMF Core — ${c.id}`, page: c.page },
          assessable: false,
        });
        core.subcategories
          .filter((s) => s.category === c.id)
          .sort((a, b) => byId(a.id, b.id))
          .forEach((s, si) => {
            const pb = playbook?.entries.find((e) => e.id === s.id);
            const actions: ProfileAction[] = (genai?.actions ?? [])
              .filter((a) => a.subcategory === s.id)
              .sort((a, b) => byId(a.id, b.id))
              .map((a) => ({ profileId: GENAI_PROFILE_ID, id: a.id, text: a.text, risks: a.risks, citation: { documentId: genai!.source.documentId, locator: a.id, page: a.page } }));
            nodes.push({
              id: `${AI_RMF_ID}:${s.id}`,
              frameworkId: AI_RMF_ID,
              code: s.id,
              kind: "subcategory",
              parentId: cid,
              depth: 2,
              order: si,
              title: "",
              text: s.text,
              attributes: {
                label: shortLabel(s.id),
                ...(pb?.suggestedActions?.length ? { suggestedActions: pb.suggestedActions } : {}),
                ...(pb?.transparencyDocumentation?.length ? { transparency: pb.transparencyDocumentation } : {}),
                ...(pb?.about ? { about: pb.about } : {}),
                ...(pb?.references?.length ? { playbookReferences: pb.references } : {}),
                ...(actions.length ? { profileActions: actions } : {}),
              },
              citation: { documentId: coreDoc, locator: `AI RMF Core — ${s.id}`, page: s.page },
              assessable: true,
            });
          });
      });
  });

  const profiles: FrameworkProfile[] = genai
    ? [
        {
          id: GENAI_PROFILE_ID,
          title: "Generative AI Profile (NIST AI 600-1)",
          documentId: genai.source.documentId,
          appliesWhen: "generative",
          risks: genai.risks.map((r) => ({ id: r.id, title: r.title, description: r.description, citation: { documentId: genai.source.documentId, locator: r.title, page: r.page } })),
        },
      ]
    : [];

  return {
    framework: {
      id: AI_RMF_ID,
      family: "ai",
      shortName: "NIST AI RMF",
      name: "NIST Artificial Intelligence Risk Management Framework (AI RMF 1.0)",
      publisher: "National Institute of Standards and Technology (NIST)",
      version: core.source.version ?? "1.0",
      published: "2023-01",
      description:
        "A voluntary framework for managing risks of AI systems to individuals, organizations and society. Four functions — GOVERN, MAP, MEASURE and MANAGE — organize outcomes that the AI RMF Playbook supports with suggested actions; the Generative AI Profile (NIST AI 600-1) adds actions for 12 risks unique to or exacerbated by generative AI.",
      levels: [
        { kind: "function", label: "Function", pluralLabel: "Functions" },
        { kind: "category", label: "Category", pluralLabel: "Categories" },
        { kind: "subcategory", label: "Subcategory", pluralLabel: "Subcategories" },
      ],
      assessableKind: "subcategory",
      sources: [{ documentId: coreDoc }, ...(playbook ? [{ documentId: playbook.source.documentId }] : []), ...(genai ? [{ documentId: genai.source.documentId }] : [])],
      unitLabel: "outcome",
      unitLabelPlural: "outcomes",
      contentNotice: "NIST publications (public domain). The AI RMF is voluntary; outcome levels are Visua's convention because the AI RMF defines no tiers.",
    },
    nodes,
    profiles,
  };
}
