import { describe, it, expect } from "vitest";
import {
  gradeMultipleChoice,
  flashcardFeedback,
  FLASHCARD_SCORE,
  isLocallyGraded,
  calibration,
} from "../lib/grade-local";
import type { Question } from "../lib/types";

const mcQuestion: Question = {
  id: "q1",
  question: "Which is the capital of France?",
  type: "multiple_choice",
  topic: "Geography",
  difficulty: "easy",
  reference_answer: "Paris",
  source_excerpt: "Paris is the capital of France.",
  rubric: [{ description: "Selects the correct option", points: 10 }],
  choices: ["London", "Paris", "Berlin", "Rome"],
  answer_index: 1,
};

describe("gradeMultipleChoice", () => {
  it("awards 10 for the correct index and 'met' status", () => {
    const fb = gradeMultipleChoice(mcQuestion, 1);
    expect(fb.score).toBe(10);
    expect(fb.criteria[0].status).toBe("met");
    expect(fb.correct).toContain("Paris");
  });

  it("awards 0 for a wrong index and names the correct answer", () => {
    const fb = gradeMultipleChoice(mcQuestion, 0);
    expect(fb.score).toBe(0);
    expect(fb.criteria[0].status).toBe("missing");
    expect(fb.missing).toContain("Paris");
    expect(fb.incorrect).toContain("London");
  });

  it("treats no selection (-1) as incorrect", () => {
    expect(gradeMultipleChoice(mcQuestion, -1).score).toBe(0);
  });
});

describe("flashcardFeedback", () => {
  it("maps ratings to SM-2-friendly scores", () => {
    expect(flashcardFeedback(mcQuestion, "again").score).toBe(FLASHCARD_SCORE.again);
    expect(flashcardFeedback(mcQuestion, "easy").score).toBe(10);
    expect(flashcardFeedback(mcQuestion, "good").score).toBeGreaterThanOrEqual(7);
  });
});

describe("isLocallyGraded", () => {
  it("is true only for multiple choice", () => {
    expect(isLocallyGraded(mcQuestion)).toBe(true);
    expect(isLocallyGraded({ ...mcQuestion, type: "short_answer" })).toBe(false);
  });
});

describe("calibration", () => {
  it("counts overconfident and underconfident answers", () => {
    const c = calibration([
      { confidence: "high", feedback: { score: 2 } }, // overconfident
      { confidence: "high", feedback: { score: 9 } }, // fine
      { confidence: "low", feedback: { score: 8 } }, // underconfident
      { feedback: { score: 5 } }, // unrated, ignored
    ]);
    expect(c.overconfident).toBe(1);
    expect(c.underconfident).toBe(1);
    expect(c.rated).toBe(3);
  });
});
