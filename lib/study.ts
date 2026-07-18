import {
  anthropic,
  MODEL,
  parseJsonFromMessage,
} from "./anthropic";
import type {
  Feedback,
  GenerateConfig,
  Overview,
  Question,
  QuestionType,
} from "./types";
import { QUESTION_TYPE_LABELS } from "./types";
import { normalizeToTen } from "./rubric";
import { assembleSource } from "./chunk";
import { verifyQuestions } from "./verify";
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
            enum: [
              "short_answer",
              "application",
              "compare_contrast",
              "multiple_choice",
            ],
          },
          topic: { type: "string" },
          reference_answer: { type: "string" },
          source_excerpt: { type: "string" },
          hint: { type: "string" },
          choices: {
            type: "array",
            items: { type: "string" },
            description:
              "For multiple_choice only: 3-4 answer options (leave empty otherwise).",
          },
          answer_index: {
            type: "integer",
            description:
              "For multiple_choice only: 0-based index of the correct option in choices (use 0 otherwise).",
          },
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
          "hint",
          "choices",
          "answer_index",
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
- hint: a SUBTLE nudge (one sentence) for a learner who is stuck. It should point them toward the right approach, the relevant idea, or what to think about — WITHOUT revealing the answer, naming the key terms from the reference answer, or giving it away. A good hint makes them think ("Consider what happens to the step size…"); a bad hint states the answer. Never include the answer in the hint.

For multiple_choice questions ONLY:
- choices: exactly 4 answer options. Exactly one is fully correct; the other three are plausible but wrong distractors grounded in the same source (common misconceptions, close-but-incomplete ideas, or true statements that don't answer the question). Keep options similar in length and style so the answer isn't obvious from format.
- answer_index: the 0-based index of the correct option within choices.
- reference_answer: the correct option's text, optionally with a one-sentence explanation of why it is correct.
- rubric: a single criterion worth 10 points ("Selects the correct option").
For all OTHER question types, set choices to an empty array and answer_index to 0.

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

  const assembled = assembleSource(source, MAX_SOURCE_CHARS);
  const coverageLine = assembled.truncated
    ? `\nThe SOURCE below is long, so it is assembled from ${assembled.sections} sections spanning the ENTIRE document (separated by "----- (section break) -----"). Draw questions from across ALL sections — including the later ones — for broad coverage; do not focus only on the beginning.`
    : "";

  // Over-generate a small buffer so the quality filter has candidates to choose
  // from without dropping below the requested count.
  const ask = Math.min(config.count + 1, 15);

  const userPrompt = `${difficultyGuidance(config)}

Generate exactly ${ask} question(s). Distribute them across these question types:
${typeList}
${focusLine}${coverageLine}

SOURCE DOCUMENT:
"""
${assembled.text}
"""`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: questionSchema },
    },
    system: GENERATION_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const parsed = parseJsonFromMessage<{ questions: RawQuestion[] }>(
    message.content,
  );

  const normalized = parsed.questions.map((q) =>
    normalizeQuestion(q, config.difficulty),
  );

  // Quality gate: drop duplicates, ungrounded, or answer-leaking questions.
  const { kept, dropped } = verifyQuestions(normalized, source, config.count);
  if (dropped.length) {
    const counts = dropped.reduce<Record<string, number>>((acc, d) => {
      acc[d.reason] = (acc[d.reason] || 0) + 1;
      return acc;
    }, {});
    console.log("[generate] quality filter dropped:", counts);
  }

  return (kept.length ? kept : normalized).slice(0, config.count);
}

interface RawQuestion {
  question: string;
  type: QuestionType;
  topic: string;
  reference_answer: string;
  source_excerpt: string;
  hint: string;
  choices?: string[];
  answer_index?: number;
  rubric: { description: string; points: number }[];
}

function normalizeQuestion(
  q: RawQuestion,
  difficulty: GenerateConfig["difficulty"],
): Question {
  // Deterministically rescale rubric points to sum to exactly 10.
  const points = normalizeToTen(q.rubric.map((c) => c.points || 0));
  const rubric = q.rubric.map((c, i) => ({
    description: c.description,
    points: points[i],
  }));

  // Multiple choice: keep choices only when they form a valid question, and
  // clamp the answer index into range. Otherwise fall back to short answer so
  // a malformed MC never reaches the learner as an unanswerable card.
  let type = q.type;
  let choices: string[] | undefined;
  let answer_index: number | undefined;
  if (q.type === "multiple_choice" && (q.choices?.length ?? 0) >= 2) {
    choices = q.choices!.map((c) => c.trim()).filter(Boolean);
    answer_index = Math.max(0, Math.min(choices.length - 1, q.answer_index ?? 0));
  } else if (q.type === "multiple_choice") {
    type = "short_answer";
  }

  return {
    id: randomUUID(),
    question: q.question,
    type,
    topic: q.topic,
    difficulty,
    reference_answer: q.reference_answer,
    source_excerpt: q.source_excerpt,
    hint: q.hint,
    choices,
    answer_index,
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
    output_config: {
      effort: "low",
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

// --- Didactic overview (study notes) -------------------------------------

const overviewSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    key_concepts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          term: { type: "string" },
          explanation: { type: "string" },
          example: { type: "string" },
        },
        required: ["term", "explanation", "example"],
      },
    },
    takeaways: { type: "array", items: { type: "string" } },
  },
  required: ["headline", "summary", "key_concepts", "takeaways"],
} as const;

const OVERVIEW_SYSTEM = `You are a teacher writing a short lesson that TEACHES a topic to someone encountering it for the FIRST time — not a summary for an expert.

Assume the learner has NO prior background. Build understanding from the ground up:
- Explain ideas in plain, everyday language. Define every technical term the first time it appears.
- Focus on intuition and the "why" — why each idea matters and how it actually works — not just what it is called.
- Prefer clarity over brevity. It is fine to spend a couple of sentences making something genuinely understandable.
- Teach in your OWN words; do not copy long passages verbatim.
- Use only what the source supports; do not add outside facts.

Produce:
- headline: one friendly sentence on what this lesson teaches
- summary: a short, plain-language introduction (3-5 sentences) that motivates the topic for a complete beginner
- key_concepts: 4-8 concepts, each with:
    - term: the concept's name
    - explanation: a clear teaching explanation in plain language (2-4 sentences) that defines the terms involved and builds intuition
    - example: a concrete example or simple analogy that makes the concept click
- takeaways: 3-6 short points worth remembering

Return ONLY the JSON object matching the schema.`;

export async function generateOverview(source: string): Promise<Overview> {
  const assembled = assembleSource(source, MAX_SOURCE_CHARS);
  const note = assembled.truncated
    ? " The source is assembled from sections spanning the whole document; summarize across all of it."
    : "";

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: overviewSchema },
    },
    system: OVERVIEW_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Write didactic study notes for this source.${note}\n\nSOURCE DOCUMENT:\n"""\n${assembled.text}\n"""`,
      },
    ],
  });

  return parseJsonFromMessage<Overview>(message.content);
}
