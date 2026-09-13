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

export type Settings = {
  /** 報告者に出す名前の一覧 */
  staff: string[];
};

/** 充足や増減の3段階。緑＝良い／黄＝ふつう／赤＝落ちている */
export type Level = "ok" | "warn" | "low";
