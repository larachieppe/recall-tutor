import type { Extracted } from "./extract";

/**
 * YouTube blocks free server-side caption scraping (proof-of-origin tokens), so
 * transcripts come from a managed transcript API. Provider is isolated to
 * `fetchTranscriptText` below — swap it to change providers.
 */

/** Extract an 11-char video id from the common YouTube URL shapes, or null. */
export function parseYouTubeId(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const ok = (id: string | null | undefined) =>
    id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;

  if (host === "youtu.be") return ok(u.pathname.slice(1).split("/")[0]);
  if (host === "youtube.com" || host === "music.youtube.com") {
    if (u.pathname === "/watch") return ok(u.searchParams.get("v"));
    const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/);
    if (m) return ok(m[1]);
  }
  return null;
}

export function isYouTubeUrl(raw: string): boolean {
  return parseYouTubeId(raw) !== null;
}

export function transcriptsConfigured(): boolean {
  return !!process.env.SUPADATA_API_KEY;
}

export async function fetchYouTubeTranscript(
  videoId: string,
): Promise<Extracted> {
  if (!transcriptsConfigured()) {
    throw new Error(
      "YouTube transcripts aren't set up on this server yet. (The owner needs to add a transcript API key.)",
    );
  }
  const [text, title] = await Promise.all([
    fetchTranscriptText(videoId),
    fetchTitle(videoId),
  ]);
  if (!text.trim()) {
    throw new Error(
      "Couldn't get a transcript for this video — it may not have captions.",
    );
  }
  return { title, text };
}

// --- Provider: Supadata (https://supadata.ai) ----------------------------

const SUPADATA_URL = "https://api.supadata.ai/v1/youtube/transcript";

async function fetchTranscriptText(videoId: string): Promise<string> {
  const key = process.env.SUPADATA_API_KEY!;
  const target = `https://www.youtube.com/watch?v=${videoId}`;
  const url = `${SUPADATA_URL}?url=${encodeURIComponent(target)}&text=true`;

  const res = await fetch(url, {
    headers: { "x-api-key": key },
    signal: AbortSignal.timeout(30_000),
  });
  const body = await res.text();

  if (!res.ok) {
    let msg = `Transcript service error (HTTP ${res.status}).`;
    try {
      const j = JSON.parse(body);
      msg = j.message || j.error || msg;
    } catch {
      /* keep default */
    }
    throw new Error(msg);
  }

  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    return body; // some providers return plain text
  }
  return extractTranscriptText(data);
}

/** Accept the common shapes providers return (plain text or segment arrays). */
function extractTranscriptText(data: unknown): string {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.content === "string") return d.content;
    if (Array.isArray(d.content))
      return d.content.map((c) => segText(c)).join(" ");
    if (typeof d.transcript === "string") return d.transcript;
    if (Array.isArray(d.transcript))
      return d.transcript.map((c) => segText(c)).join(" ");
  }
  return "";
}

function segText(seg: unknown): string {
  if (typeof seg === "string") return seg;
  if (seg && typeof seg === "object") {
    const s = seg as Record<string, unknown>;
    if (typeof s.text === "string") return s.text;
  }
  return "";
}

/** Best-effort title via YouTube's public oEmbed endpoint (no token needed). */
async function fetchTitle(videoId: string): Promise<string> {
  try {
    const r = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`,
      )}&format=json`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (r.ok) {
      const j = (await r.json()) as { title?: string };
      if (j.title) return j.title;
    }
  } catch {
    /* fall through */
  }
  return "YouTube video";
}
