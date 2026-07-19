import type {
  AnswerRecord,
  GenerateConfig,
  Overview,
  Question,
  SourceMeta,
} from "./types";

/**
 * Autosave for an in-progress study session, so a reload or accidental close
 * doesn't lose your place. Stored locally; cleared when the session finishes.
 */

export interface InProgress {
  version: 1;
  phase: "overview" | "study";
  questions: Question[];
  index: number; // next unanswered question
  records: AnswerRecord[];
  config: GenerateConfig;
  source: string;
  meta: SourceMeta;
  currentItemId: string | null;
  overview: Overview | null;
  savedAt: number;
}

const KEY = "recall.inprogress";

/** True when a snapshot represents a session worth resuming (not finished). */
export function isResumable(p: InProgress | null): p is InProgress {
  return (
    !!p &&
    p.version === 1 &&
    p.questions.length > 0 &&
    p.records.length < p.questions.length
  );
}

export function saveProgress(
  p: Omit<InProgress, "version" | "savedAt">,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...p, version: 1, savedAt: Date.now() }),
    );
  } catch {
    /* storage full / disabled — resume is best-effort */
  }
}

export function loadProgress(): InProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as InProgress;
    return isResumable(p) ? p : null;
  } catch {
    return null;
  }
}

export function clearProgress(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
