import {
  CAN_ITEMS,
  PRODUCT_GROUPS,
  PRODUCT_INDEX,
  REVIEW_STORES,
  SWEET_CELLS,
  sweetKey,
  DEFAULT_STAFF,
} from "./masters";
import type { Level, Report, Settings } from "./types";

/** 端末のローカル日付を YYYY-MM-DD で返す（UTCに寄ると日付がずれるので自前で組む） */
export function todayISO(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** その日を含む週（月曜はじまり）の月〜日 7日分を YYYY-MM-DD で返す */
export function weekOf(iso: string): string[] {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return [];
  // getDay() は日曜が0。月曜を週のはじめにするので、日曜だけ6日戻す
  const back = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - back);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return todayISO(x);
  });
}

/** YYYY-MM-DD から曜日1文字を返す */
export function weekdayOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "" : WEEKDAYS[d.getDay()];
}

/** 「8/30（日）」の表記 */
export function prettyDate(iso: string): string {
  const [, m, d] = iso.split("-");
  if (!m || !d) return iso;
  return `${Number(m)}/${Number(d)}（${weekdayOf(iso)}）`;
}

export function emptySettings(): Settings {
  return {
    staff: [...DEFAULT_STAFF],
    canTargets: {},
    sweetTargets: {},
    productNames: {},
    productHidden: [],
    productExtra: [],
    productGroupNames: {},
    productGroupHidden: [],
    productGroupExtra: [],
  };
}

/** 何も入っていない日報。日付だけ決まっている状態 */
export function emptyReport(date: string): Report {
  return {
    date,
    shift: {
      headcount: null,
      production: [],
      sales: [],
      staffPresent: false,
      partOnly: false,
      partOnlyHours: "",
      partOnlyNote: "",
    },
    cans: Object.fromEntries(CAN_ITEMS.map((i) => [i.id, { stock: null, made: null }])),
    sweets: Object.fromEntries(
      SWEET_CELLS.map((c) => [
        sweetKey(c.item.id, c.variant),
        { stock: null, madePieces: null, madeBlocks: null },
      ]),
    ),
    sales: {
      total: null,
      cash: null,
      credit: null,
      paypay: null,
      qr: null,
      anchorTicket: null,
      guests: null,
      uberOrders: null,
      uberSales: null,
      reviewsToday: null,
      reviewsTotal: null,
    },
    customers: { segment: "", peakHour: "", repeat: null, newcomer: null },
    products: Object.fromEntries(
      PRODUCT_GROUPS.flatMap((g) => g.items.map((i) => [i.id, 0])),
    ),
    idleTasks: [],
    idleNote: "",
    reviewReplies: Object.fromEntries(REVIEW_STORES.map((s) => [s, null])),
    note: "",
    updatedAt: new Date().toISOString(),
    sentAt: null,
    stockSentAt: null,
  };
}

/**
 * 在庫チェックの入力だけを空にする。日報側（売上・販売数・缶の製造数など）は残す。
 * 在庫チェックを送ったあと、日報の入力を巻き添えで消さないために使う。
 */
export function clearStockFields(r: Report): Report {
  const blank = emptyReport(r.date);
  return {
    ...r,
    // 缶は「現在庫数」だけ在庫チェックの持ち物。作成数は日報側なので残す
    cans: Object.fromEntries(
      Object.entries(r.cans).map(([id, c]) => [id, { stock: null, made: c.made }]),
    ),
    sweets: blank.sweets,
    stockSentAt: null,
  };
}

/**
 * 日報の入力だけを空にする。在庫チェックの入力（缶の現在庫数・スイーツサンド在庫）は残す。
 */
export function clearReportFields(r: Report): Report {
  const blank = emptyReport(r.date);
  return {
    ...blank,
    cans: Object.fromEntries(
      Object.entries(r.cans).map(([id, c]) => [id, { stock: c.stock, made: null }]),
    ),
    sweets: r.sweets,
    stockSentAt: r.stockSentAt,
    sentAt: null,
  };
}

/** 缶商品の当日製造数の合計 */
export function canMadeTotal(report: Report): number {
  return CAN_ITEMS.reduce((s, i) => s + (report.cans[i.id]?.made ?? 0), 0);
}

/**
 * 保存済みの日報を今のマスタに合わせて埋め直す。
 * 商品が増えた後で古い日報を開いても落ちないようにするための保険。
 */
export function normalizeReport(raw: Partial<Report> & { date: string }): Report {
  const base = emptyReport(raw.date);
  return {
    ...base,
    ...raw,
    shift: { ...base.shift, ...(raw.shift ?? {}) },
    cans: { ...base.cans, ...(raw.cans ?? {}) },
    sweets: { ...base.sweets, ...(raw.sweets ?? {}) },
    sales: { ...base.sales, ...(raw.sales ?? {}) },
    customers: { ...base.customers, ...(raw.customers ?? {}) },
    products: { ...base.products, ...(raw.products ?? {}) },
    reviewReplies: { ...base.reviewReplies, ...(raw.reviewReplies ?? {}) },
    idleTasks: raw.idleTasks ?? [],
  };
}

