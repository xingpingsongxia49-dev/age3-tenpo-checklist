import { CATEGORIES, CHECKLIST, CORE_IDS } from "./checklist";
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
/**
 * その店で実際に回す30項目。
 * マスタ（CHECKLIST 75項目）から CORE_IDS で選ぶ。項目の入れ替えは
 * lib/checklist.ts の CORE_IDS を書き換えるだけでよい。
 */
export function itemsForStore(store: StoreName): ChecklistItem[] {
  const ids = new Set(CORE_IDS[store]);
  return CHECKLIST.filter((i) => ids.has(i.id));
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

/* ------------------------------------------------------------------ */
/* 店舗の比較                                                          */
/* ------------------------------------------------------------------ */

/** 比べる視察。店ごとに視察日が違うので、店舗と視察を組にして持ち回る */
export type StorePick = { store: StoreName; insp?: Inspection };

export type CategoryCompare = {
  category: CategoryName;
  cells: { store: StoreName; rate: number | null }[];
  /** いちばん高い店といちばん低い店の開き（0-1）。2店以上そろったときだけ */
  spread: number | null;
};

/**
 * カテゴリ×店舗の比較。平均は出さない。
 * 3店の平均を見ても「どの店を直すのか」が分からず、悪い店が良い店に隠れるため、
 * 各店の数字と「開き」（最大−最小）だけを出す。
 */
export function compareCategories(picks: StorePick[]): CategoryCompare[] {
  const byStore = picks.map(({ store, insp }) => ({
    store,
    cats: insp ? summarize(insp).categories : null,
  }));

  return CATEGORIES.map((category) => {
    const cells = byStore.map(({ store, cats }) => ({
      store,
      rate: cats?.find((c) => c.category === category)?.rate ?? null,
    }));
    const values = cells.map((c) => c.rate).filter((r): r is number => r !== null);
    return {
      category,
      cells,
      spread: values.length >= 2 ? Math.max(...values) - Math.min(...values) : null,
    };
  });
}

export type ItemCompare = {
  item: ChecklistItem;
  cells: { store: StoreName; judgement: Judgement | null }[];
  /** ×の店数 */
  batsu: number;
  /** ×か△の店数 */
  weak: number;
  /** できていない店が2店以上なら全社の課題、1店だけならその店の課題 */
  scope: "全社" | StoreName;
};

/**
 * 項目×店舗の比較。3店に共通する項目だけを見る。
 *
 * 店舗別の追加項目（銀座だけの項目など）は横に並べても比較にならないので外す。
 * 「2店以上でできていない＝本部が仕組みを直す」「1店だけ＝その店が実行する」を
 * 分けたいので、できていない店数を数えて scope に入れる。
 */
export function compareItems(picks: StorePick[]): ItemCompare[] {
  const withData = picks.filter((p) => p.insp);
  if (withData.length < 2) return [];

  // 3店（データのある店すべて）に共通する項目だけ
  const common = withData
    .map(({ store }) => new Set(itemsForStore(store).map((i) => i.id)))
    .reduce((acc, ids) => new Set([...acc].filter((id) => ids.has(id))));

  const weightRank = { S: 0, A: 1, B: 2 } as const;

  return CHECKLIST.filter((item) => common.has(item.id))
    .map((item) => {
      const cells = withData.map(({ store, insp }) => ({
        store,
        judgement: insp!.answers[item.id]?.judgement ?? null,
      }));
      const batsu = cells.filter((c) => c.judgement === "×").length;
      const weak = cells.filter((c) => c.judgement === "×" || c.judgement === "△").length;
      const only = cells.find((c) => c.judgement === "×" || c.judgement === "△");
      return {
        item,
        cells,
        batsu,
        weak,
        scope: (weak >= 2 ? "全社" : (only?.store ?? "全社")) as ItemCompare["scope"],
      };
    })
    .filter((r) => r.weak > 0)
    .sort(
      (a, b) =>
        b.weak - a.weak ||
        b.batsu - a.batsu ||
        weightRank[a.item.weight] - weightRank[b.item.weight] ||
        a.item.id - b.item.id,
    );
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

/**
 * 同じ項目が何回連続で×か（今回を含む）。
 * 「基準が無いまま毎回同じ×が並ぶ」項目を炙り出すための指標。
 * 元エクセルの「なぜ⓪を新設したか」に対応する。現場を叱っても直らない項目は、
 * 連続×として何度も出てくるので、そこは本部・店長の宿題として扱う。
 */
export function batsuStreak(
  all: Inspection[],
  current: Inspection,
  itemId: number,
): number {
  const history = all
    .filter(
      (i) =>
        i.store === current.store &&
        hasAnswers(i) &&
        (i.date < current.date ||
          (i.date === current.date && i.createdAt <= current.createdAt)),
    )
    .sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );

  let streak = 0;
  for (const insp of history) {
    if (answerOf(insp, itemId).judgement !== "×") break;
    streak += 1;
  }
  return streak;
}

/**
 * 前回×だったのに今回まだ入力していない項目。
 * 前回の指摘を確認し忘れたまま店を出るのを防ぐ。
 */
export function unconfirmedPreviousBatsu(
  all: Inspection[],
  current: Inspection,
): ChecklistItem[] {
  const previous = findPrevious(all, current);
  if (!previous) return [];
  return itemsForStore(current.store).filter(
    (item) =>
      previous.answers[item.id]?.judgement === "×" &&
      answerOf(current, item.id).judgement === null,
  );
}

export type DueSummary = {
  /** 期限を過ぎた未完了の是正 */
  overdue: Correction[];
  /** 期限が今日〜指定日数以内に迫っている未完了の是正 */
  dueSoon: Correction[];
  /** 期限が未記入の未完了の是正 */
  noDue: Correction[];
};

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 全店横断で、期限が切れている／迫っている是正を拾う */
export function dueSummary(
  inspections: Inspection[],
  today: string,
  withinDays = 3,
): DueSummary {
  const open = collectCorrections(inspections, today).filter((c) => c.status !== "完了");
  const limit = addDays(today, withinDays);
  return {
    overdue: open.filter((c) => c.due && c.due < today),
    dueSoon: open.filter((c) => c.due && c.due >= today && c.due <= limit),
    noDue: open.filter((c) => !c.due),
  };
}
