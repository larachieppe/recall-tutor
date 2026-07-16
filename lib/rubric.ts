/**
 * Deterministically rescale rubric weights so the points sum to exactly 10,
 * with each criterion worth at least 1 (when there are ≤10 criteria). Uses the
 * largest-remainder (Hamilton) method, so rounding never drifts off 10 — which
 * a naive per-criterion Math.round does.
 */
export function normalizeToTen(weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];

  const minEach = n <= 10 ? 1 : 0;
  const positive = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const total = positive.reduce((s, w) => s + w, 0) || n;

  const exact = positive.map((w) => (w / total) * 10);
  const points = exact.map((x) => Math.max(minEach, Math.floor(x)));
  let sum = points.reduce((s, x) => s + x, 0);

  // Hand out any shortfall to the largest fractional remainders.
  if (sum < 10) {
    const byRemainder = exact
      .map((x, i) => ({ i, r: x - Math.floor(x) }))
      .sort((a, b) => b.r - a.r);
    let k = 0;
    while (sum < 10) {
      points[byRemainder[k % n].i] += 1;
      sum += 1;
      k += 1;
    }
  }

  // Trim any overshoot from the currently-largest allocations (keep ≥ minEach).
  let guard = 0;
  while (sum > 10 && guard < 10_000) {
    let idx = -1;
    let max = minEach;
    for (let i = 0; i < n; i++) {
      if (points[i] > max) {
        max = points[i];
        idx = i;
      }
    }
    if (idx === -1) break; // everything at floor; can't reduce further
    points[idx] -= 1;
    sum -= 1;
    guard += 1;
  }

  return points;
}
