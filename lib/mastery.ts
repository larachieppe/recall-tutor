/**
 * A lightweight learner model: per-concept mastery updated from rubric-scored
 * answers, with SM-2 spaced-repetition scheduling. "Concept" is the question's
 * topic (normalized). Pure and deterministic, so it's unit-tested.
 */

export interface ConceptMastery {
  concept: string;
  attempts: number;
  averageScore: number; // 0–10, running mean
  mastery: number; // 0–1 estimate (recency-weighted)
  // SM-2 scheduling
  ease: number; // easiness factor (≥ 1.3)
  reps: number; // consecutive successful reviews
  intervalDays: number;
  lastPracticedAt: number; // epoch ms
  nextReviewAt: number; // epoch ms
  sourceItemId?: string; // history item this concept came from (for regeneration)
}

export type MasteryMap = Record<string, ConceptMastery>;

const DAY = 86_400_000;

export function conceptKey(topic: string): string {
  return topic.trim().toLowerCase();
}

/**
 * Update (or create) a concept's mastery from one graded answer.
 * `score` is 0–10; it maps to an SM-2 quality q∈[0,5].
 */
export function updateConcept(
  prev: ConceptMastery | undefined,
  concept: string,
  score: number,
  opts: { now?: number; sourceItemId?: string } = {},
): ConceptMastery {
  const now = opts.now ?? Date.now();
  const s = Math.max(0, Math.min(10, score));
  const q = Math.max(0, Math.min(5, Math.round(s / 2)));

  let ease = prev?.ease ?? 2.5;
  let reps = prev?.reps ?? 0;
  let intervalDays = prev?.intervalDays ?? 0;

  if (q >= 3) {
    if (reps === 0) intervalDays = 1;
    else if (reps === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * ease);
    reps += 1;
  } else {
    reps = 0;
    intervalDays = 1;
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  const attempts = (prev?.attempts ?? 0) + 1;
  const averageScore =
    ((prev?.averageScore ?? 0) * (prev?.attempts ?? 0) + s) / attempts;
  const mastery = prev
    ? prev.mastery * 0.6 + (s / 10) * 0.4
    : s / 10;

  return {
    concept: prev?.concept || concept,
    attempts,
    averageScore,
    mastery: Math.max(0, Math.min(1, mastery)),
    ease,
    reps,
    intervalDays,
    lastPracticedAt: now,
    nextReviewAt: now + intervalDays * DAY,
    sourceItemId: opts.sourceItemId ?? prev?.sourceItemId,
  };
}

export function isDue(c: ConceptMastery, now = Date.now()): boolean {
  return c.nextReviewAt <= now;
}

export function dueConcepts(map: MasteryMap, now = Date.now()): ConceptMastery[] {
  return Object.values(map)
    .filter((c) => isDue(c, now))
    .sort((a, b) => a.nextReviewAt - b.nextReviewAt);
}

/** Concepts below a mastery threshold, weakest first. */
export function weakConcepts(map: MasteryMap, threshold = 0.7): ConceptMastery[] {
  return Object.values(map)
    .filter((c) => c.mastery < threshold)
    .sort((a, b) => a.mastery - b.mastery);
}

/** All concepts, weakest first. */
export function allConcepts(map: MasteryMap): ConceptMastery[] {
  return Object.values(map).sort((a, b) => a.mastery - b.mastery);
}

/** Human-friendly "due in 3 days" / "due now". */
export function reviewLabel(c: ConceptMastery, now = Date.now()): string {
  const diff = c.nextReviewAt - now;
  if (diff <= 0) return "due now";
  const days = Math.round(diff / DAY);
  if (days <= 0) return "due today";
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}
