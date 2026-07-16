import { NextRequest, NextResponse } from "next/server";
import { extractFromFile, extractFromUrl } from "@/lib/extract";
import { isMediaFilename } from "@/lib/transcribe";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { urlInput, parseBody } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 300;

const MIN_CHARS = 120;
const MAX_DOC_BYTES = 15_000_000; // 15 MB for documents
const MAX_MEDIA_BYTES = 60_000_000; // 60 MB for audio/video (larger; paste a URL for more)

export async function POST(req: NextRequest) {
  if (!rateLimit(`extract:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 },
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let result;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
      }
      const isMedia = isMediaFilename(file.name);
      const cap = isMedia ? MAX_MEDIA_BYTES : MAX_DOC_BYTES;
      if (file.size > cap) {
        return NextResponse.json(
          {
            error: isMedia
              ? "Media file too large (max 60 MB). Paste a direct link to the file instead."
              : "File too large (max 15 MB).",
          },
          { status: 413 },
        );
      }
      const bytes = await file.arrayBuffer();
      result = await extractFromFile(file.name, bytes, file.type);
    } else {
      const parsed = parseBody(urlInput, await req.json().catch(() => null));
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      result = await extractFromUrl(parsed.data.url);
    }

    if (!result.text || result.text.length < MIN_CHARS) {
      return NextResponse.json(
        {
          error:
            "Couldn't extract enough readable text from that source. Try a different file or page.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      title: result.title,
      text: result.text,
      length: result.text.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
