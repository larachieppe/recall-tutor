/**
 * Speech-to-text for audio/video sources, via Deepgram's prerecorded API.
 * One synchronous call handles either a remote URL (Deepgram fetches it) or
 * raw uploaded bytes. Provider is isolated here so it's easy to swap.
 * Requires DEEPGRAM_API_KEY; without it, media sources show a clear message.
 */

const MEDIA_EXTENSIONS = [
  "mp3", "m4a", "wav", "aac", "ogg", "oga", "opus", "flac", "wma",
  "mp4", "mov", "webm", "mkv", "avi", "m4v", "mpeg", "mpg", "3gp",
];

const DEEPGRAM_URL =
  "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true";

export function transcriptionConfigured(): boolean {
  return !!process.env.DEEPGRAM_API_KEY;
}

function extOf(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)(?:\?|#|$)/);
  return m ? m[1] : "";
}

export function isMediaFilename(name: string): boolean {
  return MEDIA_EXTENSIONS.includes(extOf(name));
}

export function isMediaUrl(raw: string): boolean {
  try {
    return MEDIA_EXTENSIONS.includes(extOf(new URL(raw).pathname));
  } catch {
    return false;
  }
}

function requireKey(): string {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) {
    throw new Error(
      "Audio/video transcription isn't set up on this server yet. (The owner needs to add a transcription API key.)",
    );
  }
  return key;
}

function readTranscript(data: unknown): string {
  const d = data as {
    results?: {
      channels?: { alternatives?: { transcript?: string }[] }[];
    };
  };
  return d.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
}

async function handleResponse(res: Response): Promise<string> {
  const body = await res.text();
  if (!res.ok) {
    let msg = `Transcription service error (HTTP ${res.status}).`;
    try {
      const j = JSON.parse(body);
      msg = j.err_msg || j.message || j.error || msg;
    } catch {
      /* keep default */
    }
    if (res.status === 401) msg = "Transcription API key is invalid.";
    throw new Error(msg);
  }
  const text = readTranscript(JSON.parse(body)).trim();
  if (!text) throw new Error("No speech was detected in that media.");
  return text;
}

/** Transcribe a remote audio/video URL (Deepgram fetches it — no local download). */
export async function transcribeUrl(url: string): Promise<string> {
  const key = requireKey();
  const res = await fetch(DEEPGRAM_URL, {
    method: "POST",
    headers: {
      Authorization: `Token ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(300_000),
  });
  return handleResponse(res);
}

/** Transcribe raw uploaded audio/video bytes. */
export async function transcribeBytes(
  bytes: ArrayBuffer,
  contentType: string,
): Promise<string> {
  const key = requireKey();
  const res = await fetch(DEEPGRAM_URL, {
    method: "POST",
    headers: {
      Authorization: `Token ${key}`,
      "Content-Type": contentType || "application/octet-stream",
    },
    body: bytes,
    signal: AbortSignal.timeout(300_000),
  });
  return handleResponse(res);
}

/** Turn a filename or URL into a readable title. */
export function titleFromSource(nameOrUrl: string): string {
  try {
    const u = new URL(nameOrUrl);
    const last = u.pathname.split("/").filter(Boolean).pop() || u.hostname;
    return decodeURIComponent(last.replace(/\.[^.]+$/, "")) || "Audio";
  } catch {
    return nameOrUrl.replace(/\.[^.]+$/, "") || "Audio";
  }
}
