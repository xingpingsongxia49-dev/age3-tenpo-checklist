import type { Expense, Level, Report, Settings } from "./types";

/**
 * 銀座店の在籍者。売上報告の「報告者」と、経費の「使用者」の両方に出す。
 * 設定画面から足し引きできる。
 */
export const DEFAULT_STAFF = [
  "長瀬ひなた",
  "小塩杏莉",
  "飯塚七彩",
  "外木実玖",
  "野口ほのか",
  "田端しほり",
  "猪木実里",
  "谷津七海",
  "尾崎優華",
  "芹田愛菜",
  "茂木琥珀",
  "椛田芽衣",
  "清原栄音",
  "久保歌音",
  "山岡可歩",
  "金田桃奈",
  "宮﨑維幸",
  "武井美日向",
  "ファンユニョウ",
];

/** 端末のローカル日付を YYYY-MM-DD で返す（UTCに寄ると日付がずれるので自前で組む） */
export function todayISO(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** YYYY-MM-DD から曜日1文字を返す */
export function weekdayOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "" : WEEKDAYS[d.getDay()];
}

/** 「9/12(土)」の表記。LINEに送っている形に合わせてある */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  if (!m || !d) return iso;
  return `${Number(m)}/${Number(d)}(${weekdayOf(iso)})`;
}

/** 「9/12（土）」の表記。画面とカードの見出し用 */
export function prettyDate(iso: string): string {
  const [, m, d] = iso.split("-");
  if (!m || !d) return iso;
  return `${Number(m)}/${Number(d)}（${weekdayOf(iso)}）`;
}

/** その日を含む週（月曜はじまり）の月〜日 7日分 */
export function weekOf(iso: string): string[] {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return [];
  const back = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - back);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return todayISO(x);
  });
}

/**
 * よく使う店。
 * トークでは「セブンイレブン」と「セブン」、「京プロ」と「京橋プロデュース」が
 * 混ざっていた。ボタンで選べるようにして、書き方をそろえる。
 */
export const DEFAULT_EXPENSE_STORES = [
  "セブンイレブン",
  "京橋プロデュース",
  "まいばすけっと",
  "オーケー",
  "ダイソー",
  "肉のハナマサ",
  "ヤマト運輸",
];

export function emptySettings(): Settings {
  return {
    staff: [...DEFAULT_STAFF],
    expenseUsers: [...DEFAULT_STAFF],
    expenseStores: [...DEFAULT_EXPENSE_STORES],
  };
}

/** 何も入っていない経費。日付だけ決まっている状態 */
export function emptyExpense(date: string): Expense {
  return {
    id: newExpenseId(),
    date,
    user: "",
    store: "",
    amount: null,
    note: "",
    createdAt: new Date().toISOString(),
    sentAt: null,
  };
}

