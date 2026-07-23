/**
 * Prompt assembly for cache-friendly requests.
 *
 * Prompt caching is a strict PREFIX match: any byte that changes invalidates
 * everything after it. The source document is large and stable; the generation
 * instructions (difficulty, count, focus area) are small and change on every
 * "practice weak areas" / "another set". So the source must come FIRST, with
 * the cache breakpoint after it, and the volatile instructions LAST.
 *
 * Pure and unit-tested — the ordering is the whole point, so it's worth a test.
 */

export type CacheTtl = "5m" | "1h";

export interface CacheControl {
  type: "ephemeral";
  ttl?: "1h";
}

export interface PromptBlock {
  type: "text";
  text: string;
  cache_control?: CacheControl;
}

/** `ttl: "1h"` is only sent when requested — omitting it means the 5m default. */
export function cacheControl(ttl: CacheTtl): CacheControl {
  return ttl === "1h" ? { type: "ephemeral", ttl: "1h" } : { type: "ephemeral" };
}

/** Wrap the source document with the delimiters the prompts expect. */
export function sourceBlock(text: string): string {
  return `SOURCE DOCUMENT:\n"""\n${text}\n"""`;
}

/**
 * Build the user-message content: cached source first, volatile instructions
 * after the breakpoint.
 */
export function cachedSourcePrompt(
  source: string,
  instructions: string,
  ttl: CacheTtl,
): PromptBlock[] {
  return [
    { type: "text", text: sourceBlock(source), cache_control: cacheControl(ttl) },
    { type: "text", text: instructions },
  ];
}
