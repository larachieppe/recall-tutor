import { describe, it, expect } from "vitest";
import {
  parseBody,
  generateInput,
  gradeInput,
  urlInput,
  tutorInput,
} from "../lib/schemas";

const longSource = "word ".repeat(50); // > 120 chars

describe("generateInput", () => {
  it("accepts a valid body", () => {
    const r = parseBody(generateInput, {
      source: longSource,
      count: 5,
      difficulty: "hard",
      types: ["short_answer"],
      focus: "x",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.difficulty).toBe("hard");
  });

  it("rejects a too-short source", () => {
    const r = parseBody(generateInput, { source: "short" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/too short/i);
  });

  it("defaults invalid config fields instead of failing", () => {
    const r = parseBody(generateInput, {
      source: longSource,
      count: 999,
      difficulty: "spicy",
      types: "nope",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.count).toBe(5); // 999 out of range → default
      expect(r.data.difficulty).toBe("medium"); // invalid → default
      expect(r.data.types).toEqual([]); // invalid → default
    }
  });
});

describe("urlInput", () => {
  it("accepts http(s) URLs", () => {
    expect(parseBody(urlInput, { url: "https://example.com" }).ok).toBe(true);
  });
  it("rejects non-http URLs", () => {
    const r = parseBody(urlInput, { url: "file:///etc/passwd" });
    expect(r.ok).toBe(false);
  });
});

describe("gradeInput", () => {
  const question = {
    question: "Why?",
    reference_answer: "Because.",
    rubric: [{ description: "c", points: 10 }],
  };
  it("accepts a valid question + answer", () => {
    expect(parseBody(gradeInput, { question, answer: "my answer" }).ok).toBe(
      true,
    );
  });
  it("rejects a question with no rubric", () => {
    const r = parseBody(gradeInput, {
      question: { ...question, rubric: [] },
      answer: "x",
    });
    expect(r.ok).toBe(false);
  });
  it("rejects a null body", () => {
    expect(parseBody(gradeInput, null).ok).toBe(false);
  });
});

describe("tutorInput", () => {
  const base = {
    question: "Why?",
    messages: [{ role: "user", content: "explain" }],
  };
  it("accepts a valid conversation", () => {
    expect(parseBody(tutorInput, base).ok).toBe(true);
  });
  it("requires at least one message", () => {
    expect(parseBody(tutorInput, { question: "Why?", messages: [] }).ok).toBe(
      false,
    );
  });
  it("rejects an invalid message role", () => {
    const r = parseBody(tutorInput, {
      question: "Why?",
      messages: [{ role: "system", content: "x" }],
    });
    expect(r.ok).toBe(false);
  });
});
