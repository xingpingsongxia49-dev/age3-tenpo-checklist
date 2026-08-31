"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { LevelBadge } from "@/components/ui";
import {
  canSummary,
  emptySettings,
  levelOf,
  pct,
  prettyDate,
  productTotal,
  sweetSummary,
  yen,
} from "@/lib/calc";
import { listReports, loadSettings } from "@/lib/storage";
import type { Report, Settings } from "@/lib/types";

type Filter = "all" | "noStaff";

export default function HistoryPage() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    void (async () => {
      const [r, s] = await Promise.all([listReports(), loadSettings()]);
      setSettings(s);
      setReports(r);
    })();
  }, []);

  const shown = useMemo(
    () => (reports ?? []).filter((r) => (filter === "noStaff" ? !r.shift.staffPresent : true)),
    [reports, filter],
  );

  const noStaffCount = (reports ?? []).filter((r) => !r.shift.staffPresent).length;

  if (!reports) {
    return <main className="px-4 pt-10 text-center text-sm text-ink-soft">読み込み中…</main>;
  }

  return (
    <main className="px-3 pt-4">
      <h1 className="mb-1 text-xl font-bold">📚 日報の履歴</h1>
      <p className="mb-3 text-xs text-ink-soft">
        社員が居ない日を色で分けています。アルバイトだけでどこまで回せているかを比べられます。
      </p>

      <div className="scroll-x mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`tap shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${
            filter === "all" ? "border-brand bg-brand text-white" : "border-line bg-white text-ink-soft"
          }`}
        >
          すべて（{reports.length}日）
        </button>
        <button
          type="button"
          onClick={() => setFilter("noStaff")}
          className={`tap shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${
            filter === "noStaff"
              ? "border-[color:var(--color-warn)] bg-[color:var(--color-warn)] text-white"
              : "border-line bg-white text-ink-soft"
          }`}
        >
          ⚠️ 社員なしの日（{noStaffCount}日）
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="card p-6 text-center text-sm text-ink-soft">
          まだ日報がありません。
          <br />
          <Link href="/" className="font-bold text-brand">
            日報入力
          </Link>
          から今日のぶんを入れてください。
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((r) => {
            const can = canSummary(r, settings);
            const sweet = sweetSummary(r, settings);
            const noStaff = !r.shift.staffPresent;
            return (
              <li key={r.date}>
                <Link
                  href={`/preview?date=${r.date}`}
                  className={`card block p-3.5 ${
                    noStaff
                      ? "border-l-[6px] border-l-[color:var(--color-warn)] bg-warn-bg"
                      : ""
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="tnum flex-1 text-base font-bold">{prettyDate(r.date)}</span>
                    <span className={`badge ${noStaff ? "badge-warn" : "badge-info"}`}>
                      {noStaff ? "⚠️ 社員なし" : "社員あり"}
                    </span>
                    {r.shift.headcount !== null ? (
                      <span className="tnum text-xs font-bold text-ink-soft">{r.shift.headcount}名</span>
                    ) : null}
                  </div>

                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-ink-soft">在庫</span>
                    <LevelBadge level={levelOf(can.rate)} text={`缶 ${pct(can.rate)}`} />
                    <LevelBadge level={levelOf(sweet.rate)} text={`サンド ${pct(sweet.rate)}`} />
                  </div>

                  <dl className="tnum grid grid-cols-4 gap-1 text-center">
                    {[
                      ["売上", yen(r.sales.total)],
                      ["客数", r.sales.guests !== null ? `${r.sales.guests}組` : "—"],
                      ["製造", `${can.made + sweet.made}個`],
                      ["販売", `${productTotal(r)}点`],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg bg-cream px-1 py-1.5">
                        <dt className="text-[10px] text-ink-soft">{label}</dt>
                        <dd className="text-xs font-bold leading-tight">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  {r.shift.partOnly && r.shift.partOnlyNote ? (
                    <p className="mt-2 line-clamp-2 rounded-lg bg-white px-2 py-1.5 text-[11px] text-ink-soft">
                      🕒 {r.shift.partOnlyHours}：{r.shift.partOnlyNote}
                    </p>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
