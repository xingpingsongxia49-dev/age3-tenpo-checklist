"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  canSummary,
  completion,
  emptyReport,
  emptySettings,
  prettyDate,
  sweetSummary,
  todayISO,
} from "@/lib/calc";
import { loadReport, loadSettings } from "@/lib/storage";
import type { Report, Settings } from "@/lib/types";

/** 「10:24」の形。報告した時刻を短く出す */
function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

/**
 * 今日やることが終わったかどうかの1行。
 * 出勤して最初に見る画面なので、「まだ出していないのはどれか」だけが分かればいい。
 */
function StatusRow({
  emoji,
  name,
  doneAt,
  progress,
}: {
  emoji: string;
  name: string;
  /** 報告済みならその時刻 */
  doneAt: string | null;
  /** まだのときに出す進み具合 */
  progress: string;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-line py-2.5 first:border-t-0 first:pt-0">
      <span aria-hidden className="text-lg leading-none">
        {emoji}
      </span>
      <span className="flex-1 text-sm font-bold">{name}</span>
      {doneAt ? (
        <span className="badge badge-ok">✅ 報告済み {hhmm(doneAt)}</span>
      ) : (
        <span className="badge badge-warn">まだ・{progress}</span>
      )}
    </div>
  );
}

/** 大きく押させたい入口 */
function BigCard({
  href,
  emoji,
  title,
  note,
  done,
}: {
  href: string;
  emoji: string;
  title: string;
  note: string;
  done: boolean;
}) {
  return (
    <Link
      href={href}
      className={`card tap flex items-center gap-3 p-4 ${
        done ? "" : "border-l-[6px] border-l-gold"
      }`}
    >
      <span aria-hidden className="text-3xl leading-none">
        {emoji}
      </span>
      <span className="flex-1">
        <span className="block text-lg font-bold leading-tight">{title}</span>
        <span className="mt-0.5 block text-xs text-ink-soft">{note}</span>
      </span>
      <span aria-hidden className="text-xl text-ink-soft">
        ›
      </span>
    </Link>
  );
}

/** 小さくていい入口 */
function SmallCard({ href, emoji, title }: { href: string; emoji: string; title: string }) {
  return (
    <Link href={href} className="card tap flex flex-col items-center gap-1 px-2 py-3.5">
      <span aria-hidden className="text-2xl leading-none">
        {emoji}
      </span>
      <span className="text-xs font-bold">{title}</span>
    </Link>
  );
}

export default function TopPage() {
  const today = todayISO();
  const [report, setReport] = useState<Report | null>(null);
  const [settings, setSettings] = useState<Settings>(emptySettings);

  useEffect(() => {
    void (async () => {
      const [r, s] = await Promise.all([loadReport(today), loadSettings()]);
      setSettings(s);
      setReport(r ?? emptyReport(today));
    })();
  }, [today]);

  const r = report ?? emptyReport(today);
  const can = canSummary(r, settings);
  const sweet = sweetSummary(r, settings);
  const stockDone = r.stockSentAt;
  const reportDone = r.sentAt;
  const bothDone = Boolean(stockDone && reportDone);

  return (
    <main className="px-3 pt-4">
      <header className="card mb-4 overflow-hidden">
        <div className="card-header px-4 py-4">
          <p className="text-[11px] font-bold tracking-[0.3em] text-gold-soft">AGE.3　KAMA</p>
          <h1 className="text-xl font-bold">嘉麻店</h1>
          <p className="tnum mt-0.5 text-sm font-bold text-gold-soft">
            📅 {prettyDate(today)}
          </p>
        </div>
      </header>

      <section className="card mb-4 p-4">
        <h2 className="section-title mb-2">
          <span aria-hidden>📌</span>
          <span>今日の状況</span>
        </h2>
        {report === null ? (
          <p className="py-3 text-center text-sm text-ink-soft">読み込み中…</p>
        ) : (
          <>
            <StatusRow
              emoji="🧊"
              name="在庫チェック"
              doneAt={stockDone}
              progress={`サンド ${sweet.filled}/${sweet.total}・缶 ${can.filled}/${can.total}`}
            />
            <StatusRow
              emoji="📝"
              name="日報"
              doneAt={reportDone}
              progress={`入力 ${Math.round(completion(r) * 100)}%`}
            />
            {bothDone ? (
              <p className="mt-3 rounded-xl bg-ok-bg px-3 py-2 text-sm font-bold text-ok">
                🎉 今日のぶんは両方とも報告済みです。おつかれさまでした。
              </p>
            ) : null}
          </>
        )}
      </section>

      <div className="space-y-2">
        <BigCard
          href="/stock"
          emoji="🧊"
          title="在庫チェック"
          note="スイーツサンド在庫と冷凍在庫（缶）を数えて、その場で報告"
          done={Boolean(stockDone)}
        />
        <BigCard
          href="/report"
          emoji="📝"
          title="日報"
          note="売上・お客様・販売数・シフト・缶商品の当日製造数"
          done={Boolean(reportDone)}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <SmallCard href="/history" emoji="📚" title="履歴" />
        <SmallCard href="/dashboard" emoji="📊" title="分析" />
        <SmallCard href="/settings" emoji="⚙️" title="設定" />
      </div>

      <p className="mt-4 text-center text-xs leading-relaxed text-ink-soft">
        在庫チェックと日報は別々に報告します。
        <br />
        片方だけ先に出しても大丈夫です。
      </p>
    </main>
  );
}
