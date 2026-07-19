import { describe, it, expect } from "vitest";
import {
  sessionToMarkdown,
  sessionToSummary,
  sessionToAnki,
  slugify,
} from "../lib/export";
import type { AnswerRecord } from "../lib/types";

function rec(topic: string, score: number, answer = "my answer"): AnswerRecord {
  return {
    question: {
      id: topic,
      question: `Explain ${topic}?`,
      type: "short_answer",
      topic,
      difficulty: "medium",
      reference_answer: "ref",
      source_excerpt: "src",
      rubric: [{ description: "c1", points: 10 }],
    },
    answer,
    feedback: {
      score,
      criteria: [],
      correct: "good",
      missing: score < 10 ? "some detail" : "",
      incorrect: "None.",
      improved_answer: "a stronger answer",
      follow_up: "",
    },
  };
}

describe("sessionToMarkdown", () => {
  it("includes score, topics, and per-question detail", () => {
    const md = sessionToMarkdown([rec("Loops", 8), rec("Loops", 4), rec("Types", 10)], {
      title: "My Notes",
    });
    expect(md).toContain("# My Notes");
    expect(md).toContain("22 / 30"); // 8+4+10
    expect(md).toContain("(73%)");
    expect(md).toContain("Loops");
    expect(md).toContain("Explain Types?");
    expect(md).toContain("Stronger answer:");
  });
});

describe("sessionToSummary", () => {
  it("splits strong and weak topics by 7/10 threshold", () => {
    const s = sessionToSummary([rec("Strong", 9), rec("Weak", 3)], { title: "T" });
    expect(s).toContain("✅ Strong: Strong");
    expect(s).toContain("📖 To review: Weak");
    expect(s).toContain("(60%)");
  });
});

describe("sessionToAnki", () => {
  it("emits Anki header directives and tab-separated front/back/tag rows", () => {
    const out = sessionToAnki([rec("Cell Biology", 8)]);
    const lines = out.split("\n");
    expect(lines[0]).toBe("#separator:tab");
    expect(lines).toContain("#html:true");
    expect(lines).toContain("#tags column:3");
    const row = lines[lines.length - 1].split("\t");
    expect(row).toHaveLength(3);
    expect(row[0]).toBe("Explain Cell Biology?"); // front = question
    expect(row[1]).toBe("ref"); // back = reference answer
    expect(row[2]).toBe("Cell_Biology"); // tag has no spaces
  });

  it("escapes tabs and newlines in fields", () => {
    const r = rec("T", 5);
    r.question.question = "Line1\nLine2\twith tab";
    const row = sessionToAnki([r]).split("\n").pop()!.split("\t");
    expect(row[0]).toBe("Line1<br>Line2 with tab");
  });
});

describe("slugify", () => {
  it("makes a filesystem-safe slug", () => {
    expect(slugify("Gradient Descent: A Primer!")).toBe("gradient-descent-a-primer");
    expect(slugify("")).toBe("session");
    expect(slugify("   ")).toBe("session");
  });
});
