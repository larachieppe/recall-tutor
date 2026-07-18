"use client";

import { useReducer } from "react";
import SetupScreen from "@/components/SetupScreen";
import OverviewScreen from "@/components/OverviewScreen";
import StudyScreen from "@/components/StudyScreen";
import ResultsScreen from "@/components/ResultsScreen";
import LibraryScreen from "@/components/LibraryScreen";
import ProgressScreen from "@/components/ProgressScreen";
import type { Feedback, GenerateConfig, SourceMeta } from "@/lib/types";
import { reducer, initialState } from "@/lib/study-machine";
import { saveSession } from "@/lib/session";
import {
  loadLibrary,
  saveLibrary,
  setItemScore,
  upsertItem,
  type HistoryItem,
} from "@/lib/library";
import { conceptKey, dueConcepts, updateConcept } from "@/lib/mastery";
import { captureAnswer } from "@/lib/capture";
import { recordStudyDay } from "@/lib/streak";
import {
  flashcardFeedback,
  gradeMultipleChoice,
  type GradeSubmission,
} from "@/lib/grade-local";
import {
  DEMO_CONFIG,
  DEMO_META,
  DEMO_OVERVIEW,
  DEMO_QUESTIONS,
  DEMO_SOURCE,
} from "@/lib/demo";

