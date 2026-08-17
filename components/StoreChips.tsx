"use client";

import { STORES } from "@/lib/checklist";
import { itemsForStore, summarize } from "@/lib/score";
import { todayISO, useStore } from "@/lib/store";
import type { StoreName } from "@/lib/types";
import type { Tab } from "@/lib/hooks";

/** 各チップに未完了バッジと「40/70 57%」を出す。どの店が残っているか一目で分かるようにする */
function StoreChip({
  store,
  active,
  onClick,
}: {
  store: StoreName;
  active: boolean;
  onClick: () => void;
}) {
  const { data } = useStore();
  const today = todayISO();
  const insp = data.inspections
    .filter((i) => i.store === store && i.date === today)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  const total = itemsForStore(store).length;
  const s = insp ? summarize(insp) : null;
  const done = s ? s.total - s.unanswered : 0;
  const remaining = s ? s.unanswered : total;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`chip relative min-h-[56px] flex-1 px-2 py-1.5 ${active ? "chip-on" : ""}`}
    >
      <span className="block text-[14px] font-bold leading-tight">{store}</span>
      <span
        className={`tabular block text-[11px] leading-tight ${
          active ? "text-white/80" : "text-[var(--color-sub)]"
        }`}
      >
        {done}/{total}　{Math.round((done / total) * 100)}%
      </span>
      {remaining > 0 && (
        <span
          className="tabular absolute -right-1 -top-1 min-w-[20px] rounded-full px-1 text-[10px] font-bold leading-[18px] text-white"
          style={{ background: "var(--color-ng)" }}
          aria-label={`未入力${remaining}件`}
        >
          {remaining}
        </span>
      )}
    </button>
  );
}

export function StoreChips({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <div role="tablist" aria-label="店舗切替" className="flex gap-2">
      {STORES.map((s) => (
        <StoreChip key={s} store={s} active={tab === s} onClick={() => onChange(s)} />
      ))}
      <button
        type="button"
        role="tab"
        aria-selected={tab === "まとめ"}
        onClick={() => onChange("まとめ")}
        className={`chip min-h-[56px] flex-1 px-2 py-1.5 ${tab === "まとめ" ? "chip-on" : ""}`}
      >
        <span className="block text-[14px] font-bold leading-tight">まとめ</span>
        <span
          className={`block text-[11px] leading-tight ${
            tab === "まとめ" ? "text-white/80" : "text-[var(--color-sub)]"
          }`}
        >
          3店比較
        </span>
      </button>
    </div>
  );
}
