import type { Question } from "./types";

/**
 * Post-generation validation: filter out low-quality questions before they
 * reach the learner. Deterministic (no model call) and unit-tested. Checks:
 *  - not empty / has a reference answer + rubric
 *  - not a near-duplicate of a kept question
 *  - source excerpt is actually grounded in the document
 *  - the question text doesn't leak the reference answer
 */

const words = (t: string): Set<string> =>
  new Set((t || "").toLowerCase().match(/[a-z][a-z0-9]{2,}/g) ?? []);

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Fraction of `sub`'s words that appear in `sup`. */
function containment(sub: Set<string>, sup: Set<string>): number {
  if (sub.size === 0) return 1;
  let inter = 0;
  for (const w of sub) if (sup.has(w)) inter++;
  return inter / sub.size;
}

export type DropReason =
  | "empty"
  | "duplicate"
  | "ungrounded-excerpt"
  | "reveals-answer"
  | "surplus";

export interface Dropped {
  question: string;
  reason: DropReason;
}

export interface VerifyResult {
  kept: Question[];
  dropped: Dropped[];
}

export function verifyQuestions(
  questions: Question[],
  source: string,
  want: number,
): VerifyResult {
  const kept: Question[] = [];
  const dropped: Dropped[] = [];
  const keptWords: Set<string>[] = [];
  const sourceWords = words(source);

  for (const q of questions) {
    const text = (q.question || "").trim();

    if (kept.length >= want) {
      dropped.push({ question: text, reason: "surplus" });
      continue;
    }
    if (!text || !(q.reference_answer || "").trim() || !q.rubric?.length) {
      dropped.push({ question: text, reason: "empty" });
      continue;
    }

    const qw = words(text);
    if (keptWords.some((kw) => jaccard(qw, kw) > 0.8)) {
      dropped.push({ question: text, reason: "duplicate" });
      continue;
    }

    const exWords = words(q.source_excerpt);
    if (exWords.size >= 4 && containment(exWords, sourceWords) < 0.5) {
      dropped.push({ question: text, reason: "ungrounded-excerpt" });
      continue;
    }

    if (jaccard(qw, words(q.reference_answer)) > 0.6) {
      dropped.push({ question: text, reason: "reveals-answer" });
      continue;
    }

    kept.push(q);
    keptWords.push(qw);
  }

  return { kept, dropped };
}
