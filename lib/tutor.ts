import { anthropic, FAST_MODEL } from "./anthropic";

export interface TutorTurn {
  role: "user" | "assistant";
  content: string;
}

export interface TutorContext {
  question: string;
  sourceExcerpt: string;
  referenceAnswer: string;
  studentAnswer: string;
}

function system(ctx: TutorContext): string {
  return `You are a patient, concise tutor helping a learner understand a concept they just practiced.

THE QUESTION THEY ANSWERED:
${ctx.question}

SUPPORTING SOURCE PASSAGE:
"""
${ctx.sourceExcerpt || "(none provided)"}
"""

REFERENCE ANSWER:
${ctx.referenceAnswer || "(none provided)"}

THE LEARNER'S ANSWER:
"""
${ctx.studentAnswer || "(left blank)"}
"""

Answer the learner's follow-up questions about this concept. Ground your explanations in the source passage and the question; if something is not covered by the source, say so briefly rather than inventing facts. Keep replies short (2–5 sentences), clear, and encouraging. Explain the idea — don't just restate the reference answer. If they ask for a hint, nudge without giving the full answer.`;
}

/** One tutor reply grounded in the question/source, given the conversation so far. */
export async function tutorReply(
  ctx: TutorContext,
  messages: TutorTurn[],
): Promise<string> {
  const msg = await anthropic.messages.create({
    model: FAST_MODEL,
    max_tokens: 800,
    system: system(ctx),
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  const block = msg.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text.trim() : "";
}
