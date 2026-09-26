/**
 * Minimal, dependency-light reader for the DESIGN.md format (version "alpha").
 *
 * The YAML front matter holds the normative tokens; token references use the
 * `{path.to.token}` syntax and may point at primitives (colors, rounded,
 * spacing) or — inside `components` — at composite typography tokens.
 */
import { parse as parseYaml } from "yaml";

export interface TypographyToken {
  fontFamily: string;
  fontSize: string;
  fontWeight?: number;
  lineHeight?: string | number;
  letterSpacing?: string;
  fontFeature?: string;
  fontVariation?: string;
}

export type ComponentTokenValue = string | TypographyToken;

export interface DesignSystem {
  version?: string;
  name: string;
  description?: string;
  colors: Record<string, string>;
  typography: Record<string, TypographyToken>;
  rounded: Record<string, string>;
  spacing: Record<string, string | number>;
  /** Components with every reference resolved to its concrete value. */
  components: Record<string, Record<string, ComponentTokenValue>>;
  /** Components exactly as written (references kept), for traceability. */
  rawComponents: Record<string, Record<string, string>>;
  /** Markdown body (everything after the front matter). */
  body: string;
}

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const REFERENCE = /^\{([a-zA-Z0-9_.-]+)\}$/;

export function splitFrontMatter(markdown: string): { yaml: string; body: string } {
  const match = FRONT_MATTER.exec(markdown);
  if (!match) throw new Error("DESIGN.md: missing YAML front matter delimited by '---'");
  return { yaml: match[1] ?? "", body: markdown.slice(match[0].length) };
}

