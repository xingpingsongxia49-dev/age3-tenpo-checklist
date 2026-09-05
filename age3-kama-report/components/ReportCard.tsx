"use client";

import {
  canMadeTotal,
  paymentTotal,
  prettyDate,
  productRowsOf,
  productTotal,
  reviewReplyTotal,
  topCanMade,
  topProduct,
  unitPrice,
  yen,
} from "@/lib/calc";
import { CAN_GROUPS, REVIEW_STORES } from "@/lib/masters";
import type { Report, Settings } from "@/lib/types";

function Row({
  label,
  value,
  big = false,
  alert = false,
}: {
  label: string;
  value: string;
  big?: boolean;
  /** 入力の食い違いなど、目を止めてほしい行 */
  alert?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3 py-1.5">
      <span className="flex-1 text-sm text-ink-soft">{label}</span>
      <span
        className={`tnum font-bold ${big ? "text-2xl text-brand" : "text-base"} ${alert ? "text-low" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="section-title mb-2 mt-5 first:mt-0">{children}</h3>;
}

/** 一覧の見出し行。グループ名とそのグループの合計 */
function SubHead({ name, value }: { name: string; value: string }) {
  return (
    <div className="mt-2 flex items-baseline gap-2 rounded-lg bg-cream-deep px-3 py-1.5">
      <span className="flex-1 text-sm font-bold leading-tight">{name}</span>
      <span className="tnum text-sm font-bold text-brand">{value}</span>
    </div>
  );
}

/** 一覧の1品目 */
function Item({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 py-1 pl-3">
      <span className="flex-1 text-sm leading-tight">{name}</span>
      <span className="tnum text-sm font-bold">{value}</span>
    </div>
  );
}

/** 売上の内訳など、本文より一段内側の小見出し */
function MinorHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 mb-1 flex items-center gap-2">
      <span className="text-xs font-bold text-ink-soft">{children}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/**
 * 画面に出す日報カード。
 * lib/cardImage.ts が書き出すPNGと同じ並び・同じ色にしてある。
 */
export function ReportCard({ report, settings }: { report: Report; settings: Settings }) {
  const top = topProduct(report, settings);
  const noStaff = !report.shift.staffPresent;
  const madeTotal = canMadeTotal(report);
  const soldTotal = productTotal(report);
  const replies = reviewReplyTotal(report);
  const tasks = [...report.idleTasks, report.idleNote].filter(Boolean) as string[];
  const mostCan = topCanMade(report);
  const pay = paymentTotal(report);
  const mismatch = report.sales.total !== null && pay !== report.sales.total;

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
        <div className={`mb-3 rounded-2xl p-3 ${noStaff ? "bg-warn-bg" : "bg-info-bg"}`}>
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

        {/* 本日やったこと。何をどれだけやった日なのかを先に伝える */}
        <div className="mb-1 rounded-2xl bg-cream p-3">
          <p className="text-base font-bold text-brand">🧾 本日やったこと</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            製造 <b className="tnum text-ink">{madeTotal}</b>個　／　販売{" "}
            <b className="tnum text-ink">{soldTotal}</b>点　／　口コミ返信{" "}
            <b className="tnum text-ink">{replies}</b>件　／　作業{" "}
            <b className="tnum text-ink">{tasks.length}</b>件
          </p>
        </div>

        <Heading>🥞 缶商品の製造</Heading>
        <div className="rounded-2xl bg-cream-deep p-3">
          <p className="text-base font-bold text-brand">本日の製造数 {madeTotal}個</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {mostCan
              ? `いちばん多く作ったもの　${mostCan.emoji}${mostCan.name} ${mostCan.made}個`
              : "本日の製造はありません"}
          </p>
        </div>
        {CAN_GROUPS.map((g) => {
          const made = g.items.filter((it) => report.cans[it.id]?.made);
          if (!made.length) return null;
          const sub = made.reduce((n, it) => n + (report.cans[it.id]?.made ?? 0), 0);
          return (
            <div key={g.id}>
              <SubHead name={`${g.emoji}${g.name}`} value={`${sub}個`} />
              {made.map((it) => (
                <Item
                  key={it.id}
                  name={`${it.emoji}${it.name}`}
                  value={`${report.cans[it.id]?.made}個`}
                />
              ))}
            </div>
          );
        })}

        <Heading>💰 売上</Heading>
        <Row label="総売上" value={yen(report.sales.total)} big />
        <Row label="客数" value={report.sales.guests !== null ? `${report.sales.guests}組` : "—"} />
        <Row label="客単価" value={yen(unitPrice(report))} />

        <MinorHead>内訳</MinorHead>
        <Item name="現金" value={yen(report.sales.cash)} />
        <Item name="クレジット" value={yen(report.sales.credit)} />
        <Item name="PayPay" value={yen(report.sales.paypay)} />
        <Item name="QR" value={yen(report.sales.qr)} />
        <Item name="アンカーチケット" value={yen(report.sales.anchorTicket)} />
        <Row
          label="内訳合計"
          value={mismatch ? `${yen(pay)}　⚠️総売上と不一致` : yen(pay)}
          alert={mismatch}
        />

        {report.sales.uberOrders || report.sales.uberSales ? (
          <>
            <MinorHead>Uber</MinorHead>
            <Item name="件数" value={`${report.sales.uberOrders ?? 0}件`} />
            <Item name="売上" value={yen(report.sales.uberSales)} />
          </>
        ) : null}

        <Heading>🙋 お客様</Heading>
        <Row label="客層" value={report.customers.segment || "—"} />
        <Row label="ピーク時間" value={report.customers.peakHour || "—"} />
        <Row
          label="リピーター / 新規"
          value={`${report.customers.repeat ?? "—"}組 / ${report.customers.newcomer ?? "—"}組`}
        />

        <Heading>🍦 販売</Heading>
        <div className="rounded-2xl bg-gold-soft p-3">
          <p className="text-base font-bold text-brand">
            {top
              ? `🏆 いちばん売れた　${top.emoji}${top.group} ${top.name}　${top.count}点`
              : "本日の販売はありません"}
          </p>
          <p className="tnum mt-0.5 text-xs text-ink-soft">販売合計 {soldTotal}点</p>
        </div>
        {productRowsOf(report, settings).map((g) => {
          const sold = g.items.filter((it) => (report.products[it.id] ?? 0) > 0);
          if (!sold.length) return null;
          const sub = sold.reduce((n, it) => n + (report.products[it.id] ?? 0), 0);
          return (
            <div key={g.id}>
              <SubHead name={`${g.emoji}${g.name}`} value={`${sub}点`} />
              {sold.map((it) => (
                <Item key={it.id} name={it.name} value={`${report.products[it.id]}点`} />
              ))}
            </div>
          );
        })}

        <Heading>⭐ 口コミ</Heading>
        <Row
          label="本日の口コミ"
          value={report.sales.reviewsToday !== null ? `${report.sales.reviewsToday}件` : "—"}
        />
        <Row
          label="総口コミ"
          value={report.sales.reviewsTotal !== null ? `${report.sales.reviewsTotal}件` : "—"}
        />
        <Row label="返信合計" value={`${replies}件`} />
        {replies > 0
          ? REVIEW_STORES.map((st) => {
              const n = report.reviewReplies[st] ?? 0;
              return n > 0 ? <Item key={st} name={st} value={`${n}件`} /> : null;
            })
          : null}

        {tasks.length ? (
          <>
            <Heading>🧹 手が空いた時の作業</Heading>
            <ul className="space-y-1">
              {tasks.map((t, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed">
                  <span aria-hidden className="text-gold">
                    ●
                  </span>
                  <span className="flex-1">{t}</span>
                </li>
              ))}
            </ul>
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
