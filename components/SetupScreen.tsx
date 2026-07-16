"use client";

import { useRef, useState } from "react";
import type {
  Difficulty,
  GenerateConfig,
  QuestionType,
  SourceMeta,
} from "@/lib/types";
import { QUESTION_TYPE_LABELS } from "@/lib/types";
import { BrandMark, PillButton } from "@/components/ui";
import { AUTH_ENABLED } from "@/lib/auth-flag";
import AuthButton from "@/components/AuthButton";

const ALL_TYPES: QuestionType[] = [
  "short_answer",
  "application",
  "compare_contrast",
];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

interface Props {
  onReady: (source: string, meta: SourceMeta, config: GenerateConfig) => void;
  onOpenHistory: () => void;
  busy: boolean;
  busyLabel: string;
  error: string | null;
}

export default function SetupScreen({
  onReady,
  onOpenHistory,
  busy,
  busyLabel,
  error,
}: Props) {
  const [tab, setTab] = useState<"link" | "file">("link");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<string>("");
  const [meta, setMeta] = useState<SourceMeta | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [count, setCount] = useState(5);
  const [types, setTypes] = useState<QuestionType[]>(ALL_TYPES);
  const [focus, setFocus] = useState("");

  async function extract() {
    setExtractError(null);
    setExtracting(true);
    setSource("");
    setMeta(null);
    try {
      let res: Response;
      if (tab === "link") {
        res = await fetch("/api/extract", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url }),
        });
      } else {
        if (!file) throw new Error("Choose a file first.");
        const fd = new FormData();
        fd.append("file", file);
        res = await fetch("/api/extract", { method: "POST", body: fd });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed.");
      setSource(data.text);
      setMeta({ title: data.title, length: data.length });
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : "Extraction failed.");
    } finally {
      setExtracting(false);
    }
  }

  function toggleType(t: QuestionType) {
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  function start() {
    if (!source || !meta) return;
    onReady(source, meta, { difficulty, count, types, focus });
  }

  const canExtract = tab === "link" ? url.trim().length > 0 : !!file;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 md:py-16">
      <header className="mb-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-[19px] font-bold tracking-[0.22em]">
              RECALL
            </span>
          </div>
          <div className="flex items-center gap-3">
            {AUTH_ENABLED && <AuthButton />}
            <button
              onClick={onOpenHistory}
              className="rounded-full border px-4 py-2 text-[13px] font-semibold transition hover:bg-[var(--tint)]"
              style={{ borderColor: "var(--line)", color: "var(--blue)" }}
            >
              History
            </button>
          </div>
        </div>
        <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl">
          Turn any source into{" "}
          <span className="gradient-text">active recall.</span>
        </h1>
        <p
          className="mt-5 max-w-xl text-[16px] leading-relaxed"
          style={{ color: "var(--muted)" }}
        >
          Paste a link or upload a file. Get medium-difficulty questions, answer
          them, and receive detailed, rubric-based feedback.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 md:items-start">
        {/* Source input */}
        <section className="panel rounded-2xl p-6">
          <SectionLabel>Source</SectionLabel>
          <div className="mb-4 flex gap-1 rounded-full tint p-1">
            <TabButton active={tab === "link"} onClick={() => setTab("link")}>
              Paste a link
            </TabButton>
            <TabButton active={tab === "file"} onClick={() => setTab("file")}>
              Upload a file
            </TabButton>
          </div>

          {tab === "link" ? (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://en.wikipedia.org/wiki/Gradient_descent"
              className="w-full rounded-xl border px-4 py-3 text-[15px] outline-none transition focus:border-[var(--blue)]"
              style={{ borderColor: "var(--line)", background: "var(--panel)" }}
            />
          ) : (
            <div>
              <input
                ref={fileInput}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button
                onClick={() => fileInput.current?.click()}
                className="w-full rounded-xl border border-dashed px-3 py-7 text-[15px] transition hover:border-[var(--blue)]"
                style={{ borderColor: "var(--line)", color: "var(--muted)" }}
              >
                {file ? file.name : "Choose a PDF, DOCX, TXT, or MD file"}
              </button>
            </div>
          )}

          <div className="mt-4">
            <PillButton
              onClick={extract}
              disabled={!canExtract || extracting}
              variant="light"
            >
              {extracting ? "Reading…" : "Read source"}
            </PillButton>
          </div>

          {extractError && (
            <p className="mt-4 text-[14px]" style={{ color: "var(--danger)" }}>
              {extractError}
            </p>
          )}
          {meta && (
            <div
              className="mt-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-[14px] tint"
              style={{ color: "var(--blue)" }}
            >
              <span className="mt-px font-bold">✓</span>
              <span>
                Read “{meta.title}” — {meta.length.toLocaleString()} characters
                extracted.
              </span>
            </div>
          )}
        </section>

        {/* Config */}
        <section className="panel rounded-2xl p-6">
          <SectionLabel>Settings</SectionLabel>
          <Field label="Difficulty">
            <div className="flex gap-2">
              {DIFFICULTIES.map((d) => (
                <Chip
                  key={d}
                  active={difficulty === d}
                  onClick={() => setDifficulty(d)}
                >
                  {d[0].toUpperCase() + d.slice(1)}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label={`Number of questions — ${count}`}>
            <input
              type="range"
              min={1}
              max={15}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: "var(--blue)" }}
            />
          </Field>

          <Field label="Question types">
            <div className="flex flex-wrap gap-2">
              {ALL_TYPES.map((t) => (
                <Chip
                  key={t}
                  active={types.includes(t)}
                  onClick={() => toggleType(t)}
                >
                  {QUESTION_TYPE_LABELS[t]}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Focus area (optional)">
            <input
              type="text"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="e.g. learning rate, convergence"
              className="w-full rounded-xl border px-4 py-3 text-[15px] outline-none transition focus:border-[var(--blue)]"
              style={{ borderColor: "var(--line)", background: "var(--panel)" }}
            />
          </Field>
        </section>
      </div>

      {error && (
        <p
          className="mt-6 text-center text-[14px]"
          style={{ color: "var(--danger)" }}
        >
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-col items-center">
        <PillButton
          onClick={start}
          disabled={!source || busy || types.length === 0}
          className="w-full md:w-auto"
        >
          {busy ? busyLabel : "Generate questions"}
        </PillButton>
        {types.length === 0 && (
          <p className="mt-3 text-[13px]" style={{ color: "var(--muted)" }}>
            Pick at least one question type.
          </p>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-4 text-[12px] font-bold uppercase tracking-[0.14em]"
      style={{ color: "var(--muted)" }}
    >
      {children}
    </p>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-full px-3 py-2 text-[14px] font-semibold transition"
      style={{
        background: active ? "var(--blue)" : "transparent",
        color: active ? "#ffffff" : "var(--muted)",
      }}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <label
        className="mb-2.5 block text-[13px] font-semibold"
        style={{ color: "var(--ink)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border px-4 py-2 text-[13px] font-semibold transition"
      style={{
        borderColor: active ? "var(--blue)" : "var(--line)",
        background: active ? "var(--blue)" : "transparent",
        color: active ? "#ffffff" : "var(--ink)",
      }}
    >
      {children}
    </button>
  );
}
