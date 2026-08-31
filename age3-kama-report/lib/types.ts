/** 日報1件分のかたち。保存も共有もこの型が唯一の入口になる。 */

/** 冷凍在庫（缶）1品目の入力 */
export type CanEntry = {
  /** 本日の現在庫数 */
  stock: number | null;
  /** 本日の作成数 */
  made: number | null;
};

/**
 * 在庫表の1マスの入力。
 * 紙と同じく「商品 × 系統（プレーン／豆乳／抹茶／チョコ）」が1マス。
 * report.sweets のキーは masters.ts の sweetKey() で作る。
 */
export type SweetEntry = {
  /** 現在庫数 */
  stock: number | null;
  /** 本日の作成個数 */
  madePieces: number | null;
  /** 本日の作成角数（1角＝切る前のかたまり） */
  madeBlocks: number | null;
};

/** シフト・人員体制。アルバイトだけで店が回っているかを見るための中心データ */
export type Shift = {
  /** 出勤人数 */
  headcount: number | null;
  /** 製造担当者（スタッフマスタから複数選択） */
  production: string[];
  /** 販売担当者（スタッフマスタから複数選択） */
  sales: string[];
  /** 社員が在店していたか */
  staffPresent: boolean;
  /** アルバイトのみの時間帯があったか */
  partOnly: boolean;
  /** あった場合の時間帯（自由記述） */
  partOnlyHours: string;
  /** あった場合の対応状況（自由記述） */
  partOnlyNote: string;
};

/** 売上情報 */
export type Sales = {
  total: number | null;
  cash: number | null;
  credit: number | null;
  paypay: number | null;
  qr: number | null;
  anchorTicket: number | null;
  /** 客数（組） */
  guests: number | null;
  uberOrders: number | null;
  uberSales: number | null;
  /** 本日ついた口コミ件数 */
  reviewsToday: number | null;
  /** 累計の総口コミ数 */
  reviewsTotal: number | null;
};

/** お客様情報 */
export type Customers = {
  segment: string;
  peakHour: string;
  repeat: number | null;
  newcomer: number | null;
};

/** 日報1件 */
export type Report = {
  /** YYYY-MM-DD。1日1件なので主キーを兼ねる */
  date: string;
  shift: Shift;
  /** 缶商品ID -> 入力 */
  cans: Record<string, CanEntry>;
  /** sweetKey(商品ID, 系統) -> 入力 */
  sweets: Record<string, SweetEntry>;
  sales: Sales;
  customers: Customers;
  /** 商品ID -> 販売数 */
  products: Record<string, number>;
  /** 手が空いた時に行った作業（チェック） */
  idleTasks: string[];
  /** 同・自由記述 */
  idleNote: string;
  /** 店舗名 -> 口コミ返信件数 */
  reviewReplies: Record<string, number | null>;
  /** その他連絡事項 */
  note: string;
  /** 保存時刻（ISO文字列） */
  updatedAt: string;
  /**
   * LINEに送った時刻（ISO文字列）。まだ送っていなければ null。
   * これが入っている日報は「その日のぶんは提出済み」とみなし、
   * 入力画面は空の状態で開く。履歴と分析にはそのまま残る。
   */
  sentAt: string | null;
};

/** 設定画面で編集するマスタ。目標数もここで上書きできる */
export type Settings = {
  staff: string[];
  /** 缶商品ID -> 絶対在庫（未設定なら masters.ts の初期値） */
  canTargets: Record<string, number>;
  /** sweetKey(商品ID, 系統) -> 定数（未設定なら masters.ts の初期値） */
  sweetTargets: Record<string, number>;
  /**
   * 商品別販売数の商品ID -> 表示名。
   * 季節ものは名前が変わるので、設定画面から書き換えられるようにしてある。
   * 未設定なら masters.ts の名前を使う。
   */
  productNames: Record<string, string>;
};

/** 充足率の3段階。緑＝十分／黄＝やや不足／赤＝大幅不足 */
export type Level = "ok" | "warn" | "low";
