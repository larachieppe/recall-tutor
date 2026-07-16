import { NextRequest, NextResponse } from "next/server";
import { generateQuestions } from "@/lib/study";
import { clientIp, rateLimit, underDailyCap } from "@/lib/rate-limit";
import { generateInput, parseBody } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (!rateLimit(`generate:${clientIp(req)}`, 12, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 },
    );
  }
  if (!underDailyCap()) {
    return NextResponse.json(
      { error: "The app has reached today's usage limit. Please try again tomorrow." },
      { status: 429 },
    );
  }
  const parsed = parseBody(generateInput, await req.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  try {
    const questions = await generateQuestions(parsed.data.source, parsed.data);
    return NextResponse.json({ questions });
  } catch (err) {
    return NextResponse.json({ error: apiErrorMessage(err) }, { status: 500 });
  }
}

function apiErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Generation failed.";
  if (/api[_ ]?key/i.test(msg) || /authentication/i.test(msg)) {
    return "The Anthropic API key is missing or invalid. Set ANTHROPIC_API_KEY in .env.local.";
  }
  return msg;
}
