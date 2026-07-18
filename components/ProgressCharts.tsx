"use client";

import { scoreSeries, type ScorePoint } from "@/lib/analytics";
import type { ConceptMastery } from "@/lib/mastery";
import type { SavedSession } from "@/lib/session";

const BLUE = "#0020bb";
const MINT = "#17bd83";
const AMBER = "#b7791f";
const DANGER = "#c0392b";
const LINE = "#e7e8f2";
const MUTED = "#5b6478";
const INK = "#0d1030";

const bandColor = (m: number) => (m >= 0.7 ? MINT : m >= 0.4 ? AMBER : DANGER);

export default function ProgressCharts({
  sessions,
  concepts,
}: {
  sessions: SavedSession[];
  concepts: ConceptMastery[];
}) {
  const series = scoreSeries(sessions);
  return (
    <div className="mt-6 grid grid-cols-1 gap-4">
      <section className="panel rounded-2xl p-6">
        <h2
          className="mb-4 text-[12px] font-bold uppercase tracking-[0.14em]"
          style={{ color: MUTED }}
        >
          Score over time
        </h2>
        {series.length >= 2 ? (
          <ScoreChart series={series} />
        ) : (
          <p className="text-[14px]" style={{ color: MUTED }}>
            Finish a few practice sets and your score trend will appear here.
          </p>
        )}
      </section>

      {concepts.length > 0 && (
        <section className="panel rounded-2xl p-6">
          <h2
            className="mb-4 text-[12px] font-bold uppercase tracking-[0.14em]"
            style={{ color: MUTED }}
          >
            Concept mastery map
          </h2>
          <MasteryMap concepts={concepts} />
          <div className="mt-3 flex flex-wrap gap-4 text-[12px]" style={{ color: MUTED }}>
            <Legend color={DANGER} label="Weak (< 40%)" />
            <Legend color={AMBER} label="Building (40–70%)" />
            <Legend color={MINT} label="Strong (≥ 70%)" />
            <span>· bubble size = attempts · position = mastery</span>
          </div>
        </section>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

function ScoreChart({ series }: { series: ScorePoint[] }) {
  const W = 640;
  const H = 200;
  const l = 30;
  const r = 14;
  const t = 14;
  const b = 26;
  const iw = W - l - r;
  const ih = H - t - b;
  const base = t + ih;
  const n = series.length;
  const x = (i: number) => l + (i / (n - 1)) * iw;
  const y = (p: number) => t + (1 - p / 100) * ih;
  const pts = series.map((s, i) => [x(i), y(s.pct)] as const);
  const line = pts
    .map((p, i) => `${i ? "L" : "M"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(" ");
  const area =
    `M ${x(0).toFixed(1)} ${base} ` +
    pts.map((p) => `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ") +
    ` L ${x(n - 1).toFixed(1)} ${base} Z`;
  const last = series[n - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Score percentage across practice sessions over time"
    >
      <defs>
        <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={BLUE} stopOpacity="0.18" />
          <stop offset="1" stopColor={BLUE} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 50, 100].map((g) => (
        <g key={g}>
          <line x1={l} x2={W - r} y1={y(g)} y2={y(g)} stroke={LINE} strokeWidth={1} />
          <text x={l - 6} y={y(g) + 3} textAnchor="end" fontSize={10} fill={MUTED}>
            {g}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#scoreFill)" />
      <path
        d={line}
        fill="none"
        stroke={BLUE}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3.2} fill={BLUE}>
          <title>
            {new Date(series[i].at).toLocaleDateString()} — {series[i].pct}%
          </title>
        </circle>
      ))}
      <text
        x={x(n - 1)}
        y={y(last.pct) - 8}
        textAnchor="end"
        fontSize={11}
        fontWeight={700}
        fill={INK}
      >
        {last.pct}%
      </text>
      <text x={l} y={H - 4} fontSize={10} fill={MUTED}>
        oldest
      </text>
      <text x={W - r} y={H - 4} textAnchor="end" fontSize={10} fill={MUTED}>
        latest
      </text>
    </svg>
  );
}

function MasteryMap({ concepts }: { concepts: ConceptMastery[] }) {
  const W = 640;
  const l = 24;
  const r = 24;
  const t = 16;
  const b = 28;
  const iw = W - l - r;
  const xOf = (m: number) => l + Math.max(0, Math.min(1, m)) * iw;
  const rad = (a: number) => 7 + Math.min(a, 12) * 1.5; // 8.5..25

  const sorted = [...concepts].sort((a, b) => a.mastery - b.mastery);
  const placed: { x: number; y: number; r: number; c: ConceptMastery }[] = [];
  for (const c of sorted) {
    const cx = xOf(c.mastery);
    const cr = rad(c.attempts);
    const step = cr * 0.9;
    const collides = (yy: number) =>
      placed.some((p) => {
        if (Math.abs(p.x - cx) > p.r + cr) return false;
        return Math.hypot(p.x - cx, p.y - yy) < p.r + cr + 2;
      });
    let y = 0;
    let k = 0;
    while (collides(y) && k < 500) {
      k++;
      y = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * step;
    }
    placed.push({ x: cx, y, r: cr, c });
  }
  const minY = Math.min(...placed.map((p) => p.y - p.r));
  const maxY = Math.max(...placed.map((p) => p.y + p.r));
  const spanY = Math.max(70, maxY - minY);
  const H = t + spanY + b;
  const yOff = t - minY;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Concept mastery map: each bubble is a concept, positioned left-to-right by mastery"
    >
      {[0, 50, 100].map((g) => {
        const gx = xOf(g / 100);
        return (
          <g key={g}>
            <line x1={gx} x2={gx} y1={t - 4} y2={H - b + 4} stroke="#f0f1f7" strokeWidth={1} />
            <text x={gx} y={H - b + 18} textAnchor="middle" fontSize={10} fill={MUTED}>
              {g}%
            </text>
          </g>
        );
      })}
      {placed.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y + yOff}
          r={p.r}
          fill={bandColor(p.c.mastery)}
          fillOpacity={0.85}
          stroke="#fff"
          strokeWidth={2}
        >
          <title>
            {p.c.concept} — {Math.round(p.c.mastery * 100)}% · {p.c.attempts}{" "}
            attempt{p.c.attempts === 1 ? "" : "s"}
          </title>
        </circle>
      ))}
    </svg>
  );
}
