// Compute metrics from eval/results/raw.json and write a JSON + Markdown report.
// No API needed. Usage: npm run eval:report
import { readFileSync, writeFileSync } from "node:fs";
import {
  mae,
  rmse,
  meanSignedError,
  pearson,
  quadraticWeightedKappa,
  prf,
  std,
  mean,
  type Pair,
} from "../lib/eval/metrics";
import type { RawResult } from "../lib/eval/types";

const raw: RawResult[] = JSON.parse(
  readFileSync("eval/results/raw.json", "utf8"),
);
const n = raw.length;

const rubricPairs: Pair[] = raw.map((r) => [r.humanScore, r.rubricScore]);
const refPairs: Pair[] = raw
  .filter((r) => typeof r.referenceScore === "number")
  .map((r) => [r.humanScore, r.referenceScore as number]);

// Criterion-level "met" detection (needs human criterion labels).
let tp = 0,
  fp = 0,
  fn = 0,
  critItems = 0;
for (const r of raw) {
  if (
    r.aiCriteria &&
    r.humanCriteria &&
    r.aiCriteria.length === r.humanCriteria.length
  ) {
    critItems += 1;
    for (let k = 0; k < r.aiCriteria.length; k++) {
      const aiMet = r.aiCriteria[k] === "met";
      const huMet = r.humanCriteria[k] === "met";
      if (aiMet && huMet) tp += 1;
      else if (aiMet && !huMet) fp += 1;
      else if (!aiMet && huMet) fn += 1;
    }
  }
}
const criterion = critItems > 0 ? { ...prf({ tp, fp, fn }), tp, fp, fn } : null;

// Grading consistency across repeated runs.
const withRepeats = raw.filter((r) => r.rubricScores && r.rubricScores.length > 1);
const consistency =
  withRepeats.length > 0
    ? { meanStdDev: mean(withRepeats.map((r) => std(r.rubricScores!))), items: withRepeats.length }
    : null;

const report = {
  generatedAt: new Date().toISOString(),
  n,
  rubric: {
    mae: mae(rubricPairs),
    rmse: rmse(rubricPairs),
    bias: meanSignedError(rubricPairs),
    pearson: pearson(rubricPairs),
    quadraticWeightedKappa: quadraticWeightedKappa(rubricPairs),
  },
  referenceBaseline:
    refPairs.length > 0
      ? {
          n: refPairs.length,
          mae: mae(refPairs),
          quadraticWeightedKappa: quadraticWeightedKappa(refPairs),
        }
      : null,
  criterionMetDetection: criterion,
  consistency,
};

writeFileSync("eval/results/report.json", JSON.stringify(report, null, 2));

const f = (x: number | undefined | null) =>
  x === null || x === undefined || Number.isNaN(x) ? "—" : x.toFixed(3);

let md = `# Grading evaluation report

Generated ${report.generatedAt} · n = ${n} labeled answers.

## Rubric grading vs. human grades

| Metric | Value |
|---|---|
| Mean absolute error (0–10) | ${f(report.rubric.mae)} |
| RMSE | ${f(report.rubric.rmse)} |
| Bias (AI − human) | ${f(report.rubric.bias)} |
| Pearson correlation | ${f(report.rubric.pearson)} |
| Quadratic weighted kappa | ${f(report.rubric.quadraticWeightedKappa)} |
`;

if (report.referenceBaseline) {
  md += `
## Rubric grading vs. reference-answer-only baseline

| Method | MAE | Weighted kappa |
|---|---|---|
| Rubric (this app) | ${f(report.rubric.mae)} | ${f(report.rubric.quadraticWeightedKappa)} |
| Reference-only baseline | ${f(report.referenceBaseline.mae)} | ${f(report.referenceBaseline.quadraticWeightedKappa)} |
`;
}

if (criterion) {
  md += `
## Criterion-level "met" detection (vs. human criterion labels)

| Metric | Value |
|---|---|
| Precision | ${f(criterion.precision)} |
| Recall | ${f(criterion.recall)} |
| F1 | ${f(criterion.f1)} |
| False-positive credit (fp) | ${criterion.fp} |
| False-negative (fn) | ${criterion.fn} |
`;
}

if (consistency) {
  md += `
## Grading consistency (repeated runs)

Mean within-item score std-dev across ${consistency.items} items: **${f(consistency.meanStdDev)}** (lower = more consistent).
`;
}

writeFileSync("eval/results/report.md", md);
console.log(md);
console.log("Wrote eval/results/report.json and eval/results/report.md");
