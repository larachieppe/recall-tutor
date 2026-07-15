"use client";

import { useState } from "react";
import SetupScreen from "@/components/SetupScreen";
import StudyScreen from "@/components/StudyScreen";
import ResultsScreen from "@/components/ResultsScreen";
import type {
  AnswerRecord,
  Feedback,
  GenerateConfig,
  Question,
  SourceMeta,
} from "@/lib/types";
import { saveSession } from "@/lib/session";

type Phase = "setup" | "study" | "results";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [source, setSource] = useState("");
  const [meta, setMeta] = useState<SourceMeta | null>(null);
  const [config, setConfig] = useState<GenerateConfig | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [records, setRecords] = useState<AnswerRecord[]>([]);

  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Working…");
  const [error, setError] = useState<string | null>(null);

  async function generate(cfg: GenerateConfig, src: string) {
    setBusy(true);
    setBusyLabel("Generating questions…");
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: src, ...cfg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed.");
      if (!data.questions?.length) throw new Error("No questions were generated.");
      setQuestions(data.questions);
      setRecords([]);
      setIndex(0);
      setPhase("study");
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
    generate(cfg, src);
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
    generate({ ...config, focus: topics.join(", ") }, source);
  }

  function anotherSet() {
    if (!config) return;
    generate(config, source);
  }

  function restart() {
    setPhase("setup");
    setQuestions([]);
    setRecords([]);
    setIndex(0);
    setError(null);
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
