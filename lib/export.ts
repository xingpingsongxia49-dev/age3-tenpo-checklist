import { answerOf, collectCorrections, itemsForStore, pct, summarize } from "./score";
import type { AppData, Inspection } from "./types";

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRows(rows: (string | number)[][]): string {
  // Excel(日本語Windows)で文字化けしないよう BOM を付ける
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

/** 視察1件分をエクセルの「チェックシート」と同じ列順で書き出す */
export function inspectionCsv(insp: Inspection): string {
  const rows: (string | number)[][] = [
    ["店舗名", insp.store, "視察日", insp.date, "視察者", insp.inspector],
    [],
    [
      "カテゴリ",
      "No",
      "対象",
      "チェック項目",
      "重要度",
      "判定",
      "備考（事実を書く）",
      "是正担当",
      "期限",
      "完了日",
    ],
  ];
  for (const item of itemsForStore(insp.store)) {
    const a = answerOf(insp, item.id);
    rows.push([
      item.category,
      item.id,
      item.scope,
      item.text,
      item.weight,
      a.judgement ?? "",
      a.note,
      a.owner,
      a.due,
      a.doneAt,
    ]);
  }

  const s = summarize(insp);
  rows.push([]);
  rows.push(["総合スコア（加重）", pct(s.weightedRate, 1)]);
  rows.push(["単純○率（参考）", pct(s.simpleRate, 1)]);
  rows.push(["S項目の×件数", s.criticalBatsu]);
  rows.push(["是正未完了（×かつ完了日なし）", s.openCorrections]);
  rows.push(["期限未記入の×", s.missingDue]);
  rows.push([]);
  rows.push(["カテゴリ", "項目数", "○", "△", "×", "対象外", "加重達成率"]);
  for (const c of s.categories) {
    rows.push([
      c.category,
      c.total,
      c.maru,
      c.sankaku,
      c.batsu,
      c.excluded,
      pct(c.rate, 1),
    ]);
  }
  return csvRows(rows);
}

/** 是正管理台帳（全視察横断）をエクセルの「是正管理」と同じ列で書き出す */
export function correctionsCsv(inspections: Inspection[], today: string): string {
  const rows: (string | number)[][] = [
    [
      "検出日",
      "店舗",
      "カテゴリ",
      "指摘内容（事実）",
      "重要度",
      "担当",
      "期限",
      "完了日",
      "状況",
    ],
  ];
  for (const c of collectCorrections(inspections, today)) {
    rows.push([
      c.date,
      c.store,
      c.category,
      c.note || c.text,
      c.weight,
      c.owner,
      c.due,
      c.doneAt,
      c.status,
    ]);
  }
  return csvRows(rows);
}

/** 履歴・店舗比較（1視察=1行、カテゴリ別スコア付き） */
export function historyCsv(inspections: Inspection[]): string {
  const summaries = inspections.map((i) => ({ insp: i, s: summarize(i) }));
  const cats = summaries[0]?.s.categories.map((c) => c.category) ?? [];
  const rows: (string | number)[][] = [
    [
      "視察日",
      "店舗",
      "視察者",
      "総合スコア",
      "S項目×件数",
      "是正未完了",
      ...cats,
    ],
  ];
  for (const { insp, s } of summaries) {
    const map = new Map(s.categories.map((c) => [c.category, c.rate] as const));
    rows.push([
      insp.date,
      insp.store,
      insp.inspector,
      pct(s.weightedRate, 1),
      s.criticalBatsu,
      s.openCorrections,
      ...cats.map((c) => pct(map.get(c) ?? null, 1)),
    ]);
  }
  return csvRows(rows);
}

/** LINE・メールにそのまま貼れる報告テキスト */
export function reportText(insp: Inspection): string {
  const s = summarize(insp);
  const mark = { green: "緑", yellow: "黄", red: "赤", none: "未判定" }[s.verdict];
  const lines: string[] = [];
  lines.push(`【Age.3 店舗チェック】${insp.store}／${insp.date}／視察者：${insp.inspector || "—"}`);
  lines.push(`総合スコア（加重）：${pct(s.weightedRate, 1)}　判定：${mark}`);
  lines.push(`○${s.maru}／△${s.sankaku}／×${s.batsu}（対象外${s.excluded}・未入力${s.unanswered}）`);
  if (s.criticalBatsu > 0) {
    lines.push(`※S項目（食品衛生・行政リスク）の×が${s.criticalBatsu}件。総合何%でも赤。即日是正。`);
  }
  lines.push("");
  lines.push("■ カテゴリ別 加重達成率");
  // 未着手のカテゴリを並べても読み手の判断材料にならないので出さない
  for (const c of s.categories.filter((c) => c.rate !== null)) {
    lines.push(`${c.category}：${pct(c.rate)}（○${c.maru} △${c.sankaku} ×${c.batsu}）`);
  }
  const untouched = s.categories.filter((c) => c.rate === null && c.excluded === 0);
  if (untouched.length > 0) {
    lines.push(`（未入力のカテゴリ：${untouched.map((c) => c.category).join("、")}）`);
  }

  const batsuItems = itemsForStore(insp.store)
    .map((item) => ({ item, a: answerOf(insp, item.id) }))
    .filter(({ a }) => a.judgement === "×")
    .sort((x, y) => {
      const rank = { S: 0, A: 1, B: 2 } as const;
      return rank[x.item.weight] - rank[y.item.weight];
    });

  if (batsuItems.length > 0) {
    lines.push("");
    lines.push(`■ ×項目（${batsuItems.length}件・重要度順）`);
    for (const { item, a } of batsuItems) {
      lines.push(`[${item.weight}] ${item.text}`);
      if (a.note) lines.push(`　事実：${a.note}`);
      lines.push(`　担当：${a.owner || "未定（要記入）"}／期限：${a.due || "未定（要記入）"}`);
    }
  }
  return lines.join("\n");
}

export function backupJson(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function download(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // クリップボードAPIが使えない環境（古いiOS等）のフォールバック
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
