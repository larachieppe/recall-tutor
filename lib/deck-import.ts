import type { Question } from "./types";

/**
 * Parse a flashcard deck (TSV or CSV) into study questions — no model call, no
 * key. Columns: front (question), back (answer), and an optional third column
 * of tags. Round-trips with the app's own Anki export (tab-separated, HTML
 * line breaks, `#` header directives). Pure and unit-tested.
 */

const MAX_CARDS = 300;

export interface ParsedDeck {
  questions: Question[];
  skipped: number; // rows dropped for missing front/back
}

/** Split one delimited line, respecting double-quoted fields (basic CSV/TSV). */
function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === sep) {
      out.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out;
}

/** Turn a stored field back into display text (Anki uses <br> for newlines). */
function cleanField(s: string): string {
  return (s || "").replace(/<br\s*\/?>/gi, "\n").trim();
}

function id(): string {
  // crypto.randomUUID exists in browsers and modern Node; fall back if not.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `card-${Math.random().toString(36).slice(2)}`;
}

export function parseDeck(text: string): ParsedDeck {
  const rawLines = (text || "").split(/\r?\n/);

  // Honor an explicit `#separator:` directive; otherwise sniff tab vs comma.
  let sep: string | null = null;
  const contentLines: string[] = [];
  for (const line of rawLines) {
    if (!line.trim()) continue;
    if (line.startsWith("#")) {
      const m = line.match(/^#separator:\s*(tab|comma|,|\t)/i);
      if (m) sep = /tab/i.test(m[1]) || m[1] === "\t" ? "\t" : ",";
      continue;
    }
    contentLines.push(line);
  }
  if (!sep) {
    sep = contentLines.some((l) => l.includes("\t")) ? "\t" : ",";
  }

  const questions: Question[] = [];
  let skipped = 0;
  for (const line of contentLines) {
    if (questions.length >= MAX_CARDS) break;
    const cols = splitLine(line, sep).map(cleanField);
    const front = cols[0] || "";
    const back = cols[1] || "";
    if (!front || !back) {
      skipped++;
      continue;
    }
    const topic = (cols[2] || "").replace(/_/g, " ").trim() || "Imported";
    questions.push({
      id: id(),
      question: front,
      type: "short_answer",
      topic,
      difficulty: "medium",
      reference_answer: back,
      source_excerpt: back,
      rubric: [{ description: "Recall the answer", points: 10 }],
    });
  }

  return { questions, skipped };
}
