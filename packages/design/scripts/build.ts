/** Compile the root DESIGN.md into generated/tokens.css and generated/tokens.ts. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDesignSystem, toCss, toTypeScript } from "../src/parse.ts";

const here = dirname(fileURLToPath(import.meta.url));
const designPath = resolve(here, "../../../DESIGN.md");
const outDir = resolve(here, "../generated");

const ds = parseDesignSystem(readFileSync(designPath, "utf8"));
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "tokens.css"), toCss(ds));
writeFileSync(resolve(outDir, "tokens.ts"), toTypeScript(ds));
console.log(
  `[design] ${ds.name}: ${Object.keys(ds.colors).length} colors, ${Object.keys(ds.typography).length} type scales, ` +
    `${Object.keys(ds.components).length} components → generated/tokens.{css,ts}`,
);