function lookup(root: Record<string, unknown>, path: string): unknown {
  let node: unknown = root;
  for (const key of path.split(".")) {
    if (node === null || typeof node !== "object" || !(key in (node as object))) {
      throw new Error(`DESIGN.md: broken token reference {${path}}`);
    }
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

function resolveValue(root: Record<string, unknown>, value: unknown, seen: Set<string> = new Set()): unknown {
  if (typeof value !== "string") return value;
  const match = REFERENCE.exec(value.trim());
  if (!match) return value;
  const path = match[1]!;
  if (seen.has(path)) throw new Error(`DESIGN.md: circular token reference {${path}}`);
  seen.add(path);
  return resolveValue(root, lookup(root, path), seen);
}

export function parseDesignSystem(markdown: string): DesignSystem {
  const { yaml, body } = splitFrontMatter(markdown);
  const root = (parseYaml(yaml) ?? {}) as Record<string, unknown>;
  const asRecord = <T>(key: string) => ((root[key] ?? {}) as Record<string, T>);

  const colors: Record<string, string> = {};
  for (const [name, value] of Object.entries(asRecord<unknown>("colors"))) {
    colors[name] = String(resolveValue(root, value));
  }
  const typography: Record<string, TypographyToken> = {};
  for (const [name, value] of Object.entries(asRecord<TypographyToken>("typography"))) {
    typography[name] = { ...value, fontSize: String(value.fontSize) };
  }
  const rounded: Record<string, string> = {};
  for (const [name, value] of Object.entries(asRecord<unknown>("rounded"))) {
    rounded[name] = String(resolveValue(root, value));
  }
  const spacing: Record<string, string | number> = {};
  for (const [name, value] of Object.entries(asRecord<unknown>("spacing"))) {
    const resolved = resolveValue(root, value);
    spacing[name] = typeof resolved === "number" ? resolved : String(resolved);
  }
  const rawComponents = asRecord<Record<string, string>>("components");
  const components: Record<string, Record<string, ComponentTokenValue>> = {};
  for (const [component, props] of Object.entries(rawComponents)) {
    components[component] = {};
    for (const [prop, value] of Object.entries(props ?? {})) {
      components[component]![prop] = resolveValue(root, value) as ComponentTokenValue;
    }
  }

  const name = root["name"];
  if (typeof name !== "string" || !name) throw new Error("DESIGN.md: `name` is required");
  if (!colors["primary"]) throw new Error("DESIGN.md: a `primary` color is required");

  return {
    version: typeof root["version"] === "string" ? root["version"] : undefined,
    name,
    description: typeof root["description"] === "string" ? root["description"] : undefined,
    colors,
    typography,
    rounded,
    spacing,
    components,
    rawComponents,
    body,
  };
}

/** `## Heading` sections of the markdown body, in order. */
export function sections(body: string): string[] {
  return [...body.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]!);
}

const kebab = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();

const COMPONENT_PROP_VAR: Record<string, string> = {
  backgroundColor: "bg",
  textColor: "fg",
  rounded: "radius",
  padding: "padding",
  size: "size",
  height: "height",
  width: "width",
};

function fontStack(family: string): string {
  const mono = /mono/i.test(family);
  const fallback = mono
    ? "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    : "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  return `'${family}', ${fallback}`;
}

function lineHeightCss(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return String(value);
}

/** Compile the design system to CSS custom properties + typography utility classes. */
export function toCss(ds: DesignSystem): string {
  const lines: string[] = [];
  lines.push(`/* Generated from DESIGN.md (${ds.name}) by @visua/design. Do not edit. */`);
  lines.push(":root {");
  for (const [name, value] of Object.entries(ds.colors)) lines.push(`  --color-${kebab(name)}: ${value};`);
  for (const [name, value] of Object.entries(ds.rounded)) lines.push(`  --radius-${kebab(name)}: ${value};`);
  for (const [name, value] of Object.entries(ds.spacing)) {
    lines.push(`  --space-${kebab(name)}: ${typeof value === "number" ? value : value};`);
  }
  for (const [name, t] of Object.entries(ds.typography)) {
    const k = kebab(name);
    lines.push(`  --font-${k}-family: ${fontStack(t.fontFamily)};`);
    lines.push(`  --font-${k}-size: ${t.fontSize};`);
    if (t.fontWeight !== undefined) lines.push(`  --font-${k}-weight: ${t.fontWeight};`);
    const lh = lineHeightCss(t.lineHeight);
    if (lh) lines.push(`  --font-${k}-line-height: ${lh};`);
    if (t.letterSpacing) lines.push(`  --font-${k}-letter-spacing: ${t.letterSpacing};`);
  }
  for (const [component, props] of Object.entries(ds.components)) {
    const c = kebab(component);
    for (const [prop, value] of Object.entries(props)) {
      if (prop === "typography" || typeof value !== "string") continue;
      const suffix = COMPONENT_PROP_VAR[prop] ?? kebab(prop);
      lines.push(`  --${c}-${suffix}: ${value};`);
    }
  }
  lines.push("}");
  lines.push("");
  for (const [name, t] of Object.entries(ds.typography)) {
    const k = kebab(name);
    lines.push(`.type-${k} {`);
    lines.push(`  font-family: var(--font-${k}-family);`);
    lines.push(`  font-size: var(--font-${k}-size);`);
    if (t.fontWeight !== undefined) lines.push(`  font-weight: var(--font-${k}-weight);`);
    if (t.lineHeight !== undefined) lines.push(`  line-height: var(--font-${k}-line-height);`);
    if (t.letterSpacing) lines.push(`  letter-spacing: var(--font-${k}-letter-spacing);`);
    if (t.fontFeature) lines.push(`  font-feature-settings: ${t.fontFeature};`);
    if (t.fontVariation) lines.push(`  font-variation-settings: ${t.fontVariation};`);
    if (name === "label-caps") lines.push("  text-transform: uppercase;");
    lines.push("}");
  }
  return lines.join("\n") + "\n";
}

/** Compile the design system to a typed TypeScript module. */
export function toTypeScript(ds: DesignSystem): string {
  const payload = {
    name: ds.name,
    version: ds.version ?? null,
    colors: ds.colors,
    typography: ds.typography,
    rounded: ds.rounded,
    spacing: ds.spacing,
    components: ds.components,
  };
  return [
    `// Generated from DESIGN.md (${ds.name}) by @visua/design. Do not edit.`,
    `export const designSystem = ${JSON.stringify(payload, null, 2)} as const;`,
    "",
    "export type ColorToken = keyof typeof designSystem.colors;",
    "export type TypographyTokenName = keyof typeof designSystem.typography;",
    "export type ComponentName = keyof typeof designSystem.components;",
    "",
  ].join("\n");
}
