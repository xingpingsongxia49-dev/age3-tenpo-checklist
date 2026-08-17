"use client";

import { Suspense, useMemo, useState } from "react";
import { ItemCard } from "@/components/ItemCard";
import { StoreTabs } from "@/components/StoreTabs";
import { Card, GoldButton, PlainButton } from "@/components/ui";
import { useStoreParam, useTodayInspection } from "@/lib/hooks";
import { answerOf, findPrevious, itemsForStore, summarize } from "@/lib/score";
import { copyText } from "@/lib/export";
import { useStore } from "@/lib/store";
import { EMPTY_ANSWER } from "@/lib/types";

type Mode = "×" | "△" | "両方";

/** その場で店長に見せる用の、指摘だけを抜いたテキスト */
function issueText(
  store: string,
  date: string,
  rows: { weight: string; text: string; j: string; note: string; owner: string; due: string }[],
): string {
  const lines = [`【要改善リスト】${store}／${date}`, ""];
  for (const r of rows) {
    lines.push(`${r.j} [${r.weight}] ${r.text}`);
    if (r.note) lines.push(`　事実：${r.note}`);
    if (r.j === "×") {
      lines.push(`　担当：${r.owner || "未定（要記入）"}／期限：${r.due || "未定（要記入）"}`);
    }
  }
  return lines.join("\n");
}

function Issues() {
  const [store, setStore] = useStoreParam();
  const { data, ready } = useStore();
  const inspection = useTodayInspection(store);
  const [mode, setMode] = useState<Mode>("両方");
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
          {store}の今日のチェックがまだありません。「チェック」タブから始めてください。
        </Card>
      </div>
    );
  }

  const summary = summarize(inspection);
  const weightRank = { S: 0, A: 1, B: 2 } as const;

  const rows = itemsForStore(store)
    .map((item) => ({ item, a: answerOf(inspection, item.id) }))
    .filter(({ a }) => {
      if (mode === "両方") return a.judgement === "×" || a.judgement === "△";
      return a.judgement === mode;
    })
    .sort(
      (x, y) =>
        (x.a.judgement === "×" ? 0 : 1) - (y.a.judgement === "×" ? 0 : 1) ||
        weightRank[x.item.weight] - weightRank[y.item.weight] ||
        x.item.id - y.item.id,
    );

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-white/95 backdrop-blur">
        <div className="flex items-center gap-2 bg-[var(--color-ink)] px-3 py-2 text-white">
          <span className="text-sm font-bold tracking-wide text-[var(--color-gold)]">
            Age.3
          </span>
          <span className="text-sm font-bold">要改善リスト</span>
          <span className="ml-auto text-xs text-white/70">
            {store}／{inspection.date}
          </span>
        </div>
        <div className="flex gap-3 px-3 py-2 text-sm">
          <span className="font-bold text-[var(--color-ng)]">
            ✕ × {summary.batsu}件
          </span>
          <span className="font-bold text-[var(--color-warn)]">
            ！ △ {summary.sankaku}件
          </span>
          {summary.criticalBatsu > 0 && (
            <span className="ml-auto rounded border border-[var(--color-ng)] bg-[var(--color-ng-soft)] px-1.5 font-bold text-[var(--color-ng)]">
              S項目× {summary.criticalBatsu}件・即日是正
            </span>
          )}
        </div>
      </header>

      <div className="px-3 pt-3">
        <StoreTabs store={store} onChange={setStore} />

        <div className="mt-2 flex gap-1">
          {(["両方", "×", "△"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`min-h-[40px] flex-1 rounded-md border text-sm font-bold ${
                mode === m
                  ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-white"
                  : "border-[var(--color-line)] bg-white text-[var(--color-ink-sub)]"
              }`}
            >
              {m === "両方" ? "×と△" : `${m}のみ`}
            </button>
          ))}
        </div>

        {summary.missingDue > 0 && (
          <Card className="mt-2 border-[var(--color-ng)] bg-[var(--color-ng-soft)] p-2">
            <p className="text-xs font-bold text-[var(--color-ng)]">
              ⚠ 期限が未記入の×が{summary.missingDue}件あります。空欄のまま店を出ない。
            </p>
          </Card>
        )}
      </div>

      <div className="mt-3 px-3">
        {rows.length === 0 ? (
          <Card className="p-4 text-sm text-[var(--color-ink-sub)]">
            該当する項目はありません。
          </Card>
        ) : (
          <Card>
            <ul>
              {rows.map(({ item, a }) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  answer={a}
                  inspectionId={inspection.id}
                  prevAnswer={
                    previous ? (previous.answers[item.id] ?? EMPTY_ANSWER) : undefined
                  }
                  prevDate={previous?.date}
                />
              ))}
            </ul>
          </Card>
        )}
      </div>

      {rows.length > 0 && (
        <div className="mt-3 flex gap-2 px-3">
          <GoldButton
            className="flex-1"
            onClick={async () => {
              const ok = await copyText(
                issueText(
                  store,
                  inspection.date,
                  rows.map(({ item, a }) => ({
                    weight: item.weight,
                    text: item.text,
                    j: a.judgement ?? "",
                    note: a.note,
                    owner: a.owner,
                    due: a.due,
                  })),
                ),
              );
              setCopied(ok);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "コピーしました" : "この一覧をコピー"}
          </GoldButton>
          <PlainButton onClick={() => window.print()}>印刷</PlainButton>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm">読み込み中…</div>}>
      <Issues />
    </Suspense>
  );
}
