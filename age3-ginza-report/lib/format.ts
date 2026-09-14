import { paymentGap, safeDiffText, shortDate, unitPrice } from "./calc";
import type { Expense, Report } from "./types";

/**
 * LINEに貼るテキスト。
 *
 * 今まで手打ちしていた報告と1文字ずつ同じ体裁にしてある（全角の￥、項目名のあと
 * 半角スペース2つ）。受け取る側は今日から読み方を変えなくていい。
 * 金庫・報告者・連絡事項は、入れたときだけ本文のうしろに足す。
 */

/** 全角の￥で金額を書く。トークに流れている表記に合わせている */
function yenFull(n: number | null | undefined): string {
  return n === null || n === undefined ? "" : `￥${n.toLocaleString("ja-JP")}`;
}

export function toLineText(report: Report): string {
  const s = report.sales;
  const L: string[] = [];

  L.push(shortDate(report.date));
  L.push(`総売上  ${yenFull(s.total)}`);
  L.push(`現金  ${yenFull(s.cash)}`);
  L.push(`PayPay  ${yenFull(s.paypay)}`);
  L.push(`CR  ${yenFull(s.credit)}`);
  L.push("");
  L.push(`客数  ${s.guests === null ? "" : `${s.guests}組`}`);
  L.push(`客単価  ${yenFull(unitPrice(report))}`);
  L.push("");

  // 反映なしの日は件数を書かない。0件と数えられなかったのは別のことなので
  if (report.reviews.notReflected) {
    L.push("口コミ  反映なし");
  } else if (report.reviews.today !== null) {
    L.push(`口コミ  ${report.reviews.today}件`);
  } else {
    L.push("口コミ  ");
  }
  L.push(`総口コミ  ${report.reviews.total === null ? "" : `${report.reviews.total.toLocaleString("ja-JP")}件`}`);
  L.push("");
  L.push(`Uber  ${s.uberOrders === null ? "" : `${s.uberOrders}件`}`);
  // 金額は今までの報告に無かった項目なので、入れた日だけ足す
  if (s.uberSales !== null) L.push(`Uber売上  ${yenFull(s.uberSales)}`);

  // ここから下は、入れたときだけ足す。いつもの本文の形は崩さない
  const tail: string[] = [];
  if (report.safe.checked) {
    tail.push(`金庫内10万円 ${safeDiffText(report.safe.diff)}`);
  }
  if (report.note.trim()) tail.push(report.note.trim());
  if (report.reporter.trim()) tail.push(`報告者：${report.reporter.trim()}`);
  if (tail.length) {
    L.push("");
    L.push(...tail);
  }

  return L.join("\n");
}

/**
 * 送る前の確認に出す注意。
 * 「送ってから間違いに気づく」をなくすために、送信ボタンのそばに出す。
 */
export function warnings(report: Report): string[] {
  const w: string[] = [];
  const s = report.sales;

  const gap = paymentGap(report);
  if (gap !== null && gap !== 0) {
    const over = gap > 0;
    w.push(
      `内訳の合計が総売上と ${yenFull(Math.abs(gap))} ${over ? "多い" : "少ない"}です（現金＋PayPay＋CR）`,
    );
  }
  if (s.total !== null && s.guests === null) w.push("客数が入っていないので、客単価が出せません");
  if (s.guests !== null && s.total === null) w.push("総売上が入っていません");
  if (!report.reviews.notReflected && report.reviews.total === null) {
    w.push("総口コミが入っていません");
  }
  if (s.uberOrders === null) w.push("Uberの件数が入っていません（0件ならそう入れてください）");
  return w;
}

/**
 * 経費の報告文。
 * こちらもトークに流れている形そのまま。金額は半角の¥で書かれているので合わせる。
 * ひとこと（何を買ったか）は、入れたときだけ最後に足す。
 */
export function toExpenseText(e: Expense): string {
  const L = [
    shortDate(e.date),
    `使用者:${e.user.trim()}`,
    `店名:${e.store.trim()}`,
    `金額:¥${(e.amount ?? 0).toLocaleString("ja-JP")}`,
  ];
  if (e.note.trim()) L.push(e.note.trim());
  return L.join("\n");
}
