import {
  canMadeTotal,
  canSummary,
  prettyDate,
  pct,
  productName,
  productTotal,
  reviewReplyTotal,
  sweetBlocks,
  sweetSummary,
  topProduct,
  unitPrice,
  yen,
} from "./calc";
import {
  CAN_GROUPS,
  PRODUCT_GROUPS,
  REVIEW_STORES,
  SWEET_ITEMS,
  SWEET_VARIANTS,
  sweetKey,
} from "./masters";
import type { Report, Settings } from "./types";

/** 数値を「9点」の形に。0や未入力は空欄にして、今までのLINE日報と同じ見た目にする */
function pt(n: number | null | undefined): string {
  return n ? `${n}点` : "";
}

function num(n: number | null | undefined, unit = ""): string {
  return n === null || n === undefined ? "" : `${n}${unit}`;
}

function money(n: number | null | undefined): string {
  return n === null || n === undefined ? "¥" : yen(n);
}

/**
 * LINEに貼るテキスト。
 * 今まで手打ちしていた日報とほぼ同じ並び・同じ絵文字にしてあるので、
 * 受け取る側は今日から読み方を変えなくていい。
 */
export function toLineText(report: Report, settings: Settings): string {
  const top = topProduct(report, settings);
  const L: string[] = [];

  L.push(`📅 ${prettyDate(report.date)}　Age.3 嘉麻店 日報`);
  L.push("");

  // シフト・人員体制
  L.push("【シフト・人員体制】");
  L.push(`▶︎ 出勤人数　：${num(report.shift.headcount, "名")}`);
  L.push(`▶︎ 社員在店　：${report.shift.staffPresent ? "あり ✅" : "なし ⚠️"}`);
  if (report.shift.production.length) {
    L.push(`▶︎ 製造担当　：${report.shift.production.join("・")}`);
  }
  if (report.shift.sales.length) {
    L.push(`▶︎ 販売担当　：${report.shift.sales.join("・")}`);
  }
  if (report.shift.partOnly) {
    L.push(`▶︎ アルバイトのみの時間帯：${report.shift.partOnlyHours || "あり"}`);
    if (report.shift.partOnlyNote) L.push(`　　対応状況：${report.shift.partOnlyNote}`);
  } else {
    L.push("▶︎ アルバイトのみの時間帯：なし");
  }
  L.push("");
  L.push("⸻");
  L.push("");

  // 缶商品の当日製造数。在庫数の報告は在庫チェック側の担当なのでここには出さない
  L.push("【缶商品の当日製造数】");
  for (const g of CAN_GROUPS) {
    const made = g.items.filter((it) => report.cans[it.id]?.made);
    if (!made.length) continue;
    L.push(`${g.emoji}${g.name}`);
    for (const it of made) L.push(`▶︎ ${it.name}：${report.cans[it.id]?.made}個`);
  }
  L.push(`▶ 製造合計：${canMadeTotal(report)}個`);
  L.push("");
  L.push("⸻");
  L.push("");

  // 売上情報
  L.push("【売上情報】");
  L.push(`▶︎ 総売上　：${money(report.sales.total)}`);
  L.push(`▶︎ 現金　　：${money(report.sales.cash)}`);
  L.push(`▶︎ ＣＲ　　：${money(report.sales.credit)}`);
  L.push(`▶︎ PayPay ：${money(report.sales.paypay)}`);
  L.push(`▶︎ QR　　　：${money(report.sales.qr)}`);
  L.push(`▶ ｱﾝｶｰﾁｹｯﾄ：${money(report.sales.anchorTicket)}`);
  L.push("");
  L.push(`▶︎ 客数　　：${num(report.sales.guests, "組")}`);
  L.push(`▶︎ 客単価　：${money(unitPrice(report))}`);
  L.push("");
  L.push(`▶︎ Uber  　：${num(report.sales.uberOrders, "件")}`);
  L.push(`▶︎ 売上　　：${money(report.sales.uberSales)}`);
  L.push("");
  L.push(`▶︎ 口コミ　：${num(report.sales.reviewsToday, "件")}`);
  L.push(`▶︎ 総口コミ：${num(report.sales.reviewsTotal, "件")}`);
  L.push("");
  L.push("⸻");
  L.push("");

  // お客様情報
  L.push("【お客様情報】");
  L.push(`▶︎ 年齢層・性別：${report.customers.segment}`);
  L.push(`▶︎ 来店ピーク時間：${report.customers.peakHour}`);
  L.push(`▶︎ リピーター：${num(report.customers.repeat, "組")}`);
  L.push(`▶︎ 新規：${num(report.customers.newcomer, "組")}`);
  L.push("");
  L.push("⸻");
  L.push("");

  // 販売動向
  L.push("【販売動向】");
  if (top) {
    L.push(`▶︎ 1番売れた商品名 ：${top.group}${top.name}`);
    L.push(`　　　　　　　個数：${top.count}点`);
  } else {
    L.push("▶︎ 1番売れた商品名 ：");
  }
  L.push("");
  L.push("【販売個数（詳細）】");
  for (const g of PRODUCT_GROUPS) {
    const lines = g.items.map(
      (it) => `▶︎ ${productName(it.id, settings)}：${pt(report.products[it.id])}`,
    );
    L.push(`${g.emoji}${g.name}`);
    L.push(...lines);
    L.push("");
  }
  L.push(`販売合計：${productTotal(report)}点`);
  L.push("");
  L.push("⸻");
  L.push("");

  // 手が空いた時に行った作業
  L.push("【手が空いた時に行った作業】");
  for (const t of report.idleTasks) L.push(`　▶︎ ${t}`);
  if (report.idleNote) L.push(`　▶︎ ${report.idleNote}`);
  if (!report.idleTasks.length && !report.idleNote) L.push("　▶︎ ");
  L.push("");
  L.push("⸻");
  L.push("");

  // 口コミ返信件数
  L.push("🔴【口コミ返信件数】🔴");
  for (const s of REVIEW_STORES) L.push(`▶︎ ${s}　　：${num(report.reviewReplies[s], "件")}`);
  L.push(`▶ 返信合計 ：${reviewReplyTotal(report)}件`);
  L.push("");
  L.push("⸻");
  L.push("");

  L.push("【その他連絡事項】");
  if (report.note) L.push(report.note);

  return L.join("\n");
}

