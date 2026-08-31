"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Fold } from "@/components/Fold";
import { ProductSection, IdleSection, ReviewSection } from "@/components/ProductSection";
import { CustomerSection, SalesSection } from "@/components/SalesSection";
import { ShiftSection } from "@/components/ShiftSection";
import { CanStockSection, SweetStockSection } from "@/components/StockSections";
import { LevelBadge, TextArea } from "@/components/ui";
import {
  canSummary,
  completion,
  levelOf,
  pct,
  productTotal,
  sweetSummary,
  todayISO,
  unitPrice,
  weekdayOf,
  yen,
} from "@/lib/calc";
import { useReport } from "@/lib/useReport";

const SAVE_LABEL: Record<string, string> = {
  idle: "",
  saving: "保存中…",
  saved: "保存しました",
  local: "この端末に保存（サーバー未接続）",
  error: "保存に失敗しました",
};

function ReportForm() {
  const params = useSearchParams();
  // 履歴やプレビューから戻ってきたときは、その日の日報を開く
  const { date, setDate, report, patch, settings, loading, saveState, sent, restoreSent } =
    useReport(params.get("date") ?? undefined);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const can = canSummary(report, settings);
  const sweet = sweetSummary(report, settings);
  const done = completion(report);

  if (!mounted || loading) {
    return (
      <main className="px-4 pt-10 text-center text-sm text-ink-soft">読み込み中…</main>
    );
  }

  return (
    <main className="px-3 pt-4">
      {/* 見出し。日付と進み具合をいつでも見えるところに置く */}
      <header className="card mb-4 overflow-hidden">
        <div className="card-header px-4 py-3">
          <p className="text-[11px] font-bold tracking-[0.25em] text-gold-soft">AGE.3 KAMA</p>
          <h1 className="text-lg font-bold">嘉麻店 日報</h1>
        </div>
        <div className="px-4 py-3">
          <label className="flex items-center gap-3">
            <span className="text-sm font-medium text-ink-soft">日付</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value || todayISO())}
              className="field tnum flex-1 font-bold"
            />
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cream-deep text-base font-bold">
              {weekdayOf(date)}
            </span>
          </label>

          <div className="mt-3 flex items-center gap-2 text-xs">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-deep">
              <div
                className="h-full rounded-full bg-gold transition-all"
                style={{ width: `${Math.round(done * 100)}%` }}
              />
            </div>
            <span className="tnum font-bold text-ink-soft">入力 {Math.round(done * 100)}%</span>
          </div>
          {saveState !== "idle" ? (
            <p
              className={`mt-2 text-xs font-bold ${
                saveState === "local" ? "text-warn" : "text-ink-soft"
              }`}
            >
              {SAVE_LABEL[saveState]}
            </p>
          ) : null}
        </div>
      </header>

      {sent ? (
        <div className="card mb-4 border-l-[6px] border-l-ok bg-ok-bg p-4">
          <p className="text-base font-bold text-ok">
            ✅ この日の日報は送信済みです
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            {new Date(sent.sentAt as string).toLocaleString("ja-JP", {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            に送信しました。送った内容は履歴と分析に残っています。
            <br />
            入力欄は次の日報のために空にしてあります。ここに入力すると、この日の日報として上書きされます。
          </p>
          <button
            type="button"
            onClick={restoreSent}
            className="btn btn-ghost mt-3 w-full"
          >
            送信した内容を呼び戻して直す
          </button>
        </div>
      ) : null}

      <Fold
        title="シフト・人員体制"
        emoji="👥"
        defaultOpen
        summary={
          <span className={`badge ${report.shift.staffPresent ? "badge-info" : "badge-warn"}`}>
            {report.shift.staffPresent ? "社員あり" : "社員なし"}
          </span>
        }
      >
        <ShiftSection report={report} settings={settings} patch={patch} />
      </Fold>

      <Fold
        title="冷凍在庫（缶）"
        emoji="🧊"
        summary={
          <span className="flex items-center gap-1.5">
            <span className="tnum text-xs text-ink-soft">
              {can.filled}/{can.total}
            </span>
            <LevelBadge level={levelOf(can.rate)} text={pct(can.rate)} />
          </span>
        }
      >
        <CanStockSection report={report} settings={settings} patch={patch} />
      </Fold>

      <Fold
        title="スイーツ在庫"
        emoji="🥪"
        summary={
          <span className="flex items-center gap-1.5">
            <span className="tnum text-xs text-ink-soft">
              {sweet.filled}/{sweet.total}
            </span>
            <LevelBadge level={levelOf(sweet.rate)} text={pct(sweet.rate)} />
          </span>
        }
      >
        <SweetStockSection report={report} settings={settings} patch={patch} />
      </Fold>

      <Fold
        title="売上情報"
        emoji="💰"
        summary={
          <span className="tnum text-xs font-bold text-ink-soft">
            {yen(report.sales.total)}
            {unitPrice(report) !== null ? ` / 単価${yen(unitPrice(report))}` : ""}
          </span>
        }
      >
        <SalesSection report={report} patch={patch} />
      </Fold>

      <Fold
        title="お客様情報"
        emoji="🙋"
        summary={
          <span className="text-xs font-bold text-ink-soft">
            {report.customers.segment || "未入力"}
          </span>
        }
      >
        <CustomerSection report={report} patch={patch} />
      </Fold>

      <Fold
        title="商品別販売数"
        emoji="🍦"
        summary={<span className="tnum text-xs font-bold text-ink-soft">{productTotal(report)}点</span>}
      >
        <ProductSection report={report} settings={settings} patch={patch} />
      </Fold>

      <Fold
        title="手が空いた時に行った作業"
        emoji="🧹"
        summary={
          <span className="tnum text-xs font-bold text-ink-soft">{report.idleTasks.length}件</span>
        }
      >
        <IdleSection report={report} patch={patch} />
      </Fold>

      <Fold title="口コミ返信件数" emoji="⭐" >
        <ReviewSection report={report} patch={patch} />
      </Fold>

      <Fold title="その他連絡事項" emoji="📮">
        <TextArea
          label="連絡事項"
          rows={4}
          placeholder="例：製氷機の調子が悪い。明日の朝いちで確認をお願いします。"
          value={report.note}
          onChange={(v) => patch((r) => ({ ...r, note: v }))}
        />
      </Fold>

      <Link href={`/preview?date=${date}`} className="btn btn-primary mt-4 w-full">
        日報カードを見る →
      </Link>
      <p className="mt-2 text-center text-xs text-ink-soft">
        入力は自動で保存されます。あとから続きを入れても大丈夫です。
      </p>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<main className="px-4 pt-10 text-center text-sm text-ink-soft">読み込み中…</main>}>
      <ReportForm />
    </Suspense>
  );
}
