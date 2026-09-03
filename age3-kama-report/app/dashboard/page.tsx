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

/** 1項目ぶんの平均と、その平均に使えた日数 */
type Stat = {
  avg: number | null;
  /** その項目の数字が入っていた日数。未入力の日は数えない */
  days: number;
};

function stat(ns: (number | null)[]): Stat {
  const xs = ns.filter((n): n is number => n !== null);
  return { avg: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null, days: xs.length };
}

type Group = {
  /** そのグループの日報の数 */
  days: number;
  sales: Stat;
  guests: Stat;
  made: Stat;
  fill: Stat;
  sold: Stat;
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
    sales: stat(rows.map((r) => r.sales.total)),
    guests: stat(rows.map((r) => r.sales.guests)),
    made: stat(mades),
    fill: stat(fills),
    sold: stat(rows.map((r) => productTotal(r))),
  };
}

/** 比べる項目1つぶんの定義 */
type Metric = {
  key: string;
  label: string;
  pick: (g: Group) => Stat;
  format: (n: number) => string;
  /** 「80個 少ない」の差のことば。割合だけだと大きさが伝わらないので添える */
  gap: (n: number) => string;
};

const METRICS: Metric[] = [
  {
    key: "made",
    label: "製造数（缶＋サンド）",
    pick: (g) => g.made,
    format: (n) => `${Math.round(n)}個`,
    gap: (n) => `${Math.round(n)}個`,
  },
  {
    key: "fill",
    label: "在庫の充足率",
    pick: (g) => g.fill,
    format: (n) => pct(n),
    gap: (n) => `${Math.round(n * 100)}ポイント`,
  },
  {
    key: "sold",
    label: "販売点数",
    pick: (g) => g.sold,
    format: (n) => `${Math.round(n)}点`,
    gap: (n) => `${Math.round(n)}点`,
  },
  {
    key: "sales",
    label: "売上",
    pick: (g) => g.sales,
    format: (n) => yen(Math.round(n)),
    gap: (n) => yen(Math.round(n)),
  },
  {
    key: "guests",
    label: "客数",
    pick: (g) => g.guests,
    format: (n) => `${Math.round(n)}組`,
    gap: (n) => `${Math.round(n)}組`,
  },
];

/**
 * 1項目を、社員あり／社員なしの2本の棒で比べる。
 *
 * 表で数字を並べるより、棒の長さの違いのほうが一目で分かる。
 * 差は割合だけでなく「80個 少ない」と実数でも書く。割合だけだと、
 * もともと小さい数字の -50% が大ごとに見えてしまうため。
 */
function CompareCard({
  metric,
  withStaff,
  without,
}: {
  metric: Metric;
  withStaff: Group;
  without: Group;
}) {
  const a = metric.pick(withStaff);
  const b = metric.pick(without);
  const max = Math.max(a.avg ?? 0, b.avg ?? 0);
  // 0は棒なしにする。わずかでも棒が残ると「少しはある」に見えてしまう
  const bar = (v: number | null) =>
    max > 0 && v !== null && v > 0 ? Math.max(2, (v / max) * 100) : 0;

  const diff = a.avg !== null && b.avg !== null && a.avg !== 0 ? (b.avg - a.avg) / a.avg : null;
  const gap = a.avg !== null && b.avg !== null ? Math.abs(a.avg - b.avg) : null;

  return (
    <div className="border-t border-line py-3 first:border-t-0 first:pt-0">
      <p className="mb-2 text-sm font-bold leading-tight">{metric.label}</p>

      <Row name="社員あり" stat={a} width={bar(a.avg)} color="var(--color-brand)" format={metric.format} />
      <Row name="社員なし" stat={b} width={bar(b.avg)} color="var(--color-warn)" format={metric.format} />

      {diff !== null && gap !== null ? (
        <p
          className={`mt-2 text-xs font-bold ${
            diff < -0.05 ? "text-low" : diff > 0.05 ? "text-ok" : "text-ink-soft"
          }`}
        >
          {diff < -0.05
            ? `アルバイトだけの日は ${metric.gap(gap)} 少ない（${Math.round(diff * 100)}%）`
            : diff > 0.05
              ? `アルバイトだけの日のほうが ${metric.gap(gap)} 多い（+${Math.round(diff * 100)}%）`
              : "ほとんど変わりません"}
        </p>
      ) : (
        <p className="mt-2 text-xs font-medium text-ink-soft">
          {a.avg === null && b.avg === null
            ? "どちらの日もまだ入力がありません"
            : a.avg === null
              ? "社員ありの日にまだ入力がないので、比べられません"
              : "アルバイトだけの日にまだ入力がないので、比べられません"}
        </p>
      )}
    </div>
  );
}

