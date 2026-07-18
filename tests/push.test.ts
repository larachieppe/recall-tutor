import { describe, it, expect } from "vitest";
import { urlBase64ToUint8Array } from "../lib/push";

describe("urlBase64ToUint8Array", () => {
  it("decodes standard base64url to bytes", () => {
    expect([...urlBase64ToUint8Array("AQID")]).toEqual([1, 2, 3]);
  });

  it("adds missing padding", () => {
    expect([...urlBase64ToUint8Array("AQI")]).toEqual([1, 2]);
  });

  it("maps url-safe characters (- _) back to + /", () => {
    // "-_" stands in for "+/"; "++/+" style vectors decode without throwing.
    const bytes = urlBase64ToUint8Array("_-8");
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });
});
