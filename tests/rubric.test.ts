import { describe, it, expect } from "vitest";
import { normalizeToTen } from "../lib/rubric";

const cases = [
  [3, 3, 3],
  [1, 1],
  [5, 3, 2],
  [1, 1, 1, 1],
  [0, 0],
  [7],
  [2, 2, 2, 2, 2],
  [10, 1],
  [1, 9],
  [4, 4, 4, 4],
];

describe("normalizeToTen", () => {
  it("always sums to exactly 10", () => {
    for (const c of cases) {
      expect(normalizeToTen(c).reduce((s, x) => s + x, 0)).toBe(10);
    }
  });

  it("gives every criterion at least 1 (for <=10 criteria)", () => {
    for (const c of cases) {
      for (const p of normalizeToTen(c)) expect(p).toBeGreaterThanOrEqual(1);
    }
  });

  it("preserves the number of criteria", () => {
    for (const c of cases) expect(normalizeToTen(c).length).toBe(c.length);
  });

  it("splits all-zero weights evenly to 10", () => {
    expect(normalizeToTen([0, 0])).toEqual([5, 5]);
  });

  it("gives a single criterion all 10", () => {
    expect(normalizeToTen([7])).toEqual([10]);
  });

  it("preserves already-valid proportions", () => {
    expect(normalizeToTen([5, 3, 2])).toEqual([5, 3, 2]);
  });

  it("handles the naive-rounding trap (3,3,3 → sum 9)", () => {
    // Math.round((3/9)*10)=3 for each → 9. Ours must be 10.
    expect(normalizeToTen([3, 3, 3]).reduce((s, x) => s + x, 0)).toBe(10);
  });

  it("returns [] for empty input", () => {
    expect(normalizeToTen([])).toEqual([]);
  });
});
