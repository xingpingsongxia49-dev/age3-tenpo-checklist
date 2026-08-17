"use client";

import { pct, type Summary } from "@/lib/score";
import { ProgressBar } from "./ui";

/**
 * 上部に常時固定する進捗表示。
 * 「34/75」と加重スコアが常に見えていないと、店内で今どこまで終わったか分からなくなる。
 */
export function StickyProgress({
  title,
  subtitle,
  summary,
  children,
}: {
  title: string;
  subtitle?: string;
  summary: Summary;
  children?: React.ReactNode;
}) {
  const done = summary.total - summary.unanswered;
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-white/95 backdrop-blur">
      <div className="flex items-center gap-2 bg-[var(--color-ink)] px-3 py-2 text-white">
        <span className="text-sm font-bold tracking-wide text-[var(--color-gold)]">
          Age.3
        </span>
        <span className="text-sm font-bold">{title}</span>
        {subtitle && (
          <span className="ml-auto text-xs text-white/70">{subtitle}</span>
        )}
      </div>

      <div className="px-3 py-2">
        <div className="mb-1 flex items-baseline gap-2">
          <span className="tabular text-lg font-bold">
            {done}
            <span className="text-sm text-[var(--color-ink-sub)]">/{summary.total}</span>
          </span>
          <span className="text-xs text-[var(--color-ink-sub)]">項目 入力済み</span>
          <span className="ml-auto text-xs text-[var(--color-ink-sub)]">
            加重スコア
          </span>
          <span className="tabular text-lg font-bold">
            {pct(summary.weightedRate)}
          </span>
        </div>
        <ProgressBar value={summary.progress} />

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="font-bold text-[var(--color-ok)]">✓ ○ {summary.maru}</span>
          <span className="font-bold text-[var(--color-warn)]">！ △ {summary.sankaku}</span>
          <span className="font-bold text-[var(--color-ng)]">✕ × {summary.batsu}</span>
          <span className="text-[var(--color-na)]">— 対象外 {summary.excluded}</span>
          {summary.criticalBatsu > 0 && (
            <span className="rounded border border-[var(--color-ng)] bg-[var(--color-ng-soft)] px-1.5 py-0.5 font-bold text-[var(--color-ng)]">
              S項目× {summary.criticalBatsu}件
            </span>
          )}
        </div>
        {children}
      </div>
    </header>
  );
}
