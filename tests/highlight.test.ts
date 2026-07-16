import { describe, it, expect } from "vitest";
import {
  splitSentences,
  matchEvidence,
  evidenceIndices,
} from "../lib/highlight";

describe("splitSentences", () => {
  it("splits on sentence punctuation", () => {
    expect(splitSentences("One thing. Two things! Three?")).toEqual([
      "One thing.",
      "Two things!",
      "Three?",
    ]);
  });
  it("collapses whitespace within a sentence", () => {
    expect(splitSentences("A\n\n  b   c.")).toEqual(["A b c."]);
  });
});

describe("matchEvidence", () => {
  const excerpt =
    "A large learning rate overshoots the minimum. This causes the loss to oscillate or diverge. Momentum smooths the updates.";
  const criteria = [
    "mentions overshooting the minimum",
    "notes the loss can oscillate or diverge",
    "explains momentum",
  ];

  it("maps each criterion to its best-matching sentence", () => {
    const { sentences, criterionSentence } = matchEvidence(excerpt, criteria);
    expect(sentences.length).toBe(3);
    expect(sentences[criterionSentence[0]]).toContain("overshoots");
    expect(sentences[criterionSentence[1]]).toContain("oscillate");
    expect(sentences[criterionSentence[2]]).toContain("Momentum");
  });

  it("returns -1 when a criterion has no lexical support", () => {
    const { criterionSentence } = matchEvidence(excerpt, [
      "discusses quantum entanglement",
    ]);
    expect(criterionSentence[0]).toBe(-1);
  });

  it("evidenceIndices collects supported sentence indices", () => {
    const { criterionSentence } = matchEvidence(excerpt, criteria);
    expect([...evidenceIndices(criterionSentence)].sort()).toEqual([0, 1, 2]);
  });
});
