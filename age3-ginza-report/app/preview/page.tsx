"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { ReportCard } from "@/components/ReportCard";
import { renderCardPng } from "@/lib/cardImage";
import { emptyReport, todayISO } from "@/lib/calc";
import { toLineText, warnings } from "@/lib/format";
import { loadReport, saveReport } from "@/lib/storage";
import type { Report } from "@/lib/types";

type Notice = { tone: "ok" | "warn"; text: string } | null;

export default function PreviewPage() {
  return (
    <Suspense fallback={<main className="px-4 pt-10 text-center text-sm text-ink-soft">読み込み中…</main>}>
      <Body />
    </Suspense>
  );
}

function Body() {
  const params = useSearchParams();
  const date = params.get("date") || todayISO();

  const [report, setReport] = useState<Report | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => setReport((await loadReport(date)) ?? emptyReport(date)))();
  }, [date]);

  if (!report) {
    return <main className="px-4 pt-10 text-center text-sm text-ink-soft">読み込み中…</main>;
  }

  const lineText = toLineText(report);
  const warns = warnings(report);

  /** その日の報告に送信の印を付ける。中身は履歴と分析にそのまま残る */
  async function markSent() {
    if (!report) return;
    const stamped = { ...report, sentAt: new Date().toISOString() };
    await saveReport(stamped);
    setReport(stamped);
  }

  /**
   * LINEの共有シートを開く。使えない端末では文字をコピーして手で貼ってもらう。
   * 送れたときは「送信済み」として記録し、入力画面が次の報告のために空で開くようにする。
   */
  async function shareText() {
    const done = async (msg: string) => {
      await markSent();
      setNotice({ tone: "ok", text: msg });
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: lineText });
        await done("送信しました。入力画面は次の報告のために空になります。");
        return;
      } catch (e) {
        // 利用者が共有シートを閉じただけなら、送信扱いにしない
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(lineText);
      await done("コピーしました。LINEを開いて貼り付けてください。");
    } catch {
      setNotice({
        tone: "warn",
        text: "共有もコピーもできませんでした。下の文面を選んでコピーしてください。",
      });
    }
  }

  /**
   * 画像を1枚作って渡す。
   * 共有シートに画像を渡せる端末ではそのまま共有し、駄目なら端末に保存させる。
   */
  async function shareImage() {
    if (!report) return;
    setBusy(true);
    setNotice(null);
    try {
      const blob = await renderCardPng(report);
      const file = new File([blob], `age3-ginza-${report.date}.png`, { type: "image/png" });

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
      setBusy(false);
    }
  }

  return (
    <main className="px-3 pt-4">
      <div className="mb-3">
        <Link href={`/?date=${date}`} className="tap text-sm font-bold text-brand">
          ← 入力に戻る
        </Link>
      </div>

      <ReportCard report={report} />

      {notice ? (
        <p
          className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${
            notice.tone === "ok" ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"
          }`}
        >
          {notice.text}
        </p>
      ) : null}

      {warns.length ? (
        <div className="card mt-3 border-l-4 border-l-warn p-4">
          <p className="text-sm font-bold text-warn">送る前に確認してください</p>
          <ul className="mt-2 space-y-1">
            {warns.map((w, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed">
                <span aria-hidden className="text-warn">
                  ●
                </span>
                <span className="flex-1">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <button type="button" onClick={() => void shareText()} className="btn btn-line w-full">
          💬 LINEに送る（テキスト）
        </button>
        <button
          type="button"
          onClick={() => void shareImage()}
          disabled={busy}
          className="btn btn-primary w-full disabled:opacity-40"
        >
          {busy ? "作成中…" : "🖼 カードを画像で保存／共有"}
        </button>
      </div>

      <section className="card mt-4 p-4">
        <details>
          <summary className="tap cursor-pointer text-sm font-bold">送られる文面を確認する</summary>
          <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-cream p-3 text-xs leading-relaxed">
            {lineText}
          </pre>
        </details>
      </section>
    </main>
  );
}
