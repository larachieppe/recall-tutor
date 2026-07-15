import {
  anthropic,
  MODEL,
  parseJsonFromMessage,
} from "./anthropic";
import type {
  Feedback,
  GenerateConfig,
  Question,
  QuestionType,
} from "./types";
import { QUESTION_TYPE_LABELS } from "./types";
import { randomUUID } from "crypto";

/** Keep prompts well under the context window; MVP-sized docs fit directly. */
export const MAX_SOURCE_CHARS = 60_000;

// --- Question generation -------------------------------------------------

const questionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string" },
          type: {
            type: "string",
            enum: ["short_answer", "application", "compare_contrast"],
          },
          topic: { type: "string" },
          reference_answer: { type: "string" },
          source_excerpt: { type: "string" },
          rubric: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                description: { type: "string" },
                points: { type: "integer" },
              },
              required: ["description", "points"],
            },
          },
        },
        required: [
          "question",
          "type",
          "topic",
          "reference_answer",
          "source_excerpt",
          "rubric",
        ],
      },
    },
  },
  required: ["questions"],
} as const;

const GENERATION_SYSTEM = `You are an expert tutor creating active-recall practice questions from a source document.

A good question:
- cannot be answered by copying a single sentence from the source
- IS fully answerable using only the source (no outside knowledge required)
- requires the learner to explain, compare, reason about causes, apply an idea to a new case, identify an assumption, or connect information from different parts of the source

Avoid:
- trivia and simple fact lookups ("What year was X founded?")
- vague or ambiguous wording
- duplicate or heavily overlapping questions
- anything the source does not support

For each question also produce:
- reference_answer: a concise, correct model answer grounded in the source
- rubric: 2-4 independently checkable criteria, each worth a whole number of points that together sum to exactly 10. Each criterion describes one specific idea the answer should contain.
- source_excerpt: a short verbatim (or near-verbatim) passage from the source that supports the answer

Return ONLY the JSON object matching the schema.`;

function difficultyGuidance(config: GenerateConfig): string {
  switch (config.difficulty) {
    case "easy":
      return "Target EASY difficulty: mostly one-step reasoning and explanation in the learner's own words, still requiring understanding rather than copying.";
    case "hard":
      return "Target HARD difficulty: multi-step reasoning, synthesis across sections, edge cases, and application to novel scenarios.";
    default:
      return "Target MEDIUM difficulty: each question needs interpretation, reasoning, comparison, or application — more than recall, but answerable from the source.";
  }
}

export async function generateQuestions(
  source: string,
  config: GenerateConfig,
): Promise<Question[]> {
  const types = config.types.length
    ? config.types
    : (["short_answer", "application", "compare_contrast"] as QuestionType[]);
  const typeList = types.map((t) => `- ${QUESTION_TYPE_LABELS[t]} (${t})`).join("\n");

  const focusLine = config.focus.trim()
    ? `\nFocus especially on this area if the source covers it: ${config.focus.trim()}`
    : "";

  const truncated = source.slice(0, MAX_SOURCE_CHARS);

  const userPrompt = `${difficultyGuidance(config)}

Generate exactly ${config.count} question(s). Distribute them across these question types:
${typeList}
${focusLine}

SOURCE DOCUMENT:
"""
${truncated}
"""`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: questionSchema },
    },
    system: GENERATION_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const parsed = parseJsonFromMessage<{ questions: RawQuestion[] }>(
    message.content,
  );

  return parsed.questions.map((q) => normalizeQuestion(q, config.difficulty));
}

interface RawQuestion {
  question: string;
  type: QuestionType;
  topic: string;
  reference_answer: string;
  source_excerpt: string;
  rubric: { description: string; points: number }[];
}

function normalizeQuestion(
  q: RawQuestion,
  difficulty: GenerateConfig["difficulty"],
): Question {
  // Re-scale rubric points to sum to exactly 10 so scoring is consistent.
  const total = q.rubric.reduce((s, c) => s + (c.points || 0), 0) || 1;
  const rubric = q.rubric.map((c) => ({
    description: c.description,
    points: Math.max(1, Math.round((c.points / total) * 10)),
  }));
  return {
    id: randomUUID(),
    question: q.question,
    type: q.type,
    topic: q.topic,
    difficulty,
    reference_answer: q.reference_answer,
    source_excerpt: q.source_excerpt,
    rubric,
  };
}

// --- Answer grading ------------------------------------------------------

const feedbackSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    criteria: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          description: { type: "string" },
          points_possible: { type: "integer" },
          points_awarded: { type: "integer" },
          status: { type: "string", enum: ["met", "partial", "missing"] },
          evidence: { type: "string" },
        },
        required: [
          "description",
          "points_possible",
          "points_awarded",
          "status",
          "evidence",
        ],
      },
    },
    correct: { type: "string" },
    missing: { type: "string" },
    incorrect: { type: "string" },
    improved_answer: { type: "string" },
    follow_up: { type: "string" },
  },
  required: [
    "criteria",
    "correct",
    "missing",
    "incorrect",
    "improved_answer",
    "follow_up",
  ],
} as const;

const GRADING_SYSTEM = `You are a fair, encouraging tutor grading a learner's free-text answer against a rubric.

Rules:
- Evaluate each rubric criterion INDEPENDENTLY. Award its full points if the idea is clearly present, partial points if partially present, zero if absent.
- Do NOT require exact wording. Give credit for any conceptually correct explanation, including valid alternative phrasing or examples.
- Ground your judgment in the provided source and reference answer. Do NOT penalize the learner for omitting things outside the rubric, and do NOT introduce facts absent from the source.
- In "evidence", quote or paraphrase the part of the learner's answer that earned or missed each criterion.
- "correct": what the learner got right. "missing": key points they left out. "incorrect": any claims that are wrong or unsupported (write "None." if there are none).
- "improved_answer": a concise, stronger model answer.
- "follow_up": one short follow-up question that pushes their understanding deeper.

Return ONLY the JSON object matching the schema.`;

export async function gradeAnswer(
  question: Question,
  answer: string,
): Promise<Feedback> {
  const rubricText = question.rubric
    .map((c, i) => `${i + 1}. (${c.points} pts) ${c.description}`)
    .join("\n");

  const userPrompt = `QUESTION:
${question.question}

SUPPORTING SOURCE PASSAGE:
"""
${question.source_excerpt}
"""

REFERENCE ANSWER:
${question.reference_answer}

RUBRIC (points sum to 10):
${rubricText}

LEARNER'S ANSWER:
"""
${answer.trim() || "(left blank)"}
"""

Grade the learner's answer now.`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: feedbackSchema },
    },
    system: GRADING_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = parseJsonFromMessage<Omit<Feedback, "score">>(message.content);
  const score = raw.criteria.reduce(
    (s, c) => s + Math.max(0, Math.min(c.points_awarded, c.points_possible)),
    0,
  );
  return { ...raw, score: Math.max(0, Math.min(10, Math.round(score))) };
}
