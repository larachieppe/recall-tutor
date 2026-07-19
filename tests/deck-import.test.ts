import { describe, it, expect } from "vitest";
import { parseDeck } from "../lib/deck-import";
import { sessionToAnki } from "../lib/export";
import type { AnswerRecord } from "../lib/types";

describe("parseDeck", () => {
  it("parses a tab-separated deck (front, back, tag)", () => {
    const { questions, skipped } = parseDeck(
      "What is 2+2?\t4\tMath\nCapital of France?\tParis\tGeography",
    );
    expect(skipped).toBe(0);
    expect(questions).toHaveLength(2);
    expect(questions[0].question).toBe("What is 2+2?");
    expect(questions[0].reference_answer).toBe("4");
    expect(questions[0].topic).toBe("Math");
    expect(questions[0].type).toBe("short_answer");
    expect(questions[0].rubric[0].points).toBe(10);
  });

  it("honors #separator and skips directive/comment lines", () => {
    const { questions } = parseDeck(
      "#separator:comma\n#html:true\nFront one,Back one\nFront two,Back two",
    );
    expect(questions).toHaveLength(2);
    expect(questions[1].reference_answer).toBe("Back two");
  });

  it("sniffs comma when there are no tabs", () => {
    const { questions } = parseDeck("a,b\nc,d");
    expect(questions).toHaveLength(2);
    expect(questions[0].topic).toBe("Imported"); // no tag column
  });

  it("respects quoted fields containing the separator", () => {
    const { questions } = parseDeck('"Hello, world","A greeting"');
    expect(questions[0].question).toBe("Hello, world");
    expect(questions[0].reference_answer).toBe("A greeting");
  });

  it("converts <br> back to newlines and skips incomplete rows", () => {
    const { questions, skipped } = parseDeck(
      "Line1<br>Line2\tBack\nonlyfront\t\n\tonlyback",
    );
    expect(questions).toHaveLength(1);
    expect(questions[0].question).toBe("Line1\nLine2");
    expect(skipped).toBe(2);
  });

  it("round-trips with the Anki export", () => {
    const rec: AnswerRecord = {
      question: {
        id: "1",
        question: "What is spaced repetition?",
        type: "short_answer",
        topic: "Learning Science",
        difficulty: "medium",
        reference_answer: "Reviewing at increasing intervals.",
        source_excerpt: "s",
        rubric: [{ description: "c", points: 10 }],
      },
      answer: "x",
      feedback: {
        score: 8,
        criteria: [],
        correct: "",
        missing: "",
        incorrect: "",
        improved_answer: "",
        follow_up: "",
      },
    };
    const anki = sessionToAnki([rec]);
    const { questions } = parseDeck(anki);
    expect(questions).toHaveLength(1);
    expect(questions[0].question).toBe("What is spaced repetition?");
    expect(questions[0].reference_answer).toBe("Reviewing at increasing intervals.");
    expect(questions[0].topic).toBe("Learning Science");
  });
});
