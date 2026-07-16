import type { Question, Feedback } from "./types";
import type { EvalItem } from "./eval/types";

/**
 * Passively logs answered questions (question + your answer + the AI grade) to
 * localStorage as you use the app, so an evaluation dataset builds itself from
 * real usage. Export it, review/correct the human scores, and drop it into
 * `eval/dataset.jsonl`. Local-only; never synced or transmitted.
 */

const KEY = "recall.eval.capture.v1";
const MAX = 1000;

export interface Capture {
  id: string;
  question: Question;
  answer: string;
  aiScore: number;
  aiCriteria: ("met" | "partial" | "missing")[];
  capturedAt: number;
}

export function captureAnswer(
  question: Question,
  answer: string,
  feedback: Feedback,
): void {
  if (typeof window === "undefined") return;
  try {
    const arr: Capture[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    arr.push({
      id: crypto.randomUUID(),
      question,
      answer,
      aiScore: feedback.score,
      aiCriteria: feedback.criteria.map((c) => c.status),
      capturedAt: Date.now(),
    });
    localStorage.setItem(KEY, JSON.stringify(arr.slice(-MAX)));
  } catch {
    /* capture is best-effort */
  }
}

export function loadCaptures(): Capture[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as Capture[];
  } catch {
    return [];
  }
}

export function captureCount(): number {
  return loadCaptures().length;
}

export function clearCaptures(): void {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}

/**
 * Build a labeling dataset (JSONL). humanScore/humanCriteria are pre-filled with
 * the AI's values as a STARTING POINT — you must review and correct them before
 * the eval means anything (otherwise it just compares the AI to itself).
 */
export function capturesToJsonl(): string {
  return (
    loadCaptures()
      .map((c) => {
        const item: EvalItem = {
          id: c.id,
          question: c.question,
          studentAnswer: c.answer,
          humanScore: c.aiScore,
          humanCriteria: c.aiCriteria,
          notes:
            "auto-captured from app usage — REVIEW & CORRECT humanScore (and humanCriteria) to make this a real human label",
        };
        return JSON.stringify(item);
      })
      .join("\n") + "\n"
  );
}
