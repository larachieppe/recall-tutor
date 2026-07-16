import { describe, it, expect } from "vitest";
import {
  mae,
  rmse,
  meanSignedError,
  pearson,
  quadraticWeightedKappa,
  prf,
  std,
  type Pair,
} from "../lib/eval/metrics";

const pairs: Pair[] = [
  [8, 6],
  [5, 5],
  [10, 7],
];

describe("error metrics", () => {
  it("mae", () => expect(mae(pairs)).toBeCloseTo(5 / 3, 4));
  it("rmse", () => expect(rmse(pairs)).toBeCloseTo(Math.sqrt(13 / 3), 4));
  it("meanSignedError (negative ⇒ AI under-scores)", () =>
    expect(meanSignedError(pairs)).toBeCloseTo(-5 / 3, 4));
  it("pearson", () => expect(pearson(pairs)).toBeCloseTo(0.9934, 3));
  it("std", () => expect(std([4, 6])).toBeCloseTo(1, 4));
});

describe("quadraticWeightedKappa", () => {
  it("is 1 for perfect agreement", () => {
    expect(
      quadraticWeightedKappa([
        [0, 0],
        [5, 5],
        [10, 10],
        [3, 3],
      ]),
    ).toBeCloseTo(1, 6);
  });
  it("stays within [-1, 1]", () => {
    const k = quadraticWeightedKappa([
      [0, 10],
      [10, 0],
      [5, 5],
    ]);
    expect(k).toBeGreaterThanOrEqual(-1);
    expect(k).toBeLessThanOrEqual(1);
  });
});

describe("prf", () => {
  it("computes precision/recall/f1", () => {
    const { precision, recall, f1 } = prf({ tp: 3, fp: 1, fn: 2 });
    expect(precision).toBeCloseTo(0.75, 4);
    expect(recall).toBeCloseTo(0.6, 4);
    expect(f1).toBeCloseTo(2 / 3, 4);
  });
});
