import { describe, it, expect } from "vitest";
import { recordStudyDay, activeStreak, type StreakData } from "../lib/streak";

describe("recordStudyDay", () => {
  it("starts a streak at 1", () => {
    expect(recordStudyDay(undefined, "2026-01-10")).toEqual({
      lastStudyDay: "2026-01-10",
      current: 1,
      longest: 1,
    });
  });

  it("is a no-op the same day", () => {
    const s: StreakData = { lastStudyDay: "2026-01-10", current: 3, longest: 5 };
    expect(recordStudyDay(s, "2026-01-10")).toBe(s);
  });

  it("increments on a consecutive day and tracks the longest", () => {
    const s: StreakData = { lastStudyDay: "2026-01-10", current: 3, longest: 3 };
    expect(recordStudyDay(s, "2026-01-11")).toEqual({
      lastStudyDay: "2026-01-11",
      current: 4,
      longest: 4,
    });
  });

  it("resets to 1 after a gap but keeps the longest", () => {
    const s: StreakData = { lastStudyDay: "2026-01-10", current: 6, longest: 6 };
    expect(recordStudyDay(s, "2026-01-13")).toEqual({
      lastStudyDay: "2026-01-13",
      current: 1,
      longest: 6,
    });
  });

  it("handles month boundaries", () => {
    const s: StreakData = { lastStudyDay: "2026-01-31", current: 2, longest: 2 };
    expect(recordStudyDay(s, "2026-02-01").current).toBe(3);
  });
});

describe("activeStreak", () => {
  const s: StreakData = { lastStudyDay: "2026-01-10", current: 4, longest: 9 };
  it("counts when studied today", () => {
    expect(activeStreak(s, "2026-01-10")).toBe(4);
  });
  it("stays alive when studied yesterday", () => {
    expect(activeStreak(s, "2026-01-11")).toBe(4);
  });
  it("is 0 once it lapses (2+ days)", () => {
    expect(activeStreak(s, "2026-01-12")).toBe(0);
  });
  it("is 0 with no data", () => {
    expect(activeStreak(undefined)).toBe(0);
  });
});
