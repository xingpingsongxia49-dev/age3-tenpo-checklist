"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LevelBadge } from "@/components/ui";
import { changeRate, levelOf, prettyDate, unitPrice, yen } from "@/lib/calc";
import { listReports } from "@/lib/storage";
import type { Report } from "@/lib/types";

export default function HistoryPage() {
  const [reports, setReports] = useState<Report[] | null>(null);

  useEffect(() => {
    void (async () => setReports(await listReports()))();
  }, []);

  if (!reports) {
    return <main className="px-4 pt-10 text-center text-sm text-ink-soft">読み込み中…</main>;
  }

  return (
    <main className="px-3 pt-4">
      <h1 className="mb-1 text-xl font-bold">📚 履歴</h1>
      <p className="mb-4 text-xs text-ink-soft">
        新しい順に並んでいます。日付を押すとその日の報告を開けます。
      </p>

      {reports.length === 0 ? (
        <p className="card p-6 text-center text-sm text-ink-soft">まだ報告がありません</p>
      ) : (
        <ul className="space-y-2">
          {reports.map((r, i) => {
            // 1つ後ろ＝1日前の報告。並びが新しい順なので次の要素が前の日になる
            const before = reports[i + 1];
            const rate = changeRate(r.sales.total, before?.sales.total ?? null);
            return (
              <li key={r.date}>
                <Link href={`/?date=${r.date}`} className="card tap block p-3">
                  <div className="flex items-baseline gap-2">
                    <span className="tnum flex-1 text-sm font-bold">{prettyDate(r.date)}</span>
                    {r.sentAt ? (
                      <span className="badge badge-ok">送信済み</span>
                    ) : (
                      <span className="badge badge-info">未送信</span>
                    )}
                    {rate === null ? null : (
                      <LevelBadge
                        level={levelOf(rate)}
                        text={`${rate > 0 ? "+" : ""}${Math.round(rate * 100)}%`}
                      />
                    )}
                  </div>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className="tnum text-xl font-bold text-brand">{yen(r.sales.total)}</span>
                    <span className="tnum text-xs text-ink-soft">
                      {r.sales.guests === null ? "客数 —" : `${r.sales.guests}組`}　客単価{" "}
                      {yen(unitPrice(r))}
                    </span>
                  </div>
                  <p className="tnum mt-0.5 text-xs text-ink-soft">
                    現金 {yen(r.sales.cash)}　PayPay {yen(r.sales.paypay)}　CR {yen(r.sales.credit)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-center text-xs text-ink-soft">
        前の日と比べた増減を、緑（増）・黄（横ばい）・赤（減）で出しています。
      </p>
    </main>
  );
}
