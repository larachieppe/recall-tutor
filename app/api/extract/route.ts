import { NextRequest, NextResponse } from "next/server";
import { extractFromFile, extractFromUrl } from "@/lib/extract";

export const runtime = "nodejs";
export const maxDuration = 60;

const MIN_CHARS = 120;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let result;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
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
