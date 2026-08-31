"use client";

import { useEffect, useMemo, useState } from "react";

import { BarSeries, type Point } from "@/components/Charts";
import { Section } from "@/components/ui";
import {
  canSummary,
  emptySettings,
  pct,
  productTotal,
  sweetSummary,
  yen,
} from "@/lib/calc";
import { listReports, loadSettings } from "@/lib/storage";
import type { Report, Settings } from "@/lib/types";

/** 平均。対象が0件なら null */
function avg(ns: (number | null)[]): number | null {
  const xs = ns.filter((n): n is number => n !== null);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

type Group = {
  days: number;
  sales: number | null;
  guests: number | null;
  made: number | null;
  fill: number | null;
  sold: number | null;
};

function groupStats(rows: Report[], settings: Settings): Group {
  const fills: (number | null)[] = [];
  const mades: number[] = [];
  for (const r of rows) {
    const can = canSummary(r, settings);
    const sweet = sweetSummary(r, settings);
    mades.push(can.made + sweet.made);
    const both = [can.rate, sweet.rate].filter((x): x is number => x !== null);
    fills.push(both.length ? both.reduce((a, b) => a + b, 0) / both.length : null);
  }
  return {
    days: rows.length,
    sales: avg(rows.map((r) => r.sales.total)),
    guests: avg(rows.map((r) => r.sales.guests)),
    made: avg(mades),
    fill: avg(fills),
    sold: avg(rows.map((r) => productTotal(r))),
  };
}

/** 2つの平均を並べて、差がどちら向きかも出す */
function CompareRow({
  label,
  withStaff,
  without,
  format,
}: {
  label: string;
  withStaff: number | null;
  without: number | null;
  format: (n: number) => string;
}) {
  const diff =
    withStaff !== null && without !== null && withStaff !== 0
      ? (without - withStaff) / withStaff
      : null;
  return (
    <tr className="border-t border-line">
      <th scope="row" className="py-2.5 pr-2 text-left text-xs font-medium text-ink-soft">
        {label}
      </th>
      <td className="tnum py-2.5 text-right text-sm font-bold">
        {withStaff === null ? "—" : format(withStaff)}
      </td>
      <td className="tnum py-2.5 text-right text-sm font-bold text-warn">
        {without === null ? "—" : format(without)}
      </td>
      <td className="tnum py-2.5 pl-2 text-right text-xs font-bold">
        {diff === null ? (
          "—"
        ) : (
          <span className={diff < -0.05 ? "text-low" : diff > 0.05 ? "text-ok" : "text-ink-soft"}>
            {diff > 0 ? "+" : ""}
            {Math.round(diff * 100)}%
          </span>
        )}
      </td>
    </tr>
  );
}

export default function DashboardPage() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [settings, setSettings] = useState<Settings>(emptySettings);

  useEffect(() => {
    void (async () => {
      const [r, s] = await Promise.all([listReports(), loadSettings()]);
      setSettings(s);
      setReports(r);
    })();
  }, []);

  // 直近30日ぶんを、古い順（左が過去）に並べ替えてグラフに渡す
  const recent = useMemo(() => (reports ?? []).slice(0, 30).reverse(), [reports]);

  const series = useMemo(() => {
    const mk = (pick: (r: Report) => number): Point[] =>
      recent.map((r) => ({
        label: r.date.slice(5).replace("-", "/"),
        value: pick(r),
        flagged: !r.shift.staffPresent,
      }));
    return {
      canMade: mk((r) => canSummary(r, settings).made),
      sweetMade: mk((r) => sweetSummary(r, settings).made),
      guests: mk((r) => r.sales.guests ?? 0),
      sales: mk((r) => r.sales.total ?? 0),
    };
  }, [recent, settings]);

  if (!reports) {
    return <main className="px-4 pt-10 text-center text-sm text-ink-soft">読み込み中…</main>;
  }

  const withStaff = groupStats(reports.filter((r) => r.shift.staffPresent), settings);
  const without = groupStats(reports.filter((r) => !r.shift.staffPresent), settings);

  return (
    <main className="px-3 pt-4">
      <h1 className="mb-1 text-xl font-bold">📊 分析</h1>
      <p className="mb-4 text-xs text-ink-soft">
        社員が入った日と、アルバイトだけの日を並べて比べています。
      </p>

      <Section title="社員あり / 社員なしの比較" emoji="⚖️">
        {reports.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-soft">まだ日報がありません</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="pb-1 text-left text-[10px] font-medium text-ink-soft">1日あたり平均</th>
                <th className="pb-1 text-right text-[10px] font-bold">
                  社員あり
                  <br />
                  <span className="tnum font-normal text-ink-soft">{withStaff.days}日</span>
                </th>
                <th className="pb-1 text-right text-[10px] font-bold text-warn">
                  社員なし
                  <br />
                  <span className="tnum font-normal text-ink-soft">{without.days}日</span>
                </th>
                <th className="pb-1 pl-2 text-right text-[10px] font-medium text-ink-soft">差</th>
              </tr>
            </thead>
            <tbody>
              <CompareRow
                label="売上"
                withStaff={withStaff.sales}
                without={without.sales}
                format={(n) => yen(Math.round(n))}
              />
              <CompareRow
                label="客数"
                withStaff={withStaff.guests}
                without={without.guests}
                format={(n) => `${Math.round(n)}組`}
              />
              <CompareRow
                label="製造数（缶＋サンド）"
                withStaff={withStaff.made}
                without={without.made}
                format={(n) => `${Math.round(n)}個`}
              />
              <CompareRow
                label="在庫充足率"
                withStaff={withStaff.fill}
                without={without.fill}
                format={(n) => pct(n)}
              />
              <CompareRow
                label="販売点数"
                withStaff={withStaff.sold}
                without={without.sold}
                format={(n) => `${Math.round(n)}点`}
              />
            </tbody>
          </table>
        )}
        <p className="mt-3 rounded-xl bg-cream px-3 py-2 text-[11px] leading-relaxed text-ink-soft">
          「差」は社員ありの日を基準にした増減です。マイナスが大きい項目ほど、
          アルバイトだけの日に落ちている業務です。
        </p>
      </Section>

      <Section title="缶商品の作成数" emoji="🧊">
        <BarSeries points={series.canMade} unit="個" />
      </Section>

      <Section title="サンドの作成数" emoji="🥪">
        <BarSeries points={series.sweetMade} unit="個" />
      </Section>

      <Section title="客数" emoji="🙋">
        <BarSeries points={series.guests} unit="組" />
      </Section>

      <Section title="売上" emoji="💰">
        <BarSeries points={series.sales} format={(n) => yen(n)} />
      </Section>

      <p className="mb-4 flex items-center justify-center gap-4 text-[11px] text-ink-soft">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-brand" aria-hidden />
          社員あり
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-warn" aria-hidden />
          社員なし
        </span>
      </p>
    </main>
  );
}
