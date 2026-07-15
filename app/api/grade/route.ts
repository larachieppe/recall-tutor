import { NextRequest, NextResponse } from "next/server";
import { gradeAnswer } from "@/lib/study";
import type { Question } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = body.question as Question | undefined;
    const answer = typeof body.answer === "string" ? body.answer : "";

    if (!question || !question.question || !Array.isArray(question.rubric)) {
      return NextResponse.json(
        { error: "Missing or malformed question." },
        { status: 400 },
      );
    }

    const feedback = await gradeAnswer(question, answer);
    return NextResponse.json({ feedback });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Grading failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
