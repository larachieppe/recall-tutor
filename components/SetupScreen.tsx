"use client";

import { useRef, useState } from "react";
import type {
  Difficulty,
  GenerateConfig,
  QuestionType,
  SourceMeta,
} from "@/lib/types";
import { QUESTION_TYPE_LABELS } from "@/lib/types";

const ALL_TYPES: QuestionType[] = [
  "short_answer",
  "application",
  "compare_contrast",
];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

interface Props {
  onReady: (source: string, meta: SourceMeta, config: GenerateConfig) => void;
  busy: boolean;
  busyLabel: string;
  error: string | null;
}

export default function SetupScreen({
  onReady,
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
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <h1 className="serif text-4xl font-semibold tracking-tight">Recall</h1>
        <p className="mt-2 text-[15px]" style={{ color: "var(--muted)" }}>
          Paste a link or upload a file. Get medium-difficulty questions,
          answer them, and receive detailed, rubric-based feedback.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 md:items-start">
        {/* Source input */}
        <section className="panel rounded-xl p-5">
        <div className="mb-4 flex gap-1 rounded-lg p-1" style={{ background: "var(--bg)" }}>
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
            className="w-full rounded-lg border px-3 py-2.5 text-[15px] outline-none focus:ring-2"
            style={{ borderColor: "var(--line)", background: "var(--bg)" }}
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
              className="w-full rounded-lg border border-dashed px-3 py-6 text-[15px]"
              style={{ borderColor: "var(--line)", color: "var(--muted)" }}
            >
              {file ? file.name : "Choose a PDF, DOCX, TXT, or MD file"}
            </button>
          </div>
        )}

        <button
          onClick={extract}
          disabled={!canExtract || extracting}
          className="mt-3 rounded-lg px-4 py-2 text-[14px] font-medium text-white disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {extracting ? "Reading…" : "Read source"}
        </button>

        {extractError && (
          <p className="mt-3 text-[14px]" style={{ color: "#c0392b" }}>
            {extractError}
          </p>
        )}
        {meta && (
          <p className="mt-3 text-[14px] accent-text">
            ✓ Read “{meta.title}” — {meta.length.toLocaleString()} characters
            extracted.
          </p>
        )}
      </section>

        {/* Config */}
        <section className="panel rounded-xl p-5">
        <Field label="Difficulty">
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
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
            style={{ accentColor: "var(--accent)" }}
          />
        </Field>

        <Field label="Question types">
          <div className="flex flex-wrap gap-2">
            {ALL_TYPES.map((t) => (
              <Chip key={t} active={types.includes(t)} onClick={() => toggleType(t)}>
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
            className="w-full rounded-lg border px-3 py-2.5 text-[15px] outline-none"
            style={{ borderColor: "var(--line)", background: "var(--bg)" }}
          />
        </Field>
        </section>
      </div>

      {error && (
        <p className="mt-4 text-center text-[14px]" style={{ color: "#c0392b" }}>
          {error}
        </p>
      )}

      <button
        onClick={start}
        disabled={!source || busy || types.length === 0}
        className="mt-6 mx-auto block w-full rounded-xl px-4 py-3 text-[15px] font-semibold text-white disabled:opacity-50 md:w-72"
        style={{ background: "var(--accent)" }}
      >
        {busy ? busyLabel : "Generate questions"}
      </button>
      {types.length === 0 && (
        <p className="mt-2 text-center text-[13px]" style={{ color: "var(--muted)" }}>
          Pick at least one question type.
        </p>
      )}
    </div>
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
      className="flex-1 rounded-md px-3 py-1.5 text-[14px] font-medium transition"
      style={{
        background: active ? "var(--panel)" : "transparent",
        color: active ? "var(--ink)" : "var(--muted)",
        boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
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
    <div className="mb-4 last:mb-0">
      <label className="mb-2 block text-[13px] font-medium" style={{ color: "var(--muted)" }}>
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
      className="rounded-full border px-3 py-1.5 text-[13px] font-medium transition"
      style={{
        borderColor: active ? "var(--accent)" : "var(--line)",
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--accent)" : "var(--ink)",
      }}
    >
      {children}
    </button>
  );
}
