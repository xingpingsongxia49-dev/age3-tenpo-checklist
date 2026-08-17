"use client";

import { dueSummary } from "@/lib/score";
import { todayISO, useStore } from "@/lib/store";

/**
 * 期限が切れている／迫っている是正を、どのタブにいても見える位置に出す。
 * 「まとめ」タブを開かないと気づけない状態だと、出張当日に優先順位を決められない。
 */
export function DueAlert({ onOpen }: { onOpen: () => void }) {
  const { data, ready } = useStore();
  if (!ready) return null;

  const { overdue, dueSoon, noDue } = dueSummary(data.inspections, todayISO());
  if (overdue.length === 0 && dueSoon.length === 0 && noDue.length === 0) return null;

  const urgent = overdue.length > 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-3 block w-full rounded-xl border px-3 py-2.5 text-left"
      style={
        urgent
          ? { borderColor: "#a33a2e", background: "#fbeeec" }
          : { borderColor: "#d9b24a", background: "#fdf7e6" }
      }
    >
      <p
        className="text-[13px] font-bold"
        style={{ color: urgent ? "#a33a2e" : "#8a6d22" }}
      >
        {overdue.length > 0 && `期限切れの是正が${overdue.length}件`}
        {overdue.length > 0 && dueSoon.length > 0 && "／"}
        {dueSoon.length > 0 && `3日以内が${dueSoon.length}件`}
        {overdue.length === 0 && dueSoon.length === 0 && `期限が未記入の是正が${noDue.length}件`}
      </p>
      <p className="mt-0.5 text-[11px] text-[var(--color-sub)]">
        {overdue.length > 0
          ? "前回の指摘が期限を過ぎたまま残っています。今日の視察で必ず確認する。"
          : dueSoon.length > 0
            ? "期限が近い是正があります。今日の視察で状況を確認する。"
            : "期限が入っていない是正があります。期限のない指摘は永久に残ります。"}
        　タップで台帳へ ›
      </p>
    </button>
  );
}
