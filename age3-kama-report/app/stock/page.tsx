"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Fold } from "@/components/Fold";
import { CanStockSection, SweetStockSection } from "@/components/StockSections";
import { LevelBadge } from "@/components/ui";
import {
  canSummary,
  levelOf,
  pct,
  prettyDate,
  sweetSummary,
  todayISO,
  weekdayOf,
} from "@/lib/calc";
import { toStockText } from "@/lib/format";
import { renderCanSheetPng, renderSweetSheetPng } from "@/lib/sheetImage";
import { loadWeek, saveReport } from "@/lib/storage";
import { useReport } from "@/lib/useReport";

type Notice = { tone: "ok" | "warn"; text: string } | null;

const SAVE_LABEL: Record<string, string> = {
  idle: "",
  saving: "保存中…",
  saved: "保存しました",
  local: "この端末に保存（サーバー未接続）",
  error: "保存に失敗しました",
};

/**
 * 在庫チェック。
 *
 * 日報とは別の業務なので画面ごと分けてある。数え終わったらこの画面から
 * そのまま報告できる。日報画面へ移動する必要はない。
 */
function StockCheck() {
  const params = useSearchParams();
  const { date, setDate, report, patch, settings, loading, saveState, sent, restoreSent } =
    useReport(params.get("date") ?? undefined, "stock");
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState<"text" | "sweet" | "can" | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const anyInput =
    canSummary(report, settings).filled > 0 || sweetSummary(report, settings).filled > 0;
  /**
   * 報告に使う中身。
   * 報告済みで入力欄が空のときは、報告した中身をそのまま使う。
   * 「文面を送ったあとに画像も送る」を、入力し直さずにできるようにするため。
   */
  const source = anyInput ? report : (sent ?? report);
  const can = canSummary(source, settings);
  const sweet = sweetSummary(source, settings);
  const bothDone = can.filled === can.total && sweet.filled === sweet.total;
  const canShare = anyInput || sent !== null;

  if (!mounted || loading) {
    return <main className="px-4 pt-10 text-center text-sm text-ink-soft">読み込み中…</main>;
  }

  /**
   * 在庫チェックを送った印を付ける。中身は履歴に残る。
   * 報告済みの中身をもう一度送っただけのときは、印を付け直さない
   */
  async function markSent() {
    if (!anyInput) return;
    await saveReport({ ...report, stockSentAt: new Date().toISOString() });
  }

  /** 数えた結果を文章で送る */
  async function shareText() {
    setBusy("text");
    setNotice(null);
    const text = toStockText(source, settings);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ text });
          await markSent();
          setNotice({ tone: "ok", text: "送信しました。入力欄は次のチェックのために空になります。" });
          return;
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
        }
      }
      await navigator.clipboard.writeText(text);
      await markSent();
      setNotice({ tone: "ok", text: "コピーしました。LINEを開いて貼り付けてください。" });
    } catch {
      setNotice({ tone: "warn", text: "共有もコピーもできませんでした。下の文面を選んでコピーしてください。" });
    } finally {
      setBusy(null);
    }
  }

  /** 紙と同じ形の表を画像で送る */
  async function shareImage(kind: "sweet" | "can", make: () => Promise<Blob>, suffix: string) {
    setBusy(kind);
    setNotice(null);
    try {
      const blob = await make();
      const file = new File([blob], `age3-kama-${suffix}-${source.date}.png`, {
        type: "image/png",
      });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          await markSent();
          return;
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      await markSent();
      setNotice({ tone: "ok", text: "画像を保存しました。LINEに添付して送れます。" });
    } catch (e) {
      setNotice({ tone: "warn", text: `画像を作れませんでした：${String(e)}` });
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="px-3 pt-4">
      <header className="card mb-4 overflow-hidden">
        <div className="card-header px-4 py-3">
          <p className="text-[11px] font-bold tracking-[0.25em] text-gold-soft">AGE.3 KAMA</p>
          <h1 className="text-lg font-bold">在庫チェック</h1>
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
          <p className="text-base font-bold text-ok">✅ この日の在庫チェックは報告済みです</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            {new Date(sent.stockSentAt as string).toLocaleString("ja-JP", {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            に報告しました。数えた結果は履歴に残っています。
            <br />
            入力欄は次のチェックのために空にしてありますが、
            下の報告ボタンからは<b>報告済みの内容をそのまま送り直せます</b>
            （文面のあとに画像も送りたいとき用）。
          </p>
          <button type="button" onClick={restoreSent} className="btn btn-ghost mt-3 w-full">
            報告した内容を呼び戻して直す
          </button>
        </div>
      ) : null}

      <Fold
        title="スイーツサンド在庫"
        emoji="🥪"
        defaultOpen
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

      {/* 数え終わったらこの場で報告する。日報画面には行かせない */}
      <section className="card mt-4 p-4">
        <h2 className="section-title mb-1">
          <span aria-hidden>📤</span>
          <span>チェック結果を報告する</span>
        </h2>
        <p className="mb-3 text-xs leading-relaxed text-ink-soft">
          {!anyInput && sent
            ? "報告済みの内容を送ります。数え直したいときは上の「呼び戻して直す」から。"
            : bothDone
              ? "2項目とも数え終わりました。このまま報告できます。"
              : `スイーツサンド ${sweet.filled}/${sweet.total}、冷凍在庫（缶）${can.filled}/${can.total} まで入力済みです。途中でも報告できます。`}
        </p>

        {notice ? (
          <p
            className={`mb-3 rounded-xl px-3 py-2 text-sm font-bold ${
              notice.tone === "ok" ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"
            }`}
          >
            {notice.text}
          </p>
        ) : null}

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => void shareText()}
            disabled={busy !== null || !canShare}
            className="btn btn-line w-full disabled:opacity-40"
          >
            {busy === "text" ? "送信中…" : "💬 LINEに送る（テキスト）"}
          </button>
          <button
            type="button"
            onClick={() =>
              void shareImage("sweet", () => renderSweetSheetPng(source, settings), "zaikohyo")
            }
            disabled={busy !== null || !canShare}
            className="btn btn-primary w-full disabled:opacity-40"
          >
            {busy === "sweet" ? "作成中…" : "📋 スイーツサンド在庫の表を画像で送る"}
          </button>
          <button
            type="button"
            onClick={() =>
              void shareImage(
                "can",
                async () => renderCanSheetPng(source, settings, await loadWeek(source.date)),
                "reitou",
              )
            }
            disabled={busy !== null || !canShare}
            className="btn btn-primary w-full disabled:opacity-40"
          >
            {busy === "can" ? "作成中…" : "🧊 冷凍在庫（缶）の表を画像で送る"}
          </button>
        </div>

        <details className="mt-4">
          <summary className="tap cursor-pointer text-sm font-bold">送られる文面を確認する</summary>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-cream p-3 text-xs leading-relaxed">
            {toStockText(source, settings)}
          </pre>
        </details>
      </section>

      <p className="mt-3 text-center text-xs leading-relaxed text-ink-soft">
        {prettyDate(date)} の在庫チェックです。
        <br />
        売上や販売数の報告は「日報入力」から行ってください。
      </p>
    </main>
  );
}

export default function StockPage() {
  return (
    <Suspense
      fallback={<main className="px-4 pt-10 text-center text-sm text-ink-soft">読み込み中…</main>}
    >
      <StockCheck />
    </Suspense>
  );
}
