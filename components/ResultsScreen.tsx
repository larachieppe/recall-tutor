"use client";

import type { AnswerRecord } from "@/lib/types";
import { topicMastery, weakTopics } from "@/lib/session";
import { PillButton } from "@/components/ui";

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
    <div className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
        Session results
      </h1>

      <section className="panel mt-7 rounded-2xl p-8 text-center">
        <div className="text-6xl font-extrabold tracking-tight">
          <span className="gradient-text">{total}</span>
          <span className="text-3xl" style={{ color: "var(--muted)" }}>
            {" "}
            / {max}
          </span>
        </div>
        <p className="mt-2 text-[14px]" style={{ color: "var(--muted)" }}>
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

      <section className="panel mt-5 rounded-2xl p-6">
        <h2
          className="mb-4 text-[12px] font-bold uppercase tracking-[0.14em]"
          style={{ color: "var(--muted)" }}
        >
          By topic
        </h2>
        <div className="space-y-3">
          {mastery.map((t) => (
            <div key={t.topic}>
              <div className="mb-1.5 flex items-center justify-between text-[14px]">
                <span className="font-medium">{t.topic}</span>
                <span style={{ color: "var(--muted)" }}>
                  {t.avgScore.toFixed(1)}/10
                </span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full"
                style={{ background: "var(--line)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(t.avgScore / 10) * 100}%`,
                    background:
                      t.avgScore >= 7
                        ? "var(--mint)"
                        : t.avgScore >= 4
                          ? "var(--amber)"
                          : "var(--danger)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-7 flex flex-col items-center gap-3">
        {weak.length > 0 && (
          <PillButton
            onClick={() => onPracticeWeak(weak)}
            disabled={busy}
            full
          >
            {busy ? busyLabel : `Practice weak areas (${weak.length})`}
          </PillButton>
        )}
        <PillButton
          onClick={onAnotherSet}
          disabled={busy}
          variant="light"
          full
        >
          {busy ? busyLabel : "Generate another set"}
        </PillButton>
        <button
          onClick={onRestart}
          className="mt-1 text-[14px] font-semibold"
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
  const color = tone === "strong" ? "var(--mint)" : "var(--danger)";
  return (
    <div className="panel rounded-2xl p-6">
      <h2
        className="mb-3 text-[12px] font-bold uppercase tracking-[0.14em]"
        style={{ color: "var(--muted)" }}
      >
        {title}
      </h2>
      {topics.length === 0 ? (
        <p className="text-[14px]" style={{ color: "var(--muted)" }}>
          {empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {topics.map((t) => (
            <li key={t} className="flex items-center gap-2.5 text-[14px]">
              <span
                className="inline-block h-2 w-2 rounded-full"
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
