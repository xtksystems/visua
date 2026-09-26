/**
 * Claude runtime: a streamed, manual tool-use loop with glass-box step
 * recording. Uses adaptive thinking (summarized, so reasoning is visible in
 * the flight recorder), prompt caching of the static system prompt, eager
 * tool-input streaming with schema validation before execution, and
 * server-side refusal fallbacks.
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { AgentDefinition } from "./agents.ts";
import { systemPrompt } from "./agents.ts";
import type { AgentHost, AgentResult } from "./host.ts";
import { toolByName, type AgentTool } from "./tools.ts";

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

type BetaTool = Anthropic.Beta.BetaTool;
type BetaMessageParam = Anthropic.Beta.BetaMessageParam;
type BetaToolResult = Anthropic.Beta.BetaToolResultBlockParam;

export function toolSchema(tool: AgentTool): BetaTool["input_schema"] {
  const json = z.toJSONSchema(tool.schema) as Record<string, unknown>;
  delete json["$schema"];
  return json as BetaTool["input_schema"];
}

function toBetaTool(tool: AgentTool): BetaTool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: toolSchema(tool),
    // Stream large tool inputs (policy bodies) as they are generated; inputs are
    // validated against the Zod schema before any tool runs.
    eager_input_streaming: true,
  };
}

function firstLine(text: string, max = 110): string {
  const line = text.trim().split("\n").find((l) => l.trim()) ?? "";
  const clean = line.replace(/^[#*\-\s]+/, "").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function summarizeResult(value: unknown): string {
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (typeof v["error"] === "string") return `Error: ${v["error"]}`;
    if (typeof v["proposalId"] === "string") return `Proposal ${v["status"] === "applied" ? "applied" : "staged for approval"}`;
    for (const key of ["hits", "rows", "tasks", "evidence", "mappings", "connectors"]) {
      if (Array.isArray(v[key])) return `${(v[key] as unknown[]).length} ${key}`;
    }
  }
  return "Done";
}

export async function runWithClaude(host: AgentHost, def: AgentDefinition, contextText: string, goal: string): Promise<AgentResult> {
  const model = configuredModel();
  const client = new Anthropic();
  const tools = def.tools.map((name) => toolByName(name)).filter((t): t is AgentTool => !!t);
  const betaTools = tools.map(toBetaTool);
  const messages: BetaMessageParam[] = [
    {
      role: "user",
      content: [
        { type: "text", text: contextText },
        { type: "text", text: `Request: ${goal}` },
      ],
    },
  ];
  const usage = { inputTokens: 0, outputTokens: 0 };
  let finalText = "";
  let jsonRetries = 0;

  host.step({ type: "plan", title: `${def.name} started with ${model}`, detail: goal });

  for (let turn = 0; turn < def.maxTurns; turn++) {
    if (host.signal.aborted) throw new Error("Run cancelled");
    const stream = client.beta.messages.stream(
      {
        model,
        max_tokens: 32000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive", display: "summarized" },
        output_config: { effort: def.effort },
        system: [{ type: "text", text: systemPrompt(def), cache_control: { type: "ephemeral" } }],
        tools: betaTools,
        messages,
      },
      { signal: host.signal },
    );

    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await stream.finalMessage();
      jsonRetries = 0;
    } catch (err) {
      // Only an unparseable eager tool input is retried; API errors propagate.
      if (err instanceof Anthropic.APIError || host.signal.aborted || jsonRetries++ >= 2) throw err;
      host.step({ type: "error", title: "A tool input could not be parsed — retrying the turn" });
      continue;
    }

    usage.inputTokens += message.usage.input_tokens + (message.usage.cache_read_input_tokens ?? 0) + (message.usage.cache_creation_input_tokens ?? 0);
    usage.outputTokens += message.usage.output_tokens;

    let turnText = "";
    for (const block of message.content) {
      if (block.type === "thinking" && block.thinking.trim()) {
        host.step({ type: "thought", title: firstLine(block.thinking), detail: block.thinking });
      } else if (block.type === "text" && block.text.trim()) {
        turnText += block.text;
      }
    }

    if (message.stop_reason === "refusal") {
      host.step({
        type: "error",
        title: "The model declined this request",
        detail: message.stop_details?.explanation ?? undefined,
      });
      finalText = turnText || "The request was declined by the model's safety systems. Try rephrasing the goal.";
      break;
    }
    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }

    const toolUses = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (!toolUses.length) {
      finalText = turnText;
      break;
    }
    if (message.stop_reason === "max_tokens") {
      throw new Error("A tool input was truncated at max_tokens; the run was stopped before executing it.");
    }
    if (turnText.trim()) host.step({ type: "message", title: firstLine(turnText), detail: turnText });

    messages.push({ role: "assistant", content: message.content });

    const results = await Promise.all(
      toolUses.map(async (use): Promise<BetaToolResult> => {
        const tool = toolByName(use.name);
        if (!tool || !def.tools.includes(use.name)) {
          return { type: "tool_result", tool_use_id: use.id, is_error: true, content: `Unknown tool '${use.name}'` };
        }
        const parsed = tool.schema.safeParse(use.input);
        if (!parsed.success) {
          return {
            type: "tool_result",
            tool_use_id: use.id,
            is_error: true,
            content: JSON.stringify({ INVALID_INPUT: z.prettifyError(parsed.error), received: use.input }),
          };
        }
        host.step({ type: "tool-call", title: use.name, data: parsed.data });
        try {
          const out = await tool.run(host, parsed.data);
          host.step({ type: "tool-result", title: `${use.name}: ${summarizeResult(out)}`, data: out });
          return { type: "tool_result", tool_use_id: use.id, content: JSON.stringify(out) };
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err);
          host.step({ type: "error", title: `${use.name} failed`, detail });
          return { type: "tool_result", tool_use_id: use.id, is_error: true, content: detail };
        }
      }),
    );
    // All tool results go back in a single user message.
    messages.push({ role: "user", content: results });
  }

  if (!finalText) finalText = "Reached the step limit for this run. Review the proposals and continue with a narrower goal if needed.";
  host.step({ type: "message", title: firstLine(finalText) || "Summary", detail: finalText });
  return { summary: finalText, mode: "claude", model, usage };
}
