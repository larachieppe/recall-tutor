"use client";

import { useState } from "react";
import SetupScreen from "@/components/SetupScreen";
import OverviewScreen from "@/components/OverviewScreen";
import StudyScreen from "@/components/StudyScreen";
import ResultsScreen from "@/components/ResultsScreen";
import LibraryScreen from "@/components/LibraryScreen";
import ProgressScreen from "@/components/ProgressScreen";
import type {
  AnswerRecord,
  Feedback,
  GenerateConfig,
  Overview,
  Question,
  SourceMeta,
} from "@/lib/types";
import { saveSession } from "@/lib/session";
import {
  loadLibrary,
  saveLibrary,
  setItemScore,
  upsertItem,
  type HistoryItem,
} from "@/lib/library";
import { conceptKey, dueConcepts, updateConcept } from "@/lib/mastery";

type Phase =
  | "setup"
  | "library"
  | "progress"
  | "overview"
  | "study"
  | "results";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [source, setSource] = useState("");
  const [meta, setMeta] = useState<SourceMeta | null>(null);
  const [config, setConfig] = useState<GenerateConfig | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);

  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Working…");
  const [error, setError] = useState<string | null>(null);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);

  /**
   * Generate questions (and, on the first round, didactic study notes in
   * parallel). If notes come back, show the overview screen before study.
   */
  async function generate(
    cfg: GenerateConfig,
    src: string,
    withOverview: boolean,
  ) {
    setBusy(true);
    setBusyLabel(withOverview ? "Reading & generating…" : "Generating questions…");
    setError(null);
    try {
      const genReq = fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: src, ...cfg }),
      });
      const sumReq = withOverview
        ? fetch("/api/summary", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ source: src }),
          })
        : null;

      const [genRes, sumRes] = await Promise.all([genReq, sumReq]);

      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error || "Generation failed.");
      if (!genData.questions?.length)
        throw new Error("No questions were generated.");

      let ov: Overview | null = null;
      if (sumRes) {
        const sumData = await sumRes.json();
        if (sumRes.ok && sumData.overview) ov = sumData.overview;
      }

      setQuestions(genData.questions);
      setRecords([]);
      setIndex(0);
      setOverview(ov);
      setPhase(ov ? "overview" : "study");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  /** Save the input to history (dedupes by source) and start a study round. */
  function startStudy(src: string, m: SourceMeta, cfg: GenerateConfig) {
    const { lib, id } = upsertItem(loadLibrary(), {
      title: m.title,
      source: src,
      config: cfg,
    });
    saveLibrary(lib);
    setCurrentItemId(id);
    setSource(src);
    setMeta(m);
    setConfig(cfg);
    generate(cfg, src, true);
  }

  function handleReady(src: string, m: SourceMeta, cfg: GenerateConfig) {
    startStudy(src, m, cfg);
  }

  function openItem(item: HistoryItem) {
    startStudy(
      item.source,
      { title: item.title, length: item.source.length },
      item.config,
    );
  }

  async function handleGrade(answer: string): Promise<Feedback> {
    const question = questions[index];
    const res = await fetch("/api/grade", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, answer }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Grading failed.");
    const feedback = data.feedback as Feedback;
    setRecords((prev) => [...prev, { question, answer, feedback }]);

    // Update the learner model for this concept (topic) and re-schedule it.
    const lib = loadLibrary();
    const mastery = { ...(lib.mastery ?? {}) };
    const key = conceptKey(question.topic);
    mastery[key] = updateConcept(mastery[key], question.topic, feedback.score, {
      sourceItemId: currentItemId ?? undefined,
    });
    saveLibrary({ ...lib, mastery });

    return feedback;
  }

  function finish(finalRecords: AnswerRecord[]) {
    if (meta && finalRecords.length) {
      const totalScore = finalRecords.reduce((s, r) => s + r.feedback.score, 0);
      const maxScore = finalRecords.length * 10;
      saveSession({
        id: crypto.randomUUID(),
        title: meta.title,
        createdAt: Date.now(),
        totalScore,
        maxScore,
        answers: finalRecords,
      });
      if (currentItemId) {
        const pct = Math.round((totalScore / maxScore) * 100);
        saveLibrary(setItemScore(loadLibrary(), currentItemId, pct));
      }
    }
    setPhase("results");
  }

  function practiceWeak(topics: string[]) {
    if (!config) return;
    generate({ ...config, focus: topics.join(", ") }, source, false);
  }

  function anotherSet() {
    if (!config) return;
    generate(config, source, false);
  }

  /**
   * Regenerate a practice round for concepts that are due for review, grounded
   * in the source they came from. Picks the source covering the most due
   * concepts and focuses generation on them.
   */
  function reviewDue() {
    const lib = loadLibrary();
    const due = dueConcepts(lib.mastery ?? {});
    const bySource = new Map<string, string[]>();
    for (const c of due) {
      if (c.sourceItemId && lib.items[c.sourceItemId]) {
        const arr = bySource.get(c.sourceItemId) ?? [];
        arr.push(c.concept);
        bySource.set(c.sourceItemId, arr);
      }
    }
    if (bySource.size === 0) return;

    let bestId = "";
    let bestConcepts: string[] = [];
    for (const [id, concepts] of bySource) {
      if (concepts.length > bestConcepts.length) {
        bestId = id;
        bestConcepts = concepts;
      }
    }
    const item = lib.items[bestId];
    startStudy(
      item.source,
      { title: item.title, length: item.source.length },
      { ...item.config, focus: bestConcepts.join(", ") },
    );
  }

  function restart() {
    setPhase("setup");
    setQuestions([]);
    setRecords([]);
    setOverview(null);
    setIndex(0);
    setError(null);
  }

  if (phase === "library") {
    return (
      <LibraryScreen
        onOpenItem={openItem}
        onNewSource={() => setPhase("setup")}
      />
    );
  }

  if (phase === "progress") {
    return (
      <ProgressScreen
        busy={busy}
        busyLabel={busyLabel}
        onReviewDue={reviewDue}
        onNewSource={() => setPhase("setup")}
      />
    );
  }

  if (phase === "overview" && overview) {
    return (
      <OverviewScreen
        overview={overview}
        sourceTitle={meta?.title ?? ""}
        questionCount={questions.length}
        onStart={() => setPhase("study")}
      />
    );
  }

  if (phase === "study") {
    return (
      <StudyScreen
        questions={questions}
        index={index}
        records={records}
        onSubmit={handleGrade}
        onNext={() => setIndex((i) => i + 1)}
        onFinish={() => finish(records)}
      />
    );
  }

  if (phase === "results") {
    return (
      <ResultsScreen
        records={records}
        busy={busy}
        busyLabel={busyLabel}
        onPracticeWeak={practiceWeak}
        onAnotherSet={anotherSet}
        onRestart={restart}
        onOpenProgress={() => setPhase("progress")}
      />
    );
  }

  return (
    <SetupScreen
      onReady={handleReady}
      onOpenHistory={() => setPhase("library")}
      onOpenProgress={() => setPhase("progress")}
      busy={busy}
      busyLabel={busyLabel}
      error={error}
    />
  );
}
