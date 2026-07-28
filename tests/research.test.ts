import { describe, it, expect } from "vitest";
import { collectSources, extractText } from "../lib/research";

describe("extractText", () => {
  it("joins only the text blocks, trimmed", () => {
    const content = [
      { type: "server_tool_use", text: undefined },
      { type: "text", text: "  First section.  " },
      { type: "web_search_tool_result", content: [] },
      { type: "text", text: "Second section." },
    ];
    expect(extractText(content)).toBe("First section.\n\nSecond section.");
  });

  it("returns empty string when there is no text", () => {
    expect(extractText([{ type: "web_search_tool_result", content: [] }])).toBe("");
  });
});

describe("collectSources", () => {
  it("pulls title+url from web_search_tool_result, de-duped by url", () => {
    const content = [
      {
        type: "web_search_tool_result",
        content: [
          { type: "web_search_result", url: "https://a.com", title: "A" },
          { type: "web_search_result", url: "https://b.com", title: "B" },
        ],
      },
      { type: "text", text: "..." },
      {
        type: "web_search_tool_result",
        content: [
          { type: "web_search_result", url: "https://a.com", title: "A dup" }, // duplicate url
          { type: "web_search_result", url: "https://c.com", title: "C" },
        ],
      },
    ];
    expect(collectSources(content)).toEqual([
      { url: "https://a.com", title: "A" },
      { url: "https://b.com", title: "B" },
      { url: "https://c.com", title: "C" },
    ]);
  });

  it("skips error results (content is an object, not an array)", () => {
    const content = [
      { type: "web_search_tool_result", content: { error_code: "max_uses_exceeded" } },
    ];
    expect(collectSources(content)).toEqual([]);
  });

  it("falls back to the url when a result has no title", () => {
    const content = [
      {
        type: "web_search_tool_result",
        content: [{ type: "web_search_result", url: "https://x.com" }],
      },
    ];
    expect(collectSources(content)).toEqual([
      { url: "https://x.com", title: "https://x.com" },
    ]);
  });
});
