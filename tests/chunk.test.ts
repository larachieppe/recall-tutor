import { describe, it, expect } from "vitest";
import { chunkDocument, selectCoverage, assembleSource } from "../lib/chunk";

function longDoc(sections = 60): string {
  const parts: string[] = [];
  for (let i = 0; i < sections; i++) {
    parts.push(
      `SECTION ${i}\n\nmarker${i} ` +
        "lorem ipsum dolor sit amet consectetur ".repeat(30),
    );
  }
  return parts.join("\n\n");
}

describe("chunkDocument", () => {
  it("splits a long document into multiple chunks", () => {
    const chunks = chunkDocument(longDoc(20));
    expect(chunks.length).toBeGreaterThan(5);
  });

  it("starts a new chunk at a heading", () => {
    const text = "SECTION A\n\nfirst paragraph\n\nSECTION B\n\nsecond paragraph";
    const chunks = chunkDocument(text, 5000);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks.some((c) => c.text.includes("SECTION B"))).toBe(true);
  });

  it("hard-splits an oversize paragraph", () => {
    const chunks = chunkDocument("x".repeat(5000), 1000);
    expect(chunks.length).toBeGreaterThanOrEqual(5);
  });
});

describe("selectCoverage", () => {
  it("returns everything when under budget", () => {
    const chunks = chunkDocument(longDoc(5));
    expect(selectCoverage(chunks, 1_000_000)).toEqual(chunks);
  });

  it("stays within budget and returns document order", () => {
    const chunks = chunkDocument(longDoc(60));
    const picked = selectCoverage(chunks, 8000);
    const used = picked.reduce((s, c) => s + c.text.length, 0);
    expect(used).toBeLessThanOrEqual(8000);
    const indices = picked.map((c) => c.index);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });

  it("covers both the start and the end of the document", () => {
    const chunks = chunkDocument(longDoc(60));
    const picked = selectCoverage(chunks, 8000);
    expect(picked[0].index).toBe(0);
    expect(picked[picked.length - 1].index).toBe(chunks.length - 1);
  });
});

describe("assembleSource", () => {
  it("leaves a short document untouched", () => {
    const a = assembleSource("short source text that is well under budget");
    expect(a.truncated).toBe(false);
    expect(a.sections).toBe(1);
  });

  it("covers the END of a long document (the truncation fix)", () => {
    const doc = longDoc(60); // ~70k chars
    const a = assembleSource(doc, 8000);
    expect(a.truncated).toBe(true);
    expect(a.text.length).toBeLessThanOrEqual(9000);
    expect(a.text).toContain("marker0"); // start present
    expect(a.text).toContain("marker59"); // END present — naive truncation would drop this
  });
});