/** 設定の上書きを見たうえでの、缶商品の絶対在庫 */
export function canTarget(id: string, settings: Settings): number {
  const override = settings.canTargets[id];
  if (typeof override === "number" && override > 0) return override;
  return CAN_ITEMS.find((i) => i.id === id)?.target ?? 0;
}

/** 設定の上書きを見たうえでの、在庫表1マスの定数。key は sweetKey() で作ったもの */
export function sweetTarget(key: string, settings: Settings): number {
  const override = settings.sweetTargets[key];
  if (typeof override === "number" && override > 0) return override;
  const cell = SWEET_CELLS.find((c) => sweetKey(c.item.id, c.variant) === key);
  return cell?.target ?? 0;
}

/**
 * 充足率の段階。
 * 80%以上＝十分（緑）／50%以上＝やや不足（黄）／50%未満＝大幅不足（赤）。
 * 目標が0の品目は判定しようがないので緑扱いにする。
 */
export function levelOf(rate: number | null): Level {
  if (rate === null) return "warn";
  if (rate >= 0.8) return "ok";
  if (rate >= 0.5) return "warn";
  return "low";
}

/** 現在庫 ÷ 目標。未入力なら null */
export function fillRate(stock: number | null, target: number): number | null {
  if (stock === null || target <= 0) return null;
  return stock / target;
}

export type StockSummary = {
  /** 入力済みの品目数 */
  filled: number;
  total: number;
  /** 現在庫の合計 */
  stock: number;
  /**
   * 目標の合計。ただし在庫を入力した品目のぶんだけ足す。
   * まだ数え終えていない品目の目標まで含めると、途中経過が実際より
   * ずっと不足しているように見えてしまうため。
   */
  target: number;
  /** 全品目の目標の合計（参考） */
  targetAll: number;
  /** 作成数の合計 */
  made: number;
  /** 入力済みの品目だけで見た充足率 */
  rate: number | null;
  ok: number;
  warn: number;
  low: number;
  /** 大幅不足の品目名（赤バッジ）。少ない順に並べる */
  lowNames: string[];
};

function summarize(
  rows: { name: string; stock: number | null; target: number; made: number }[],
): StockSummary {
  let stock = 0;
  let target = 0;
  let targetAll = 0;
  let made = 0;
  let filled = 0;
  const counts = { ok: 0, warn: 0, low: 0 };
  const lows: { name: string; rate: number }[] = [];

  for (const r of rows) {
    made += r.made;
    targetAll += r.target;
    if (r.stock === null) continue;
    filled += 1;
    stock += r.stock;
    target += r.target;
    const rate = fillRate(r.stock, r.target);
    const lv = levelOf(rate);
    counts[lv] += 1;
    if (lv === "low") lows.push({ name: r.name, rate: rate ?? 0 });
  }

  lows.sort((a, b) => a.rate - b.rate);
  return {
    filled,
    total: rows.length,
    stock,
    target,
    targetAll,
    made,
    rate: target > 0 ? stock / target : null,
    ...counts,
    lowNames: lows.map((l) => l.name),
  };
}

/** 冷凍在庫（缶）のまとめ */
export function canSummary(report: Report, settings: Settings): StockSummary {
  return summarize(
    CAN_ITEMS.map((i) => ({
      name: i.name,
      stock: report.cans[i.id]?.stock ?? null,
      target: canTarget(i.id, settings),
      made: report.cans[i.id]?.made ?? 0,
    })),
  );
}

/**
 * 在庫表のまとめ。
 * 紙と同じく「商品 × 系統」の1マスを1品目として数える。
 * 名前は系統が分かるように「THREEサンド（抹茶）」の形にする。
 */
export function sweetSummary(report: Report, settings: Settings): StockSummary {
  return summarize(
    SWEET_CELLS.map((c) => {
      const key = sweetKey(c.item.id, c.variant);
      const label = c.variant === "plain" ? c.item.name : `${c.item.name}（${VARIANT_LABEL[c.variant]}）`;
      return {
        name: label,
        stock: report.sweets[key]?.stock ?? null,
        target: sweetTarget(key, settings),
        made: report.sweets[key]?.madePieces ?? 0,
      };
    }),
  );
}

const VARIANT_LABEL: Record<string, string> = {
  plain: "プレーン",
  tonyu: "豆乳",
  matcha: "抹茶",
  choco: "チョコ",
};

