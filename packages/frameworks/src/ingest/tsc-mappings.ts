/**
 * AICPA Trust Services Criteria mappings (ingest-time only; reads .xlsx).
 *
 *  - TSC 2017 (rev. 2022) → NIST SP 800-53 Rev. 5: AICPA's current workbook,
 *    which lists SP 800-53 requirements as framework-specific points of focus
 *    for each criterion → "control supports criterion".
 *  - TSC 2017 → NIST CSF v1.1 (AICPA), carried forward to CSF 2.0 through
 *    NIST's official OLIR CSF v1.1 → v2.0 crosswalk. Composed mappings are
 *    labelled as such and treated as weaker ("related-to").
 *
 * Both workbooks are AICPA works: the resulting mapping files stay local
 * (git-ignored) like the rest of the AICPA corpus.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import ExcelJS from "exceljs";
import type { Mapping, MappingSet } from "@visua/core";
import { CORPUS_DIR } from "../paths.ts";
import { TSC_ID } from "./tsc.ts";

const AICPA_80053 = "aicpa-soc2/mappings/tsc-2022-to-nist-sp800-53r5.xlsx";
const AICPA_CSF11 = "aicpa-soc2/mappings/tsc-2017-to-nist-csf-v1.1.xlsx";
const OLIR_CSF11_TO_20 = "nist-csf-2.0/mappings/CSFv1-1_to_CSFv2-0_CROSSWALK_20240326.xlsx";

const CRITERION = /^(CC\d|A1|PI1|C1|P\d)\.\d+$/;

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if ("richText" in v && Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("");
    if ("text" in v && typeof v.text === "string") return v.text;
    if ("result" in v) return cellText(v.result as ExcelJS.CellValue);
  }
  return String(v);
}

async function rows(path: string, sheet: string | number): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const ws = typeof sheet === "number" ? wb.worksheets[sheet] : wb.getWorksheet(sheet);
  if (!ws) throw new Error(`Worksheet '${sheet}' not found in ${path}`);
  const out: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as ExcelJS.CellValue[];
    out.push(values.slice(1).map((v) => cellText(v).trim()));
  });
  return out;
}

/** "PS-6a" → "PS-6"; "AC-2(1)(a)" → "AC-2(1)"; "SA-08(21)" → "SA-8(21)". */
export function normalize80053(ref: string): string | null {
  const m = /^([A-Z]{2})-0*(\d+)\s*(?:\(0*(\d+)\))?/.exec(ref.trim());
  if (!m) return null;
  return `${m[1]}-${m[2]}${m[3] ? `(${m[3]})` : ""}`;
}

export async function aicpaTscMappingSets(exists: (id: string) => boolean): Promise<{ sets: MappingSet[]; report: Record<string, number> }> {
  const sets: MappingSet[] = [];
  const report: Record<string, number> = {};

  const p80053 = resolve(CORPUS_DIR, AICPA_80053);
  if (existsSync(p80053)) {
    const mappings: Mapping[] = [];
    const seen = new Set<string>();
    let skipped = 0;
    for (const r of await rows(p80053, "NIST 800-53 as Points of Focus")) {
      const criterion = r[0] ?? "";
      if (!CRITERION.test(criterion) || !r[1]) continue;
      const control = normalize80053(r[1]);
      const source = control ? `nist-sp-800-53-r5:${control}` : "";
      const target = `${TSC_ID}:${criterion}`;
      if (!control || !exists(source) || !exists(target)) {
        skipped++;
        continue;
      }
      const key = `${source}|${target}`;
      if (seen.has(key)) continue;
      seen.add(key);
      mappings.push({ source, target, relationship: "supports", origin: { documentId: "map-tsc2022-nist-sp800-53r5", locator: `${criterion} ↔ ${r[1]}`, authority: "AICPA — TSC 2017 (rev. 2022) to NIST SP 800-53 Rev. 5 mapping" } });
    }
    sets.push({ id: "sp-800-53-r5--tsc-2017", title: "SP 800-53 Rev. 5 controls supporting SOC 2 criteria (AICPA mapping)", sourceFramework: "nist-sp-800-53-r5", targetFramework: TSC_ID, authority: "AICPA", mappings });
    report["sp-800-53-r5--tsc-2017"] = mappings.length;
    report["sp-800-53-r5--tsc-2017:skipped"] = skipped;
  }

  const pCsf11 = resolve(CORPUS_DIR, AICPA_CSF11);
  const pOlir = resolve(CORPUS_DIR, OLIR_CSF11_TO_20);
  if (existsSync(pCsf11) && existsSync(pOlir)) {
    // NIST OLIR: focal = CSF 2.0 element, reference = CSF 1.1 element.
    const v11to20 = new Map<string, Set<string>>();
    for (const r of await rows(pOlir, "Relationships")) {
      const v20 = r[0] ?? "";
      const v11 = r[2] ?? "";
      if (!/^[A-Z]{2}\.[A-Z]{2}-\d{2}$/.test(v20) || !/^[A-Z]{2}\.[A-Z]{2}-\d+$/.test(v11)) continue;
      const set = v11to20.get(v11) ?? new Set<string>();
      set.add(v20);
      v11to20.set(v11, set);
    }
    const mappings: Mapping[] = [];
    const seen = new Set<string>();
    let current = "";
    let unresolved = 0;
    for (const r of await rows(pCsf11, "TS to NIST CSF")) {
      if (CRITERION.test(r[0] ?? "")) current = r[0]!;
      const refs = (r[3] ?? "").split(/[\s,;]+/).filter((x) => /^[A-Z]{2}\.[A-Z]{2}-\d+$/.test(x));
      if (!current) continue;
      for (const v11 of refs) {
        const targets = v11to20.get(v11);
        if (!targets?.size) {
          unresolved++;
          continue;
        }
        for (const v20 of targets) {
          const source = `nist-csf-2.0:${v20}`;
          const target = `${TSC_ID}:${current}`;
          const key = `${source}|${target}`;
          if (seen.has(key) || !exists(source) || !exists(target)) continue;
          seen.add(key);
          mappings.push({ source, target, relationship: "related-to", origin: { documentId: "map-tsc2017-nist-csf-v1.1", locator: `${current} ↔ CSF 1.1 ${v11} → CSF 2.0 ${v20} (via NIST OLIR v1.1→v2.0)`, authority: "AICPA TSC→CSF v1.1 mapping, carried to CSF 2.0 via NIST's OLIR crosswalk (composed)" } });
        }
      }
    }
    sets.push({ id: "csf-2.0--tsc-2017", title: "CSF 2.0 outcomes related to SOC 2 criteria (AICPA → CSF 1.1, carried to 2.0 via NIST OLIR)", sourceFramework: "nist-csf-2.0", targetFramework: TSC_ID, authority: "AICPA + NIST OLIR (composed)", mappings });
    report["csf-2.0--tsc-2017"] = mappings.length;
    report["csf-2.0--tsc-2017:unresolved-csf-1.1-refs"] = unresolved;
  }
  return { sets, report };
}
