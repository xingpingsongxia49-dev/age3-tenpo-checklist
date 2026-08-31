"use client";

import { CheckGrid, NumberField, Stepper, TextArea } from "@/components/ui";
import { productTotal, reviewReplyTotal, topProduct } from "@/lib/calc";
import { IDLE_TASKS, PRODUCT_GROUPS, REVIEW_STORES } from "@/lib/masters";
import type { Report } from "@/lib/types";

/** 商品別販売数。一番売れた商品はその場で自動判定して光らせる */
export function ProductSection({
  report,
  patch,
}: {
  report: Report;
  patch: (fn: (r: Report) => Report) => void;
}) {
  const top = topProduct(report);
  const set = (id: string, v: number | null) =>
    patch((r) => ({ ...r, products: { ...r.products, [id]: v ?? 0 } }));

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border-2 border-gold bg-gold-soft p-3">
        <p className="text-xs font-bold text-brand">🏆 1番売れた商品（自動判定）</p>
        {top ? (
          <p className="mt-1 text-lg font-bold leading-tight">
            <span aria-hidden>{top.emoji}</span> {top.group}　{top.name}
            <span className="tnum ml-2 text-base">{top.count}点</span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-soft">まだ入力がありません</p>
        )}
        <p className="tnum mt-1 text-xs text-ink-soft">販売合計 {productTotal(report)}点</p>
      </div>

      {PRODUCT_GROUPS.map((g) => (
        <div key={g.id}>
          <h3 className="mb-2 flex items-center gap-1.5 rounded-lg bg-cream-deep px-3 py-2 text-sm font-bold">
            <span aria-hidden>{g.emoji}</span>
            {g.name}
          </h3>
          <div className="space-y-2">
            {g.items.map((it) => {
              const n = report.products[it.id] ?? 0;
              const isTop = top?.id === it.id;
              return (
                <div
                  key={it.id}
                  className={`flex items-center gap-2 rounded-xl px-2 py-1 ${
                    isTop ? "bg-gold-soft" : ""
                  }`}
                >
                  <span className="flex-1 text-sm font-medium leading-tight">
                    {isTop ? <span aria-hidden>🏆 </span> : null}
                    {it.name}
                  </span>
                  <Stepper value={n} onChange={(v) => set(it.id, v)} label={it.name} max={999} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** 手が空いた時に行った作業 */
export function IdleSection({
  report,
  patch,
}: {
  report: Report;
  patch: (fn: (r: Report) => Report) => void;
}) {
  return (
    <div className="space-y-3">
      <CheckGrid
        options={IDLE_TASKS}
        value={report.idleTasks}
        onChange={(v) => patch((r) => ({ ...r, idleTasks: v }))}
      />
      <TextArea
        label="その他に行った作業"
        placeholder="例：冷凍庫の整理、翌日の仕込み分の解凍"
        value={report.idleNote}
        onChange={(v) => patch((r) => ({ ...r, idleNote: v }))}
      />
    </div>
  );
}

/** 口コミ返信件数。店舗ごとに入れて合計は自動 */
export function ReviewSection({
  report,
  patch,
}: {
  report: Report;
  patch: (fn: (r: Report) => Report) => void;
}) {
  return (
    <div className="space-y-1">
      {REVIEW_STORES.map((s) => (
        <NumberField
          key={s}
          label={s}
          unit="件"
          value={report.reviewReplies[s] ?? null}
          onChange={(v) =>
            patch((r) => ({ ...r, reviewReplies: { ...r.reviewReplies, [s]: v } }))
          }
        />
      ))}
      <div className="mt-2 flex items-center justify-between rounded-xl bg-low-bg px-3 py-3">
        <span className="text-sm font-bold text-low">返信合計（自動）</span>
        <span className="tnum text-lg font-bold text-low">{reviewReplyTotal(report)}件</span>
      </div>
    </div>
  );
}
