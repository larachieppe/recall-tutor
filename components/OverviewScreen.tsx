"use client";

import type { Overview } from "@/lib/types";
import { PillButton } from "@/components/ui";

interface Props {
  overview: Overview;
  sourceTitle: string;
  questionCount: number;
  onStart: () => void;
}

export default function OverviewScreen({
  overview,
  sourceTitle,
  questionCount,
  onStart,
}: Props) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <p
        className="mb-3 text-[12px] font-bold uppercase tracking-[0.16em]"
        style={{ color: "var(--muted)" }}
      >
        Study notes
      </p>
      <h1 className="text-3xl font-extrabold leading-[1.12] tracking-tight md:text-4xl">
        <span className="gradient-text">{overview.headline}</span>
      </h1>
      <p className="mt-2 text-[13px]" style={{ color: "var(--muted)" }}>
        From “{sourceTitle}”
      </p>

      {/* Summary */}
      <section className="panel mt-7 rounded-2xl p-7">
        <p className="text-[16px] leading-relaxed">{overview.summary}</p>
      </section>

      {/* Key concepts */}
      <section className="panel mt-5 rounded-2xl p-7">
        <h2 className="mb-5 text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
          Key concepts
        </h2>
        <div className="space-y-5">
          {overview.key_concepts.map((c, i) => (
            <div key={i} className="flex gap-4">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold tint"
                style={{ color: "var(--blue)" }}
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-[16px] font-bold" style={{ color: "var(--blue)" }}>
                  {c.term}
                </h3>
                <p className="mt-1 text-[15px] leading-relaxed">
                  {c.explanation}
                </p>
                {c.example && (
                  <p
                    className="mt-2 rounded-lg px-3 py-2 text-[14px] leading-relaxed tint"
                    style={{ color: "var(--ink)" }}
                  >
                    <span className="font-semibold" style={{ color: "var(--blue)" }}>
                      Example:{" "}
                    </span>
                    {c.example}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Takeaways */}
      {overview.takeaways.length > 0 && (
        <section className="panel mt-5 rounded-2xl p-7">
          <h2 className="mb-4 text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
            Key takeaways
          </h2>
          <ul className="space-y-2.5">
            {overview.takeaways.map((t, i) => (
              <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed">
                <span
                  className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: "var(--mint)" }}
                />
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8">
        <PillButton onClick={onStart} full>
          Start practicing ({questionCount} question
          {questionCount === 1 ? "" : "s"})
        </PillButton>
      </div>
    </div>
  );
}
