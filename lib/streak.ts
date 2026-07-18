/**
 * Daily review streak — consecutive days the learner studied. Pure and
 * deterministic (dates passed in / defaulted), so it's unit-tested. Days are
 * the learner's LOCAL calendar days.
 */

export interface StreakData {
  lastStudyDay: string; // "YYYY-MM-DD" (local)
  current: number;
  longest: number;
}

/** Local calendar day as "YYYY-MM-DD". */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Whole-day difference b − a for two "YYYY-MM-DD" strings. */
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000,
  );
}

/** Record that the learner studied on `today`; returns the updated streak. */
export function recordStudyDay(
  prev: StreakData | undefined,
  today: string = dayKey(),
): StreakData {
  if (!prev?.lastStudyDay) {
    return { lastStudyDay: today, current: 1, longest: 1 };
  }
  if (prev.lastStudyDay === today) return prev; // already counted today
  const gap = daysBetween(prev.lastStudyDay, today);
  const current = gap === 1 ? prev.current + 1 : 1;
  return {
    lastStudyDay: today,
    current,
    longest: Math.max(prev.longest, current),
  };
}

/**
 * The streak to display: the current count if it's still alive (studied today
 * or yesterday), otherwise 0 (it has lapsed).
 */
export function activeStreak(
  streak: StreakData | undefined,
  today: string = dayKey(),
): number {
  if (!streak?.lastStudyDay) return 0;
  const gap = daysBetween(streak.lastStudyDay, today);
  return gap <= 1 ? streak.current : 0;
}