/** 他とぶつからない経費のIDを作る */
export function newExpenseId(): string {
  return `ex_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** 保存済みの経費を今のかたちに合わせて埋め直す */
export function normalizeExpense(raw: Partial<Expense> & { id: string; date: string }): Expense {
  return { ...emptyExpense(raw.date), ...raw };
}

/** 経費の合計 */
export function expenseTotal(list: Expense[]): number {
  return list.reduce((s, e) => s + (e.amount ?? 0), 0);
}

/** 経費を出せる状態か。使用者・店名・金額がそろっていれば送れる */
export function canSendExpense(e: Expense): boolean {
  return Boolean(e.user.trim()) && Boolean(e.store.trim()) && e.amount !== null && e.amount > 0;
}

/** 何も入っていない報告。日付だけ決まっている状態 */
export function emptyReport(date: string): Report {
  return {
    date,
    sales: {
      total: null,
      cash: null,
      paypay: null,
      credit: null,
      guests: null,
      uberOrders: null,
      uberSales: null,
    },
    reviews: { today: null, total: null, notReflected: false },
    safe: { checked: false, diff: null },
    reporter: "",
    note: "",
    updatedAt: new Date().toISOString(),
    sentAt: null,
  };
}

/**
 * 保存済みの報告を今のかたちに合わせて埋め直す。
 * 項目が増えたあとで古い報告を開いても落ちないようにするための保険。
 */
export function normalizeReport(raw: Partial<Report> & { date: string }): Report {
  const base = emptyReport(raw.date);
  return {
    ...base,
    ...raw,
    sales: { ...base.sales, ...(raw.sales ?? {}) },
    reviews: { ...base.reviews, ...(raw.reviews ?? {}) },
    safe: { ...base.safe, ...(raw.safe ?? {}) },
  };
}

/** 入力した報告を空にする。日付は残す */
export function clearReport(r: Report): Report {
  return { ...emptyReport(r.date), reporter: r.reporter };
}

/** 客単価。総売上 ÷ 客数。割れないときは null */
export function unitPrice(report: Report): number | null {
  const { total, guests } = report.sales;
  if (!total || !guests) return null;
  return Math.round(total / guests);
}

/** 決済手段の合計。現金＋PayPay＋CR */
export function paymentTotal(report: Report): number {
  const s = report.sales;
  return (s.cash ?? 0) + (s.paypay ?? 0) + (s.credit ?? 0);
}

/**
 * 内訳と総売上の食い違い。
 * 3つとも未入力のときは比べようがないので null を返す。
 */
export function paymentGap(report: Report): number | null {
  const s = report.sales;
  if (s.total === null) return null;
  if (s.cash === null && s.paypay === null && s.credit === null) return null;
  return paymentTotal(report) - s.total;
}

/** 決済手段ごとの割合。総売上ではなく内訳の合計で割る */
export function paymentShare(report: Report): { cash: number; paypay: number; credit: number } | null {
  const sum = paymentTotal(report);
  if (sum <= 0) return null;
  const s = report.sales;
  return {
    cash: (s.cash ?? 0) / sum,
    paypay: (s.paypay ?? 0) / sum,
    credit: (s.credit ?? 0) / sum,
  };
}

/** 入力がどこまで進んだか。0〜1 */
export function completion(report: Report): number {
  const checks: boolean[] = [
    report.sales.total !== null,
    report.sales.cash !== null,
    report.sales.paypay !== null,
    report.sales.credit !== null,
    report.sales.guests !== null,
    report.reviews.total !== null || report.reviews.notReflected,
    report.sales.uberOrders !== null,
  ];
  return checks.filter(Boolean).length / checks.length;
}

/** 報告に出せる状態か。総売上と客数が入っていれば送れる */
export function canSend(report: Report): boolean {
  return report.sales.total !== null && report.sales.guests !== null;
}

/** 円表記。null は「—」 */
export function yen(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `¥${n.toLocaleString("ja-JP")}`;
}

/** 割合を「78%」の形に */
export function pct(rate: number | null): string {
  if (rate === null) return "—";
  return `${Math.round(rate * 100)}%`;
}

/**
 * 金庫の誤差を日本語にする。
 * 「誤差 ￥-500」だと符号を読み取る手間がかかるので、多い／不足で書く。
 */
export function safeDiffText(diff: number | null): string {
  const d = diff ?? 0;
  if (d === 0) return "誤差なし";
  return d > 0 ? `${Math.abs(d).toLocaleString("ja-JP")}円 多い` : `${Math.abs(d).toLocaleString("ja-JP")}円 不足`;
}

/** 前の日と比べた増減。割れないときは null */
export function changeRate(now: number | null, before: number | null): number | null {
  if (now === null || before === null || before === 0) return null;
  return (now - before) / before;
}

/** 増減の3段階。5%以上増＝緑／±5%＝黄／5%以上減＝赤 */
export function levelOf(rate: number | null): Level {
  if (rate === null) return "warn";
  if (rate >= 0.05) return "ok";
  if (rate > -0.05) return "warn";
  return "low";
}

/** 平均。対象が0件なら null */
export function avg(ns: (number | null)[]): number | null {
  const xs = ns.filter((n): n is number => n !== null);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}
