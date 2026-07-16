import { NextRequest, NextResponse } from "next/server";
import { extractFromFile, extractFromUrl } from "@/lib/extract";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MIN_CHARS = 120;
const MAX_FILE_BYTES = 15_000_000; // 15 MB

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
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: "File too large (max 15 MB)." },
          { status: 413 },
        );
      }
      const bytes = await file.arrayBuffer();
      result = await extractFromFile(file.name, bytes);
    } else {
      const { url } = await req.json();
      if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
        return NextResponse.json(
          { error: "Please provide a valid http(s) URL." },
          { status: 400 },
        );
      }
      result = await extractFromUrl(url);
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
