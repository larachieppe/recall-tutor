import type { AnswerRecord } from "./types";

export interface TopicMastery {
  topic: string;
  answered: number;
  avgScore: number;
}

export interface SavedSession {
  id: string;
  title: string;
  createdAt: number;
  totalScore: number;
  maxScore: number;
  answers: AnswerRecord[];
}

const KEY = "recall.sessions";

export function topicMastery(answers: AnswerRecord[]): TopicMastery[] {
  const byTopic = new Map<string, number[]>();
  for (const a of answers) {
    const list = byTopic.get(a.question.topic) ?? [];
    list.push(a.feedback.score);
    byTopic.set(a.question.topic, list);
  }
  return [...byTopic.entries()]
    .map(([topic, scores]) => ({
      topic,
      answered: scores.length,
      avgScore: scores.reduce((s, v) => s + v, 0) / scores.length,
    }))
    .sort((a, b) => a.avgScore - b.avgScore);
}

/** Topics scoring below 7/10 on average — the ones worth another round. */
export function weakTopics(answers: AnswerRecord[]): string[] {
  return topicMastery(answers)
    .filter((t) => t.avgScore < 7)
    .map((t) => t.topic);
}

export function saveSession(session: SavedSession): void {
  if (typeof window === "undefined") return;
  const all = loadSessions();
  all.unshift(session);
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, 25)));
}

export function loadSessions(): SavedSession[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as SavedSession[];
  } catch {
    return [];
  }
}
