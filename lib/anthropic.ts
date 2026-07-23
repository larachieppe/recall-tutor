import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic();

/**
 * Fast, capable default for an interactive tutor. Override with ANTHROPIC_MODEL
 * (e.g. claude-opus-4-8 for max quality, claude-haiku-4-5 for lowest latency).
 */
export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

/** Lowest-latency model for snappy, lower-stakes calls (the tutor chat). */
export const FAST_MODEL =
  process.env.ANTHROPIC_FAST_MODEL || "claude-haiku-4-5-20251001";

/**
 * TTL for the cached source-document prefix.
 *
 * Cache reads cost ~0.1x input; writes cost 1.25x at "5m" and 2x at "1h". The
 * default "5m" has the cheaper write but often expires while the learner is
 * answering questions, so the follow-up round ("another set", "practice weak
 * areas") misses. "1h" survives a whole study session but needs ~3 requests on
 * the same source to beat no caching. Start at 5m, watch the cache_read numbers
 * logged below, and switch to 1h if reads are consistently missing.
 */
export const CACHE_TTL: "5m" | "1h" =
  process.env.ANTHROPIC_CACHE_TTL === "1h" ? "1h" : "5m";

interface UsageLike {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

/**
 * Log token usage so cache effectiveness is observable. `cache_read` staying 0
 * across repeated requests on the same source means the prefix is being
 * invalidated (or the TTL expired before reuse).
 */
export function logUsage(label: string, usage: UsageLike | undefined): void {
  if (!usage) return;
  const read = usage.cache_read_input_tokens ?? 0;
  const write = usage.cache_creation_input_tokens ?? 0;
  console.log(
    `[usage:${label}] input=${usage.input_tokens ?? 0} cache_write=${write} cache_read=${read} output=${usage.output_tokens ?? 0}`,
  );
}

/**
 * Pull the first text block out of a message and JSON.parse it. When adaptive
 * thinking is on, content[0] is a thinking block, so we search for the text one.
 */
export function parseJsonFromMessage<T>(content: Anthropic.ContentBlock[]): T {
  const textBlock = content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Model returned no text block to parse.");
  }
  return JSON.parse(textBlock.text) as T;
}
