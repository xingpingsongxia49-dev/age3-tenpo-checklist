"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { StickyProgress } from "@/components/AppHeader";
import { ItemCard } from "@/components/ItemCard";
import { StoreTabs } from "@/components/StoreTabs";
import { Card, JUDGEMENT_ICON, JUDGEMENT_STYLE } from "@/components/ui";
import { CATEGORIES } from "@/lib/checklist";
import { useEnsureTodayInspection, useStoreParam } from "@/lib/hooks";
import {
  answerOf,
  findPrevious,
  itemsForStore,
  pct,
  summarize,
} from "@/lib/score";
import { useStore } from "@/lib/store";
import { EMPTY_ANSWER } from "@/lib/types";

type Filter = "all" | "todo" | "issue";

function Check() {
  const [store, setStore] = useStoreParam();
  const { data, ready, updateInspection } = useStore();
  const inspection = useEnsureTodayInspection(store);
  const [openCat, setOpenCat] = useState<string | null>(CATEGORIES[0]);
  const [filter, setFilter] = useState<Filter>("all");

  const previous = useMemo(
    () => (inspection ? findPrevious(data.inspections, inspection) : undefined),
    [data.inspections, inspection],
  );

  if (!ready || !inspection) {
    return <div className="p-4 text-sm">読み込み中…</div>;
  }

  const summary = summarize(inspection);
  const items = itemsForStore(store);

  const visible = items.filter((item) => {
    const a = answerOf(inspection, item.id);
    if (filter === "todo") return a.judgement === null;
    if (filter === "issue") return a.judgement === "×" || a.judgement === "△";
    return true;
  });

  return (
    <div>
      <StickyProgress
        title={`${store}`}
        subtitle={`${inspection.date}／${inspection.inspector || "視察者未設定"}`}
        summary={summary}
      >
        <div className="mt-2 flex gap-1">
          {(
            [
              ["all", `全${items.length}`],
              ["todo", `未入力${summary.unanswered}`],
              ["issue", `要改善${summary.sankaku + summary.batsu}`],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`min-h-[36px] flex-1 rounded-md border text-xs font-bold ${
                filter === key
                  ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-white"
                  : "border-[var(--color-line)] bg-white text-[var(--color-ink-sub)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </StickyProgress>

      <div className="px-3 pt-3">
        <StoreTabs store={store} onChange={setStore} />

        <div className="mt-2 flex gap-2">
          <input
            value={inspection.inspector}
            onChange={(e) =>
              updateInspection(inspection.id, { inspector: e.target.value })
            }
            placeholder="視察者"
            aria-label="視察者"
            className="min-h-[40px] w-28 rounded-md border border-[var(--color-line)] px-2 text-sm"
          />
          <input
            type="date"
            value={inspection.date}
            onChange={(e) =>
              updateInspection(inspection.id, { date: e.target.value })
            }
            aria-label="視察日"
            className="min-h-[40px] flex-1 rounded-md border border-[var(--color-line)] px-2 text-sm"
          />
        </div>

        {previous && (
          <p className="mt-2 text-[11px] text-[var(--color-ink-sub)]">
            前回：{previous.date}（{pct(summarize(previous).weightedRate)}）と比較表示中
          </p>
        )}
      </div>

      <div className="mt-2 space-y-2 px-3">
        {CATEGORIES.map((cat) => {
          const catItems = visible.filter((i) => i.category === cat);
          const allCatItems = items.filter((i) => i.category === cat);
          if (allCatItems.length === 0) return null;

          const cs = summary.categories.find((c) => c.category === cat);
          const answered = allCatItems.filter(
            (i) => answerOf(inspection, i.id).judgement !== null,
          ).length;
          const isOpen = openCat === cat;
          const hidden = catItems.length === 0 && filter !== "all";

          return (
            <Card key={cat} className={hidden ? "opacity-50" : ""}>
              <button
                type="button"
                onClick={() => setOpenCat(isOpen ? null : cat)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2 px-3 py-3 text-left"
              >
                <span className="min-w-0 flex-1 text-[15px] font-bold leading-snug">
                  {cat}
                </span>
                <span className="tabular shrink-0 text-xs text-[var(--color-ink-sub)]">
                  {answered}/{allCatItems.length}
                </span>
                {cs && cs.batsu > 0 && (
                  <span className={`shrink-0 rounded border px-1 text-[11px] font-bold ${JUDGEMENT_STYLE["×"].chip}`}>
                    {JUDGEMENT_ICON["×"]} {cs.batsu}
                  </span>
                )}
                {cs && cs.sankaku > 0 && (
                  <span className={`shrink-0 rounded border px-1 text-[11px] font-bold ${JUDGEMENT_STYLE["△"].chip}`}>
                    {JUDGEMENT_ICON["△"]} {cs.sankaku}
                  </span>
                )}
                <span className="tabular w-10 shrink-0 text-right text-xs font-bold">
                  {pct(cs?.rate ?? null)}
                </span>
                <span aria-hidden className="shrink-0 text-[var(--color-ink-sub)]">
                  {isOpen ? "▲" : "▼"}
                </span>
              </button>

              {isOpen && (
                <ul className="border-t border-[var(--color-line)]">
                  {catItems.length === 0 ? (
                    <li className="px-3 py-3 text-xs text-[var(--color-ink-sub)]">
                      このカテゴリに該当する項目はありません（絞り込み中）
                    </li>
                  ) : (
                    catItems.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        answer={answerOf(inspection, item.id)}
                        inspectionId={inspection.id}
                        prevAnswer={
                          previous
                            ? (previous.answers[item.id] ?? EMPTY_ANSWER)
                            : undefined
                        }
                        prevDate={previous?.date}
                      />
                    ))
                  )}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <div className="mt-4 px-3">
        <Link href={`/result?store=${encodeURIComponent(store)}`}>
          <div className="min-h-[48px] rounded-lg bg-[var(--color-gold)] px-4 py-3 text-center text-base font-bold text-white">
            結果を見る・コピーする
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm">読み込み中…</div>}>
      <Check />
    </Suspense>
  );
}
