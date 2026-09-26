/**
 * Repository Hygiene connector — scans a local source repository for secure
 * software development signals: disclosure policy, code ownership, CI,
 * automated dependency updates, lockfiles and committed secrets.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { CheckOutput, ConnectorKind } from "./index.ts";

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".venv", "venv", "__pycache__", "corpus", ".next", "target"]);
const SECRET_PATTERNS: [string, RegExp][] = [
  ["AWS access key id", /\bAKIA[0-9A-Z]{16}\b/],
  ["Private key block", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ["Anthropic API key", /\bsk-ant-[A-Za-z0-9_-]{20,}\b/],
  ["Stripe live key", /\bsk_live_[A-Za-z0-9]{20,}\b/],
];
const TEXT_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|ya?ml|toml|env|ini|cfg|conf|py|rb|go|java|kt|cs|php|sh|tf|md|txt|properties|xml)$/i;

function walk(root: string, limit = 4000): string[] {
  const out: string[] = [];
  const stack = [root];
  while (stack.length && out.length < limit) {
    const dir = stack.pop()!;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (SKIP_DIRS.has(name)) continue;
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) stack.push(full);
      else if (st.size < 512_000) out.push(full);
      if (out.length >= limit) break;
    }
  }
  return out;
}

const any = (root: string, paths: string[]) => paths.find((p) => existsSync(join(root, p)));

export const repoScanConnector: ConnectorKind = {
  kind: "repo-scan",
  name: "Repository Hygiene",
  description: "Scans a local source repository for secure development practices: SECURITY.md, CODEOWNERS, CI, dependency automation, lockfiles and committed secrets.",
  configFields: [{ key: "path", label: "Repository path on the Visua server", placeholder: "/srv/repos/app", required: true }],
  async run(config) {
    const root = resolve(String(config["path"] ?? "."));
    if (!existsSync(root) || !statSync(root).isDirectory()) {
      return [
        {
          checkId: "repo-exists",
          title: "Repository is accessible",
          outcome: "error",
          detail: `Path not found or not a directory: ${root}`,
          observed: { root },
          requirements: {},
        },
      ];
    }
    const out: CheckOutput[] = [];
    const disclosure = any(root, ["SECURITY.md", ".github/SECURITY.md", "docs/SECURITY.md"]);
    out.push({
      checkId: "security-policy",
      title: "Vulnerability disclosure policy (SECURITY.md)",
      outcome: disclosure ? "pass" : "warn",
      detail: disclosure ? `Found ${disclosure}` : "No SECURITY.md — add a disclosure policy so researchers know how to report issues",
      observed: { file: disclosure ?? null },
      requirements: { csf: ["ID.RA-08"], soc2: ["CC2.3"], sp80053: ["RA-5(11)"] },
    });
    const owners = any(root, ["CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS"]);
    out.push({
      checkId: "code-owners",
      title: "Code ownership and review routing (CODEOWNERS)",
      outcome: owners ? "pass" : "warn",
      detail: owners ? `Found ${owners}` : "No CODEOWNERS file — changes may merge without an accountable reviewer",
      observed: { file: owners ?? null },
      requirements: { csf: ["PR.PS-06"], soc2: ["CC8.1"], sp80053: ["CM-3"] },
    });
    const workflowsDir = join(root, ".github", "workflows");
    const workflows = existsSync(workflowsDir) ? readdirSync(workflowsDir).filter((f) => /\.ya?ml$/.test(f)) : [];
    const otherCi = any(root, [".gitlab-ci.yml", "azure-pipelines.yml", ".circleci/config.yml", "Jenkinsfile", "bitbucket-pipelines.yml"]);
    out.push({
      checkId: "ci-pipeline",
      title: "Automated build and test pipeline",
      outcome: workflows.length || otherCi ? "pass" : "fail",
      detail: workflows.length ? `${workflows.length} GitHub Actions workflow(s): ${workflows.join(", ")}` : otherCi ? `Found ${otherCi}` : "No CI configuration found",
      observed: { workflows, otherCi: otherCi ?? null },
      requirements: { csf: ["PR.PS-06"], soc2: ["CC8.1"], sp80053: ["SA-11"] },
    });
    const depBot = any(root, [".github/dependabot.yml", ".github/dependabot.yaml", "renovate.json", ".github/renovate.json", "renovate.json5"]);
    out.push({
      checkId: "dependency-updates",
      title: "Automated dependency vulnerability updates",
      outcome: depBot ? "pass" : "warn",
      detail: depBot ? `Found ${depBot}` : "No Dependabot/Renovate configuration — vulnerable dependencies may go unpatched",
      observed: { file: depBot ?? null },
      requirements: { csf: ["ID.RA-01", "PR.PS-02"], soc2: ["CC7.1"], sp80053: ["RA-5", "SI-2"] },
    });
    const lock = any(root, ["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "poetry.lock", "Pipfile.lock", "go.sum", "Cargo.lock", "Gemfile.lock", "composer.lock"]);
    out.push({
      checkId: "lockfile",
      title: "Dependency versions are pinned (lockfile)",
      outcome: lock ? "pass" : "warn",
      detail: lock ? `Found ${lock}` : "No lockfile — builds may pull unreviewed dependency versions",
      observed: { file: lock ?? null },
      requirements: { csf: ["PR.PS-06"], soc2: ["CC8.1"], sp80053: ["SA-10"] },
    });
    const findings: { file: string; kind: string }[] = [];
    for (const file of walk(root)) {
      if (!TEXT_EXT.test(file) && !/\.env/.test(file)) continue;
      let content: string;
      try {
        content = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      for (const [kind, re] of SECRET_PATTERNS) {
        if (re.test(content)) findings.push({ file: relative(root, file), kind });
      }
      if (findings.length > 20) break;
    }
    out.push({
      checkId: "secrets",
      title: "No credentials committed to the repository",
      outcome: findings.length ? "fail" : "pass",
      detail: findings.length ? `${findings.length} potential secret(s): ${findings.slice(0, 5).map((f) => `${f.kind} in ${f.file}`).join("; ")}` : "No high-confidence secret patterns found",
      observed: { findings: findings.slice(0, 20) },
      requirements: { csf: ["PR.AA-01", "PR.DS-01"], soc2: ["CC6.1"], sp80053: ["IA-5"] },
    });
    return out;
  },
};
