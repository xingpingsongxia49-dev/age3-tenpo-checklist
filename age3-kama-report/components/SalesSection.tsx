"use client";

import { NumberField, Select } from "@/components/ui";
import { paymentTotal, unitPrice, yen } from "@/lib/calc";
import { CUSTOMER_SEGMENTS, PEAK_HOURS } from "@/lib/masters";
import type { Report } from "@/lib/types";

/** 売上情報。客単価は総売上÷客数で自動計算するので入力欄は置かない */
export function SalesSection({
  report,
  patch,
}: {
  report: Report;
  patch: (fn: (r: Report) => Report) => void;
}) {
  const set = <K extends keyof Report["sales"]>(key: K, v: Report["sales"][K]) =>
    patch((r) => ({ ...r, sales: { ...r.sales, [key]: v } }));

  const breakdown = paymentTotal(report);
  const total = report.sales.total;
  // 内訳の合計が総売上と合わないときは、締めの前に気づけるよう出しておく
  const gap = total !== null && breakdown > 0 ? total - breakdown : null;

  return (
    <div className="space-y-1">
      <NumberField label="総売上" unit="円" value={report.sales.total} onChange={(v) => set("total", v)} />
      <NumberField label="現金" unit="円" value={report.sales.cash} onChange={(v) => set("cash", v)} />
      <NumberField label="ＣＲ" unit="円" value={report.sales.credit} onChange={(v) => set("credit", v)} />
      <NumberField label="PayPay" unit="円" value={report.sales.paypay} onChange={(v) => set("paypay", v)} />
      <NumberField label="QR" unit="円" value={report.sales.qr} onChange={(v) => set("qr", v)} />
      <NumberField
        label="アンカーチケット"
        unit="円"
        value={report.sales.anchorTicket}
        onChange={(v) => set("anchorTicket", v)}
      />

      {gap !== null && gap !== 0 ? (
        <p className="my-2 rounded-xl bg-warn-bg px-3 py-2 text-sm font-bold text-warn">
          ⚠️ 内訳の合計 {yen(breakdown)} と総売上が {yen(Math.abs(gap))} ずれています
        </p>
      ) : null}

      <div className="my-3 h-px bg-line" />

      <NumberField label="客数" unit="組" value={report.sales.guests} onChange={(v) => set("guests", v)} />
      <div className="flex items-center justify-between rounded-xl bg-gold-soft px-3 py-3">
        <span className="text-sm font-bold">客単価（自動計算）</span>
        <span className="tnum text-lg font-bold">{yen(unitPrice(report))}</span>
      </div>

      <div className="my-3 h-px bg-line" />

      <NumberField label="Uber" unit="件" value={report.sales.uberOrders} onChange={(v) => set("uberOrders", v)} />
      <NumberField label="Uber売上" unit="円" value={report.sales.uberSales} onChange={(v) => set("uberSales", v)} />

      <div className="my-3 h-px bg-line" />

      <NumberField
        label="本日の口コミ"
        unit="件"
        value={report.sales.reviewsToday}
        onChange={(v) => set("reviewsToday", v)}
      />
      <NumberField
        label="総口コミ"
        unit="件"
        value={report.sales.reviewsTotal}
        onChange={(v) => set("reviewsTotal", v)}
      />
    </div>
  );
}

/** お客様情報 */
export function CustomerSection({
  report,
  patch,
}: {
  report: Report;
  patch: (fn: (r: Report) => Report) => void;
}) {
  const set = <K extends keyof Report["customers"]>(key: K, v: Report["customers"][K]) =>
    patch((r) => ({ ...r, customers: { ...r.customers, [key]: v } }));

  return (
    <div className="space-y-1">
      <Select
        label="客層"
        value={report.customers.segment}
        onChange={(v) => set("segment", v)}
        options={CUSTOMER_SEGMENTS}
      />
      <Select
        label="来店ピーク時間帯"
        value={report.customers.peakHour}
        onChange={(v) => set("peakHour", v)}
        options={PEAK_HOURS}
      />
      <NumberField
        label="リピーター"
        unit="組"
        value={report.customers.repeat}
        onChange={(v) => set("repeat", v)}
      />
      <NumberField
        label="新規客"
        unit="組"
        value={report.customers.newcomer}
        onChange={(v) => set("newcomer", v)}
      />
    </div>
  );
}
