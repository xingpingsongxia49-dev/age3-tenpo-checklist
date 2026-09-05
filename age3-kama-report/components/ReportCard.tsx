"use client";

import {
  canMadeTotal,
  prettyDate,
  productTotal,
  reviewReplyTotal,
  topProduct,
  unitPrice,
  yen,
} from "@/lib/calc";
import { CAN_ITEMS } from "@/lib/masters";
import type { Report, Settings } from "@/lib/types";

function Row({
  label,
  value,
  big = false,
}: {
  label: string;
  value: string;
  big?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3 py-1.5">
      <span className="flex-1 text-sm text-ink-soft">{label}</span>
      <span className={`tnum font-bold ${big ? "text-2xl text-brand" : "text-base"}`}>{value}</span>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="section-title mb-2 mt-5 first:mt-0">{children}</h3>;
}

/**
 * 画面に出す日報カード。
 * lib/cardImage.ts が書き出すPNGと同じ並び・同じ色にしてある。
 */
export function ReportCard({ report, settings }: { report: Report; settings: Settings }) {
  const top = topProduct(report, settings);
  const noStaff = !report.shift.staffPresent;
  const canMade = canMadeTotal(report);
  // 絵文字を頭に置くと、名前を1つずつ読まなくても何を作ったのかが分かる
  const madeList = CAN_ITEMS.filter((i) => report.cans[i.id]?.made).map(
    (i) => `${i.emoji}${i.name} ${report.cans[i.id]?.made}`,
  );
  const tasks = [...report.idleTasks, report.idleNote].filter(Boolean).join("・");

  return (
    <article className="card overflow-hidden">
      <div className="card-header px-4 py-4">
        <p className="text-[11px] font-bold tracking-[0.3em] text-gold-soft">AGE.3　KAMA</p>
        <div className="flex items-end justify-between gap-2">
          <h2 className="text-2xl font-bold">嘉麻店 日報</h2>
          <p className="tnum text-base font-bold text-gold-soft">📅 {prettyDate(report.date)}</p>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* 社員在店。ここが一番目立つように色を強く出す */}
        <div
          className={`mb-4 rounded-2xl p-3 ${noStaff ? "bg-warn-bg" : "bg-info-bg"}`}
        >
          <p className={`text-lg font-bold ${noStaff ? "text-warn" : "text-info"}`}>
            {noStaff ? "⚠️ 社員なし（アルバイトのみ）" : "✅ 社員あり"}
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-ink-soft">
            {report.shift.headcount !== null ? <li>出勤 {report.shift.headcount}名</li> : null}
            {report.shift.production.length ? <li>製造 {report.shift.production.join("・")}</li> : null}
            {report.shift.sales.length ? <li>販売 {report.shift.sales.join("・")}</li> : null}
            {report.shift.partOnly ? (
              <li>
                アルバイトのみ {report.shift.partOnlyHours || "あり"}
                {report.shift.partOnlyNote ? `／${report.shift.partOnlyNote}` : ""}
              </li>
            ) : null}
          </ul>
        </div>

        <Heading>🥞 缶商品の製造</Heading>
        <div className="rounded-2xl bg-cream p-3">
          <div className="flex items-baseline gap-2">
            <span className="flex-1 text-sm font-bold">本日の製造数</span>
            <span className="tnum text-2xl font-bold text-brand">{canMade}個</span>
          </div>
          {madeList.length ? (
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              {madeList.slice(0, 8).join("・")}
              {madeList.length > 8 ? " ほか" : ""}
            </p>
          ) : null}
        </div>

        <Heading>💰 売上</Heading>
        <Row label="総売上" value={yen(report.sales.total)} big />
        <Row label="客数" value={report.sales.guests !== null ? `${report.sales.guests}組` : "—"} />
        <Row label="客単価" value={yen(unitPrice(report))} />
        <Row label="内訳" value={`現金 ${yen(report.sales.cash)}／CR ${yen(report.sales.credit)}`} />
        <Row label="　" value={`PayPay ${yen(report.sales.paypay)}／QR ${yen(report.sales.qr)}`} />
        {report.sales.uberOrders ? (
          <Row label="Uber" value={`${report.sales.uberOrders}件　${yen(report.sales.uberSales)}`} />
        ) : null}

        <Heading>🙋 お客様</Heading>
        <Row label="客層" value={report.customers.segment || "—"} />
        <Row label="ピーク時間" value={report.customers.peakHour || "—"} />
        <Row
          label="リピーター / 新規"
          value={`${report.customers.repeat ?? "—"}組 / ${report.customers.newcomer ?? "—"}組`}
        />

        <Heading>🍦 販売</Heading>
        {top ? (
          <div className="rounded-2xl bg-gold-soft p-3">
            <p className="text-base font-bold text-brand">
              🏆 {top.emoji} {top.group} {top.name}　<span className="tnum">{top.count}点</span>
            </p>
            <p className="tnum mt-0.5 text-xs text-ink-soft">販売合計 {productTotal(report)}点</p>
          </div>
        ) : (
          <Row label="販売合計" value={`${productTotal(report)}点`} />
        )}

        <Heading>⭐ 口コミ</Heading>
        <Row
          label="本日の口コミ"
          value={report.sales.reviewsToday !== null ? `${report.sales.reviewsToday}件` : "—"}
        />
        <Row
          label="総口コミ"
          value={report.sales.reviewsTotal !== null ? `${report.sales.reviewsTotal}件` : "—"}
        />
        <Row label="返信合計" value={`${reviewReplyTotal(report)}件`} />

        {tasks ? (
          <>
            <Heading>🧹 手が空いた時の作業</Heading>
            <p className="text-sm leading-relaxed">{tasks}</p>
          </>
        ) : null}

        {report.note ? (
          <>
            <Heading>📮 その他連絡事項</Heading>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{report.note}</p>
          </>
        ) : null}
      </div>
      <div className="h-1.5 bg-gold" />
    </article>
  );
}
