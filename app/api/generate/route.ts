import { NextRequest, NextResponse } from "next/server";
import { generateQuestions } from "@/lib/study";
import {
  anonQuotaExceeded,
  authConfigured,
  clientIp,
  rateLimit,
  underDailyCap,
} from "@/lib/rate-limit";
import { generateInput, parseBody } from "@/lib/schemas";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (!rateLimit(`generate:${clientIp(req)}`, 12, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 },
    );
  }

  // Require sign-in to generate, once auth is configured — but give anonymous
  // users a small free daily allowance first.
  if (authConfigured()) {
    const session = await auth();
    if (!session?.user) {
      const free = Number(process.env.FREE_ANON_GENERATIONS || 3);
      if (anonQuotaExceeded(clientIp(req), free)) {
        return NextResponse.json(
          {
            error: `You've used your ${free} free question sets for today. Sign in to keep generating.`,
            code: "SIGN_IN_REQUIRED",
          },
          { status: 401 },
        );
      }
    }
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
