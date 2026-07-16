/**
 * Heuristic source-evidence matching: split a source passage into sentences and,
 * for each rubric criterion, find the sentence that best supports it (by content-
 * word overlap). Pure + deterministic — unit-tested. No model call.
 */

const STOP = new Set(
  ("the a an and or but of to in on for with as is are was were be been being that " +
    "this it its by from at into than then so such not no can may which who whose " +
    "these those their there here when where how why what will would should could")
    .split(" "),
);

function contentWords(text: string): Set<string> {
  return new Set(
    (text.toLowerCase().match(/[a-z][a-z0-9]{2,}/g) ?? []).filter(
      (w) => !STOP.has(w),
    ),
  );
}

export function splitSentences(text: string): string[] {
  return (
    text
      .replace(/\s+/g, " ")
      .match(/[^.!?]+[.!?]*/g)
      ?.map((s) => s.trim())
      .filter(Boolean) ?? []
  );
}

export interface EvidenceMatch {
  sentences: string[];
  /** For each criterion, the index of its best-matching sentence (or -1). */
  criterionSentence: number[];
}

export function matchEvidence(
  excerpt: string,
  criteria: string[],
): EvidenceMatch {
  const sentences = splitSentences(excerpt);
  const sentWords = sentences.map(contentWords);

  const criterionSentence = criteria.map((desc) => {
    const cw = contentWords(desc);
    let best = -1;
    let bestScore = 0;
    sentWords.forEach((sw, i) => {
      let inter = 0;
      for (const w of cw) if (sw.has(w)) inter++;
      if (inter > bestScore) {
        bestScore = inter;
        best = i;
      }
    });
    return best;
  });

  return { sentences, criterionSentence };
}

/** Set of sentence indices that support at least one criterion. */
export function evidenceIndices(criterionSentence: number[]): Set<number> {
  return new Set(criterionSentence.filter((i) => i >= 0));
}
