"use client";

import { useEffect, useMemo, useState } from "react";

import { BarSeries, type Point } from "@/components/Charts";
import { Bar, Section } from "@/components/ui";
import { avg, paymentTotal, pct, unitPrice, weekdayOf, yen } from "@/lib/calc";
import { listReports } from "@/lib/storage";
import type { Report } from "@/lib/types";

/** 平均を1行で見せる */
function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline gap-3 border-t border-line py-2.5 first:border-t-0 first:pt-0">
      <span className="flex-1 text-sm text-ink-soft">{label}</span>
      <span className="tnum text-lg font-bold">{value}</span>
      {sub ? <span className="tnum w-16 shrink-0 text-right text-xs text-ink-soft">{sub}</span> : null}
    </div>
  );
}

export default function DashboardPage() {
  const [reports, setReports] = useState<Report[] | null>(null);

  useEffect(() => {
    void (async () => setReports(await listReports()))();
  }, []);

  // 直近30日ぶんを、古い順（左が過去）に並べ替えてグラフに渡す
  const recent = useMemo(() => (reports ?? []).slice(0, 30).reverse(), [reports]);

  const series = useMemo(() => {
    const mk = (pick: (r: Report) => number): Point[] =>
      recent.map((r) => {
        const w = weekdayOf(r.date);
        return {
          label: r.date.slice(5).replace("-", "/"),
          value: pick(r),
          flagged: w === "土" || w === "日",
        };
      });
    return {
      sales: mk((r) => r.sales.total ?? 0),
      guests: mk((r) => r.sales.guests ?? 0),
      unit: mk((r) => unitPrice(r) ?? 0),
    };
  }, [recent]);

  if (!reports) {
    return <main className="px-4 pt-10 text-center text-sm text-ink-soft">読み込み中…</main>;
  }

  const withSales = reports.filter((r) => r.sales.total !== null);
  const avgSales = avg(reports.map((r) => r.sales.total));
  const avgGuests = avg(reports.map((r) => r.sales.guests));
  const avgUnit = avg(reports.map((r) => unitPrice(r)));
  const avgUber = avg(reports.map((r) => r.sales.uberOrders));
  // Uber売上は入れはじめたばかりの項目なので、入っている日だけで平均を出す
  const avgUberSales = avg(reports.map((r) => r.sales.uberSales));
  const uberDays = reports.filter((r) => r.sales.uberSales !== null).length;

  // 決済手段の割合は、日ごとではなく期間の合計で出す。
  // 日ごとの割合を平均すると、売上の小さい日が大きい日と同じ重みになってしまう
  const sum = { cash: 0, paypay: 0, credit: 0 };
  for (const r of reports) {
    sum.cash += r.sales.cash ?? 0;
    sum.paypay += r.sales.paypay ?? 0;
    sum.credit += r.sales.credit ?? 0;
  }
  const payAll = sum.cash + sum.paypay + sum.credit;

  // 曜日ごとの平均売上。どの曜日に人を厚くするかの手がかりになる
  const byWeekday = ["月", "火", "水", "木", "金", "土", "日"].map((w) => ({
    w,
    avg: avg(reports.filter((r) => weekdayOf(r.date) === w).map((r) => r.sales.total)),
    days: reports.filter((r) => weekdayOf(r.date) === w && r.sales.total !== null).length,
  }));
  const maxWeekday = Math.max(...byWeekday.map((b) => b.avg ?? 0), 1);

  return (
    <main className="px-3 pt-4">
      <h1 className="mb-1 text-xl font-bold">📊 分析</h1>
      <p className="mb-4 text-xs text-ink-soft">
        報告した日だけを数えています。入力していない日は平均に入れていません。
      </p>

      {reports.length === 0 ? (
        <p className="card p-6 text-center text-sm text-ink-soft">まだ報告がありません</p>
      ) : (
        <>
          <Section title="1日あたりの平均" emoji="📐">
            <Stat label="総売上" value={yen(avgSales === null ? null : Math.round(avgSales))} sub={`${withSales.length}日`} />
            <Stat label="客数" value={avgGuests === null ? "—" : `${Math.round(avgGuests)}組`} />
            <Stat label="客単価" value={yen(avgUnit === null ? null : Math.round(avgUnit))} />
            <Stat label="Uber 件数" value={avgUber === null ? "—" : `${Math.round(avgUber * 10) / 10}件`} />
            <Stat
              label="Uber 売上"
              value={yen(avgUberSales === null ? null : Math.round(avgUberSales))}
              sub={uberDays > 0 ? `${uberDays}日` : undefined}
            />
          </Section>

          <Section title="決済手段の割合" emoji="💳">
            {payAll === 0 ? (
              <p className="py-4 text-center text-sm text-ink-soft">まだ内訳が入っていません</p>
            ) : (
              <>
                {[
                  { name: "現金", v: sum.cash, color: "var(--color-matcha)" },
                  { name: "PayPay", v: sum.paypay, color: "var(--color-info)" },
                  { name: "CR", v: sum.credit, color: "var(--color-gold)" },
                ].map((x) => (
                  <div key={x.name} className="py-2">
                    <div className="flex items-baseline gap-2">
                      <span className="flex-1 text-sm">{x.name}</span>
                      <span className="tnum text-sm font-bold">{yen(x.v)}</span>
                      <span className="tnum w-12 shrink-0 text-right text-sm font-bold text-brand">
                        {pct(x.v / payAll)}
                      </span>
                    </div>
                    <div className="mt-1">
                      <Bar rate={x.v / payAll} color={x.color} />
                    </div>
                  </div>
                ))}
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                  期間の合計から出しています。日ごとの割合を平均すると、売上の小さい日が
                  大きい日と同じ重みになってしまうためです。
                </p>
              </>
            )}
          </Section>

          <Section title="曜日ごとの平均売上" emoji="🗓">
            {byWeekday.map((b) => (
              <div key={b.w} className="flex items-center gap-2 py-1.5">
                <span className="w-6 shrink-0 text-sm font-bold">{b.w}</span>
                <span className="flex-1">
                  <Bar
                    rate={(b.avg ?? 0) / maxWeekday}
                    color={b.w === "土" || b.w === "日" ? "var(--color-gold)" : "var(--color-brand)"}
                  />
                </span>
                <span className="tnum w-24 shrink-0 text-right text-sm font-bold">
                  {b.avg === null ? "—" : yen(Math.round(b.avg))}
                </span>
                <span className="tnum w-8 shrink-0 text-right text-[10px] text-ink-soft">{b.days}日</span>
              </div>
            ))}
          </Section>

          <Section title="総売上の推移" emoji="💰">
            <BarSeries points={series.sales} format={(n) => yen(n)} />
          </Section>

          <Section title="客数の推移" emoji="🙋">
            <BarSeries points={series.guests} unit="組" />
          </Section>

          <Section title="客単価の推移" emoji="🧾">
            <BarSeries points={series.unit} format={(n) => yen(n)} />
          </Section>

          <p className="mb-4 flex items-center justify-center gap-4 text-[11px] text-ink-soft">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-brand" aria-hidden />
              平日
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-gold" aria-hidden />
              土日
            </span>
          </p>
        </>
      )}
    </main>
  );
}
