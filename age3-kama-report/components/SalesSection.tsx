"use client";

import { NumberField, Select } from "@/components/ui";
import { paymentsAll, unitPrice, yen } from "@/lib/calc";
import { CUSTOMER_SEGMENTS, PEAK_HOURS } from "@/lib/masters";
import type { Report, Settings } from "@/lib/types";

/** 売上情報。客単価は総売上÷客数で自動計算するので入力欄は置かない */
export function SalesSection({
  report,
  settings,
  patch,
}: {
  report: Report;
  settings: Settings;
  patch: (fn: (r: Report) => Report) => void;
}) {
  const set = <K extends keyof Report["sales"]>(key: K, v: Report["sales"][K]) =>
    patch((r) => ({ ...r, sales: { ...r.sales, [key]: v } }));

  /** 決済方法は設定画面で足す・消す・名前を変えられるので、その一覧を回す */
  const setPayment = (id: string, v: number | null) =>
    patch((r) => ({ ...r, payments: { ...r.payments, [id]: v } }));

  return (
    <div className="space-y-1">
      <NumberField label="総売上" unit="円" value={report.sales.total} onChange={(v) => set("total", v)} />
      {paymentsAll(settings).map((m) => (
        <NumberField
          key={m.id}
          label={m.name}
          unit="円"
          value={report.payments[m.id] ?? null}
          onChange={(v) => setPayment(m.id, v)}
        />
      ))}

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
