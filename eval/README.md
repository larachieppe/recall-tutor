# Grading evaluation harness

Measures how well the app's **rubric grader** agrees with **human** grades, and
compares it to a reference-answer-only baseline. Nothing here is fabricated — the
numbers only exist once you provide labeled data and run it with your API key.

## What it measures

- **Rubric vs. human** — mean absolute error, RMSE, bias (AI − human), Pearson
  correlation, and quadratic weighted Cohen's kappa (agreement beyond chance).
- **Rubric vs. reference-only baseline** — does per-criterion rubric grading
  agree with humans better than a plain "compare to the reference answer" grader?
- **Criterion-level "met" detection** — precision / recall / F1, plus counts of
  false-positive credit and false-negatives (needs `humanCriteria` labels).
- **Consistency** — score variance across repeated runs on the same answer.

## Labeling a dataset

Each line of `eval/dataset.jsonl` is one `EvalItem` (see
[`lib/eval/types.ts`](../lib/eval/types.ts)). See
[`dataset.example.jsonl`](dataset.example.jsonl) for the format.

Two ways to build it:

1. **Seed from a source** (fills in questions/rubrics for you):

   ```bash
   npm run eval:generate -- path/to/source.txt 8
   ```

   Then open `eval/dataset.jsonl` and fill in each item's `studentAnswer`,
   `humanScore` (0–10), and optionally `humanCriteria` (one status per rubric
   criterion: `met` / `partial` / `missing`).

2. **Write it by hand** using the example as a template.

Aim for ~50–150 answers spanning the score range for a meaningful result.

## Running

```bash
npm run eval            # grades every answer (needs ANTHROPIC_API_KEY)
npm run eval:report     # computes metrics → eval/results/report.md
```

Options (env vars):

- `EVAL_DATASET=eval/dataset.example.jsonl` — grade the example set (a smoke test).
- `EVAL_REPEATS=5` — grade each answer 5× to measure consistency.

`report.md` is safe to quote in the top-level README once it reflects real data.
Your `eval/dataset.jsonl` and `eval/results/` are gitignored (they can be large /
private); commit `report.md` yourself if you want to publish the numbers.
