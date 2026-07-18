import { describe, it, expect } from "vitest";
import { DEMO_QUESTIONS, DEMO_SOURCE, DEMO_OVERVIEW } from "../lib/demo";
import { gradeMultipleChoice } from "../lib/grade-local";

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

describe("demo data integrity", () => {
  it("every demo question is a well-formed multiple choice", () => {
    for (const q of DEMO_QUESTIONS) {
      expect(q.type).toBe("multiple_choice");
      expect(q.choices && q.choices.length).toBeGreaterThanOrEqual(2);
      expect(q.answer_index).toBeGreaterThanOrEqual(0);
      expect(q.answer_index!).toBeLessThan(q.choices!.length);
    }
  });

  it("grades the keyed answer as correct and a wrong pick as incorrect", () => {
    for (const q of DEMO_QUESTIONS) {
      expect(gradeMultipleChoice(q, q.answer_index!).score).toBe(10);
      const wrong = (q.answer_index! + 1) % q.choices!.length;
      expect(gradeMultipleChoice(q, wrong).score).toBe(0);
    }
  });

  it("each source excerpt actually appears in the demo source", () => {
    const source = norm(DEMO_SOURCE);
    for (const q of DEMO_QUESTIONS) {
      expect(source).toContain(norm(q.source_excerpt));
    }
  });

  it("has a complete overview", () => {
    expect(DEMO_OVERVIEW.key_concepts.length).toBeGreaterThanOrEqual(3);
    expect(DEMO_OVERVIEW.takeaways.length).toBeGreaterThanOrEqual(3);
  });
});
