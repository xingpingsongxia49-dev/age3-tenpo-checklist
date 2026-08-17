export type StoreName = "銀座" | "原宿" | "浅草";

export type CategoryName = string;

/** S=食品衛生・行政リスク（重み5）、A=売上/品質/オペ直結（重み3）、B=改善推奨（重み1） */
export type Weight = "S" | "A" | "B";

/** 「共通」は全店、それ以外はその店舗だけに出す */
export type Scope = "共通" | StoreName;

export type ChecklistItem = {
  id: number;
  category: CategoryName;
  scope: Scope;
  text: string;
  weight: Weight;
};

/** ○=1.0 / △=0.5 / ×=0 / 対象外=集計から除外 / null=未入力 */
export type Judgement = "○" | "△" | "×" | "対象外";

export type Answer = {
  judgement: Judgement | null;
  /** 事実を書く欄。「不十分」ではなく誰が何をどれくらい */
  note: string;
  /** ×のときの是正担当 */
  owner: string;
  /** ×のときの期限 (YYYY-MM-DD) */
  due: string;
  /** 是正が済んだ日 (YYYY-MM-DD) */
  doneAt: string;
  /**
   * この項目の証拠写真のID。実体は端末内(IndexedDB)にあり、ここは参照だけを持つ。
   * どの項目の証拠かを1対1で特定できるよう、写真は項目単位で持つ。
   */
  photos: string[];
};

export type Inspection = {
  id: string;
  store: StoreName;
  /** 視察日 (YYYY-MM-DD) */
  date: string;
  inspector: string;
  answers: Record<number, Answer>;
  createdAt: string;
  updatedAt: string;
  /** 視察を締めた日時。締めると履歴に確定表示される */
  completedAt: string | null;
};

export type AppData = {
  version: 1;
  inspections: Inspection[];
  /** 直近に使った視察者名。次回の初期値に使う */
  lastInspector: string;
};

export const EMPTY_APP_DATA: AppData = {
  version: 1,
  inspections: [],
  lastInspector: "",
};

export const EMPTY_ANSWER: Answer = {
  judgement: null,
  note: "",
  owner: "",
  due: "",
  doneAt: "",
  photos: [],
};
