import type { AnswerRecord } from "./types";
import { topicMastery } from "./session";

/**
 * Turn a completed study session into shareable artifacts. Pure and
 * deterministic (no network, no key) so it's unit-tested and works offline.
 */

export interface ExportMeta {
  title: string;
}

function scoreLine(records: AnswerRecord[]): { total: number; max: number; pct: number } {
  const total = records.reduce((s, r) => s + r.feedback.score, 0);
  const max = records.length * 10;
  const pct = max ? Math.round((total / max) * 100) : 0;
  return { total, max, pct };
}

/** A full Markdown transcript of the session: questions, answers, feedback. */
export function sessionToMarkdown(records: AnswerRecord[], meta: ExportMeta): string {
  const { total, max, pct } = scoreLine(records);
  const lines: string[] = [];
  lines.push(`# ${meta.title || "Study session"}`);
  lines.push("");
  lines.push(`**Score:** ${total} / ${max} (${pct}%) · ${records.length} question${records.length === 1 ? "" : "s"}`);
  lines.push("");

  const mastery = topicMastery(records);
  if (mastery.length > 0) {
    lines.push("## By topic");
    lines.push("");
    for (const t of mastery) {
      lines.push(`- **${t.topic}** — ${t.avgScore.toFixed(1)}/10 (${t.answered} question${t.answered === 1 ? "" : "s"})`);
    }
    lines.push("");
  }

  lines.push("## Questions");
  lines.push("");
  records.forEach((r, i) => {
    lines.push(`### ${i + 1}. ${r.question.question}`);
    lines.push("");
    lines.push(`*Topic: ${r.question.topic} · Score: ${r.feedback.score}/10*`);
    lines.push("");
    lines.push(`**Your answer:** ${r.answer.trim() || "_(left blank)_"}`);
    lines.push("");
    if (r.feedback.improved_answer?.trim()) {
      lines.push(`**Stronger answer:** ${r.feedback.improved_answer.trim()}`);
      lines.push("");
    }
    if (r.feedback.missing?.trim()) {
      lines.push(`**What was missing:** ${r.feedback.missing.trim()}`);
      lines.push("");
    }
  });

  lines.push("---");
  lines.push("");
  lines.push("_Generated with Recall — active-recall tutor._");
  return lines.join("\n");
}

/** A compact plain-text summary suitable for pasting into a chat or clipboard. */
export function sessionToSummary(records: AnswerRecord[], meta: ExportMeta): string {
  const { total, max, pct } = scoreLine(records);
  const mastery = topicMastery(records);
  const strong = mastery.filter((t) => t.avgScore >= 7).map((t) => t.topic);
  const weak = mastery.filter((t) => t.avgScore < 7).map((t) => t.topic);

  const parts: string[] = [];
  parts.push(`📚 Recall — "${meta.title || "Study session"}"`);
  parts.push(`Scored ${total}/${max} (${pct}%) across ${records.length} question${records.length === 1 ? "" : "s"}.`);
  if (strong.length) parts.push(`✅ Strong: ${strong.join(", ")}`);
  if (weak.length) parts.push(`📖 To review: ${weak.join(", ")}`);
  return parts.join("\n");
}

/** One Anki field: strip tabs, turn newlines into <br> (Anki renders HTML). */
function ankiField(s: string): string {
  return (s || "")
    .replace(/\t/g, " ")
    .replace(/\r?\n/g, "<br>")
    .trim();
}

/**
 * A tab-separated deck importable by Anki (and most SRS apps): question on the
 * front, reference answer on the back, topic as a tag. The header directives
 * tell Anki the separator, that fields contain HTML, and which column is tags.
 */
export function sessionToAnki(records: AnswerRecord[]): string {
  const lines = ["#separator:tab", "#html:true", "#tags column:3"];
  for (const r of records) {
    const front = ankiField(r.question.question);
    const back = ankiField(r.question.reference_answer);
    const tag = (r.question.topic || "").trim().replace(/\s+/g, "_");
    lines.push(`${front}\t${back}\t${tag}`);
  }
  return lines.join("\n");
}

/** Trigger a browser download of `content` as a file. No-op on the server. */
export function downloadFile(filename: string, content: string, mime = "text/markdown"): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Filesystem-safe slug for a filename. */
export function slugify(s: string): string {
  return (
    (s || "session")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "session"
  );
}
