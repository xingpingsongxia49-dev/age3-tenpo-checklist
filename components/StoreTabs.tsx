"use client";

import { STORES } from "@/lib/checklist";
import type { StoreName } from "@/lib/types";

/** 銀座→原宿→浅草を1日で回るので、店舗切替は常に1タップで届く位置に置く */
export function StoreTabs({
  store,
  onChange,
}: {
  store: StoreName;
  onChange: (s: StoreName) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="店舗切替"
      className="grid grid-cols-3 gap-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-gold-soft)] p-1"
    >
      {STORES.map((s) => {
        const active = s === store;
        return (
          <button
            key={s}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(s)}
            className={`min-h-[44px] rounded-md text-base font-bold transition-colors ${
              active
                ? "bg-[var(--color-gold)] text-white shadow-sm"
                : "bg-white text-[var(--color-ink)]"
            }`}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}