/** 在庫表の作成角数の合計 */
export function sweetBlocks(report: Report): number {
  return SWEET_CELLS.reduce(
    (s, c) => s + (report.sweets[sweetKey(c.item.id, c.variant)]?.madeBlocks ?? 0),
    0,
  );
}

/**
 * 1角から取れる個数。
 * 食パン2枚でクリームやフルーツを挟んだかたまりが1角。半分に切ると2個になる。
 */
export const PIECES_PER_BLOCK = 2;

export type MakePlan = {
  /** 目標に対して足りない個数 */
  shortage: number;
  /** 作る角数。角は割れないので切り上げる */
  blocks: number;
  /** その角数から取れる個数（角数 × 2） */
  pieces: number;
  /** 切り上げで目標より多くできるぶん。0か1 */
  surplus: number;
};

/**
 * 現在庫と目標から、今日つくる角数・個数を出す。
 *
 * 角は途中で割れないので、不足ぶんを2で割って切り上げる。
 * 不足が奇数のときは1個ぶん多くできるが、足りないより多いほうが店としては安全なので切り上げでそろえる。
 * 在庫が未入力、または目標がない品目は計算しようがないので null を返す。
 */
export function makePlan(stock: number | null, target: number): MakePlan | null {
  if (stock === null || target <= 0) return null;
  const shortage = Math.max(0, target - stock);
  const blocks = Math.ceil(shortage / PIECES_PER_BLOCK);
  const pieces = blocks * PIECES_PER_BLOCK;
  return { shortage, blocks, pieces, surplus: pieces - shortage };
}

/** 在庫表ぜんぶで、今日つくる角数と個数の合計 */
export function sweetMakeTotal(
  report: Report,
  settings: Settings,
): { blocks: number; pieces: number; items: number } {
  let blocks = 0;
  let pieces = 0;
  let items = 0;
  for (const c of SWEET_CELLS) {
    const key = sweetKey(c.item.id, c.variant);
    const e = report.sweets[key];
    const b = e?.madeBlocks ?? 0;
    const p = e?.madePieces ?? 0;
    if (b > 0 || p > 0) items += 1;
    blocks += b;
    pieces += p;
  }
  return { blocks, pieces, items };
}

/** 客単価。総売上 ÷ 客数（組）。割れないときは null */
export function unitPrice(report: Report): number | null {
  const { total, guests } = report.sales;
  if (!total || !guests) return null;
  return Math.round(total / guests);
}

/** 決済手段の内訳合計。総売上と食い違っていたら入力ミスに気づける */
export function paymentTotal(report: Report): number {
  const s = report.sales;
  return (s.cash ?? 0) + (s.credit ?? 0) + (s.paypay ?? 0) + (s.qr ?? 0) + (s.anchorTicket ?? 0);
}

/** 商品別販売数の合計 */
export function productTotal(report: Report): number {
  return Object.values(report.products).reduce((s, n) => s + (n || 0), 0);
}

/** 設定を反映したあとの商品1件 */
export type ProductRow = {
  id: string;
  name: string;
  /** 設定画面から足した商品か。消し方が違うので区別する */
  custom: boolean;
};

/** 設定を反映したあとの商品グループ */
export type ProductRowGroup = {
  id: string;
  name: string;
  emoji: string;
  items: ProductRow[];
};

/** 一覧から外した商品のうち、その日の日報に数字が残っているものを入れる箱 */
const RETIRED_GROUP = { id: "__retired", name: "一覧にない商品", emoji: "📦" };

/** 設定画面から足した商品を id で引く */
function extraOf(settings?: Settings): Map<string, { group: string; name: string }> {
  const m = new Map<string, { group: string; name: string }>();
  for (const e of settings?.productExtra ?? []) m.set(e.id, { group: e.group, name: e.name });
  return m;
}

/**
 * 設定（名前の書き換え・消した商品・足した商品）を反映した商品別販売数の一覧。
 * 入力画面も日報カードもこれを見るので、設定を変えれば全部そろって変わる。
 */
export function productGroupsOf(settings?: Settings): ProductRowGroup[] {
  const hidden = new Set(settings?.productHidden ?? []);
  const extras = settings?.productExtra ?? [];
  return productGroupsAll(settings)
    .map((g) => {
      const base = PRODUCT_GROUPS.find((x) => x.id === g.id);
      return {
        id: g.id,
        name: g.name,
        emoji: g.emoji,
        items: [
          ...(base?.items ?? [])
            .filter((it) => !hidden.has(it.id))
            .map((it) => ({ id: it.id, name: productName(it.id, settings), custom: false })),
          ...extras
            .filter((e) => e.group === g.id && !hidden.has(e.id))
            .map((e) => ({ id: e.id, name: productName(e.id, settings), custom: true })),
        ],
      };
    })
    .filter((g) => g.items.length > 0);
}

