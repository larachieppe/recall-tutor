/**
 * Long-document handling. Instead of truncating to the first N characters
 * (which ignores the end of a long source), we chunk the document by structure
 * and select a diverse spread of chunks that covers the whole thing within a
 * character budget. Pure + deterministic, so it's unit-tested.
 *
 * This is dependency-free (no embeddings). Embeddings-based semantic clustering
 * would be a further improvement for very unstructured sources.
 */

export interface Chunk {
  index: number;
  text: string;
}

/** Heuristic: does this block start with a heading-like line? */
function looksLikeHeading(block: string): boolean {
  const line = block.split("\n")[0].trim();
  if (/^#{1,6}\s/.test(line)) return true; // markdown heading
  if (
    line.length > 0 &&
    line.length <= 80 &&
    !line.endsWith(".") &&
    /^[A-Z0-9]/.test(line) &&
    (/^(chapter|section|part|\d+[.)])\b/i.test(line) || line === line.toUpperCase())
  ) {
    return true;
  }
  return false;
}

/** Split into paragraph blocks, hard-splitting any that exceed the target. */
function splitIntoBlocks(text: string, target: number): string[] {
  const paras = text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of paras) {
    if (p.length <= target) {
      out.push(p);
    } else {
      for (let i = 0; i < p.length; i += target) out.push(p.slice(i, i + target));
    }
  }
  return out;
}

/** Group blocks into ~`target`-sized chunks, breaking at headings. */
export function chunkDocument(text: string, target = 2000): Chunk[] {
  const blocks = splitIntoBlocks(text, target);
  const chunks: Chunk[] = [];
  let buf: string[] = [];
  let len = 0;
  const flush = () => {
    const t = buf.join("\n\n").trim();
    if (t) chunks.push({ index: chunks.length, text: t });
    buf = [];
    len = 0;
  };
  for (const b of blocks) {
    if ((looksLikeHeading(b) && len > 0) || len + b.length > target) flush();
    buf.push(b);
    len += b.length + 2;
  }
  flush();
  return chunks;
}

const wordSet = (t: string) =>
  new Set(t.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

/**
 * Visiting order that covers the document progressively: first, last, middle,
 * quarters, … So even if the budget only fits a few chunks, they still span the
 * whole document rather than clustering at the start.
 */
function spreadOrder(n: number): number[] {
  const order: number[] = [];
  const seen = new Set<number>();
  const push = (i: number) => {
    if (i >= 0 && i < n && !seen.has(i)) {
      seen.add(i);
      order.push(i);
    }
  };
  push(0);
  push(n - 1);
  const q: [number, number][] = [[0, n - 1]];
  while (q.length) {
    const [lo, hi] = q.shift()!;
    const mid = Math.floor((lo + hi) / 2);
    if (mid !== lo && mid !== hi) {
      push(mid);
      q.push([lo, mid], [mid, hi]);
    }
  }
  for (let i = 0; i < n; i++) push(i); // any stragglers, in order
  return order;
}

/** Select a diverse, whole-document-spanning subset of chunks within `budget`. */
export function selectCoverage(chunks: Chunk[], budget: number): Chunk[] {
  const total = chunks.reduce((s, c) => s + c.text.length, 0);
  if (total <= budget) return chunks;

  const selected: Chunk[] = [];
  const selectedWords: Set<string>[] = [];
  let used = 0;
  for (const i of spreadOrder(chunks.length)) {
    const c = chunks[i];
    if (used + c.text.length > budget) continue;
    const w = wordSet(c.text);
    if (selectedWords.some((sw) => jaccard(w, sw) > 0.85)) continue; // drop near-dupes
    selected.push(c);
    selectedWords.push(w);
    used += c.text.length;
    if (used >= budget * 0.97) break;
  }
  return selected.sort((a, b) => a.index - b.index);
}

export interface AssembledSource {
  text: string;
  sections: number;
  truncated: boolean;
}

const SECTION_SEP = "\n\n----- (section break) -----\n\n";

/**
 * Turn a raw source into the text sent to the model: the whole thing if it fits
 * the budget, otherwise a coverage-selected set of chunks joined with section
 * markers (so questions can be drawn from across the entire document).
 */
export function assembleSource(source: string, budget = 58_000): AssembledSource {
  if (source.length <= budget) {
    return { text: source, sections: 1, truncated: false };
  }
  const chunks = chunkDocument(source);
  const chosen = selectCoverage(chunks, budget);
  return {
    text: chosen.map((c) => c.text).join(SECTION_SEP),
    sections: chosen.length,
    truncated: true,
  };
}
