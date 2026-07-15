import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export interface Extracted {
  title: string;
  text: string;
}

function clean(text: string): string {
  return text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function extractFromFile(
  filename: string,
  bytes: ArrayBuffer,
): Promise<Extracted> {
  const lower = filename.toLowerCase();
  const title = filename.replace(/\.[^.]+$/, "");

  if (lower.endsWith(".pdf")) {
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractText(pdf, { mergePages: true });
    return { title, text: clean(text) };
  }

  if (lower.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return { title, text: clean(value) };
  }

  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    return { title, text: clean(new TextDecoder().decode(bytes)) };
  }

  // Fall back to treating unknown types as UTF-8 text.
  return { title, text: clean(new TextDecoder().decode(bytes)) };
}

export async function extractFromUrl(url: string): Promise<Extracted> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; RecallTutor/0.1; +https://localhost)",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Could not fetch the page (HTTP ${res.status}).`);
  }
  const html = await res.text();
  const dom = new JSDOM(html, { url });
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

  // Fallback: strip scripts/styles and take the body text.
  doc.querySelectorAll("script, style, noscript").forEach((el) => el.remove());
  const bodyText = doc.body?.textContent ?? "";
  return { title: pageTitle, text: clean(bodyText) };
}
