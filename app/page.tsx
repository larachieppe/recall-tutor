"use client";

import { useState } from "react";
import SetupScreen from "@/components/SetupScreen";
import OverviewScreen from "@/components/OverviewScreen";
import StudyScreen from "@/components/StudyScreen";
import ResultsScreen from "@/components/ResultsScreen";
import type {
  AnswerRecord,
  Feedback,
  GenerateConfig,
  Overview,
  Question,
  SourceMeta,
} from "@/lib/types";
import { saveSession } from "@/lib/session";

type Phase = "setup" | "overview" | "study" | "results";

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

  function handleReady(src: string, m: SourceMeta, cfg: GenerateConfig) {
    setSource(src);
    setMeta(m);
    setConfig(cfg);
    generate(cfg, src, true);
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
    return feedback;
  }

  function finish(finalRecords: AnswerRecord[]) {
    if (meta && finalRecords.length) {
      saveSession({
        id: crypto.randomUUID(),
        title: meta.title,
        createdAt: Date.now(),
        totalScore: finalRecords.reduce((s, r) => s + r.feedback.score, 0),
        maxScore: finalRecords.length * 10,
        answers: finalRecords,
      });
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

  function restart() {
    setPhase("setup");
    setQuestions([]);
    setRecords([]);
    setOverview(null);
    setIndex(0);
    setError(null);
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
      />
    );
  }

  return (
    <SetupScreen
      onReady={handleReady}
      busy={busy}
      busyLabel={busyLabel}
      error={error}
    />
  );
}
