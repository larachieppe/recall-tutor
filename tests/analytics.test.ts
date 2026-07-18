import { describe, it, expect } from "vitest";
import { scoreSeries } from "../lib/analytics";
import type { SavedSession } from "../lib/session";

function s(createdAt: number, total: number, max: number): SavedSession {
  return { id: String(createdAt), title: "t", createdAt, totalScore: total, maxScore: max, answers: [] };
}

describe("scoreSeries", () => {
  it("computes percentages and sorts oldest-first", () => {
    const out = scoreSeries([s(300, 5, 10), s(100, 7, 10), s(200, 3, 10)]);
    expect(out).toEqual([
      { at: 100, pct: 70 },
      { at: 200, pct: 30 },
      { at: 300, pct: 50 },
    ]);
  });

  it("skips sessions with no max score", () => {
    expect(scoreSeries([s(100, 0, 0)])).toEqual([]);
  });
});