/**
 * その日報を表示するための一覧。
 *
 * productGroupsOf に加えて、一覧から外したあとも数字が残っている商品を
 * 最後にまとめて出す。合計だけ合って明細に出てこない、という食い違いを防ぐ。
 * 入力画面ではここから0に直せる。
 */
export function productRowsOf(report: Report, settings?: Settings): ProductRowGroup[] {
  const groups = productGroupsOf(settings);
  const shown = new Set(groups.flatMap((g) => g.items.map((i) => i.id)));
  const extras = extraOf(settings);
  const retired: ProductRow[] = Object.entries(report.products)
    .filter(([id, n]) => (n || 0) > 0 && !shown.has(id))
    .map(([id]) => ({ id, name: productName(id, settings), custom: extras.has(id) }));
  return retired.length ? [...groups, { ...RETIRED_GROUP, items: retired }] : groups;
}

/** 商品別販売数のカテゴリ1件ぶんの見出し情報 */
export type ProductGroupMeta = {
  id: string;
  name: string;
  emoji: string;
  /** 設定画面から足したカテゴリか */
  custom: boolean;
};

/**
 * 今この店で使うカテゴリの一覧。
 * 標準のカテゴリのうしろに、設定画面から足したカテゴリを並べる。消したものは含まない。
 * 入力画面・日報カード・設定画面がどれもこれを見るので、並び順がそろう。
 */
export function productGroupsAll(settings?: Settings): ProductGroupMeta[] {
  const hidden = new Set(settings?.productGroupHidden ?? []);
  return [
    ...PRODUCT_GROUPS.map((g) => ({ id: g.id, emoji: g.emoji, custom: false })),
    ...(settings?.productGroupExtra ?? []).map((g) => ({ id: g.id, emoji: g.emoji, custom: true })),
  ]
    .filter((g) => !hidden.has(g.id))
    .map((g) => ({ ...g, name: productGroupName(g.id, settings) }));
}

/** 設定の上書きを見たうえでの、商品別販売数のカテゴリ名 */
export function productGroupName(groupId: string, settings?: Settings): string {
  const override = settings?.productGroupNames?.[groupId]?.trim();
  if (override) return override;
  const extra = settings?.productGroupExtra?.find((g) => g.id === groupId);
  if (extra) return extra.name;
  return PRODUCT_GROUPS.find((g) => g.id === groupId)?.name || groupId;
}

/** 設定の上書きを見たうえでの、商品別販売数の商品名 */
export function productName(id: string, settings?: Settings): string {
  const override = settings?.productNames?.[id]?.trim();
  if (override) return override;
  const extra = settings?.productExtra?.find((e) => e.id === id);
  if (extra) return extra.name;
  return PRODUCT_INDEX[id]?.name || id;
}

/** 他とぶつからない商品IDを作る。設定画面から商品を足すときに使う */
export function newProductId(): string {
  return `cx_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** 他とぶつからないカテゴリIDを作る。設定画面からカテゴリを足すときに使う */
export function newGroupId(): string {
  return `gx_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** 足したカテゴリに付けられる絵文字。店で扱うものに寄せてある */
export const GROUP_EMOJI = ["🥤", "☕️", "🧋", "🍺", "🍰", "🍪", "🥐", "🍱", "🎁", "🆕"];

/** 一番売れた商品。同数なら先に並んでいるほうを採る */
export function topProduct(
  report: Report,
  settings?: Settings,
): { id: string; name: string; group: string; emoji: string; count: number } | null {
  let best: { id: string; name: string; group: string; emoji: string; count: number } | null = null;
  for (const g of productRowsOf(report, settings)) {
    for (const it of g.items) {
      const n = report.products[it.id] ?? 0;
      if (n > 0 && (!best || n > best.count)) {
        best = { id: it.id, name: it.name, group: g.name, emoji: g.emoji, count: n };
      }
    }
  }
  return best;
}

/** 口コミ返信の合計 */
export function reviewReplyTotal(report: Report): number {
  return Object.values(report.reviewReplies).reduce<number>((s, n) => s + (n ?? 0), 0);
}

/** 入力がどこまで進んだか。0〜1 */
export function completion(report: Report): number {
  // 在庫数は在庫チェック側の担当なので、日報の進み具合には数えない
  const checks: boolean[] = [
    report.shift.headcount !== null,
    report.shift.production.length > 0 || report.shift.sales.length > 0,
    canMadeTotal(report) > 0,
    report.sales.total !== null,
    report.sales.guests !== null,
    report.customers.segment !== "",
    productTotal(report) > 0,
  ];
  return checks.filter(Boolean).length / checks.length;
}

/** 円表記。null は空欄のまま出す */
export function yen(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `¥${n.toLocaleString("ja-JP")}`;
}

/** 割合を「78%」の形に */
export function pct(rate: number | null): string {
  if (rate === null) return "—";
  return `${Math.round(rate * 100)}%`;
}
