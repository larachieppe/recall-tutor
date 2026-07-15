"use client";

import { useState } from "react";
import type { AnswerRecord, Feedback, Question } from "@/lib/types";
import { QUESTION_TYPE_LABELS } from "@/lib/types";
import { PillButton } from "@/components/ui";

interface Props {
  questions: Question[];
  index: number;
  records: AnswerRecord[];
  onSubmit: (answer: string) => Promise<Feedback>;
  onNext: () => void;
  onFinish: () => void;
}

export default function StudyScreen({
  questions,
  index,
  onSubmit,
  onNext,
  onFinish,
}: Props) {
  const question = questions[index];
  const isLast = index === questions.length - 1;

  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setGrading(true);
    setError(null);
    try {
      const fb = await onSubmit(answer);
      setFeedback(fb);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Grading failed.");
    } finally {
      setGrading(false);
    }
  }

  function advance() {
    setAnswer("");
    setFeedback(null);
    setError(null);
    if (isLast) onFinish();
    else onNext();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      {/* progress */}
      <div className="mb-7">
        <div
          className="mb-2.5 flex items-center justify-between text-[13px]"
          style={{ color: "var(--muted)" }}
        >
          <span className="font-semibold">
            Question {index + 1} of {questions.length}
          </span>
          <span
            className="rounded-full px-3 py-1 font-semibold tint"
            style={{ color: "var(--blue)" }}
          >
            {QUESTION_TYPE_LABELS[question.type]} · {question.topic}
          </span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full"
          style={{ background: "var(--line)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${((index + (feedback ? 1 : 0)) / questions.length) * 100}%`,
              background: "var(--blue)",
            }}
          />
        </div>
      </div>

      <div className="panel rounded-2xl p-7">
        <h2 className="text-[24px] font-extrabold leading-snug tracking-tight md:text-[26px]">
          {question.question}
        </h2>

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={!!feedback || grading}
          placeholder="Type your answer in your own words…"
          rows={6}
          className="mt-6 w-full resize-y rounded-xl border px-4 py-3.5 text-[15px] leading-relaxed outline-none transition focus:border-[var(--blue)] disabled:opacity-70"
          style={{ borderColor: "var(--line)", background: "var(--panel)" }}
        />

        {!feedback && (
          <div className="mt-5">
            <PillButton onClick={submit} disabled={grading}>
              {grading ? "Grading…" : "Submit answer"}
            </PillButton>
          </div>
        )}

        {error && (
          <p className="mt-4 text-[14px]" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </div>

      {feedback && <FeedbackCard feedback={feedback} question={question} />}

      {feedback && (
        <div className="mt-6">
          <PillButton onClick={advance} full>
            {isLast ? "See results" : "Next question"}
          </PillButton>
        </div>
      )}
    </div>
  );
}

function statusColors(status: "met" | "partial" | "missing") {
  if (status === "met")
    return { bg: "rgba(23,189,131,0.12)", fg: "var(--mint)" };
  if (status === "partial") return { bg: "#fbf1dc", fg: "var(--amber)" };
  return { bg: "#f7dfdb", fg: "var(--danger)" };
}

function FeedbackCard({
  feedback,
  question,
}: {
  feedback: Feedback;
  question: Question;
}) {
  const [showSource, setShowSource] = useState(false);
  return (
    <div className="panel mt-6 rounded-2xl p-7">
      <div className="mb-5 flex items-center gap-3">
        <ScoreBadge score={feedback.score} />
        <div className="flex flex-wrap gap-1.5">
          {feedback.criteria.map((c, i) => {
            const col = statusColors(c.status);
            return (
              <span
                key={i}
                title={`${c.description} — ${c.points_awarded}/${c.points_possible}`}
                className="rounded-md px-2 py-1 text-[11px] font-bold"
                style={{ background: col.bg, color: col.fg }}
              >
                {c.points_awarded}/{c.points_possible}
              </span>
            );
          })}
        </div>
      </div>

      <Block title="What you got right" body={feedback.correct} />
      <Block title="What was missing" body={feedback.missing} />
      {feedback.incorrect &&
        feedback.incorrect.trim().toLowerCase() !== "none." && (
          <Block title="Incorrect claims" body={feedback.incorrect} />
        )}
      <Block title="Stronger answer" body={feedback.improved_answer} accent />
      {feedback.follow_up && <Block title="Next step" body={feedback.follow_up} />}

      <button
        onClick={() => setShowSource((s) => !s)}
        className="mt-1 text-[13px] font-semibold accent-text"
      >
        {showSource ? "Hide source passage" : "Show source passage"}
      </button>
      {showSource && (
        <blockquote
          className="mt-3 rounded-xl border-l-2 px-4 py-3 text-[14px] italic tint"
          style={{ borderColor: "var(--blue)", color: "var(--muted)" }}
        >
          {question.source_excerpt}
        </blockquote>
      )}
    </div>
  );
}

function Block({
  title,
  body,
  accent,
}: {
  title: string;
  body: string;
  accent?: boolean;
}) {
  if (!body || !body.trim()) return null;
  return (
    <div className="mb-4">
      <h3
        className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.1em]"
        style={{ color: accent ? "var(--blue)" : "var(--muted)" }}
      >
        {title}
      </h3>
      <p className="text-[15px] leading-relaxed">{body}</p>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const good = score >= 7;
  const mid = score >= 4 && score < 7;
  const fg = good ? "var(--mint)" : mid ? "var(--amber)" : "var(--danger)";
  const bg = good
    ? "rgba(23,189,131,0.12)"
    : mid
      ? "#fbf1dc"
      : "#f7dfdb";
  return (
    <div
      className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full text-[17px] font-extrabold"
      style={{ background: bg, color: fg }}
    >
      {score}
      <span className="text-[9px] font-semibold opacity-70">/10</span>
    </div>
  );
}
