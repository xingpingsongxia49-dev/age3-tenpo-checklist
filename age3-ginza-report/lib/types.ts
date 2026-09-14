/**
 * 銀座店 売上報告 1件ぶんのかたち。
 * LINEのトーク履歴にある報告をそのまま項目にしてある。
 */

/** 売上。決済手段は現金・PayPay・CR（クレジット）の3つだけ */
export type Sales = {
  /** 総売上 */
  total: number | null;
  cash: number | null;
  paypay: number | null;
  /** CR。クレジットカード */
  credit: number | null;
  /** 客数（組） */
  guests: number | null;
  /** Uberの件数 */
  uberOrders: number | null;
  /**
   * Uberの売上。
   * 現金・PayPay・CR とは別に精算されるので、総売上の内訳には足さない。
   */
  uberSales: number | null;
};

/** 口コミ */
export type Reviews = {
  /** 本日の増減。減ることもあるのでマイナスを入れられる */
  today: number | null;
  /** 総口コミ件数 */
  total: number | null;
  /**
   * Googleマップに反映されていなくて数えられなかった日。
   * 「0件」と「数えられなかった」は意味が違うので分けて持つ。
   */
  notReflected: boolean;
};

/** 金庫。毎日10万円あるかを確認して報告している */
export type Safe = {
  /** 確認したか */
  checked: boolean;
  /** 誤差。0なら誤差なし */
  diff: number | null;
};

export type Report = {
  /** YYYY-MM-DD */
  date: string;
  sales: Sales;
  reviews: Reviews;
  safe: Safe;
  /** 報告した人 */
  reporter: string;
  /** その他連絡事項 */
  note: string;
  updatedAt: string;
  /** LINEに送った時刻。まだなら null */
  sentAt: string | null;
};

/**
 * 経費の報告1件。
 *
 * 売上報告と違って1日に何件も出るし、買った人がその場で報告する。
 * 夕方にまとめて入れる売上報告と一緒の入れ物にすると、片方を保存したときに
 * もう片方を消してしまうので、別々に持つ。
 */
export type Expense = {
  /** 他とぶつからないID */
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** 使用者。立て替えて買った人 */
  user: string;
  /** 店名 */
  store: string;
  amount: number | null;
  /** 何を買ったかなど。無くてもよい */
  note: string;
  createdAt: string;
  /** LINEに送った時刻。まだなら null */
  sentAt: string | null;
};

export type Settings = {
  /** 報告者に出す名前の一覧 */
  staff: string[];
  /** 経費の「使用者」に出す名前の一覧 */
  expenseUsers: string[];
  /** 経費の「店名」に出すよく使う店の一覧 */
  expenseStores: string[];
};

/** 充足や増減の3段階。緑＝良い／黄＝ふつう／赤＝落ちている */
export type Level = "ok" | "warn" | "low";
