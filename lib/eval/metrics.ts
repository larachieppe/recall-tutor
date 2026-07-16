/**
 * Pure metric functions for the grading evaluation. No I/O, no API — so they're
 * unit-tested. `pairs` are [humanScore, aiScore] tuples on a 0–10 scale.
 */

export type Pair = [number, number];

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN;
}

export function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/** Mean absolute error between human and AI scores. */
export function mae(pairs: Pair[]): number {
  return mean(pairs.map(([h, a]) => Math.abs(h - a)));
}

export function rmse(pairs: Pair[]): number {
  return Math.sqrt(mean(pairs.map(([h, a]) => (h - a) ** 2)));
}

/** Mean signed error (ai − human): positive ⇒ the AI over-scores. */
export function meanSignedError(pairs: Pair[]): number {
  return mean(pairs.map(([h, a]) => a - h));
}

export function pearson(pairs: Pair[]): number {
  const n = pairs.length;
  if (n < 2) return NaN;
  const hs = pairs.map((p) => p[0]);
  const as = pairs.map((p) => p[1]);
  const mh = mean(hs);
  const ma = mean(as);
  let num = 0;
  let dh = 0;
  let da = 0;
  for (let i = 0; i < n; i++) {
    const x = hs[i] - mh;
    const y = as[i] - ma;
    num += x * y;
    dh += x * x;
    da += y * y;
  }
  if (dh === 0 || da === 0) return NaN;
  return num / Math.sqrt(dh * da);
}

/**
 * Quadratic weighted Cohen's kappa over integer ratings [min, max]. Measures
 * agreement beyond chance; 1 = perfect, 0 = chance, <0 = worse than chance.
 */
export function quadraticWeightedKappa(pairs: Pair[], min = 0, max = 10): number {
  const N = max - min + 1;
  if (pairs.length === 0) return NaN;
  const O = Array.from({ length: N }, () => new Array(N).fill(0));
  const rowTot = new Array(N).fill(0);
  const colTot = new Array(N).fill(0);
  const clamp = (v: number) => Math.max(0, Math.min(N - 1, Math.round(v) - min));
  for (const [h, a] of pairs) {
    const i = clamp(h);
    const j = clamp(a);
    O[i][j] += 1;
    rowTot[i] += 1;
    colTot[j] += 1;
  }
  const total = pairs.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const w = (i - j) ** 2 / (N - 1) ** 2;
      const e = (rowTot[i] * colTot[j]) / total;
      num += w * O[i][j];
      den += w * e;
    }
  }
  if (den === 0) return 1; // degenerate (all identical) ⇒ perfect agreement
  // Kappa is defined on [-1, 1]; clamp away floating-point overshoot.
  return Math.max(-1, Math.min(1, 1 - num / den));
}

export interface PRF {
  precision: number;
  recall: number;
  f1: number;
}

/** Precision / recall / F1 from a confusion count. */
export function prf({ tp, fp, fn }: { tp: number; fp: number; fn: number }): PRF {
  const precision = tp + fp === 0 ? NaN : tp / (tp + fp);
  const recall = tp + fn === 0 ? NaN : tp / (tp + fn);
  const f1 =
    !precision || !recall || precision + recall === 0
      ? NaN
      : (2 * precision * recall) / (precision + recall);
  return { precision, recall, f1 };
}
