"use client";

import type { Judgement, Weight } from "@/lib/types";
import type { Verdict } from "@/lib/score";

/* 判定は色だけで区別しない。必ず記号アイコンを添える */
export const JUDGEMENT_ICON: Record<Judgement, string> = {
  "○": "✓",
  "△": "！",
  "×": "✕",
  対象外: "—",
};

export const JUDGEMENT_STYLE: Record<
  Judgement,
  { on: string; off: string; text: string; chip: string }
> = {
  "○": {
    on: "bg-[var(--color-ok)] text-white border-[var(--color-ok)]",
    off: "bg-white text-[var(--color-ok)] border-[var(--color-ok)]",
    text: "text-[var(--color-ok)]",
    chip: "bg-[var(--color-ok-soft)] text-[var(--color-ok)] border-[var(--color-ok)]",
  },
  "△": {
    on: "bg-[var(--color-warn)] text-white border-[var(--color-warn)]",
    off: "bg-white text-[var(--color-warn)] border-[var(--color-warn)]",
    text: "text-[var(--color-warn)]",
    chip: "bg-[var(--color-warn-soft)] text-[var(--color-warn)] border-[var(--color-warn)]",
  },
  "×": {
    on: "bg-[var(--color-ng)] text-white border-[var(--color-ng)]",
    off: "bg-white text-[var(--color-ng)] border-[var(--color-ng)]",
    text: "text-[var(--color-ng)]",
    chip: "bg-[var(--color-ng-soft)] text-[var(--color-ng)] border-[var(--color-ng)]",
  },
  対象外: {
    on: "bg-[var(--color-na)] text-white border-[var(--color-na)]",
    off: "bg-white text-[var(--color-na)] border-[var(--color-na)]",
    text: "text-[var(--color-na)]",
    chip: "bg-[var(--color-na-soft)] text-[var(--color-na)] border-[var(--color-na)]",
  },
};

export function JudgementChip({ j }: { j: Judgement }) {
  const s = JUDGEMENT_STYLE[j];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${s.chip}`}
    >
      <span aria-hidden>{JUDGEMENT_ICON[j]}</span>
      {j}
    </span>
  );
}

const WEIGHT_STYLE: Record<Weight, string> = {
  S: "bg-[var(--color-ng)] text-white",
  A: "bg-[var(--color-ink)] text-white",
  B: "bg-[var(--color-na-soft)] text-[var(--color-na)] border border-[var(--color-line)]",
};

const WEIGHT_TITLE: Record<Weight, string> = {
  S: "S＝食品衛生・行政リスク（重み5）。×が1件でも出たら総合何%でも赤、その場で是正。",
  A: "A＝売上・品質・オペレーション直結（重み3）。今週中に是正。",
  B: "B＝改善推奨（重み1）。緊急性は低い。",
};

export function WeightBadge({ w }: { w: Weight }) {
  return (
    <span
      title={WEIGHT_TITLE[w]}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ${WEIGHT_STYLE[w]}`}
    >
      {w}
    </span>
  );
}

export const VERDICT_STYLE: Record<Verdict, string> = {
  green: "bg-[var(--color-ok-soft)] text-[var(--color-ok)] border-[var(--color-ok)]",
  yellow: "bg-[var(--color-warn-soft)] text-[var(--color-warn)] border-[var(--color-warn)]",
  red: "bg-[var(--color-ng-soft)] text-[var(--color-ng)] border-[var(--color-ng)]",
  none: "bg-[var(--color-na-soft)] text-[var(--color-na)] border-[var(--color-line)]",
};

export const VERDICT_ICON: Record<Verdict, string> = {
  green: "✓",
  yellow: "！",
  red: "✕",
  none: "—",
};

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-line)]">
      <div
        className="h-full rounded-full bg-[var(--color-gold)] transition-[width] duration-300"
        style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
      />
    </div>
  );
}

export function ScoreBar({ rate }: { rate: number | null }) {
  const v = rate ?? 0;
  const color =
    rate === null
      ? "var(--color-line)"
      : v >= 0.8
        ? "var(--color-ok)"
        : v >= 0.6
          ? "var(--color-warn)"
          : "var(--color-ng)";
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-line)]">
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${Math.round(v * 100)}%`, background: color }}
      />
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-line)] bg-white ${className}`}
    >
      {children}
    </div>
  );
}

export function GoldButton({
  children,
  onClick,
  type = "button",
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[48px] rounded-lg bg-[var(--color-gold)] px-4 text-base font-bold text-white shadow-sm active:bg-[var(--color-gold-dark)] disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function PlainButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[48px] rounded-lg border border-[var(--color-line)] bg-white px-4 text-base font-bold text-[var(--color-ink)] active:bg-[var(--color-gold-soft)] disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function ChangeBadge({
  change,
  fixed,
}: {
  change: "improved" | "worsened" | "same" | "new";
  fixed: boolean;
}) {
  if (fixed) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-[var(--color-ok)] bg-[var(--color-ok-soft)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--color-ok)]">
        ✓ 是正済み
      </span>
    );
  }
  if (change === "improved") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-[var(--color-ok)] bg-[var(--color-ok-soft)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--color-ok)]">
        ↑ 改善
      </span>
    );
  }
  if (change === "worsened") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-[var(--color-ng)] bg-[var(--color-ng-soft)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--color-ng)]">
        ↓ 悪化
      </span>
    );
  }
  if (change === "same") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-[var(--color-line)] bg-white px-1.5 py-0.5 text-[11px] font-bold text-[var(--color-ink-sub)]">
        → 変化なし
      </span>
    );
  }
  return null;
}
