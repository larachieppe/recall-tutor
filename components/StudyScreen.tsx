"use client";

import { useState } from "react";
import type {
  Confidence,
  CriterionResult,
  Feedback,
  PracticeMode,
  Question,
} from "@/lib/types";
import { QUESTION_TYPE_LABELS } from "@/lib/types";
import { PillButton } from "@/components/ui";
import { matchEvidence, evidenceIndices } from "@/lib/highlight";
import type { TutorTurn } from "@/lib/tutor";
import type { FlashcardRating, GradeSubmission } from "@/lib/grade-local";

interface Props {
  questions: Question[];
  index: number;
  mode: PracticeMode;
  onSubmit: (submission: GradeSubmission) => Promise<Feedback>;
  onNext: () => void;
  onFinish: () => void;
}

export default function StudyScreen({
  questions,
  index,
  mode,
  onSubmit,
  onNext,
  onFinish,
}: Props) {
  const question = questions[index];
  const isLast = index === questions.length - 1;
  const isMC = question.type === "multiple_choice" && !!question.choices?.length;

  const [answer, setAnswer] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  async function submit() {
    if (isMC && selected === null) return;
    setGrading(true);
    setError(null);
    try {
      const fb = await onSubmit({
        answer: isMC ? question.choices![selected!] : answer,
        selectedIndex: isMC ? (selected ?? undefined) : undefined,
        confidence: confidence ?? undefined,
      });
      setFeedback(fb);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Grading failed.");
    } finally {
      setGrading(false);
    }
  }

  function reset() {
    setAnswer("");
    setSelected(null);
    setConfidence(null);
    setFeedback(null);
    setError(null);
    setShowHint(false);
  }

  function advance() {
    reset();
    if (isLast) onFinish();
    else onNext();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <ProgressHeader
        index={index}
        total={questions.length}
        answered={!!feedback}
        typeLabel={mode === "flashcard" ? "Flashcard" : QUESTION_TYPE_LABELS[question.type]}
        topic={question.topic}
      />

      {mode === "flashcard" ? (
        <FlashcardView
          key={question.id}
          question={question}
          onRate={async (rating) => {
            await onSubmit({ answer: "", rating });
            advance();
          }}
          isLast={isLast}
        />
      ) : (
        <>
          <div className="panel rounded-2xl p-7">
            <h2 className="text-[24px] font-extrabold leading-snug tracking-tight md:text-[26px]">
              {question.question}
            </h2>

            {isMC ? (
              <div className="mt-6 space-y-2.5">
                {question.choices!.map((choice, i) => (
                  <ChoiceButton
                    key={i}
                    label={choice}
                    index={i}
                    selected={selected === i}
                    disabled={!!feedback || grading}
                    state={
                      feedback
                        ? i === question.answer_index
                          ? "correct"
                          : selected === i
                            ? "wrong"
                            : "idle"
                        : "idle"
                    }
                    onClick={() => setSelected(i)}
                  />
                ))}
              </div>
            ) : (
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={!!feedback || grading}
                placeholder="Type your answer in your own words…"
                rows={6}
                className="mt-6 w-full resize-y rounded-xl border px-4 py-3.5 text-[15px] leading-relaxed outline-none transition focus:border-[var(--blue)] disabled:opacity-70"
                style={{ borderColor: "var(--line)", background: "var(--panel)" }}
              />
            )}

            {!feedback && (
              <ConfidencePicker value={confidence} onChange={setConfidence} disabled={grading} />
            )}

            {!feedback && (
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
                <PillButton onClick={submit} disabled={grading || (isMC && selected === null)}>
                  {grading ? "Checking…" : isMC ? "Submit choice" : "Submit answer"}
                </PillButton>
                {question.hint && !showHint && (
                  <button
                    onClick={() => setShowHint(true)}
                    disabled={grading}
                    className="text-[13px] font-semibold disabled:opacity-50"
                    style={{ color: "var(--muted)" }}
                  >
                    Stuck? Reveal a hint
                  </button>
                )}
              </div>
            )}

            {!feedback && showHint && question.hint && (
              <div
                className="mt-4 rounded-xl px-4 py-3 text-[14px] leading-relaxed tint"
                style={{ color: "var(--ink)" }}
              >
                <span className="font-semibold" style={{ color: "var(--blue)" }}>
                  Hint:{" "}
                </span>
                {question.hint}
              </div>
            )}

            {error && (
              <p className="mt-4 text-[14px]" style={{ color: "var(--danger)" }}>
                {error}
              </p>
            )}
          </div>

          {feedback && (
            <FeedbackCard feedback={feedback} question={question} answer={answer} hideCriteria={isMC} />
          )}

          {feedback && (
            <div className="mt-6">
              <PillButton onClick={advance} full>
                {isLast ? "See results" : "Next question"}
              </PillButton>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProgressHeader({
  index,
  total,
  answered,
  typeLabel,
  topic,
}: {
  index: number;
  total: number;
  answered: boolean;
  typeLabel: string;
  topic: string;
}) {
  return (
    <div className="mb-7">
      <div
        className="mb-2.5 flex items-center justify-between text-[13px]"
        style={{ color: "var(--muted)" }}
      >
        <span className="font-semibold">
          Question {index + 1} of {total}
        </span>
        <span
          className="rounded-full px-3 py-1 font-semibold tint"
          style={{ color: "var(--blue)" }}
        >
          {typeLabel} · {topic}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: "var(--line)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${((index + (answered ? 1 : 0)) / total) * 100}%`,
            background: "var(--blue)",
          }}
        />
      </div>
    </div>
  );
}

function ChoiceButton({
  label,
  index,
  selected,
  disabled,
  state,
  onClick,
}: {
  label: string;
  index: number;
  selected: boolean;
  disabled: boolean;
  state: "idle" | "correct" | "wrong";
  onClick: () => void;
}) {
  const letter = String.fromCharCode(65 + index);
  let border = selected ? "var(--blue)" : "var(--line)";
  let bg = "var(--panel)";
  let badgeBg = selected ? "var(--blue)" : "var(--tint)";
  let badgeFg = selected ? "#fff" : "var(--blue)";
  if (state === "correct") {
    border = "var(--mint)";
    bg = "rgba(23,189,131,0.10)";
    badgeBg = "var(--mint)";
    badgeFg = "#fff";
  } else if (state === "wrong") {
    border = "var(--danger)";
    bg = "#f7dfdb";
    badgeBg = "var(--danger)";
    badgeFg = "#fff";
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] transition disabled:cursor-default"
      style={{ borderColor: border, background: bg }}
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
        style={{ background: badgeBg, color: badgeFg }}
      >
        {state === "correct" ? "✓" : state === "wrong" ? "✕" : letter}
      </span>
      <span>{label}</span>
    </button>
  );
}

const CONFIDENCE_OPTIONS: { value: Confidence; label: string }[] = [
  { value: "low", label: "Not sure" },
  { value: "medium", label: "Fairly sure" },
  { value: "high", label: "Confident" },
];

function ConfidencePicker({
  value,
  onChange,
  disabled,
}: {
  value: Confidence | null;
  onChange: (c: Confidence) => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <span className="text-[13px] font-medium" style={{ color: "var(--muted)" }}>
        How confident are you?
      </span>
      {CONFIDENCE_OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          disabled={disabled}
          className="rounded-full border px-3 py-1.5 text-[12px] font-semibold transition disabled:opacity-50"
          style={{
            borderColor: value === o.value ? "var(--blue)" : "var(--line)",
            background: value === o.value ? "var(--blue)" : "transparent",
            color: value === o.value ? "#fff" : "var(--muted)",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const RATINGS: { value: FlashcardRating; label: string; color: string }[] = [
  { value: "again", label: "Again", color: "var(--danger)" },
  { value: "hard", label: "Hard", color: "var(--amber)" },
  { value: "good", label: "Good", color: "var(--blue)" },
  { value: "easy", label: "Easy", color: "var(--mint)" },
];

function FlashcardView({
  question,
  onRate,
  isLast,
}: {
  question: Question;
  onRate: (rating: FlashcardRating) => Promise<void>;
  isLast: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const [rating, setRating] = useState(false);

  async function rate(r: FlashcardRating) {
    if (rating) return;
    setRating(true);
    await onRate(r);
  }

  return (
    <div className="panel rounded-2xl p-7">
      <div className="text-[12px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--muted)" }}>
        Prompt
      </div>
      <h2 className="mt-2 text-[24px] font-extrabold leading-snug tracking-tight md:text-[26px]">
        {question.question}
      </h2>

      {!revealed ? (
        <div className="mt-7">
          <PillButton onClick={() => setRevealed(true)} full>
            Show answer
          </PillButton>
          <p className="mt-3 text-center text-[13px]" style={{ color: "var(--muted)" }}>
            Try to recall it first, then reveal to check yourself.
          </p>
        </div>
      ) : (
        <>
          <div
            className="mt-6 rounded-xl px-4 py-4 text-[15px] leading-relaxed tint"
            style={{ color: "var(--ink)" }}
          >
            <div className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--blue)" }}>
              Answer
            </div>
            {question.reference_answer}
          </div>

          <p className="mt-6 mb-3 text-center text-[13px] font-semibold" style={{ color: "var(--muted)" }}>
            How well did you recall it?
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                onClick={() => rate(r.value)}
                disabled={rating}
                className="rounded-xl border px-3 py-3 text-[14px] font-bold transition hover:bg-[var(--tint)] disabled:opacity-50"
                style={{ borderColor: r.color, color: r.color }}
              >
                {r.label}
              </button>
            ))}
          </div>
          {isLast && (
            <p className="mt-3 text-center text-[12px]" style={{ color: "var(--muted)" }}>
              Rating the last card finishes the session.
            </p>
          )}
        </>
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
  answer,
  hideCriteria,
}: {
  feedback: Feedback;
  question: Question;
  answer: string;
  hideCriteria?: boolean;
}) {
  const [showSource, setShowSource] = useState(false);
  return (
    <div className="panel mt-6 rounded-2xl p-7">
      <div className="mb-5 flex items-center gap-3">
        <ScoreBadge score={feedback.score} />
        {!hideCriteria && (
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
        )}
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
        {showSource ? "Hide evidence" : "Show evidence"}
      </button>
      {showSource && (
        <EvidenceView
          excerpt={question.source_excerpt}
          criteria={feedback.criteria}
        />
      )}

      <TutorChat question={question} answer={answer} />
    </div>
  );
}

const SUGGESTIONS = [
  "Why is that?",
  "Explain it differently",
  "Give me an analogy",
];

function TutorChat({
  question,
  answer,
}: {
  question: Question;
  answer: string;
}) {
  const [messages, setMessages] = useState<TutorTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next: TutorTurn[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: question.question,
          sourceExcerpt: question.source_excerpt,
          referenceAnswer: question.reference_answer,
          studentAnswer: answer,
          messages: next,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tutor failed.");
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tutor failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--line)" }}>
      <h3
        className="mb-3 text-[12px] font-bold uppercase tracking-[0.1em]"
        style={{ color: "var(--muted)" }}
      >
        Ask the tutor
      </h3>

      {messages.length > 0 && (
        <div className="mb-3 space-y-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                m.role === "user" ? "ml-auto" : ""
              }`}
              style={{
                background: m.role === "user" ? "var(--blue)" : "var(--tint)",
                color: m.role === "user" ? "#fff" : "var(--ink)",
              }}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div
              className="max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] tint"
              style={{ color: "var(--muted)" }}
            >
              Thinking…
            </div>
          )}
        </div>
      )}

      {messages.length === 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={loading}
              className="rounded-full border px-3 py-1.5 text-[13px] font-medium transition hover:bg-[var(--tint)] disabled:opacity-50"
              style={{ borderColor: "var(--line)", color: "var(--blue)" }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          placeholder="Ask a follow-up about this concept…"
          className="flex-1 rounded-full border px-4 py-2.5 text-[14px] outline-none transition focus:border-[var(--blue)]"
          style={{ borderColor: "var(--line)", background: "var(--panel)" }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="shrink-0 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--blue)" }}
        >
          Ask
        </button>
      </form>

      {error && (
        <p className="mt-2 text-[13px]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function EvidenceView({
  excerpt,
  criteria,
}: {
  excerpt: string;
  criteria: CriterionResult[];
}) {
  const { sentences, criterionSentence } = matchEvidence(
    excerpt,
    criteria.map((c) => c.description),
  );
  const highlighted = evidenceIndices(criterionSentence);

  return (
    <div className="mt-3">
      <blockquote
        className="rounded-xl border-l-2 px-4 py-3 text-[14px] leading-relaxed"
        style={{ borderColor: "var(--blue)", background: "var(--panel)" }}
      >
        {sentences.length === 0 ? (
          <span style={{ color: "var(--muted)" }}>{excerpt}</span>
        ) : (
          sentences.map((s, i) => (
            <span
              key={i}
              style={
                highlighted.has(i)
                  ? {
                      background: "rgba(23,189,131,0.18)",
                      borderRadius: "3px",
                      padding: "1px 2px",
                    }
                  : { color: "var(--muted)" }
              }
            >
              {s}{" "}
            </span>
          ))
        )}
      </blockquote>
      <p className="mt-2 text-[12px]" style={{ color: "var(--muted)" }}>
        Highlighted sentences are the source evidence for the rubric criteria.
      </p>
      <div className="mt-2 space-y-1">
        {criteria.map((c, ci) =>
          criterionSentence[ci] >= 0 ? (
            <div key={ci} className="text-[13px] leading-snug">
              <span className="font-semibold">{c.description}</span>
              <span style={{ color: "var(--muted)" }}>
                {" — “"}
                {sentences[criterionSentence[ci]]}
                {"”"}
              </span>
            </div>
          ) : null,
        )}
      </div>
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
