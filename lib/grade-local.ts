import type { Confidence, Feedback, Question } from "./types";

/**
 * Deterministic, client-side grading for question formats that don't need the
 * model: multiple-choice (right/wrong) and flashcard self-rating. Runs
 * instantly, costs nothing, and works with no API key — so it also powers the
 * offline demo. Pure and unit-tested.
 */

/** Grade a multiple-choice answer by comparing the chosen index to the key. */
export function gradeMultipleChoice(
  question: Question,
  selectedIndex: number,
): Feedback {
  const choices = question.choices ?? [];
  const correctIndex = question.answer_index ?? -1;
  const correct = selectedIndex === correctIndex && correctIndex >= 0;
  const score = correct ? 10 : 0;
  const correctText = choices[correctIndex] ?? question.reference_answer;
  const chosenText =
    selectedIndex >= 0 ? choices[selectedIndex] : "(no selection)";

  return {
    score,
    criteria: [
      {
        description: "Selected the correct option",
        points_possible: 10,
        points_awarded: score,
        status: correct ? "met" : "missing",
        evidence: `You chose: ${chosenText}`,
      },
    ],
    correct: correct
      ? `Correct — "${correctText}" is right.`
      : "Not quite.",
    missing: correct ? "" : `The correct answer is "${correctText}".`,
    incorrect: correct ? "None." : `You chose "${chosenText}".`,
    improved_answer: question.reference_answer,
    follow_up: "",
  };
}

/** Flashcard self-rating mapped to an SM-2-friendly 0–10 score. */
export type FlashcardRating = "again" | "hard" | "good" | "easy";

/** What the StudyScreen hands back when a question is answered — covers
 *  free-text, multiple-choice, and flashcard self-rating in one shape. */
export interface GradeSubmission {
  answer: string;
  selectedIndex?: number;
  confidence?: Confidence;
  rating?: FlashcardRating;
}

export const FLASHCARD_SCORE: Record<FlashcardRating, number> = {
  again: 2,
  hard: 5,
  good: 8,
  easy: 10,
};

const FLASHCARD_LABEL: Record<FlashcardRating, string> = {
  again: "Didn't recall it",
  hard: "Recalled with difficulty",
  good: "Recalled it",
  easy: "Knew it cold",
};

/** Synthesize a Feedback from a flashcard self-rating so it flows through the
 *  same records/mastery/session pipeline as graded answers. */
export function flashcardFeedback(
  question: Question,
  rating: FlashcardRating,
): Feedback {
  const score = FLASHCARD_SCORE[rating];
  return {
    score,
    criteria: [
      {
        description: "Self-rated recall",
        points_possible: 10,
        points_awarded: score,
        status: score >= 7 ? "met" : score >= 4 ? "partial" : "missing",
        evidence: FLASHCARD_LABEL[rating],
      },
    ],
    correct: FLASHCARD_LABEL[rating] + ".",
    missing: "",
    incorrect: "None.",
    improved_answer: question.reference_answer,
    follow_up: "",
  };
}

/** True when a question is graded locally (no API call needed). */
export function isLocallyGraded(question: Question): boolean {
  return question.type === "multiple_choice";
}

/** Confidence-vs-score calibration: flags overconfident and underconfident
 *  answers so the learner can see where their self-assessment is off. */
export interface Calibration {
  overconfident: number; // high confidence, score < 5
  underconfident: number; // low confidence, score >= 7
  rated: number; // answers that carried a confidence rating
}

const CONF_RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

export function calibration(
  records: { confidence?: Confidence; feedback: { score: number } }[],
): Calibration {
  let over = 0;
  let under = 0;
  let rated = 0;
  for (const r of records) {
    if (!r.confidence) continue;
    rated++;
    const c = CONF_RANK[r.confidence];
    if (c === 2 && r.feedback.score < 5) over++;
    if (c === 0 && r.feedback.score >= 7) under++;
  }
  return { overconfident: over, underconfident: under, rated };
}
