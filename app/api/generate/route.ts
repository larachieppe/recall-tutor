import { NextRequest, NextResponse } from "next/server";
import { generateQuestions } from "@/lib/study";
import type { GenerateConfig, QuestionType } from "@/lib/types";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

const VALID_TYPES: QuestionType[] = [
  "short_answer",
  "application",
  "compare_contrast",
];

export async function POST(req: NextRequest) {
  if (!rateLimit(`generate:${clientIp(req)}`, 12, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 },
    );
  }
  try {
    const body = await req.json();
    const source = typeof body.source === "string" ? body.source : "";
    if (source.trim().length < 120) {
      return NextResponse.json(
        { error: "Source text is too short to generate good questions." },
        { status: 400 },
      );
    }

    const count = Math.min(15, Math.max(1, Number(body.count) || 5));
    const difficulty = ["easy", "medium", "hard"].includes(body.difficulty)
      ? body.difficulty
      : "medium";
    const types: QuestionType[] = Array.isArray(body.types)
      ? body.types.filter((t: unknown) =>
          VALID_TYPES.includes(t as QuestionType),
        )
      : [];
    const focus = typeof body.focus === "string" ? body.focus : "";

    const config: GenerateConfig = { count, difficulty, types, focus };
    const questions = await generateQuestions(source, config);

    return NextResponse.json({ questions });
  } catch (err) {
    return NextResponse.json(
      { error: apiErrorMessage(err) },
      { status: 500 },
    );
  }
}

function apiErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Generation failed.";
  if (/api[_ ]?key/i.test(msg) || /authentication/i.test(msg)) {
    return "The Anthropic API key is missing or invalid. Set ANTHROPIC_API_KEY in .env.local.";
  }
  return msg;
}
