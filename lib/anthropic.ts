import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic();

/** Highest-quality default; override with ANTHROPIC_MODEL for lower cost. */
export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

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
