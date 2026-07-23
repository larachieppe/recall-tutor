import { describe, it, expect } from "vitest";
import { cacheControl, cachedSourcePrompt, sourceBlock } from "../lib/prompt";

describe("cacheControl", () => {
  it("omits ttl for the 5m default and sets it for 1h", () => {
    expect(cacheControl("5m")).toEqual({ type: "ephemeral" });
    expect(cacheControl("1h")).toEqual({ type: "ephemeral", ttl: "1h" });
  });
});

describe("cachedSourcePrompt", () => {
  const blocks = cachedSourcePrompt("THE SOURCE", "Generate 5 questions.", "5m");

  it("puts the stable source FIRST and the volatile instructions LAST", () => {
    // Caching is a prefix match — if the instructions came first, changing the
    // focus area would invalidate the whole cached source.
    expect(blocks).toHaveLength(2);
    expect(blocks[0].text).toContain("THE SOURCE");
    expect(blocks[1].text).toBe("Generate 5 questions.");
  });

  it("puts the cache breakpoint on the source block only", () => {
    expect(blocks[0].cache_control).toEqual({ type: "ephemeral" });
    expect(blocks[1].cache_control).toBeUndefined();
  });

  it("keeps the source prefix byte-identical when instructions change", () => {
    const a = cachedSourcePrompt("SAME", "focus: loops", "5m");
    const b = cachedSourcePrompt("SAME", "focus: recursion", "5m");
    expect(a[0].text).toBe(b[0].text); // cached prefix survives
    expect(a[1].text).not.toBe(b[1].text);
  });
});

describe("sourceBlock", () => {
  it("wraps the text in the delimiters the prompts expect", () => {
    expect(sourceBlock("hi")).toBe('SOURCE DOCUMENT:\n"""\nhi\n"""');
  });
});
