import { describe, it, expect } from "vitest";
import { isResumable, type InProgress } from "../lib/progress-store";
import type { Question } from "../lib/types";

function q(id: string): Question {
  return {
    id,
    question: "?",
    type: "short_answer",
    topic: "t",
    difficulty: "medium",
    reference_answer: "a",
    source_excerpt: "s",
    rubric: [{ description: "c", points: 10 }],
  };
}

function snapshot(over: Partial<InProgress>): InProgress {
  return {
    version: 1,
    phase: "study",
    questions: [q("1"), q("2")],
    index: 0,
    records: [],
    config: { difficulty: "medium", count: 2, types: ["short_answer"], focus: "" },
    source: "src",
    meta: { title: "T", length: 3 },
    currentItemId: null,
    overview: null,
    savedAt: 0,
    ...over,
  };
}

describe("isResumable", () => {
  it("is true when questions remain unanswered", () => {
    expect(isResumable(snapshot({ records: [] }))).toBe(true);
  });

  it("is false when all questions are answered", () => {
    const rec = { question: q("1"), answer: "x", feedback: { score: 5, criteria: [], correct: "", missing: "", incorrect: "", improved_answer: "", follow_up: "" } };
    expect(isResumable(snapshot({ records: [rec, rec] }))).toBe(false);
  });

  it("is false for null / empty / wrong version", () => {
    expect(isResumable(null)).toBe(false);
    expect(isResumable(snapshot({ questions: [] }))).toBe(false);
    expect(isResumable(snapshot({ version: 2 as unknown as 1 }))).toBe(false);
  });
});
