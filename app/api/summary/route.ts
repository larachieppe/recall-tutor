import { NextRequest, NextResponse } from "next/server";
import { generateOverview } from "@/lib/study";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { summaryInput, parseBody } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (!rateLimit(`summary:${clientIp(req)}`, 12, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 },
    );
  }
  const parsed = parseBody(summaryInput, await req.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  try {
    const overview = await generateOverview(parsed.data.source);
    return NextResponse.json({ overview });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Overview failed.";
    if (/api[_ ]?key/i.test(msg) || /authentication/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "The Anthropic API key is missing or invalid. Set ANTHROPIC_API_KEY in .env.local.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
