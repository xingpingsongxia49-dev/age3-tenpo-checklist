"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { ReportCard } from "@/components/ReportCard";
import { renderCardPng } from "@/lib/cardImage";
import { emptyReport, emptySettings, todayISO } from "@/lib/calc";
import { toLineText } from "@/lib/format";
import { loadReport, loadSettings, saveReport } from "@/lib/storage";
import type { Report, Settings } from "@/lib/types";

type Notice = { tone: "ok" | "warn"; text: string } | null;

function PreviewBody() {
  const params = useSearchParams();
  const date = params.get("date") || todayISO();

  const [report, setReport] = useState<Report | null>(null);
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [notice, setNotice] = useState<Notice>(null);
  /** 今どの画像を作っているか。null なら何も作っていない */
  const [busy, setBusy] = useState<"card" | null>(null);

  useEffect(() => {
    void (async () => {
      const [r, s] = await Promise.all([loadReport(date), loadSettings()]);
      setReport(r ?? emptyReport(date));
      setSettings(s);
    })();
  }, [date]);

  if (!report) {
    return <p className="px-4 pt-10 text-center text-sm text-ink-soft">読み込み中…</p>;
  }

  const lineText = toLineText(report, settings);

  /**
   * LINEの共有シートを開く。使えない端末では文字をコピーして手で貼ってもらう。
   * 日報そのものを送れたときは「送信済み」として記録し、
   * 入力画面が次の日報のために空で開くようにする。
   */
  async function shareText(text: string, isReport = false) {
    const done = async (msg: string) => {
      if (isReport) await markSent();
      setNotice({ tone: "ok", text: msg });
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text });
        await done("送信しました。入力画面は次の日報のために空になります。");
        return;
      } catch (e) {
        // 利用者が共有シートを閉じただけなら、送信扱いにしない
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      await done("コピーしました。LINEを開いて貼り付けてください。");
    } catch {
      setNotice({ tone: "warn", text: "共有もコピーもできませんでした。下の文面を選んでコピーしてください。" });
    }
  }

  /** その日の日報に送信の印を付ける。中身は履歴と分析にそのまま残る */
  async function markSent() {
    if (!report) return;
    const stamped = { ...report, sentAt: new Date().toISOString() };
    await saveReport(stamped);
    setReport(stamped);
  }

  /**
   * 画像を1枚作って渡す。
   * 共有シートに画像を渡せる端末ではそのまま共有し、駄目なら端末に保存させる。
   */
  async function shareImage(
    kind: "card",
    make: () => Promise<Blob>,
    suffix: string,
  ) {
    if (!report) return;
    setBusy(kind);
    setNotice(null);
    try {
      const blob = await make();
      const file = new File([blob], `age3-kama-${suffix}-${report.date}.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
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
      // 端末が保存し終わるまで少し猶予をおいてから片付ける
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setNotice({ tone: "ok", text: "画像を保存しました。LINEに添付して送れます。" });
    } catch (e) {
      setNotice({ tone: "warn", text: `画像を作れませんでした：${String(e)}` });
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="px-3 pt-4">
      <div className="mb-3 flex items-center gap-2">
        <Link href={`/report?date=${date}`} className="tap text-sm font-bold text-brand">
          ← 入力に戻る
        </Link>
      </div>

      <ReportCard report={report} settings={settings} />

      {notice ? (
        <p
          className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${
            notice.tone === "ok" ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"
          }`}
        >
          {notice.text}
        </p>
      ) : null}

      <div className="mt-4 space-y-2">
        <button type="button" onClick={() => void shareText(lineText, true)} className="btn btn-line w-full">
          💬 LINEに送る（テキスト）
        </button>
        <button
          type="button"
          onClick={() => void shareImage("card", () => renderCardPng(report, settings), "card")}
          disabled={busy !== null}
          className="btn btn-primary w-full disabled:opacity-40"
        >
          {busy === "card" ? "画像を作成中…" : "🖼 日報カードを画像で保存／共有"}
        </button>

        <Link href={`/stock?date=${date}`} className="btn btn-ghost w-full">
          🧊 在庫チェックはこちら
        </Link>
      </div>

      <details className="card mt-4 p-4">
        <summary className="tap cursor-pointer text-sm font-bold">送られる文面を確認する</summary>
        <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-cream p-3 text-xs leading-relaxed">
          {lineText}
        </pre>
      </details>

      <p className="mt-3 text-center text-xs text-ink-soft">
        「LINEに送る」で共有シートが出ないときは、画像で保存してLINEに添付してください。
      </p>
    </main>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<p className="px-4 pt-10 text-center text-sm text-ink-soft">読み込み中…</p>}>
      <PreviewBody />
    </Suspense>
  );
}
