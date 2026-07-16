import { anthropic, MODEL, parseJsonFromMessage } from "../anthropic";
import type { Question } from "../types";

/**
 * Baseline grader that scores 0–10 by comparing to the reference answer only
 * (no rubric). Used purely for the evaluation comparison against the app's
 * rubric grader — it is NOT used in the product.
 */
const schema = {
  type: "object",
  additionalProperties: false,
  properties: { score: { type: "integer" } },
  required: ["score"],
} as const;

export async function gradeReferenceOnly(
  question: Question,
  answer: string,
): Promise<number> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema },
    },
    system:
      'You grade a student\'s answer from 0 to 10 by how well it matches the reference answer. Return ONLY {"score": n}.',
    messages: [
      {
        role: "user",
        content: `QUESTION:\n${question.question}\n\nREFERENCE ANSWER:\n${question.reference_answer}\n\nSTUDENT ANSWER:\n${answer || "(blank)"}\n\nGrade 0-10.`,
      },
    ],
  });
  const r = parseJsonFromMessage<{ score: number }>(message.content);
  return Math.max(0, Math.min(10, Math.round(r.score)));
}
