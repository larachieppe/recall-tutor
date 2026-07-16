import { describe, it, expect } from "vitest";
import { reducer, initialState, type State } from "../lib/study-machine";
import type {
  AnswerRecord,
  GenerateConfig,
  Overview,
  Question,
} from "../lib/types";

const cfg: GenerateConfig = {
  difficulty: "medium",
  count: 3,
  types: ["short_answer"],
  focus: "",
};
const meta = { title: "Src", length: 100 };
const q = (t: string): Question => ({
  id: t,
  question: t,
  type: "short_answer",
  topic: t,
  difficulty: "medium",
  reference_answer: "",
  source_excerpt: "",
  rubric: [{ description: "c", points: 10 }],
});
const rec = (score: number): AnswerRecord => ({
  question: q("x"),
  answer: "a",
  feedback: { score } as AnswerRecord["feedback"],
});
const overview: Overview = {
  headline: "h",
  summary: "s",
  key_concepts: [],
  takeaways: [],
};

describe("study-machine reducer", () => {
  it("navigates between meta screens and clears errors", () => {
    const s = reducer({ ...initialState, error: "boom" }, {
      type: "NAV",
      phase: "library",
    });
    expect(s.phase).toBe("library");
    expect(s.error).toBeNull();
  });

  it("GENERATE_START sets busy + source/config, keeps phase", () => {
    const s = reducer(initialState, {
      type: "GENERATE_START",
      source: "src",
      meta,
      config: cfg,
      itemId: "item1",
      label: "Generating…",
    });
    expect(s.busy).toBe(true);
    expect(s.config).toEqual(cfg);
    expect(s.currentItemId).toBe("item1");
    expect(s.phase).toBe("setup");
  });

  it("GENERATE_DONE with an overview goes to the overview screen", () => {
    const s = reducer(initialState, {
      type: "GENERATE_DONE",
      questions: [q("1")],
      overview,
    });
    expect(s.phase).toBe("overview");
    expect(s.busy).toBe(false);
    expect(s.index).toBe(0);
    expect(s.records).toEqual([]);
  });

  it("GENERATE_DONE without an overview goes straight to study", () => {
    const s = reducer(initialState, {
      type: "GENERATE_DONE",
      questions: [q("1")],
      overview: null,
    });
    expect(s.phase).toBe("study");
  });

  it("GENERATE_FAIL surfaces the error and clears busy", () => {
    const s = reducer({ ...initialState, busy: true }, {
      type: "GENERATE_FAIL",
      error: "nope",
    });
    expect(s.busy).toBe(false);
    expect(s.error).toBe("nope");
  });

  it("records answers and advances", () => {
    let s: State = reducer(initialState, {
      type: "GENERATE_DONE",
      questions: [q("1"), q("2")],
      overview: null,
    });
    s = reducer(s, { type: "ANSWERED", record: rec(7) });
    s = reducer(s, { type: "NEXT" });
    expect(s.records).toHaveLength(1);
    expect(s.index).toBe(1);
  });

  it("TO_STUDY and FINISH move overview→study→results", () => {
    let s = reducer(initialState, {
      type: "GENERATE_DONE",
      questions: [q("1")],
      overview,
    });
    s = reducer(s, { type: "TO_STUDY" });
    expect(s.phase).toBe("study");
    s = reducer(s, { type: "FINISH" });
    expect(s.phase).toBe("results");
  });

  it("RESTART returns to a clean setup state", () => {
    const dirty: State = {
      ...initialState,
      phase: "results",
      questions: [q("1")],
      records: [rec(5)],
      error: "x",
    };
    expect(reducer(dirty, { type: "RESTART" })).toEqual(initialState);
  });
});
