import dns from "node:dns/promises";
import net from "node:net";
import { fetchYouTubeTranscript, parseYouTubeId } from "./youtube";

// NOTE: jsdom / unpdf / mammoth / readability are loaded lazily inside the
// functions below (dynamic import). Importing them at module top-level pulls an
// ESM-only jsdom transitive dep that breaks Next's build-time page-data step.
import {
  isMediaFilename,
  isMediaUrl,
  titleFromSource,
  transcribeBytes,
  transcribeUrl,
} from "./transcribe";

export interface Extracted {
  title: string;
  text: string;
}

/** Hard cap on extracted text so a huge source can't blow up request bodies. */
export const MAX_EXTRACT_CHARS = 200_000;
/** Hard cap on bytes downloaded from a remote URL. */
const MAX_FETCH_BYTES = 8_000_000;
const MAX_REDIRECTS = 5;

function clean(text: string): string {
  const out = text
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return out.length > MAX_EXTRACT_CHARS ? out.slice(0, MAX_EXTRACT_CHARS) : out;
}

export async function extractFromFile(
  filename: string,
  bytes: ArrayBuffer,
  contentType = "",
): Promise<Extracted> {
  const lower = filename.toLowerCase();
  const title = filename.replace(/\.[^.]+$/, "");

  // Audio/video uploads: transcribe the speech.
  if (isMediaFilename(filename)) {
    const text = await transcribeBytes(bytes, contentType);
    return { title: titleFromSource(filename), text: clean(text) };
  }

  if (lower.endsWith(".pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractText(pdf, { mergePages: true });
    return { title, text: clean(text) };
  }

  if (lower.endsWith(".docx")) {
    const mammoth = (await import("mammoth")).default;
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return { title, text: clean(value) };
  }

  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    return { title, text: clean(new TextDecoder().decode(bytes)) };
  }

  // Fall back to treating unknown types as UTF-8 text.
  return { title, text: clean(new TextDecoder().decode(bytes)) };
}

// --- SSRF protection -----------------------------------------------------

/** True if an IP literal is loopback / private / link-local / reserved. */
function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    if (p[0] === 0 || p[0] === 10 || p[0] === 127) return true;
    if (p[0] === 169 && p[1] === 254) return true; // link-local incl. cloud metadata
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT
    if (p[0] >= 224) return true; // multicast / reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const a = ip.toLowerCase();
    if (a === "::1" || a === "::") return true;
    if (a.startsWith("fe80")) return true; // link-local
    if (a.startsWith("fc") || a.startsWith("fd")) return true; // unique-local fc00::/7
    if (a.startsWith("::ffff:")) {
      const mapped = a.split(":").pop();
      if (mapped && mapped.includes(".")) return isPrivateIp(mapped); // IPv4-mapped
    }
    return false;
  }
  return true; // not a valid IP → treat as unsafe
}

/** Validate a URL is a public http(s) endpoint (blocks SSRF to internal hosts). */
async function assertPublicUrl(raw: string): Promise<void> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed.");
  }
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new Error("That host is not allowed.");
  }

  const addresses: string[] = [];
  if (net.isIP(host)) {
    addresses.push(host);
  } else {
    const resolved = await dns.lookup(host, { all: true });
    for (const r of resolved) addresses.push(r.address);
  }
  if (addresses.length === 0) throw new Error("Could not resolve that host.");
  for (const ip of addresses) {
    if (isPrivateIp(ip)) {
      throw new Error("That host points to a private address and is blocked.");
    }
  }
}

/** Fetch that validates every redirect hop and caps the download size. */
async function safeFetch(raw: string): Promise<string> {
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(current);
    const res = await fetch(current, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RecallTutor/0.1)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error(`Could not fetch the page (HTTP ${res.status}).`);
      current = new URL(loc, current).toString();
      continue;
    }
    if (!res.ok) throw new Error(`Could not fetch the page (HTTP ${res.status}).`);

    const type = res.headers.get("content-type") || "";
    if (type && !/html|xml|text/i.test(type)) {
      throw new Error("That URL is not a web page.");
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_FETCH_BYTES) throw new Error("That page is too large.");
    return new TextDecoder().decode(buf);
  }
  throw new Error("Too many redirects.");
}

export async function extractFromUrl(url: string): Promise<Extracted> {
  // YouTube links: learn from the spoken transcript, not the (JS-rendered) page.
  const ytId = parseYouTubeId(url);
  if (ytId) {
    const yt = await fetchYouTubeTranscript(ytId);
    return { title: yt.title, text: clean(yt.text) };
  }

  // Direct audio/video URLs: transcribe the media (Deepgram fetches it).
  if (isMediaUrl(url)) {
    const text = await transcribeUrl(url);
    return { title: titleFromSource(url), text: clean(text) };
  }

  const html = await safeFetch(url);
  const { JSDOM } = await import("jsdom");
  const { Readability } = await import("@mozilla/readability");
  const dom = new JSDOM(html); // no `url` option → no resource loading
  const doc = dom.window.document;
  const pageTitle = doc.title || url;

  try {
    const article = new Readability(doc).parse();
    if (article?.textContent && article.textContent.trim().length > 200) {
      return {
        title: article.title || pageTitle,
        text: clean(article.textContent),
      };
    }
  } catch {
    // fall through to naive extraction
  }

  doc.querySelectorAll("script, style, noscript").forEach((el) => el.remove());
  const bodyText = doc.body?.textContent ?? "";
  return { title: pageTitle, text: clean(bodyText) };
}
