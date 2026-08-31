"use client";

import { Bar, LevelBadge, Stepper } from "@/components/ui";
import { canTarget, fillRate, levelOf, pct, sweetTarget } from "@/lib/calc";
import { CAN_GROUPS, SWEET_ITEMS } from "@/lib/masters";
import type { Report, Settings } from "@/lib/types";

/** 1品目ぶんの行。目標に対する現在庫を色で示し、その下に現在庫と作成数を並べる */
function StockRow({
  name,
  target,
  stock,
  children,
}: {
  name: string;
  target: number;
  stock: number | null;
  children: React.ReactNode;
}) {
  const rate = fillRate(stock, target);
  const level = levelOf(rate);
  return (
    <div className="border-t border-line py-3 first:border-t-0 first:pt-0">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex-1 text-sm font-bold leading-tight">{name}</span>
        <span className="tnum text-xs text-ink-soft">
          目標 {target}
        </span>
        {stock === null ? (
          <span className="badge badge-info">未入力</span>
        ) : (
          <LevelBadge level={level} text={pct(rate)} />
        )}
      </div>
      {stock !== null ? (
        <div className="mb-2">
          <Bar rate={rate} level={level} />
        </div>
      ) : null}
      {children}
    </div>
  );
}

/** 冷凍在庫（缶商品） */
export function CanStockSection({
  report,
  settings,
  patch,
}: {
  report: Report;
  settings: Settings;
  patch: (fn: (r: Report) => Report) => void;
}) {
  const set = (id: string, key: "stock" | "made", v: number | null) =>
    patch((r) => ({
      ...r,
      cans: { ...r.cans, [id]: { ...r.cans[id], [key]: v } },
    }));

  return (
    <div className="space-y-5">
      {CAN_GROUPS.map((g) => (
        <div key={g.id}>
          <h3 className="mb-2 flex items-center gap-1.5 rounded-lg bg-cream-deep px-3 py-2 text-sm font-bold">
            <span aria-hidden>{g.emoji}</span>
            {g.name}
          </h3>
          {g.items.map((it) => {
            const e = report.cans[it.id] ?? { stock: null, made: null };
            const target = canTarget(it.id, settings);
            return (
              <StockRow key={it.id} name={it.name} target={target} stock={e.stock}>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="mb-1 text-xs font-medium text-ink-soft">現在庫数</p>
                    <Stepper
                      value={e.stock}
                      onChange={(v) => set(it.id, "stock", v)}
                      label={`${it.name}の現在庫数`}
                      compact
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-ink-soft">作成数</p>
                    <Stepper
                      value={e.made}
                      onChange={(v) => set(it.id, "made", v)}
                      label={`${it.name}の作成数`}
                      compact
                    />
                  </div>
                </div>
              </StockRow>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** スイーツ在庫（フルーツサンド・冷凍サンド） */
export function SweetStockSection({
  report,
  settings,
  patch,
}: {
  report: Report;
  settings: Settings;
  patch: (fn: (r: Report) => Report) => void;
}) {
  const set = (id: string, key: "stock" | "madePieces" | "madeBlocks", v: number | null) =>
    patch((r) => ({
      ...r,
      sweets: { ...r.sweets, [id]: { ...r.sweets[id], [key]: v } },
    }));

  return (
    <div>
      {SWEET_ITEMS.map((it) => {
        const e = report.sweets[it.id] ?? { stock: null, madePieces: null, madeBlocks: null };
        const target = sweetTarget(it.id, settings);
        return (
          <StockRow key={it.id} name={it.name} target={target} stock={e.stock}>
            <div className="mb-2 flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs font-medium text-ink-soft">現在庫数</span>
              <Stepper
                value={e.stock}
                onChange={(v) => set(it.id, "stock", v)}
                label={`${it.name}の現在庫数`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-xs font-medium text-ink-soft">作成個数</p>
                <Stepper
                  value={e.madePieces}
                  onChange={(v) => set(it.id, "madePieces", v)}
                  label={`${it.name}の作成個数`}
                  compact
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-ink-soft">作成角数</p>
                <Stepper
                  value={e.madeBlocks}
                  onChange={(v) => set(it.id, "madeBlocks", v)}
                  label={`${it.name}の作成角数`}
                  compact
                />
              </div>
            </div>
          </StockRow>
        );
      })}
    </div>
  );
}
