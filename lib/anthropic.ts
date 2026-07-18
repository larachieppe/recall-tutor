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
