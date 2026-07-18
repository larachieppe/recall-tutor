import type { SavedSession } from "./session";

export interface ScorePoint {
  at: number; // epoch ms
  pct: number; // 0–100
}

/** Session score percentages over time, oldest first. */
export function scoreSeries(sessions: SavedSession[]): ScorePoint[] {
  return sessions
    .filter((s) => s.maxScore > 0)
    .map((s) => ({
      at: s.createdAt,
      pct: Math.round((s.totalScore / s.maxScore) * 100),
    }))
    .sort((a, b) => a.at - b.at);
}