/** 棒1本ぶん。名前・棒・数字・その数字に使えた日数 */
function Row({
  name,
  stat: s,
  width,
  color,
  format,
}: {
  name: string;
  stat: Stat;
  width: number;
  color: string;
  format: (n: number) => string;
}) {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <span className="w-14 shrink-0 text-[11px] font-medium text-ink-soft">{name}</span>
      <span className="h-5 flex-1 overflow-hidden rounded bg-cream-deep">
        <span
          className="block h-full rounded"
          style={{ width: `${width}%`, background: color }}
          aria-hidden
        />
      </span>
      <span className="tnum w-24 shrink-0 text-right text-sm font-bold">
        {s.avg === null ? <span className="text-ink-soft">未入力</span> : format(s.avg)}
      </span>
      <span className="tnum w-10 shrink-0 text-right text-[10px] text-ink-soft">{s.days}日</span>
    </div>
  );
}

/**
 * 一番落ちている項目を1行で言い切る。
 * 表を読み解かなくても、どこに手を打てばいいかが先に分かるようにする。
 */
function headline(withStaff: Group, without: Group): { text: string; tone: "low" | "ok" | "soft" } {
  let worst: { label: string; diff: number; gap: string } | null = null;
  for (const m of METRICS) {
    const a = m.pick(withStaff).avg;
    const b = m.pick(without).avg;
    if (a === null || b === null || a === 0) continue;
    const diff = (b - a) / a;
    if (!worst || diff < worst.diff) {
      worst = { label: m.label, diff, gap: m.gap(Math.abs(a - b)) };
    }
  }
  if (!worst) return { text: "まだ比べられるだけの日報がありません。", tone: "soft" };
  if (worst.diff >= -0.05) {
    return { text: "アルバイトだけの日でも、大きく落ちている項目はありません。", tone: "ok" };
  }
  return {
    text: `アルバイトだけの日は、${worst.label} が いちばん落ちています。1日あたり ${worst.gap} 少ない（${Math.round(worst.diff * 100)}%）。`,
    tone: "low",
  };
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
  const lead = headline(withStaff, without);
  // どちらかが3日に満たないうちは、差が本物かどうか判断できない
  const thin = withStaff.days > 0 && without.days > 0 && Math.min(withStaff.days, without.days) < 3;

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
          <>
            <p
              className={`mb-3 rounded-xl border-l-4 px-3 py-2 text-sm font-bold leading-relaxed ${
                lead.tone === "low"
                  ? "border-l-low bg-low-bg text-low"
                  : lead.tone === "ok"
                    ? "border-l-ok bg-ok-bg text-ok"
                    : "border-l-line bg-cream text-ink-soft"
              }`}
            >
              {lead.text}
            </p>

            <p className="mb-3 flex items-center justify-between rounded-xl bg-cream px-3 py-2 text-xs">
              <span className="font-bold">
                <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-brand align-middle" aria-hidden />
                社員あり <span className="tnum">{withStaff.days}</span>日
              </span>
              <span className="font-bold text-warn">
                <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-warn align-middle" aria-hidden />
                社員なし <span className="tnum">{without.days}</span>日
              </span>
            </p>

            {thin ? (
              <p className="mb-3 rounded-xl bg-warn-bg px-3 py-2 text-[11px] font-bold leading-relaxed text-warn">
                ⚠️ 比べている日数がまだ少ないので、たまたまの差かもしれません。3日ずつたまってから判断してください。
              </p>
            ) : null}

            {METRICS.map((m) => (
              <CompareCard key={m.key} metric={m} withStaff={withStaff} without={without} />
            ))}
          </>
        )}
        <p className="mt-3 rounded-xl bg-cream px-3 py-2 text-[11px] leading-relaxed text-ink-soft">
          どれも<b className="text-ink">1日あたりの平均</b>です。右はしの日数は、その項目の数字が
          実際に入っていた日数です。数字を入れていない日は平均に入れていません。
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
