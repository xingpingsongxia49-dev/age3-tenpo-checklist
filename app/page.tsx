"use client";

import Link from "next/link";
import { Suspense } from "react";
import { STORES } from "@/lib/checklist";
import { useStoreParam, useTodayInspection } from "@/lib/hooks";
import { todayISO, useStore } from "@/lib/store";
import {
  collectCorrections,
  itemsForStore,
  pct,
  summarize,
  VERDICT_LABEL,
} from "@/lib/score";
import { Guide } from "@/components/Guide";
import { StoreTabs } from "@/components/StoreTabs";
import {
  Card,
  GoldButton,
  ProgressBar,
  ScoreBar,
  VERDICT_ICON,
  VERDICT_STYLE,
} from "@/components/ui";
import type { StoreName } from "@/lib/types";

function StoreLine({ store }: { store: StoreName }) {
  const insp = useTodayInspection(store);
  const total = itemsForStore(store).length;
  const s = insp ? summarize(insp) : null;
  const done = s ? s.total - s.unanswered : 0;

  return (
    <Link
      href={`/check?store=${encodeURIComponent(store)}`}
      className="flex items-center gap-3 border-b border-[var(--color-line)] px-3 py-3 last:border-b-0 active:bg-[var(--color-gold-soft)]"
    >
      <span className="w-12 text-base font-bold">{store}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="tabular text-sm font-bold">
            {done}/{total}
          </span>
          {s && s.criticalBatsu > 0 && (
            <span className="rounded border border-[var(--color-ng)] bg-[var(--color-ng-soft)] px-1 text-[11px] font-bold text-[var(--color-ng)]">
              S項目× {s.criticalBatsu}
            </span>
          )}
          <span className="tabular ml-auto text-sm font-bold">
            {s ? pct(s.weightedRate) : "未着手"}
          </span>
        </div>
        <div className="mt-1">
          <ProgressBar value={s ? s.progress : 0} />
        </div>
      </div>
      <span aria-hidden className="text-[var(--color-ink-sub)]">
        ›
      </span>
    </Link>
  );
}

function Home() {
  const [store, setStore] = useStoreParam();
  const { data, ready } = useStore();
  const today = todayISO();
  const insp = useTodayInspection(store);
  const s = insp ? summarize(insp) : null;

  const openCorrections = collectCorrections(data.inspections, today).filter(
    (c) => c.status !== "完了",
  );

  return (
    <div className="px-3 pt-3">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded bg-[var(--color-ink)] px-2 py-1 text-sm font-bold tracking-wide text-[var(--color-gold)]">
          Age.3
        </span>
        <h1 className="text-base font-bold">店舗チェック</h1>
        <span className="tabular ml-auto text-xs text-[var(--color-ink-sub)]">
          {today}
        </span>
      </div>

      <StoreTabs store={store} onChange={setStore} />

      <div className="mt-3">
        <Link href={`/check?store=${encodeURIComponent(store)}`}>
          <GoldButton className="w-full">
            {insp
              ? `${store}のチェックを続ける`
              : `${store}のチェックを始める`}
          </GoldButton>
        </Link>
      </div>

      {s && (
        <Card className="mt-3 p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{store}／今日の状況</span>
            <span
              className={`ml-auto rounded-full border px-2 py-0.5 text-xs font-bold ${VERDICT_STYLE[s.verdict]}`}
            >
              {VERDICT_ICON[s.verdict]} {VERDICT_LABEL[s.verdict]}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="tabular text-3xl font-bold">
              {pct(s.weightedRate)}
            </span>
            <span className="text-xs text-[var(--color-ink-sub)]">
              加重達成率（S=5／A=3／B=1）
            </span>
          </div>
          <div className="mt-2">
            <ScoreBar rate={s.weightedRate} />
          </div>
          <div className="mt-2 flex gap-3 text-xs">
            <Link
              href={`/issues?store=${encodeURIComponent(store)}`}
              className="font-bold text-[var(--color-ng)] underline"
            >
              要改善 {s.batsu + s.sankaku}件を見る
            </Link>
            <Link
              href={`/result?store=${encodeURIComponent(store)}`}
              className="font-bold text-[var(--color-gold-dark)] underline"
            >
              結果・コピー
            </Link>
          </div>
        </Card>
      )}

      <h2 className="mb-2 mt-4 text-sm font-bold text-[var(--color-ink-sub)]">
        今日の3店舗
      </h2>
      <Card>
        {STORES.map((st) => (
          <StoreLine key={st} store={st} />
        ))}
      </Card>

      {ready && openCorrections.length > 0 && (
        <Link href="/records" className="mt-3 block">
          <Card className="border-[var(--color-ng)] bg-[var(--color-ng-soft)] p-3">
            <p className="text-sm font-bold text-[var(--color-ng)]">
              ✕ 是正未完了 {openCorrections.length}件（全店）
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-ink-sub)]">
              ここが埋まらない限り、視察は「見ただけ」で終わる。台帳を見る ›
            </p>
          </Card>
        </Link>
      )}

      <Guide />

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--color-ink-sub)]">
        データはこの端末のブラウザ内にだけ保存されます。視察が終わったら
        「記録 → データ」からJSONを書き出してください。
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm">読み込み中…</div>}>
      <Home />
    </Suspense>
  );
}
