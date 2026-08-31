"use client";

import { Bar, LevelBadge, Stepper } from "@/components/ui";
import { canTarget, fillRate, levelOf, pct, sweetTarget } from "@/lib/calc";
import { CAN_GROUPS, SWEET_ITEMS, SWEET_VARIANTS, sweetKey } from "@/lib/masters";
import type { Report, Settings, SweetEntry } from "@/lib/types";

/** グループの見出し。紙の色帯をそのまま持ってくる */
function GroupHead({ emoji, name, color }: { emoji: string; name: string; color: string }) {
  return (
    <h3
      className="mb-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold"
      style={{ background: color }}
    >
      <span aria-hidden>{emoji}</span>
      {name}
    </h3>
  );
}

/** 目標に対する現在庫を色と棒で示す帯 */
function FillHead({
  name,
  targetLabel,
  target,
  stock,
}: {
  name: string;
  targetLabel: string;
  target: number;
  stock: number | null;
}) {
  const rate = fillRate(stock, target);
  const level = levelOf(rate);
  return (
    <>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex-1 text-sm font-bold leading-tight">{name}</span>
        {targetLabel ? <span className="tnum text-xs text-ink-soft">目標 {targetLabel}</span> : null}
        {stock === null ? (
          <span className="badge badge-info">未入力</span>
        ) : target > 0 ? (
          <LevelBadge level={level} text={pct(rate)} />
        ) : null}
      </div>
      {stock !== null && target > 0 ? (
        <div className="mb-2">
          <Bar rate={rate} level={level} />
        </div>
      ) : null}
    </>
  );
}

/**
 * 冷凍在庫（缶）の在庫チェック。数えるのはここだけ。
 * その日の製造数は日報側（CanMadeSection）で入れる。
 */
export function CanStockSection({
  report,
  settings,
  patch,
}: {
  report: Report;
  settings: Settings;
  patch: (fn: (r: Report) => Report) => void;
}) {
  const set = (id: string, key: "stock", v: number | null) =>
    patch((r) => ({
      ...r,
      cans: { ...r.cans, [id]: { ...r.cans[id], [key]: v } },
    }));

  return (
    <div className="space-y-5">
      {CAN_GROUPS.map((g) => (
        <div key={g.id}>
          <GroupHead emoji={g.emoji} name={g.name} color={g.color} />
          {g.items.map((it) => {
            const e = report.cans[it.id] ?? { stock: null, made: null };
            return (
              <div key={it.id} className="border-t border-line py-3 first:border-t-0 first:pt-0">
                <FillHead
                  name={it.name}
                  targetLabel={it.targetLabel}
                  target={canTarget(it.id, settings)}
                  stock={e.stock}
                />
                <div className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs font-medium text-ink-soft">現在庫数</span>
                  <Stepper
                    value={e.stock}
                    onChange={(v) => set(it.id, "stock", v)}
                    label={`${it.name}の現在庫数`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * 在庫表（フルーツサンド・冷凍サンド）。
 *
 * 紙と同じく1商品に最大4系統（プレーン／豆乳／抹茶／チョコ）ある。
 * 無い系統は紙でグレーに潰してあるので、こちらでも欄自体を出さない。
 * ほとんどの商品はプレーンだけなので、見た目はそれほど長くならない。
 */
export function SweetStockSection({
  report,
  settings,
  patch,
}: {
  report: Report;
  settings: Settings;
  patch: (fn: (r: Report) => Report) => void;
}) {
  const set = (key: string, field: keyof SweetEntry, v: number | null) =>
    patch((r) => ({
      ...r,
      sweets: { ...r.sweets, [key]: { ...r.sweets[key], [field]: v } },
    }));

  return (
    <div className="space-y-4">
      {SWEET_ITEMS.map((it) => {
        const variants = SWEET_VARIANTS.filter((v) => it.targets[v.id] !== undefined);
        return (
          <div key={it.id} className="rounded-xl border border-line p-3">
            <p className="mb-2 text-sm font-bold leading-tight">{it.name}</p>
            {variants.map((v) => {
              const key = sweetKey(it.id, v.id);
              const e = report.sweets[key] ?? { stock: null, madePieces: null, madeBlocks: null };
              const target = sweetTarget(key, settings);
              return (
                <div key={v.id} className="mt-2 rounded-lg p-2" style={{ background: v.color === "#ffffff" ? "var(--color-cream)" : v.color }}>
                  <FillHead
                    name={v.name}
                    targetLabel={`${target}`}
                    target={target}
                    stock={e.stock}
                  />
                  <div className="mb-2 flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs font-medium text-ink-soft">現在庫数</span>
                    <Stepper
                      value={e.stock}
                      onChange={(n) => set(key, "stock", n)}
                      label={`${it.name}${v.name}の現在庫数`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="mb-1 text-xs font-medium text-ink-soft">作成個数</p>
                      <Stepper
                        value={e.madePieces}
                        onChange={(n) => set(key, "madePieces", n)}
                        label={`${it.name}${v.name}の作成個数`}
                        compact
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-ink-soft">作成角数</p>
                      <Stepper
                        value={e.madeBlocks}
                        onChange={(n) => set(key, "madeBlocks", n)}
                        label={`${it.name}${v.name}の作成角数`}
                        compact
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}


/**
 * 缶商品の当日製造数。日報で報告する項目。
 *
 * 在庫チェック（何個あるか）とは別の話で、日報では「今日どれだけ作ったか」だけを見る。
 * 数える作業と作った数の報告を分けたいので、画面も分けてある。
 */
export function CanMadeSection({
  report,
  patch,
}: {
  report: Report;
  patch: (fn: (r: Report) => Report) => void;
}) {
  const set = (id: string, v: number | null) =>
    patch((r) => ({
      ...r,
      cans: { ...r.cans, [id]: { ...r.cans[id], made: v } },
    }));

  const total = CAN_GROUPS.flatMap((g) => g.items).reduce(
    (s, it) => s + (report.cans[it.id]?.made ?? 0),
    0,
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-2xl bg-gold-soft px-3 py-3">
        <span className="text-sm font-bold">本日の製造数 合計</span>
        <span className="tnum text-lg font-bold">{total}個</span>
      </div>

      {CAN_GROUPS.map((g) => (
        <div key={g.id}>
          <GroupHead emoji={g.emoji} name={g.name} color={g.color} />
          {g.items.map((it) => {
            const made = report.cans[it.id]?.made ?? null;
            return (
              <div
                key={it.id}
                className="flex items-center gap-2 border-t border-line py-2 first:border-t-0"
              >
                <span className="flex-1 text-sm font-medium leading-tight">{it.name}</span>
                <Stepper
                  value={made}
                  onChange={(v) => set(it.id, v)}
                  label={`${it.name}の製造数`}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
