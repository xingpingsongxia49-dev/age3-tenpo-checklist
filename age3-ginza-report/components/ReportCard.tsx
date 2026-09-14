"use client";

import { paymentGap, paymentShare, paymentTotal, pct, prettyDate, safeDiffText, unitPrice, yen } from "@/lib/calc";
import { Bar } from "@/components/ui";
import type { Report } from "@/lib/types";

function Row({ label, value, big = false, alert = false }: {
  label: string;
  value: string;
  big?: boolean;
  alert?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3 py-1.5">
      <span className="flex-1 text-sm text-ink-soft">{label}</span>
      <span
        className={`tnum font-bold ${big ? "text-3xl text-brand" : "text-base"} ${alert ? "text-low" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="section-title mb-2 mt-5 first:mt-0">{children}</h3>;
}

/** 内訳の1行。金額と、内訳全体に占める割合の棒 */
function PayRow({ name, value, rate, color }: {
  name: string;
  value: number | null;
  rate: number | null;
  color: string;
}) {
  return (
    <div className="py-1.5">
      <div className="flex items-baseline gap-2">
        <span className="flex-1 text-sm">{name}</span>
        <span className="tnum text-base font-bold">{yen(value)}</span>
        <span className="tnum w-10 shrink-0 text-right text-xs text-ink-soft">
          {rate === null ? "" : pct(rate)}
        </span>
      </div>
      {rate === null ? null : (
        <div className="mt-1">
          <Bar rate={rate} color={color} />
        </div>
      )}
    </div>
  );
}

/**
 * 画面に出す報告カード。
 * lib/cardImage.ts が書き出すPNGと同じ並び・同じ色にしてある。
 */
export function ReportCard({ report }: { report: Report }) {
  const s = report.sales;
  const share = paymentShare(report);
  const pay = paymentTotal(report);
  const gap = paymentGap(report);
  const mismatch = gap !== null && gap !== 0;

  return (
    <article className="card overflow-hidden">
      <div className="card-header px-4 py-4">
        <p className="text-[11px] font-bold tracking-[0.3em] text-gold-soft">AGE.3　GINZA</p>
        <div className="flex items-end justify-between gap-2">
          <h2 className="text-2xl font-bold">銀座店 売上報告</h2>
          <p className="tnum text-base font-bold text-gold-soft">📅 {prettyDate(report.date)}</p>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="rounded-2xl bg-cream p-4 text-center">
          <p className="text-sm font-bold text-ink-soft">総売上</p>
          <p className="tnum text-4xl font-bold text-brand">{yen(s.total)}</p>
          <p className="tnum mt-1 text-sm text-ink-soft">
            {s.guests === null ? "客数 —" : `客数 ${s.guests}組`}　／　客単価 {yen(unitPrice(report))}
          </p>
        </div>

        <Heading>💳 内訳</Heading>
        <PayRow name="現金" value={s.cash} rate={share?.cash ?? null} color="var(--color-matcha)" />
        <PayRow name="PayPay" value={s.paypay} rate={share?.paypay ?? null} color="var(--color-info)" />
        <PayRow name="CR" value={s.credit} rate={share?.credit ?? null} color="var(--color-gold)" />
        <Row
          label="内訳合計"
          value={mismatch ? `${yen(pay)}　⚠️総売上と不一致` : yen(pay)}
          alert={mismatch}
        />

        <Heading>⭐ 口コミ</Heading>
        <Row
          label="本日"
          value={
            report.reviews.notReflected
              ? "反映なし"
              : report.reviews.today === null
                ? "—"
                : `${report.reviews.today}件`
          }
        />
        <Row
          label="総口コミ"
          value={report.reviews.total === null ? "—" : `${report.reviews.total.toLocaleString("ja-JP")}件`}
        />

        <Heading>🛵 Uber</Heading>
        <Row label="件数" value={s.uberOrders === null ? "—" : `${s.uberOrders}件`} />
        <Row label="売上" value={yen(s.uberSales)} />

        {report.safe.checked ? (
          <>
            <Heading>🔐 金庫</Heading>
            <Row
              label="10万円"
              value={safeDiffText(report.safe.diff)}
              alert={(report.safe.diff ?? 0) !== 0}
            />
          </>
        ) : null}

        {report.note ? (
          <>
            <Heading>📮 その他連絡事項</Heading>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{report.note}</p>
          </>
        ) : null}

        {report.reporter ? (
          <p className="mt-4 text-right text-xs text-ink-soft">報告者：{report.reporter}</p>
        ) : null}
      </div>
      <div className="h-1.5 bg-gold" />
    </article>
  );
}
