import { NextRequest, NextResponse } from "next/server";
import { gradeAnswer } from "@/lib/study";
import type { Question } from "@/lib/types";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { gradeInput, parseBody } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (!rateLimit(`grade:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 },
    );
  }
  const parsed = parseBody(gradeInput, await req.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  try {
    const feedback = await gradeAnswer(
      parsed.data.question as Question,
      parsed.data.answer,
    );
    return NextResponse.json({ feedback });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Grading failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
