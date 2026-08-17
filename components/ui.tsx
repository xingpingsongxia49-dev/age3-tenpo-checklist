"use client";

import type { Judgement, Weight } from "@/lib/types";

/* 判定は色だけで区別しない。必ず記号を添える */
export const JUDGEMENT_ICON: Record<Judgement, string> = {
  "○": "✓",
  "△": "！",
  "×": "✕",
  対象外: "—",
};

export const JUDGEMENT_COLOR: Record<
  Judgement,
  { ink: string; bg: string }
> = {
  "○": { ink: "var(--color-ok)", bg: "var(--color-ok-bg)" },
  "△": { ink: "var(--color-mid)", bg: "var(--color-mid-bg)" },
  "×": { ink: "var(--color-ng)", bg: "var(--color-ng-bg)" },
  対象外: { ink: "var(--color-na)", bg: "var(--color-na-bg)" },
};

/** 参考アプリの「前月10日迄」バッジと同じ見た目で重要度を出す */
const WEIGHT_TITLE: Record<Weight, string> = {
  S: "S＝食品衛生・行政/近隣リスク（重み5）。×が1件でも出たら総合何%でも赤、その場で是正。",
  A: "A＝売上・品質・オペレーション直結（重み3）。今週中に是正。",
  B: "B＝改善推奨（重み1）。緊急性は低い。",
};

export function WeightBadge({ w }: { w: Weight }) {
  const critical = w === "S";
  return (
    <span
      title={WEIGHT_TITLE[w]}
      className="inline-block rounded-full border px-2 py-[1px] text-[11px] font-bold leading-[16px]"
      style={
        critical
          ? {
              borderColor: "var(--color-ng)",
              background: "var(--color-ng-bg)",
              color: "var(--color-ng)",
            }
          : {
              borderColor: "var(--color-line)",
              background: "var(--color-chip-bg)",
              color: "var(--color-brown2)",
            }
      }
    >
      重要度 {w}
    </span>
  );
}

export function Bar({ value }: { value: number }) {
  const v = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="bar" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${v}%` }} />
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
  return <section className={`card ${className}`}>{children}</section>;
}

/** 注意事項ボックス。参考アプリと同じ点線ゴールド */
export function Notice({ children }: { children: React.ReactNode }) {
  return <div className="notice px-3 py-2.5 text-[12px] leading-relaxed">{children}</div>;
}

/** 上部の警告バンド。参考アプリの「期限を過ぎた未完了の項目が◯件あります」に相当 */
export function WarningBand({
  lines,
}: {
  lines: { text: string; strong?: boolean }[];
}) {
  if (lines.length === 0) return null;
  return (
    <div
      className="rounded-xl border px-3 py-2.5"
      style={{
        borderColor: "var(--color-ng)",
        background: "var(--color-ng-bg)",
      }}
    >
      {lines.map((l, i) => (
        <p
          key={i}
          className={`text-[12px] leading-relaxed ${l.strong ? "font-bold" : ""}`}
          style={{ color: "var(--color-ng)" }}
        >
          {l.text}
        </p>
      ))}
    </div>
  );
}

export function ChangeBadge({
  change,
  fixed,
}: {
  change: "improved" | "worsened" | "same" | "new";
  fixed: boolean;
}) {
  if (change === "new") return null;

  const spec = fixed
    ? { label: "✓ 是正済み", ink: "var(--color-ok)", bg: "var(--color-ok-bg)" }
    : change === "improved"
      ? { label: "↑ 改善", ink: "var(--color-ok)", bg: "var(--color-ok-bg)" }
      : change === "worsened"
        ? { label: "↓ 悪化", ink: "var(--color-ng)", bg: "var(--color-ng-bg)" }
        : { label: "→ 変化なし", ink: "var(--color-sub)", bg: "#fff" };

  return (
    <span
      className="inline-block rounded-full border px-2 py-[1px] text-[11px] font-bold leading-[16px]"
      style={{ borderColor: spec.ink, background: spec.bg, color: spec.ink }}
    >
      {spec.label}
    </span>
  );
}
