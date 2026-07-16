import { describe, it, expect } from "vitest";
import { verifyQuestions } from "../lib/verify";
import type { Question } from "../lib/types";

const source =
  "Gradient descent minimizes a loss function by taking steps proportional to the negative gradient. " +
  "A learning rate that is too large can cause the loss to oscillate or diverge instead of converging. " +
  "Momentum accumulates past gradients to smooth and speed up the updates.";

function q(over: Partial<Question>): Question {
  return {
    id: Math.random().toString(36).slice(2),
    question: "Why can a large learning rate prevent convergence?",
    type: "short_answer",
    topic: "Learning rate",
    difficulty: "medium",
    reference_answer:
      "A large step overshoots the minimum so the loss oscillates or diverges.",
    source_excerpt:
      "A learning rate that is too large can cause the loss to oscillate or diverge instead of converging.",
    rubric: [{ description: "overshooting", points: 10 }],
    ...over,
  };
}

describe("verifyQuestions", () => {
  it("keeps a valid, grounded question", () => {
    const { kept, dropped } = verifyQuestions([q({})], source, 5);
    expect(kept).toHaveLength(1);
    expect(dropped).toHaveLength(0);
  });

  it("drops near-duplicate questions", () => {
    const { kept, dropped } = verifyQuestions([q({}), q({})], source, 5);
    expect(kept).toHaveLength(1);
    expect(dropped[0].reason).toBe("duplicate");
  });

  it("drops a question whose excerpt isn't grounded in the source", () => {
    const bad = q({
      question: "What is the capital of France and why does it matter here?",
      source_excerpt:
        "Paris croissant baguette eiffel tower seine louvre montmartre",
    });
    const { kept, dropped } = verifyQuestions([bad], source, 5);
    expect(kept).toHaveLength(0);
    expect(dropped[0].reason).toBe("ungrounded-excerpt");
  });

  it("drops a question that leaks the reference answer", () => {
    const leaky = q({
      question:
        "A large step overshoots the minimum so the loss oscillates or diverges — explain.",
      reference_answer:
        "A large step overshoots the minimum so the loss oscillates or diverges.",
    });
    const { dropped } = verifyQuestions([leaky], source, 5);
    expect(dropped[0].reason).toBe("reveals-answer");
  });

  it("drops empty/malformed questions", () => {
    const { dropped } = verifyQuestions([q({ question: "" })], source, 5);
    expect(dropped[0].reason).toBe("empty");
  });

  it("respects the requested count (surplus dropped)", () => {
    const items = [
      q({ question: "First distinct question about the gradient step size?" }),
      q({ question: "Second distinct question about momentum smoothing?" }),
      q({ question: "Third distinct question about the loss diverging why?" }),
    ];
    const { kept, dropped } = verifyQuestions(items, source, 2);
    expect(kept).toHaveLength(2);
    expect(dropped.some((d) => d.reason === "surplus")).toBe(true);
  });
});
