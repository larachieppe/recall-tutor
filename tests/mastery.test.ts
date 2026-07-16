import { describe, it, expect } from "vitest";
import { topicMastery, weakTopics } from "../lib/session";
import type { AnswerRecord } from "../lib/types";

function rec(topic: string, score: number): AnswerRecord {
  return {
    question: { topic } as AnswerRecord["question"],
    answer: "",
    feedback: { score } as AnswerRecord["feedback"],
  };
}

const records = [rec("A", 8), rec("A", 6), rec("B", 3), rec("C", 9)];

describe("topicMastery", () => {
  it("averages scores per topic", () => {
    const a = topicMastery(records).find((t) => t.topic === "A")!;
    expect(a.avgScore).toBe(7);
    expect(a.answered).toBe(2);
  });
  it("sorts weakest topic first", () => {
    expect(topicMastery(records)[0].topic).toBe("B");
  });
});

describe("weakTopics", () => {
  it("returns topics averaging below 7", () => {
    expect(weakTopics(records)).toEqual(["B"]);
  });
});
