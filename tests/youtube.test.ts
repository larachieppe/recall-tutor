import { describe, it, expect } from "vitest";
import { parseYouTubeId, isYouTubeUrl } from "../lib/youtube";

const id = "dQw4w9WgXcQ";

describe("parseYouTubeId", () => {
  it("parses a standard watch URL", () => {
    expect(parseYouTubeId(`https://www.youtube.com/watch?v=${id}`)).toBe(id);
  });
  it("parses youtu.be short links", () => {
    expect(parseYouTubeId(`https://youtu.be/${id}`)).toBe(id);
  });
  it("parses /shorts/ and /embed/ and /live/", () => {
    expect(parseYouTubeId(`https://www.youtube.com/shorts/${id}`)).toBe(id);
    expect(parseYouTubeId(`https://www.youtube.com/embed/${id}`)).toBe(id);
    expect(parseYouTubeId(`https://www.youtube.com/live/${id}`)).toBe(id);
  });
  it("ignores extra query params", () => {
    expect(parseYouTubeId(`https://www.youtube.com/watch?v=${id}&t=42s`)).toBe(id);
  });
  it("handles the m. subdomain", () => {
    expect(parseYouTubeId(`https://m.youtube.com/watch?v=${id}`)).toBe(id);
  });
  it("returns null for non-YouTube URLs", () => {
    expect(parseYouTubeId("https://example.com/watch?v=abc")).toBeNull();
  });
  it("returns null for malformed ids", () => {
    expect(parseYouTubeId("https://youtu.be/short")).toBeNull();
  });
});

describe("isYouTubeUrl", () => {
  it("detects YouTube links", () => {
    expect(isYouTubeUrl(`https://youtu.be/${id}`)).toBe(true);
    expect(isYouTubeUrl("https://example.com")).toBe(false);
  });
});
