import type { Question } from "../types";

export type CriterionStatus = "met" | "partial" | "missing";

/** One labeled evaluation example. Store as JSONL (one per line). */
export interface EvalItem {
  id: string;
  question: Question; // full question incl. rubric, reference_answer, source_excerpt
  studentAnswer: string;
  humanScore: number; // 0–10 gold grade
  /** Optional per-rubric-criterion human labels, aligned to question.rubric order. */
  humanCriteria?: CriterionStatus[];
  notes?: string;
}

/** One graded result produced by `npm run eval`. */
export interface RawResult {
  id: string;
  humanScore: number;
  rubricScore: number; // rubric grader (the app's grader)
  rubricScores?: number[]; // present when EVAL_REPEATS > 1 (for variance)
  referenceScore?: number; // reference-answer-only grader (for comparison)
  aiCriteria?: CriterionStatus[];
  humanCriteria?: CriterionStatus[];
}
