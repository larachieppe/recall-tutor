"use client";

import { useState } from "react";
import type { AnswerRecord, Feedback, Question } from "@/lib/types";
import { QUESTION_TYPE_LABELS } from "@/lib/types";

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
    <div className="mx-auto max-w-3xl px-6 py-12">
      {/* progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-[13px]" style={{ color: "var(--muted)" }}>
          <span>
            Question {index + 1} of {questions.length}
          </span>
          <span className="rounded-full px-2 py-0.5" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
            {QUESTION_TYPE_LABELS[question.type]} · {question.topic}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${((index + (feedback ? 1 : 0)) / questions.length) * 100}%`,
              background: "var(--accent)",
            }}
          />
        </div>
      </div>

      <div className="panel rounded-xl p-6">
        <h2 className="serif text-[22px] font-semibold leading-snug">
          {question.question}
        </h2>

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={!!feedback || grading}
          placeholder="Type your answer in your own words…"
          rows={6}
          className="mt-5 w-full resize-y rounded-lg border px-3 py-3 text-[15px] leading-relaxed outline-none focus:ring-2 disabled:opacity-70"
          style={{ borderColor: "var(--line)", background: "var(--bg)" }}
        />

        {!feedback && (
          <button
            onClick={submit}
            disabled={grading}
            className="mt-4 rounded-lg px-5 py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {grading ? "Grading…" : "Submit answer"}
          </button>
        )}

        {error && (
          <p className="mt-3 text-[14px]" style={{ color: "#c0392b" }}>
            {error}
          </p>
        )}
      </div>

      {feedback && (
        <FeedbackCard feedback={feedback} question={question} />
      )}

      {feedback && (
        <button
          onClick={advance}
          className="mt-5 w-full rounded-xl px-4 py-3 text-[15px] font-semibold text-white"
          style={{ background: "var(--accent)" }}
        >
          {isLast ? "See results" : "Next question"}
        </button>
      )}
    </div>
  );
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
    <div className="panel mt-5 rounded-xl p-6">
      <div className="mb-4 flex items-center gap-3">
        <ScoreBadge score={feedback.score} />
        <div className="flex flex-wrap gap-1.5">
          {feedback.criteria.map((c, i) => (
            <span
              key={i}
              title={`${c.description} — ${c.points_awarded}/${c.points_possible}`}
              className="rounded px-1.5 py-0.5 text-[11px] font-medium"
              style={{
                background:
                  c.status === "met"
                    ? "var(--accent-soft)"
                    : c.status === "partial"
                      ? "#fdf0d5"
                      : "#f4d9d5",
                color:
                  c.status === "met"
                    ? "var(--accent)"
                    : c.status === "partial"
                      ? "#8a6d1a"
                      : "#a33227",
              }}
            >
              {c.points_awarded}/{c.points_possible}
            </span>
          ))}
        </div>
      </div>

      <Block title="What you got right" body={feedback.correct} />
      <Block title="What was missing" body={feedback.missing} />
      {feedback.incorrect && feedback.incorrect.trim().toLowerCase() !== "none." && (
        <Block title="Incorrect claims" body={feedback.incorrect} />
      )}
      <Block title="Stronger answer" body={feedback.improved_answer} accent />
      {feedback.follow_up && (
        <Block title="Next step" body={feedback.follow_up} />
      )}

      <button
        onClick={() => setShowSource((s) => !s)}
        className="mt-2 text-[13px] font-medium accent-text"
      >
        {showSource ? "Hide source passage" : "Show source passage"}
      </button>
      {showSource && (
        <blockquote
          className="mt-2 rounded-lg border-l-2 px-3 py-2 text-[14px] italic"
          style={{ borderColor: "var(--accent)", background: "var(--bg)", color: "var(--muted)" }}
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
    <div className="mb-3">
      <h3
        className="mb-1 text-[12px] font-semibold uppercase tracking-wide"
        style={{ color: accent ? "var(--accent)" : "var(--muted)" }}
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
  const color = good ? "var(--accent)" : mid ? "#8a6d1a" : "#a33227";
  const bg = good ? "var(--accent-soft)" : mid ? "#fdf0d5" : "#f4d9d5";
  return (
    <div
      className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full text-[15px] font-bold"
      style={{ background: bg, color }}
    >
      {score}
      <span className="text-[9px] font-medium opacity-70">/10</span>
    </div>
  );
}
