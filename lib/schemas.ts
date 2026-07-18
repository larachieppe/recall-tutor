import { z } from "zod";

/** API input schemas + a small helper. Validation runs before any model call. */

export const generateInput = z.object({
  source: z
    .string()
    .min(120, "Source text is too short to generate good questions."),
  count: z.coerce.number().int().min(1).max(15).catch(5),
  difficulty: z.enum(["easy", "medium", "hard"]).catch("medium"),
  types: z
    .array(
      z.enum([
        "short_answer",
        "application",
        "compare_contrast",
        "multiple_choice",
      ]),
    )
    .catch([]),
  focus: z.string().catch(""),
});

export const summaryInput = z.object({
  source: z.string().min(120, "Source text is too short to summarize."),
});

const rubricCriterion = z.object({
  description: z.string(),
  points: z.number(),
});

export const questionInput = z.object({
  id: z.string().optional(),
  question: z.string().min(1),
  type: z.string().optional(),
  topic: z.string().optional(),
  difficulty: z.string().optional(),
  reference_answer: z.string(),
  source_excerpt: z.string().optional().default(""),
  choices: z.array(z.string()).optional(),
  answer_index: z.number().optional(),
  rubric: z.array(rubricCriterion).min(1),
});

export const gradeInput = z.object({
  question: questionInput,
  answer: z.string().catch(""),
});

export const tutorInput = z.object({
  question: z.string().min(1),
  sourceExcerpt: z.string().catch(""),
  referenceAnswer: z.string().catch(""),
  studentAnswer: z.string().catch(""),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
});

export const urlInput = z.object({
  url: z.string().regex(/^https?:\/\//i, "Please provide a valid http(s) URL."),
});

export const libraryPutInput = z.object({
  library: z.record(z.string(), z.unknown()),
});

export const pushSubscribeInput = z.object({
  endpoint: z.string().regex(/^https?:\/\//i, "Invalid push endpoint."),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const pushUnsubscribeInput = z.object({
  endpoint: z.string().min(1),
});

/** Validate a request body; returns the typed data or a user-facing message. */
export function parseBody<T>(
  schema: z.ZodType<T>,
  body: unknown,
): { ok: true; data: T } | { ok: false; error: string } {
  const r = schema.safeParse(body);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, error: r.error.issues[0]?.message || "Invalid request." };
}
