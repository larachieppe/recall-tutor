import { anthropic, CACHE_TTL, logUsage, MODEL } from "./anthropic";
import type { SourceLink } from "./types";

/**
 * Research a topic with the web-search server tool: Claude runs several
 * searches, reads the results, and synthesizes a self-contained study document
 * grounded in what it found. That document then feeds the normal generation
 * pipeline exactly like a pasted source would.
 *
 * The block-shaped helpers (collectSources / extractText) are pure and
 * unit-tested; researchTopic() itself needs a key (web search is a billed
 * server tool), so it's verified structurally against a mock API.
 */

export type { SourceLink };

export interface ResearchResult {
  text: string;
  title: string;
  length: number;
  sources: SourceLink[];
}

// Basic web-search tool version — supported across all current models (the
// create() call is cast to `never` since these server-tool params predate this
// SDK version's typed unions; the fields are still sent on the wire).
const WEB_SEARCH_TOOL = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 8,
};

const RESEARCH_SYSTEM = `You are a subject-matter researcher assembling a study document. Given a TOPIC, use web search to gather accurate, current information from multiple reputable sources, then write a comprehensive, self-contained explainer that a motivated beginner could learn the topic from. The document will be used to generate quiz questions, so it must be factual and fully answerable on its own.

The document must:
- Teach from the ground up: define the key terms, explain the core concepts and how they actually work, cover the main subtopics, and include concrete examples.
- Be thorough but focused — roughly 700-1500 words, organized into clear sections with short headings.
- Ground every claim in what you found through search. Do NOT invent facts, and do NOT describe sources you didn't actually retrieve.
- Be plain teaching prose. Do NOT add a bibliography, footnotes, or inline citation markers — just the explanatory content.

Search several focused queries to cover the topic well before writing. When you have enough, write the document as your final message.`;

interface Block {
  type: string;
  text?: string;
  content?: unknown;
}

/** Join the assistant's text blocks into the study document. */
export function extractText(content: Block[]): string {
  return content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => (b.text as string).trim())
    .filter(Boolean)
    .join("\n\n");
}

/** Pull the retrieved pages (title + url) out of web_search_tool_result blocks,
 *  de-duplicated by URL and skipping error results. */
export function collectSources(content: Block[]): SourceLink[] {
  const out: SourceLink[] = [];
  const seen = new Set<string>();
  for (const block of content) {
    if (block.type !== "web_search_tool_result") continue;
    const results = block.content;
    if (!Array.isArray(results)) continue; // error results are a single object
    for (const r of results as Array<Record<string, unknown>>) {
      if (r?.type !== "web_search_result") continue;
      const url = typeof r.url === "string" ? r.url : "";
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push({
        url,
        title: typeof r.title === "string" && r.title ? r.title : url,
      });
    }
  }
  return out;
}

export async function researchTopic(topic: string): Promise<ResearchResult> {
  const clean = topic.trim();
  const userPrompt = `TOPIC: ${clean}\n\nResearch this topic and write the study document.`;

  const allContent: Block[] = [];
  let messages: Array<{ role: "user" | "assistant"; content: unknown }> = [
    { role: "user", content: userPrompt },
  ];
  let last: { content: Block[] } | null = null;

  // Web search runs a server-side loop; if it hits its iteration cap the turn
  // pauses. Re-send to resume (a few times) until it finishes writing.
  for (let i = 0; i < 5; i++) {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      output_config: { effort: "medium" },
      system: [
        {
          type: "text",
          text: RESEARCH_SYSTEM,
          cache_control: CACHE_TTL === "1h" ? { type: "ephemeral", ttl: "1h" } : { type: "ephemeral" },
        },
      ],
      tools: [WEB_SEARCH_TOOL],
      messages,
      // The server-tool block types predate this SDK version's unions.
    } as never);
    logUsage("research", (message as { usage?: unknown }).usage as never);
    const content = (message as unknown as { content: Block[] }).content;
    allContent.push(...content);
    last = { content };

    if ((message as { stop_reason?: string }).stop_reason === "pause_turn") {
      messages = [
        { role: "user", content: userPrompt },
        { role: "assistant", content },
      ];
      continue;
    }
    break;
  }

  const text = extractText(last?.content ?? allContent);
  return {
    text,
    title: clean,
    length: text.length,
    sources: collectSources(allContent),
  };
}
