import { CATEGORIES, CHECKLIST } from "./checklist";
import type {
  Answer,
  CategoryName,
  ChecklistItem,
  Inspection,
  Judgement,
  StoreName,
  Weight,
} from "./types";
import { EMPTY_ANSWER } from "./types";

export const WEIGHT_POINT: Record<Weight, number> = { S: 5, A: 3, B: 1 };

export const JUDGEMENT_FACTOR: Record<Exclude<Judgement, "対象外">, number> = {
  "○": 1,
  "△": 0.5,
  "×": 0,
};

/** その店舗で見るべき項目（共通 ＋ その店舗の追加項目） */
export function itemsForStore(store: StoreName): ChecklistItem[] {
  return CHECKLIST.filter((i) => i.scope === "共通" || i.scope === store);
}

export function answerOf(inspection: Inspection, itemId: number): Answer {
  return inspection.answers[itemId] ?? EMPTY_ANSWER;
}

export type CategoryScore = {
  category: CategoryName;
  total: number;
  answered: number;
  maru: number;
  sankaku: number;
  batsu: number;
  excluded: number;
  /** 加重達成率 0-1。判定済みが0件なら null */
  rate: number | null;
};

export type Summary = {
  store: StoreName;
  items: ChecklistItem[];
  total: number;
  answered: number;
  unanswered: number;
  maru: number;
  sankaku: number;
  batsu: number;
  excluded: number;
  /** 加重達成率 Σ(重み×係数)÷Σ(重み)。判定済み0件なら null */
  weightedRate: number | null;
  /** 旧シート互換の単純○率（参考値） */
  simpleRate: number | null;
  /** S項目の×件数。1件でもあれば総合何%でも赤 */
  criticalBatsu: number;
  /** ×かつ完了日なし */
  openCorrections: number;
  /** ×なのに期限が空欄 */
  missingDue: number;
  categories: CategoryScore[];
  verdict: Verdict;
  progress: number;
};

export type Verdict = "green" | "yellow" | "red" | "none";

/** 合格ライン: 80%以上=緑 / 60-79%=黄 / 60%未満=赤。ただしS項目に×があれば無条件で赤 */
export function judge(rate: number | null, criticalBatsu: number): Verdict {
  if (criticalBatsu > 0) return "red";
  if (rate === null) return "none";
  if (rate >= 0.8) return "green";
  if (rate >= 0.6) return "yellow";
  return "red";
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  green: "緑（合格）",
  yellow: "黄（要改善）",
  red: "赤（不合格）",
  none: "未判定",
};

export function summarize(inspection: Inspection): Summary {
  const items = itemsForStore(inspection.store);

  let gained = 0;
  let possible = 0;
  let maru = 0;
  let sankaku = 0;
  let batsu = 0;
  let excluded = 0;
  let answered = 0;
  let criticalBatsu = 0;
  let openCorrections = 0;
  let missingDue = 0;

  const byCategory = new Map<CategoryName, CategoryScore>();
  const catAcc = new Map<CategoryName, { gained: number; possible: number }>();
  for (const c of CATEGORIES) {
    byCategory.set(c, {
      category: c,
      total: 0,
      answered: 0,
      maru: 0,
      sankaku: 0,
      batsu: 0,
      excluded: 0,
      rate: null,
    });
    catAcc.set(c, { gained: 0, possible: 0 });
  }

  for (const item of items) {
    const cat = byCategory.get(item.category)!;
    const acc = catAcc.get(item.category)!;
    cat.total += 1;

    const a = answerOf(inspection, item.id);
    if (a.judgement === null) continue;

    if (a.judgement === "対象外") {
      excluded += 1;
      cat.excluded += 1;
      continue;
    }

    answered += 1;
    cat.answered += 1;

    const w = WEIGHT_POINT[item.weight];
    const f = JUDGEMENT_FACTOR[a.judgement];
    gained += w * f;
    possible += w;
    acc.gained += w * f;
    acc.possible += w;

    if (a.judgement === "○") {
      maru += 1;
      cat.maru += 1;
    } else if (a.judgement === "△") {
      sankaku += 1;
      cat.sankaku += 1;
    } else {
      batsu += 1;
      cat.batsu += 1;
      if (item.weight === "S") criticalBatsu += 1;
      if (!a.doneAt) openCorrections += 1;
      if (!a.due) missingDue += 1;
    }
  }

  for (const [name, acc] of catAcc) {
    const cat = byCategory.get(name)!;
    cat.rate = acc.possible > 0 ? acc.gained / acc.possible : null;
  }

  const weightedRate = possible > 0 ? gained / possible : null;
  const simpleRate = answered > 0 ? maru / answered : null;
  const decided = answered + excluded;

  return {
    store: inspection.store,
    items,
    total: items.length,
    answered,
    unanswered: items.length - decided,
    maru,
    sankaku,
    batsu,
    excluded,
    weightedRate,
    simpleRate,
    criticalBatsu,
    openCorrections,
    missingDue,
    categories: [...byCategory.values()].filter((c) => c.total > 0),
    verdict: judge(weightedRate, criticalBatsu),
    progress: items.length > 0 ? decided / items.length : 0,
  };
}

