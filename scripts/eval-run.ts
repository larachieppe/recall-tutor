// Grade every labeled answer with the rubric grader (and a reference-only
// baseline), optionally repeated for variance. Writes eval/results/raw.json.
// Usage: npm run eval   (needs ANTHROPIC_API_KEY; reads eval/dataset.jsonl)
import "./_env";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gradeAnswer } from "../lib/study";
import { gradeReferenceOnly } from "../lib/eval/reference-grade";
import type { EvalItem, RawResult } from "../lib/eval/types";

const DATASET = process.env.EVAL_DATASET || "eval/dataset.jsonl";
const REPEATS = Math.max(1, Number(process.env.EVAL_REPEATS || 1));

const items: EvalItem[] = readFileSync(DATASET, "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l));

if (items.length === 0) {
  console.error(`No items found in ${DATASET}. Run: npm run eval:generate -- <source.txt>`);
  process.exit(1);
}

const results: RawResult[] = [];
for (const [n, item] of items.entries()) {
  process.stdout.write(`Grading ${n + 1}/${items.length} (${item.id})… `);
  const rubricScores: number[] = [];
  let aiCriteria: RawResult["aiCriteria"];
  for (let r = 0; r < REPEATS; r++) {
    const fb = await gradeAnswer(item.question, item.studentAnswer);
    rubricScores.push(fb.score);
    if (r === 0) aiCriteria = fb.criteria.map((c) => c.status);
  }
  let referenceScore: number | undefined;
  try {
    referenceScore = await gradeReferenceOnly(item.question, item.studentAnswer);
  } catch {
    referenceScore = undefined;
  }
  results.push({
    id: item.id,
    humanScore: item.humanScore,
    rubricScore: rubricScores[0],
    rubricScores: REPEATS > 1 ? rubricScores : undefined,
    referenceScore,
    aiCriteria,
    humanCriteria: item.humanCriteria,
  });
  console.log(
    `rubric=${rubricScores[0]} ref=${referenceScore ?? "-"} human=${item.humanScore}`,
  );
}

mkdirSync("eval/results", { recursive: true });
writeFileSync("eval/results/raw.json", JSON.stringify(results, null, 2));
console.log(`\nWrote ${results.length} results to eval/results/raw.json — run: npm run eval:report`);
