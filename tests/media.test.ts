import { describe, it, expect } from "vitest";
import { isMediaUrl, isMediaFilename } from "../lib/transcribe";

describe("isMediaUrl", () => {
  it("detects media file URLs (incl. query strings)", () => {
    expect(isMediaUrl("https://x.com/a.mp3")).toBe(true);
    expect(isMediaUrl("https://x.com/a.mp4?token=1")).toBe(true);
    expect(isMediaUrl("https://x.com/clip.mov#t=10")).toBe(true);
  });
  it("rejects non-media URLs", () => {
    expect(isMediaUrl("https://x.com/page.html")).toBe(false);
    expect(isMediaUrl("https://x.com/article")).toBe(false);
    expect(isMediaUrl("not a url")).toBe(false);
  });
});

describe("isMediaFilename", () => {
  it("detects audio/video filenames case-insensitively", () => {
    expect(isMediaFilename("lecture.m4a")).toBe(true);
    expect(isMediaFilename("talk.MOV")).toBe(true);
    expect(isMediaFilename("audio.wav")).toBe(true);
  });
  it("rejects document filenames", () => {
    expect(isMediaFilename("notes.pdf")).toBe(false);
    expect(isMediaFilename("paper.docx")).toBe(false);
  });
});
