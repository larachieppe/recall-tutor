import { NextRequest, NextResponse } from "next/server";
import { tutorReply } from "@/lib/tutor";
import { clientIp, rateLimit, underDailyCap } from "@/lib/rate-limit";
import { tutorInput, parseBody } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!rateLimit(`tutor:${clientIp(req)}`, 20, 60_000)) {
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

  const parsed = parseBody(tutorInput, await req.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const { question, sourceExcerpt, referenceAnswer, studentAnswer, messages } =
      parsed.data;
    const reply = await tutorReply(
      { question, sourceExcerpt, referenceAnswer, studentAnswer },
      messages,
    );
    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Tutor failed.";
    if (/api[_ ]?key/i.test(msg) || /authentication/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "The Anthropic API key is missing or invalid. Set ANTHROPIC_API_KEY.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