export function pct(rate: number | null, digits = 0): string {
  if (rate === null) return "—";
  return `${(rate * 100).toFixed(digits)}%`;
}

/**
 * 1件でも判定が入っているか。
 * 画面を開いただけの空の視察が履歴や前回比較に紛れ込むと、スコアが実態とずれる。
 */
export function hasAnswers(inspection: Inspection): boolean {
  return Object.values(inspection.answers).some((a) => a.judgement !== null);
}

/** 同じ店舗の、この視察より前の視察のうち直近のもの（空の視察は除く） */
export function findPrevious(
  inspections: Inspection[],
  current: Inspection,
): Inspection | undefined {
  return inspections
    .filter(
      (i) =>
        i.id !== current.id &&
        i.store === current.store &&
        hasAnswers(i) &&
        (i.date < current.date ||
          (i.date === current.date && i.createdAt < current.createdAt)),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0];
}

export type Change = "improved" | "worsened" | "same" | "new";

const JUDGE_RANK: Record<Judgement, number> = {
  "×": 0,
  "△": 1,
  "○": 2,
  対象外: 3,
};

/** 前回と今回の判定を比べる。前回×→今回○△なら是正済み */
export function compareJudgement(
  prev: Judgement | null,
  now: Judgement | null,
): Change {
  if (!prev || !now) return "new";
  if (prev === now) return "same";
  if (prev === "対象外" || now === "対象外") return "same";
  return JUDGE_RANK[now] > JUDGE_RANK[prev] ? "improved" : "worsened";
}

/** 前回×で、今回○か△になった＝現場で潰れた項目 */
export function isFixed(prev: Judgement | null, now: Judgement | null): boolean {
  return prev === "×" && (now === "○" || now === "△");
}

/** 是正台帳の1行。全視察を横断して×項目を拾う */
export type Correction = {
  inspectionId: string;
  itemId: number;
  store: StoreName;
  date: string;
  category: CategoryName;
  text: string;
  weight: Weight;
  note: string;
  owner: string;
  due: string;
  doneAt: string;
  /** 完了 / 期限切れ / 対応中 */
  status: "完了" | "期限切れ" | "対応中";
};

export function collectCorrections(
  inspections: Inspection[],
  today: string,
): Correction[] {
  const rows: Correction[] = [];
  for (const insp of inspections) {
    for (const item of itemsForStore(insp.store)) {
      const a = answerOf(insp, item.id);
      if (a.judgement !== "×") continue;
      const status: Correction["status"] = a.doneAt
        ? "完了"
        : a.due && a.due < today
          ? "期限切れ"
          : "対応中";
      rows.push({
        inspectionId: insp.id,
        itemId: item.id,
        store: insp.store,
        date: insp.date,
        category: item.category,
        text: item.text,
        weight: item.weight,
        note: a.note,
        owner: a.owner,
        due: a.due,
        doneAt: a.doneAt,
        status,
      });
    }
  }
  // 未完了を上に、S項目を上に、期限が近い順
  const statusRank = { 期限切れ: 0, 対応中: 1, 完了: 2 } as const;
  const weightRank = { S: 0, A: 1, B: 2 } as const;
  return rows.sort(
    (a, b) =>
      statusRank[a.status] - statusRank[b.status] ||
      weightRank[a.weight] - weightRank[b.weight] ||
      (a.due || "9999-99-99").localeCompare(b.due || "9999-99-99"),
  );
}