export default function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);

  /** Async generation: questions (+ optional study notes) → drive the machine. */
  async function runGeneration(
    cfg: GenerateConfig,
    src: string,
    withOverview: boolean,
  ) {
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

      let overview = null;
      if (sumRes) {
        const sumData = await sumRes.json();
        if (sumRes.ok && sumData.overview) overview = sumData.overview;
      }
      dispatch({ type: "GENERATE_DONE", questions: genData.questions, overview });
    } catch (e) {
      dispatch({
        type: "GENERATE_FAIL",
        error: e instanceof Error ? e.message : "Generation failed.",
      });
    }
  }

  /** Save the input to history (dedupes) and start a study round. */
  function startStudy(src: string, meta: SourceMeta, cfg: GenerateConfig) {
    const { lib, id } = upsertItem(loadLibrary(), {
      title: meta.title,
      source: src,
      config: cfg,
    });
    saveLibrary(lib);
    dispatch({
      type: "GENERATE_START",
      source: src,
      meta,
      config: cfg,
      itemId: id,
      label: "Reading & generating…",
    });
    runGeneration(cfg, src, true);
  }

  function handleReady(src: string, m: SourceMeta, cfg: GenerateConfig) {
    startStudy(src, m, cfg);
  }

  /** Load the pre-baked demo — no API key, no network. Grades locally. */
  function startDemo() {
    dispatch({
      type: "GENERATE_START",
      source: DEMO_SOURCE,
      meta: DEMO_META,
      config: DEMO_CONFIG,
      itemId: null,
      label: "Loading demo…",
    });
    dispatch({
      type: "GENERATE_DONE",
      questions: DEMO_QUESTIONS,
      overview: DEMO_OVERVIEW,
    });
  }

  function openItem(item: HistoryItem) {
    if (state.busy) return; // ignore clicks while a round is already generating
    startStudy(
      item.source,
      { title: item.title, length: item.source.length },
      item.config,
    );
  }

  /** Regenerate without study notes, reusing the current source (weak areas / another set). */
  function regenerate(cfg: GenerateConfig) {
    if (!state.meta) return;
    dispatch({
      type: "GENERATE_START",
      source: state.source,
      meta: state.meta,
      config: cfg,
      itemId: state.currentItemId,
      label: "Generating questions…",
    });
    runGeneration(cfg, state.source, false);
  }

  function practiceWeak(topics: string[]) {
    if (!state.config) return;
    regenerate({ ...state.config, focus: topics.join(", ") });
  }

  function anotherSet() {
    if (!state.config) return;
    regenerate(state.config);
  }

  /** Regenerate for concepts due for review, grounded in the source they came from. */
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

  async function handleGrade(sub: GradeSubmission): Promise<Feedback> {
    const question = state.questions[state.index];

    // Route to the cheapest correct grader: flashcard self-rating and
    // multiple-choice are graded locally (instant, no key); free-text goes to
    // the model. Only model-graded answers feed the eval-capture dataset.
    let feedback: Feedback;
    let aiGraded = false;
    if (sub.rating) {
      feedback = flashcardFeedback(question, sub.rating);
    } else if (question.type === "multiple_choice") {
      feedback = gradeMultipleChoice(question, sub.selectedIndex ?? -1);
    } else {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, answer: sub.answer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Grading failed.");
      feedback = data.feedback as Feedback;
      aiGraded = true;
    }

    dispatch({
      type: "ANSWERED",
      record: {
        question,
        answer: sub.answer,
        feedback,
        confidence: sub.confidence,
      },
    });

    // Learner model update + eval capture (side-effects, local).
    const lib = loadLibrary();
    const mastery = { ...(lib.mastery ?? {}) };
    const key = conceptKey(question.topic);
    mastery[key] = updateConcept(mastery[key], question.topic, feedback.score, {
      sourceItemId: state.currentItemId ?? undefined,
    });
    saveLibrary({ ...lib, mastery, streak: recordStudyDay(lib.streak) });
    if (aiGraded) captureAnswer(question, sub.answer, feedback);

    return feedback;
  }

  function finish() {
    const records = state.records;
    if (state.meta && records.length) {
      const totalScore = records.reduce((s, r) => s + r.feedback.score, 0);
      const maxScore = records.length * 10;
      saveSession({
        id: crypto.randomUUID(),
        title: state.meta.title,
        createdAt: Date.now(),
        totalScore,
        maxScore,
        answers: records,
      });
      if (state.currentItemId) {
        const pct = Math.round((totalScore / maxScore) * 100);
        saveLibrary(setItemScore(loadLibrary(), state.currentItemId, pct));
      }
    }
    dispatch({ type: "FINISH" });
  }

  if (state.phase === "library") {
    return (
      <LibraryScreen
        onOpenItem={openItem}
        onNewSource={() => dispatch({ type: "NAV", phase: "setup" })}
        busy={state.busy}
        busyLabel={state.busyLabel}
        error={state.error}
      />
    );
  }

  if (state.phase === "progress") {
    return (
      <ProgressScreen
        busy={state.busy}
        busyLabel={state.busyLabel}
        onReviewDue={reviewDue}
        onNewSource={() => dispatch({ type: "NAV", phase: "setup" })}
        error={state.error}
      />
    );
  }

  if (state.phase === "overview" && state.overview) {
    return (
      <OverviewScreen
        overview={state.overview}
        sourceTitle={state.meta?.title ?? ""}
        questionCount={state.questions.length}
        onStart={() => dispatch({ type: "TO_STUDY" })}
      />
    );
  }

  if (state.phase === "study") {
    return (
      <StudyScreen
        questions={state.questions}
        index={state.index}
        mode={state.config?.mode ?? "graded"}
        onSubmit={handleGrade}
        onNext={() => dispatch({ type: "NEXT" })}
        onFinish={finish}
      />
    );
  }

  if (state.phase === "results") {
    return (
      <ResultsScreen
        records={state.records}
        title={state.meta?.title ?? "Study session"}
        busy={state.busy}
        busyLabel={state.busyLabel}
        onPracticeWeak={practiceWeak}
        onAnotherSet={anotherSet}
        onRestart={() => dispatch({ type: "RESTART" })}
        onOpenProgress={() => dispatch({ type: "NAV", phase: "progress" })}
        error={state.error}
      />
    );
  }

  return (
    <SetupScreen
      onReady={handleReady}
      onTryDemo={startDemo}
      onOpenHistory={() => dispatch({ type: "NAV", phase: "library" })}
      onOpenProgress={() => dispatch({ type: "NAV", phase: "progress" })}
      onReviewDue={reviewDue}
      busy={state.busy}
      busyLabel={state.busyLabel}
      error={state.error}
    />
  );
}