/**
 * 在庫チェックの報告文。この1本でそのままLINEに送れる体裁にしてある。
 * 上に2項目のまとめ、下に品目ごとの内訳を並べる。
 */
export function toStockText(report: Report, settings: Settings): string {
  const can = canSummary(report, settings);
  const sweet = sweetSummary(report, settings);
  const L: string[] = [];

  L.push(`📅 ${prettyDate(report.date)}　Age.3 嘉麻店 在庫チェック`);
  L.push("");
  L.push(
    `🥪 スイーツサンド在庫：充足率 ${pct(sweet.rate)}（${sweet.stock}/${sweet.target}・${sweet.filled}/${sweet.total}品目）`,
  );
  L.push(`　　🟢${sweet.ok}　🟡${sweet.warn}　🔴${sweet.low}　作成 ${sweet.made}個 / ${sweetBlocks(report)}角`);
  if (sweet.lowNames.length) L.push(`　　要補充：${sweet.lowNames.slice(0, 8).join("・")}`);
  L.push("");
  L.push(
    `🧊 冷凍在庫（缶）：充足率 ${pct(can.rate)}（${can.stock}/${can.target}・${can.filled}/${can.total}品目）`,
  );
  L.push(`　　🟢${can.ok}　🟡${can.warn}　🔴${can.low}`);
  if (can.lowNames.length) L.push(`　　要補充：${can.lowNames.slice(0, 8).join("・")}`);
  L.push("");
  L.push("⸻");
  L.push("");
  L.push("🧊【冷凍在庫（缶）の内訳】");
  for (const g of CAN_GROUPS) {
    L.push(`${g.emoji}${g.name}`);
    for (const it of g.items) {
      const e = report.cans[it.id];
      L.push(`　${it.name}：在庫 ${e?.stock ?? "—"} / ${it.targetLabel || "—"}`);
    }
  }
  L.push("");
  L.push("🥪【スイーツサンド在庫の内訳】");
  for (const it of SWEET_ITEMS) {
    L.push(`${it.name}`);
    for (const v of SWEET_VARIANTS) {
      const target = it.targets[v.id];
      if (target === undefined) continue;
      const e = report.sweets[sweetKey(it.id, v.id)];
      L.push(
        `　${v.name}：在庫 ${e?.stock ?? "—"} / ${target}　作成 ${e?.madePieces ?? 0}個 ${e?.madeBlocks ?? 0}角`,
      );
    }
  }
  return L.join("\n");
}
