/**
 * Runtime mode and content-licensing policy for agents.
 *
 * AICPA content (SOC 2 criterion text, points of focus, AICPA guides) is ©
 * AICPA; its terms object to inclusion in LLM knowledge bases without written
 * permission. When agents run on Claude, that text is withheld from tool
 * results unless the operator declares permission with
 * VISUA_AICPA_AI_USE=permitted. Offline playbooks run locally and are
 * unaffected.
 */

/** Default model: override with VISUA_MODEL. */
export const DEFAULT_MODEL = "claude-opus-5";

export function configuredModel(): string {
  return process.env["VISUA_MODEL"]?.trim() || DEFAULT_MODEL;
}

/**
 * Agent mode resolution. `VISUA_AGENT_MODE=claude|offline|auto` (default auto):
 * auto uses Claude when an API credential is present in the environment.
 */
export function claudeEnabled(): boolean {
  const mode = (process.env["VISUA_AGENT_MODE"] ?? "auto").toLowerCase();
  if (mode === "offline") return false;
  if (mode === "claude") return true;
  return Boolean(process.env["ANTHROPIC_API_KEY"] || process.env["ANTHROPIC_AUTH_TOKEN"]);
}

/** Whether licensed (AICPA) text may be placed in content sent to the language model. */
export function licensedTextToModel(): boolean {
  return !claudeEnabled() || (process.env["VISUA_AICPA_AI_USE"] ?? "").trim().toLowerCase() === "permitted";
}

export const WITHHELD_NOTICE =
  "[Official AICPA text withheld from the AI model: AICPA's terms object to LLM use without written permission. Visua's summary is shown instead; the full text is visible to people in the Visua UI. Operators with AICPA permission can set VISUA_AICPA_AI_USE=permitted.]";
