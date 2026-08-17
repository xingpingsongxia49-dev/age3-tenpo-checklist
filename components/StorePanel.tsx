"use client";

import { useMemo, useState } from "react";
import { CategoryPhotos } from "./CategoryPhotos";
import { ItemRow } from "./ItemRow";
import { Bar, Card, JUDGEMENT_COLOR, JUDGEMENT_ICON, Notice, WarningBand } from "./ui";
import { CATEGORIES } from "@/lib/checklist";
import { useEnsureTodayInspection } from "@/lib/hooks";
import {
  answerOf,
  batsuStreak,
  compareJudgement,
  findPrevious,
  isFixed,
  itemsForStore,
  pct,
  summarize,
  unconfirmedPreviousBatsu,
  VERDICT_LABEL,
} from "@/lib/score";
import { copyText, reportText } from "@/lib/export";
import { shareReportImage } from "@/lib/image";
import { StoreReport } from "./PrintReport";
import { usePrint } from "@/lib/usePrint";
import { PrintPortal } from "./PrintPortal";
import { todayISO, useStore } from "@/lib/store";
import { EMPTY_ANSWER, type StoreName } from "@/lib/types";

type Filter = "all" | "todo" | "issue" | "prevNg" | "streak";

export function StorePanel({ store }: { store: StoreName }) {
  const { data, ready, updateInspection, updateAnswer, resetInspection } = useStore();
  const inspection = useEnsureTodayInspection(store);
  const [filter, setFilter] = useState<Filter>("all");
  const [flash, setFlash] = useState("");
  const [withPhotos, setWithPhotos] = useState(true);
  const { printing, print } = usePrint();

  const previous = useMemo(
    () => (inspection ? findPrevious(data.inspections, inspection) : undefined),
    [data.inspections, inspection],
  );

  if (!ready || !inspection) {
    return (
      <Card>
        <p className="text-[14px] text-[var(--color-sub)]">読み込み中…</p>
      </Card>
    );
  }

  const s = summarize(inspection);
  const items = itemsForStore(store);
  const photoCount = items.reduce(
    (n, i) => n + answerOf(inspection, i.id).photos.length,
    0,
  );
  const answeredCount = s.total - s.unanswered;

  const say = (m: string) => {
    setFlash(m);
    setTimeout(() => setFlash(""), 2400);
  };

  // 同じ項目が何回連続で×か。2回以上なら基準そのものを疑う
  const streaks = new Map(
    items.map((i) => [i.id, batsuStreak(data.inspections, inspection, i.id)] as const),
  );
  const repeated = items.filter((i) => (streaks.get(i.id) ?? 0) >= 2);

  // 前回×だったのに今回まだ見ていない項目
  const unconfirmed = unconfirmedPreviousBatsu(data.inspections, inspection);
  const unconfirmedIds = new Set(unconfirmed.map((i) => i.id));

  const visible = items.filter((item) => {
    const j = answerOf(inspection, item.id).judgement;
    if (filter === "todo") return j === null;
    if (filter === "issue") return j === "×" || j === "△";
    if (filter === "prevNg") return unconfirmedIds.has(item.id);
    if (filter === "streak") return (streaks.get(item.id) ?? 0) >= 2;
    return true;
  });

  // 上部の警告バンド。手を打たないと帰れないものだけを出す
  const warnings: { text: string; strong?: boolean }[] = [];
  if (s.criticalBatsu > 0) {
    warnings.push({
      text: `S項目（食品衛生・行政/近隣リスク）の×が${s.criticalBatsu}件あります。総合何%でも赤。他を中断してその場で是正する。`,
      strong: true,
    });
  }
  if (s.missingDue > 0) {
    warnings.push({ text: `担当または期限が未記入の×が${s.missingDue}件あります。空欄のまま店を出ない。` });
  }
  if (unconfirmed.length > 0) {
    warnings.push({
      text: `前回×だった項目のうち${unconfirmed.length}件がまだ未入力です。是正できたかを必ず確認する。`,
      strong: true,
    });
  }
  if (repeated.length > 0) {
    warnings.push({
      text: `2回以上続けて×の項目が${repeated.length}件あります。現場を叱っても直りません。基準が決まっているかを本部・店長側で確認する。`,
    });
  }
  if (s.batsu + s.sankaku > 0) {
    warnings.push({ text: `要改善は×${s.batsu}件・△${s.sankaku}件です。` });
  }

  const prevSummary = previous ? summarize(previous) : null;
  const fixedCount = previous
    ? items.filter((i) =>
        isFixed(previous.answers[i.id]?.judgement ?? null, answerOf(inspection, i.id).judgement),
      ).length
    : 0;
  const worsenedCount = previous
    ? items.filter(
        (i) =>
          compareJudgement(
            previous.answers[i.id]?.judgement ?? null,
            answerOf(inspection, i.id).judgement,
          ) === "worsened",
      ).length
    : 0;

  const verdictInk =
    s.verdict === "green"
      ? "var(--color-ok)"
      : s.verdict === "yellow"
        ? "var(--color-mid)"
        : s.verdict === "red"
          ? "var(--color-ng)"
          : "var(--color-sub)";

  const verdictBg =
    s.verdict === "green"
      ? "var(--color-ok-bg)"
      : s.verdict === "yellow"
        ? "var(--color-mid-bg)"
        : s.verdict === "red"
          ? "var(--color-ng-bg)"
          : "var(--color-na-bg)";

  return (
    <Card>
      {/* 視察日・視察者 */}
      <div className="mb-3 flex gap-2">
        <input
          value={inspection.inspector}
          onChange={(e) => updateInspection(inspection.id, { inspector: e.target.value })}
          placeholder="視察者"
          aria-label="視察者"
          className="chip min-h-[40px] w-28 px-3 text-[14px]"
        />
        <input
          type="date"
          value={inspection.date}
          onChange={(e) => updateInspection(inspection.id, { date: e.target.value })}
          aria-label="視察日"
          className="chip min-h-[40px] flex-1 px-3 text-[14px]"
        />
      </div>

      {/* 進捗バー */}
      <div className="mb-1 flex items-baseline gap-2">
        <span className="tabular text-[22px] font-bold">
          {answeredCount}
          <span className="text-[14px] text-[var(--color-sub)]">/{s.total}</span>
        </span>
        <span className="text-[12px] text-[var(--color-sub)]">項目 入力済み</span>
        <span className="ml-auto text-[12px] text-[var(--color-sub)]">加重達成率</span>
        <span className="tabular text-[22px] font-bold">{pct(s.weightedRate)}</span>
      </div>
      <Bar value={s.progress} />
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-bold">
        <span style={{ color: JUDGEMENT_COLOR["○"].ink }}>✓ ○ {s.maru}</span>
        <span style={{ color: JUDGEMENT_COLOR["△"].ink }}>！ △ {s.sankaku}</span>
        <span style={{ color: JUDGEMENT_COLOR["×"].ink }}>✕ × {s.batsu}</span>
        <span style={{ color: JUDGEMENT_COLOR["対象外"].ink }}>— 対象外 {s.excluded}</span>
        <span
          className="ml-auto rounded-full px-2 py-[1px] text-[11px]"
          style={{ background: verdictBg, color: verdictInk }}
        >
          判定：{VERDICT_LABEL[s.verdict]}
        </span>
      </div>

      {previous && (
        <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-sub)]">
          前回 {previous.date}（{pct(prevSummary?.weightedRate ?? null)}）と比較中
          <br />
          <span className="font-bold" style={{ color: "var(--color-ok)" }}>
            是正済み {fixedCount}件
          </span>
          <span className="mx-1">／</span>
          <span className="font-bold" style={{ color: "var(--color-ng)" }}>
            悪化 {worsenedCount}件
          </span>
        </p>
      )}

      {warnings.length > 0 && (
        <div className="mt-3">
          <WarningBand lines={warnings} />
        </div>
      )}

      <div className="mt-3">
        <Notice>
          ○=基準を満たす／△=やってはいるが不十分・人による差がある／×=できていない、または基準そのものが無い／対象外=集計から除外。
          重みは S=5・A=3・B=1。×をつけたら、その場で担当と期限を必ず埋める。
          S項目に×が1件でもあれば、総合何%でも赤。
        </Notice>
      </div>

      {/* 絞り込み */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(
          [
            ["all", `すべて ${items.length}`],
            ["todo", `未入力 ${s.unanswered}`],
            ["issue", `要改善 ${s.batsu + s.sankaku}`],
            ...(unconfirmed.length > 0
              ? ([["prevNg", `前回×が未入力 ${unconfirmed.length}`]] as [Filter, string][])
              : []),
            ...(repeated.length > 0
              ? ([["streak", `連続× ${repeated.length}`]] as [Filter, string][])
              : []),
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`chip min-h-[38px] flex-1 whitespace-nowrap px-2 text-[12px] font-bold ${
              filter === key ? "chip-on" : ""
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* カテゴリ見出しごとの項目リスト */}
      <div className="mt-4">
        {CATEGORIES.map((cat) => {
          const catAll = items.filter((i) => i.category === cat);
          if (catAll.length === 0) return null;
          const catVisible = visible.filter((i) => i.category === cat);
          if (catVisible.length === 0) return null;

          const cs = s.categories.find((c) => c.category === cat);
          const done = catAll.filter((i) => answerOf(inspection, i.id).judgement !== null).length;

          return (
            <section key={cat} className="mt-4 first:mt-0">
              <div className="flex items-baseline gap-2 border-b-2 border-[var(--color-brown)] pb-1.5">
                <h3 className="min-w-0 flex-1 text-[15px] font-bold leading-snug">{cat}</h3>
                <span className="tabular shrink-0 text-[12px] text-[var(--color-sub)]">
                  {done}/{catAll.length}
                </span>
                {cs && cs.batsu > 0 && (
                  <span
                    className="shrink-0 rounded-full px-1.5 text-[11px] font-bold"
                    style={{
                      background: JUDGEMENT_COLOR["×"].bg,
                      color: JUDGEMENT_COLOR["×"].ink,
                    }}
                  >
                    {JUDGEMENT_ICON["×"]} {cs.batsu}
                  </span>
                )}
                {cs && cs.sankaku > 0 && (
                  <span
                    className="shrink-0 rounded-full px-1.5 text-[11px] font-bold"
                    style={{
                      background: JUDGEMENT_COLOR["△"].bg,
                      color: JUDGEMENT_COLOR["△"].ink,
                    }}
                  >
                    {JUDGEMENT_ICON["△"]} {cs.sankaku}
                  </span>
                )}
                <span className="tabular w-10 shrink-0 text-right text-[13px] font-bold">
                  {pct(cs?.rate ?? null)}
                </span>
              </div>
              <ul>
                {catVisible.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    answer={answerOf(inspection, item.id)}
                    inspectionId={inspection.id}
                    prevAnswer={previous ? (previous.answers[item.id] ?? EMPTY_ANSWER) : undefined}
                    prevDate={previous?.date}
                    streak={streaks.get(item.id) ?? 0}
                  />
                ))}
              </ul>

              {/* カテゴリ見出し → 項目リスト → 写真欄 → 次のカテゴリ の並び */}
              <CategoryPhotos
                inspectionId={inspection.id}
                category={cat}
                photos={inspection.categoryPhotos?.[cat] ?? []}
              />
            </section>
          );
        })}

        {visible.length === 0 && (
          <p className="py-6 text-center text-[13px] text-[var(--color-sub)]">
            該当する項目はありません。
          </p>
        )}
      </div>

      {/* カード下部のアクション */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={async () => {
            const ok = await copyText(reportText(inspection));
            say(ok ? "コピーしました" : "コピーできませんでした");
          }}
        >
          テキストをコピー
        </button>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            const r = await shareReportImage(inspection);
            say(
              r === "shared"
                ? "共有しました"
                : r === "downloaded"
                  ? "画像を保存しました"
                  : "画像を作れませんでした",
            );
          }}
        >
          画像で保存・共有
        </button>
        <button
          type="button"
          className="btn"
          onClick={print}
        >
          PDF報告書を作る
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            const todo = items.filter((i) => answerOf(inspection, i.id).judgement === null);
            if (todo.length === 0) return say("未入力の項目はありません");
            if (
              !window.confirm(
                `未入力の${todo.length}項目を、まとめて○にします。実際に見ていない項目まで○になると、点数の意味が無くなります。よろしいですか？`,
              )
            )
              return;
            for (const i of todo) updateAnswer(inspection.id, i.id, { judgement: "○" });
            say(`${todo.length}項目を○にしました`);
          }}
        >
          すべてチェック
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (
              !window.confirm(
                `${store}の今日の入力（メモ・写真を含む）を全て消します。取り消せません。よろしいですか？`,
              )
            )
              return;
            void resetInspection(inspection.id).then(() => say("リセットしました"));
          }}
        >
          この店舗をリセット
        </button>
      </div>

      <label className="mt-2 flex items-center justify-center gap-2 text-[12px] text-[var(--color-sub)]">
        <input
          type="checkbox"
          checked={withPhotos}
          onChange={(e) => setWithPhotos(e.target.checked)}
          className="h-4 w-4"
        />
        PDFに現場写真を載せる（{photoCount}枚・写真ぶんページが増えます）
      </label>

      {flash && (
        <p className="mt-2 text-center text-[13px] font-bold text-[var(--color-brown2)]">
          {flash}
        </p>
      )}

      {printing && (
        <PrintPortal>
          <StoreReport
            inspection={inspection}
            all={data.inspections}
            issuedOn={todayISO()}
            includePhotos={withPhotos}
          />
        </PrintPortal>
      )}
    </Card>
  );
}
