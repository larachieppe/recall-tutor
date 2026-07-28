import { NextRequest, NextResponse } from "next/server";
import { researchTopic } from "@/lib/research";
import {
  anonQuotaExceeded,
  authConfigured,
  clientIp,
  rateLimit,
  underDailyCap,
} from "@/lib/rate-limit";
import { parseBody, researchInput } from "@/lib/schemas";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  // Research is the most expensive action (web search + a capable model over
  // several searches), so it gets a tighter per-IP limit than generation.
  if (!rateLimit(`research:${clientIp(req)}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "Too many research requests. Please wait a moment." },
      { status: 429 },
    );
  }

  // Same sign-in gate + anonymous free allowance as generation.
  if (authConfigured()) {
    const session = await auth();
    if (!session?.user) {
      const free = Number(process.env.FREE_ANON_GENERATIONS || 3);
      if (anonQuotaExceeded(clientIp(req), free)) {
        return NextResponse.json(
          {
            error: `You've used your ${free} free sets for today. Sign in to keep researching.`,
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

  const parsed = parseBody(researchInput, await req.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await researchTopic(parsed.data.topic);
    if (!result.text || result.text.length < 120) {
      return NextResponse.json(
        {
          error:
            "Couldn't gather enough on that topic. Try rephrasing or being more specific.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: apiErrorMessage(err) }, { status: 500 });
  }
}

function apiErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Research failed.";
  if (/api[_ ]?key/i.test(msg) || /authentication/i.test(msg)) {
    return "The Anthropic API key is missing or invalid. Set ANTHROPIC_API_KEY in .env.local.";
  }
  if (/web[_ ]?search|tool/i.test(msg)) {
    return "Web search isn't available on this API key. Enable it in the Anthropic console, or paste a source instead.";
  }
  return msg;
}
