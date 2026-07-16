import { describe, it, expect } from "vitest";
import {
  updateConcept,
  dueConcepts,
  weakConcepts,
  isDue,
  conceptKey,
  type MasteryMap,
} from "../lib/mastery";

const DAY = 86_400_000;
const t0 = 1_000_000_000_000;

describe("updateConcept", () => {
  it("initializes on first attempt", () => {
    const c = updateConcept(undefined, "Gradient descent", 8, { now: t0 });
    expect(c.attempts).toBe(1);
    expect(c.averageScore).toBe(8);
    expect(c.mastery).toBeCloseTo(0.8);
    expect(c.reps).toBe(1);
    expect(c.intervalDays).toBe(1);
    expect(c.nextReviewAt).toBe(t0 + DAY);
  });

  it("grows the interval on repeated passes (1 → 6 → longer)", () => {
    let c = updateConcept(undefined, "X", 10, { now: t0 });
    expect(c.intervalDays).toBe(1);
    c = updateConcept(c, "X", 10, { now: t0 });
    expect(c.intervalDays).toBe(6);
    c = updateConcept(c, "X", 10, { now: t0 });
    expect(c.intervalDays).toBeGreaterThan(6);
  });

  it("resets the schedule on a failing score", () => {
    let c = updateConcept(undefined, "X", 10, { now: t0 });
    c = updateConcept(c, "X", 10, { now: t0 });
    c = updateConcept(c, "X", 2, { now: t0 }); // q=1, fail
    expect(c.reps).toBe(0);
    expect(c.intervalDays).toBe(1);
  });

  it("keeps a running average and moves mastery toward recent scores", () => {
    let c = updateConcept(undefined, "X", 4, { now: t0 });
    c = updateConcept(c, "X", 10, { now: t0 });
    expect(c.attempts).toBe(2);
    expect(c.averageScore).toBe(7); // (4+10)/2
    expect(c.mastery).toBeGreaterThan(0.4); // pulled up by the 10
  });

  it("never lets ease drop below 1.3", () => {
    let c = updateConcept(undefined, "X", 0, { now: t0 });
    for (let i = 0; i < 5; i++) c = updateConcept(c, "X", 0, { now: t0 });
    expect(c.ease).toBeGreaterThanOrEqual(1.3);
  });

  it("carries the source item id", () => {
    const c = updateConcept(undefined, "X", 8, { now: t0, sourceItemId: "src1" });
    expect(c.sourceItemId).toBe("src1");
  });
});

describe("scheduling queries", () => {
  const map: MasteryMap = {
    a: updateConcept(undefined, "A", 3, { now: t0 - 10 * DAY }), // weak, long past
    b: updateConcept(undefined, "B", 10, { now: t0 }), // strong, due tomorrow
  };

  it("isDue / dueConcepts finds past-due concepts", () => {
    expect(isDue(map.a, t0)).toBe(true);
    expect(isDue(map.b, t0)).toBe(false);
    expect(dueConcepts(map, t0).map((c) => c.concept)).toEqual(["A"]);
  });

  it("weakConcepts filters by mastery", () => {
    expect(weakConcepts(map).map((c) => c.concept)).toEqual(["A"]);
  });
});

describe("conceptKey", () => {
  it("normalizes case and whitespace", () => {
    expect(conceptKey("  Gradient Descent ")).toBe("gradient descent");
  });
});
