"use client";

import type { AnswerRecord } from "@/lib/types";
import { topicMastery, weakTopics } from "@/lib/session";

interface Props {
  records: AnswerRecord[];
  busy: boolean;
  busyLabel: string;
  onPracticeWeak: (topics: string[]) => void;
  onAnotherSet: () => void;
  onRestart: () => void;
}

export default function ResultsScreen({
  records,
  busy,
  busyLabel,
  onPracticeWeak,
  onAnotherSet,
  onRestart,
}: Props) {
  const total = records.reduce((s, r) => s + r.feedback.score, 0);
  const max = records.length * 10;
  const pct = max ? Math.round((total / max) * 100) : 0;
  const mastery = topicMastery(records);
  const weak = weakTopics(records);
  const strong = mastery.filter((t) => t.avgScore >= 7).map((t) => t.topic);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="serif text-3xl font-semibold">Session results</h1>

      <section className="panel mt-6 rounded-xl p-6 text-center">
        <div className="serif text-5xl font-bold accent-text">
          {total}
          <span className="text-2xl" style={{ color: "var(--muted)" }}>
            {" "}
            / {max}
          </span>
        </div>
        <p className="mt-1 text-[14px]" style={{ color: "var(--muted)" }}>
          {pct}% across {records.length} question
          {records.length === 1 ? "" : "s"}
        </p>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TopicList
          title="Strongest topics"
          topics={strong}
          empty="Keep practicing to build strengths."
          tone="strong"
        />
        <TopicList
          title="Weakest topics"
          topics={weak}
          empty="No weak spots — nicely done."
          tone="weak"
        />
      </section>

      <section className="panel mt-5 rounded-xl p-5">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
          By topic
        </h2>
        <div className="space-y-2.5">
          {mastery.map((t) => (
            <div key={t.topic}>
              <div className="mb-1 flex items-center justify-between text-[14px]">
                <span>{t.topic}</span>
                <span style={{ color: "var(--muted)" }}>
                  {t.avgScore.toFixed(1)}/10
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(t.avgScore / 10) * 100}%`,
                    background:
                      t.avgScore >= 7 ? "var(--accent)" : t.avgScore >= 4 ? "#c99a2e" : "#c0503f",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 space-y-3">
        {weak.length > 0 && (
          <button
            onClick={() => onPracticeWeak(weak)}
            disabled={busy}
            className="w-full rounded-xl px-4 py-3 text-[15px] font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {busy ? busyLabel : `Practice weak areas (${weak.length})`}
          </button>
        )}
        <button
          onClick={onAnotherSet}
          disabled={busy}
          className="w-full rounded-xl border px-4 py-3 text-[15px] font-semibold disabled:opacity-50"
          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
        >
          {busy ? busyLabel : "Generate another set"}
        </button>
        <button
          onClick={onRestart}
          className="w-full rounded-xl px-4 py-2.5 text-[14px] font-medium"
          style={{ color: "var(--muted)" }}
        >
          Start over with a new source
        </button>
      </div>
    </div>
  );
}

function TopicList({
  title,
  topics,
  empty,
  tone,
}: {
  title: string;
  topics: string[];
  empty: string;
  tone: "strong" | "weak";
}) {
  const color = tone === "strong" ? "var(--accent)" : "#c0503f";
  return (
    <div className="panel rounded-xl p-5">
      <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        {title}
      </h2>
      {topics.length === 0 ? (
        <p className="text-[14px]" style={{ color: "var(--muted)" }}>
          {empty}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {topics.map((t) => (
            <li key={t} className="flex items-center gap-2 text-[14px]">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: color }}
              />
              {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
