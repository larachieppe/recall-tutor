import type { NextRequest } from "next/server";

type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

/** Best-effort client IP from proxy headers (Render sets x-forwarded-for). */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Fixed-window in-memory rate limit. Fine for a single Render instance; returns
 * true if the call is allowed. Not a substitute for a shared store at scale.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  // Opportunistically prune expired buckets so the map can't grow unbounded.
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k);
  }

  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

// --- Global daily cap ----------------------------------------------------

let dayKey = "";
let dayCount = 0;

/**
 * App-wide ceiling on paid AI calls per UTC day, across ALL users/IPs. This is
 * the backstop that per-IP limits can't provide (IP rotation bypasses those).
 * In-memory: it holds during a sustained attack (process stays warm) and resets
 * on deploy/idle. Set DAILY_AI_LIMIT to tune; pair it with a hard spend limit on
 * the Anthropic key for a true financial ceiling.
 */
export function underDailyCap(): boolean {
  const limit = Number(process.env.DAILY_AI_LIMIT || 300);
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dayKey) {
    dayKey = today;
    dayCount = 0;
  }
  if (dayCount >= limit) return false;
  dayCount += 1;
  return true;
}

