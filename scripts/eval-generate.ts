// Seed a labeling dataset from a source file: generates questions (with rubrics
// + reference answers) and writes stubs you fill with student answers + human
// grades. Usage: npm run eval:generate -- path/to/source.txt [count]
import "./_env";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { generateQuestions } from "../lib/study";
import type { EvalItem } from "../lib/eval/types";

const srcFile = process.argv[2];
const count = Number(process.argv[3] || 5);
if (!srcFile) {
  console.error("Usage: npm run eval:generate -- <source.txt> [count]");
  process.exit(1);
}

const source = readFileSync(srcFile, "utf8");
const questions = await generateQuestions(source, {
  difficulty: "medium",
  count,
  types: ["short_answer", "application", "compare_contrast"],
  focus: "",
});

const lines = questions.map((q, i) => {
  const item: EvalItem = {
    id: `item-${i + 1}`,
    question: q,
    studentAnswer: "",
    humanScore: 0,
    humanCriteria: q.rubric.map(() => "missing"),
    notes: "FILL IN: studentAnswer, humanScore (0-10), and humanCriteria per rubric criterion",
  };
  return JSON.stringify(item);
});

mkdirSync("eval", { recursive: true });
writeFileSync("eval/dataset.jsonl", lines.join("\n") + "\n");
console.log(
  `Wrote ${questions.length} question stubs to eval/dataset.jsonl.\n` +
    `Fill in studentAnswer + humanScore (+ humanCriteria) for each, then run: npm run eval`,
);
