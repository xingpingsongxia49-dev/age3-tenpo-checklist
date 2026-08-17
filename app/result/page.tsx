"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { StoreTabs } from "@/components/StoreTabs";
import {
  Card,
  GoldButton,
  PlainButton,
  ScoreBar,
  VERDICT_ICON,
  VERDICT_STYLE,
} from "@/components/ui";
import { useStoreParam, useTodayInspection } from "@/lib/hooks";
import {
  compareJudgement,
  findPrevious,
  isFixed,
  itemsForStore,
  pct,
  summarize,
  VERDICT_LABEL,
  answerOf,
} from "@/lib/score";
import { download, inspectionCsv, reportText, copyText } from "@/lib/export";
import { useStore } from "@/lib/store";

function Stat({
  label,
  value,
  alert,
}: {
  label: string;
  value: string | number;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-2 ${
        alert
          ? "border-[var(--color-ng)] bg-[var(--color-ng-soft)]"
          : "border-[var(--color-line)] bg-white"
      }`}
    >
      <p className="text-[11px] leading-tight text-[var(--color-ink-sub)]">{label}</p>
      <p
        className={`tabular text-xl font-bold ${alert ? "text-[var(--color-ng)]" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function Result() {
  const [store, setStore] = useStoreParam();
  const { data, ready, updateInspection } = useStore();
  const inspection = useTodayInspection(store);
  const [copied, setCopied] = useState(false);

  const previous = useMemo(
    () => (inspection ? findPrevious(data.inspections, inspection) : undefined),
    [data.inspections, inspection],
  );

  if (!ready) return <div className="p-4 text-sm">読み込み中…</div>;

  if (!inspection) {
    return (
      <div className="px-3 pt-3">
        <StoreTabs store={store} onChange={setStore} />
        <Card className="mt-3 p-4 text-sm text-[var(--color-ink-sub)]">
          {store}の今日のチェックがまだありません。
        </Card>
      </div>
    );
  }

  const s = summarize(inspection);
  const prevS = previous ? summarize(previous) : null;
  const diff =
    prevS?.weightedRate != null && s.weightedRate != null
      ? s.weightedRate - prevS.weightedRate
      : null;

  const fixedCount = previous
    ? itemsForStore(store).filter((item) =>
        isFixed(
          previous.answers[item.id]?.judgement ?? null,
          answerOf(inspection, item.id).judgement,
        ),
      ).length
    : 0;

  const worsenedCount = previous
    ? itemsForStore(store).filter(
        (item) =>
          compareJudgement(
            previous.answers[item.id]?.judgement ?? null,
            answerOf(inspection, item.id).judgement,
          ) === "worsened",
      ).length
    : 0;

  return (
    <div className="px-3 pt-3">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded bg-[var(--color-ink)] px-2 py-1 text-sm font-bold tracking-wide text-[var(--color-gold)]">
          Age.3
        </span>
        <h1 className="text-base font-bold">結果</h1>
        <span className="tabular ml-auto text-xs text-[var(--color-ink-sub)]">
          {inspection.date}
        </span>
      </div>

      <StoreTabs store={store} onChange={setStore} />

      <Card className="mt-3 p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{store}／総合スコア（加重）</span>
          <span
            className={`ml-auto rounded-full border px-2 py-0.5 text-xs font-bold ${VERDICT_STYLE[s.verdict]}`}
          >
            {VERDICT_ICON[s.verdict]} {VERDICT_LABEL[s.verdict]}
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="tabular text-4xl font-bold">{pct(s.weightedRate)}</span>
          {diff !== null && (
            <span
              className={`text-sm font-bold ${
                diff > 0
                  ? "text-[var(--color-ok)]"
                  : diff < 0
                    ? "text-[var(--color-ng)]"
                    : "text-[var(--color-ink-sub)]"
              }`}
            >
              {diff > 0 ? "↑" : diff < 0 ? "↓" : "→"} 前回比 {pct(Math.abs(diff), 1)}
            </span>
          )}
        </div>
        <div className="mt-2">
          <ScoreBar rate={s.weightedRate} />
        </div>
        <p className="mt-1 text-[11px] text-[var(--color-ink-sub)]">
          単純○率（参考）{pct(s.simpleRate, 1)}／未入力 {s.unanswered}件
          {s.unanswered > 0 && "（未入力は集計から除外されています）"}
        </p>
      </Card>

      {s.criticalBatsu > 0 && (
        <Card className="mt-2 border-[var(--color-ng)] bg-[var(--color-ng-soft)] p-3">
          <p className="text-sm font-bold text-[var(--color-ng)]">
            ✕ S項目の×が{s.criticalBatsu}件。総合何%でも赤。
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-ink-sub)]">
            食品衛生・行政/近隣リスク。他を中断して、その場で是正する。営業を止める判断も含めて検討する。
          </p>
        </Card>
      )}

      <div className="mt-2 grid grid-cols-3 gap-2">
        <Stat label="S項目の×" value={s.criticalBatsu} alert={s.criticalBatsu > 0} />
        <Stat label="是正未完了" value={s.openCorrections} alert={s.openCorrections > 0} />
        <Stat label="期限未記入の×" value={s.missingDue} alert={s.missingDue > 0} />
      </div>

      {previous && (
        <Card className="mt-2 p-3">
          <p className="text-sm font-bold">前回（{previous.date}）との比較</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Stat label="前回スコア" value={pct(prevS?.weightedRate ?? null)} />
            <Stat label="是正済み" value={`${fixedCount}件`} />
            <Stat label="悪化" value={`${worsenedCount}件`} alert={worsenedCount > 0} />
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-ink-sub)]">
            「是正済み」＝前回×で今回○か△になった項目。各項目の変化は
            <Link
              href={`/check?store=${encodeURIComponent(store)}`}
              className="font-bold text-[var(--color-gold-dark)] underline"
            >
              チェック画面
            </Link>
            で確認できます。
          </p>
        </Card>
      )}

      <h2 className="mb-2 mt-4 text-sm font-bold text-[var(--color-ink-sub)]">
        カテゴリ別 加重達成率
      </h2>
      <Card className="p-3">
        <ul className="space-y-2.5">
          {s.categories.map((c) => (
            <li key={c.category}>
              <div className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-[13px]">
                  {c.category}
                </span>
                <span className="shrink-0 text-[11px] text-[var(--color-ink-sub)]">
                  ○{c.maru} △{c.sankaku} ×{c.batsu}
                </span>
                <span className="tabular w-10 shrink-0 text-right text-sm font-bold">
                  {pct(c.rate)}
                </span>
              </div>
              <div className="mt-1">
                <ScoreBar rate={c.rate} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-4 space-y-2">
        <GoldButton
          className="w-full"
          onClick={async () => {
            const ok = await copyText(reportText(inspection));
            setCopied(ok);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "コピーしました" : "結果をコピー（LINEに貼れる形式）"}
        </GoldButton>

        <div className="grid grid-cols-2 gap-2">
          <PlainButton
            onClick={() =>
              download(
                `Age3_${store}_${inspection.date}.csv`,
                inspectionCsv(inspection),
                "text/csv",
              )
            }
          >
            CSV書き出し
          </PlainButton>
          <PlainButton
            onClick={() =>
              updateInspection(inspection.id, {
                completedAt: inspection.completedAt
                  ? null
                  : new Date().toISOString(),
              })
            }
          >
            {inspection.completedAt ? "締めを取り消す" : "この視察を締める"}
          </PlainButton>
        </div>
      </div>

      {s.unanswered > 0 && (
        <p className="mt-3 text-xs font-bold text-[var(--color-warn)]">
          ！ 未入力が{s.unanswered}件あります。全部埋めないとスコアは実態を表しません。
        </p>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm">読み込み中…</div>}>
      <Result />
    </Suspense>
  );
}
