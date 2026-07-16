"use client";

import { useEffect, useState } from "react";
import { loadLibrary } from "@/lib/library";
import {
  allConcepts,
  dueConcepts,
  isDue,
  reviewLabel,
  type ConceptMastery,
  type MasteryMap,
} from "@/lib/mastery";
import { BrandMark, PillButton } from "@/components/ui";
import { captureCount, capturesToJsonl, clearCaptures } from "@/lib/capture";
import { AUTH_ENABLED } from "@/lib/auth-flag";
import SignInPrompt from "@/components/SignInPrompt";

interface Props {
  busy: boolean;
  busyLabel: string;
  onReviewDue: () => void;
  onNewSource: () => void;
  error: string | null;
}

export default function ProgressScreen({
  busy,
  busyLabel,
  onReviewDue,
  onNewSource,
  error,
}: Props) {
  const [mastery, setMastery] = useState<MasteryMap>({});
  const [captured, setCaptured] = useState(0);

  useEffect(() => {
    const load = () => {
      setMastery(loadLibrary().mastery ?? {});
      setCaptured(captureCount());
    };
    load();
    window.addEventListener("recall:lib-remote", load);
    return () => window.removeEventListener("recall:lib-remote", load);
  }, []);

  function downloadDataset() {
    const blob = new Blob([capturesToJsonl()], {
      type: "application/x-jsonlines",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dataset.jsonl";
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetCaptures() {
    clearCaptures();
    setCaptured(0);
  }

  const concepts = allConcepts(mastery);
  const due = dueConcepts(mastery);
  const reviewable = due.filter((c) => c.sourceItemId);
  const avgMastery =
    concepts.length > 0
      ? concepts.reduce((s, c) => s + c.mastery, 0) / concepts.length
      : 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BrandMark size={24} />
          <span className="text-[16px] font-bold tracking-[0.22em]">RECALL</span>
        </div>
        <PillButton onClick={onNewSource} variant="light">
          New source
        </PillButton>
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
        Your progress
      </h1>
      <p className="mt-1 text-[14px]" style={{ color: "var(--muted)" }}>
        {concepts.length} concept{concepts.length === 1 ? "" : "s"} tracked
        {concepts.length > 0
          ? ` · ${Math.round(avgMastery * 100)}% average mastery · ${due.length} due for review`
          : ""}
      </p>

      {concepts.length === 0 && (
        <div
          className="panel mt-7 rounded-2xl p-8 text-center text-[15px]"
          style={{ color: "var(--muted)" }}
        >
          No concepts yet. Answer some questions and your concept mastery will
          build here, then get scheduled for spaced review.
        </div>
      )}

      {reviewable.length > 0 && (
        <div className="mt-7">
          <PillButton onClick={onReviewDue} disabled={busy} full>
            {busy
              ? busyLabel
              : `Review due concepts (${reviewable.length})`}
          </PillButton>
        </div>
      )}

      {error && (
        <div className="mt-4 flex flex-col items-center">
          <p className="text-center text-[14px]" style={{ color: "var(--danger)" }}>
            {error}
          </p>
          {AUTH_ENABLED && /sign in/i.test(error) && <SignInPrompt />}
        </div>
      )}

      {concepts.length > 0 && (
        <section className="panel mt-6 rounded-2xl p-6">
          <h2
            className="mb-4 text-[12px] font-bold uppercase tracking-[0.14em]"
            style={{ color: "var(--muted)" }}
          >
            Concept mastery
          </h2>
          <div className="space-y-4">
            {concepts.map((c) => (
              <ConceptRow key={c.concept} c={c} />
            ))}
          </div>
        </section>
      )}

      {/* Evaluation capture (self-building dataset from real usage) */}
      <section className="panel mt-6 rounded-2xl p-6">
        <h2
          className="mb-1 text-[12px] font-bold uppercase tracking-[0.14em]"
          style={{ color: "var(--muted)" }}
        >
          Evaluation capture
        </h2>
        <p className="text-[14px]" style={{ color: "var(--muted)" }}>
          {captured === 0
            ? "Answers you grade are logged here (locally) to build a grading-evaluation dataset."
            : `${captured} answered question${captured === 1 ? "" : "s"} captured. Download, review/correct the human scores, then run the eval.`}
        </p>
        {captured > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={downloadDataset}
              className="rounded-full px-5 py-2 text-[14px] font-semibold text-white"
              style={{ background: "var(--blue)" }}
            >
              Download dataset.jsonl
            </button>
            <button
              onClick={resetCaptures}
              className="text-[13px] font-semibold"
              style={{ color: "var(--muted)" }}
            >
              Clear
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function ConceptRow({ c }: { c: ConceptMastery }) {
  const pct = Math.round(c.mastery * 100);
  const color =
    c.mastery >= 0.7
      ? "var(--mint)"
      : c.mastery >= 0.4
        ? "var(--amber)"
        : "var(--danger)";
  const due = isDue(c);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-[14px]">
        <span className="min-w-0 flex-1 truncate font-medium">{c.concept}</span>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold"
          style={{
            background: due ? "var(--tint)" : "transparent",
            color: due ? "var(--blue)" : "var(--muted)",
          }}
        >
          {reviewLabel(c)}
        </span>
        <span
          className="shrink-0 text-[13px] tabular-nums"
          style={{ color: "var(--muted)" }}
        >
          {pct}%
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: "var(--line)" }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="mt-1 text-[12px]" style={{ color: "var(--muted)" }}>
        {c.attempts} attempt{c.attempts === 1 ? "" : "s"} · avg{" "}
        {c.averageScore.toFixed(1)}/10
      </div>
    </div>
  );
}
