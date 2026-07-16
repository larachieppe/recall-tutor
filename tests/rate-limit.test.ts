import { describe, it, expect } from "vitest";
import { anonQuotaExceeded } from "../lib/rate-limit";

describe("anonQuotaExceeded", () => {
  it("allows up to the limit then blocks", () => {
    const ip = "test-" + Math.random();
    expect(anonQuotaExceeded(ip, 2)).toBe(false);
    expect(anonQuotaExceeded(ip, 2)).toBe(false);
    expect(anonQuotaExceeded(ip, 2)).toBe(true);
    expect(anonQuotaExceeded(ip, 2)).toBe(true);
  });

  it("tracks IPs independently", () => {
    const a = "a-" + Math.random();
    const b = "b-" + Math.random();
    expect(anonQuotaExceeded(a, 1)).toBe(false);
    expect(anonQuotaExceeded(a, 1)).toBe(true);
    expect(anonQuotaExceeded(b, 1)).toBe(false); // b unaffected by a
  });
});
