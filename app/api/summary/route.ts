import { NextRequest, NextResponse } from "next/server";
import { generateOverview } from "@/lib/study";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const source = typeof body.source === "string" ? body.source : "";
    if (source.trim().length < 120) {
      return NextResponse.json(
        { error: "Source text is too short to summarize." },
        { status: 400 },
      );
    }

    const overview = await generateOverview(source);
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
