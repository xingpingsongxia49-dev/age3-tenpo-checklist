/**
 * 嘉麻店の商品マスタ。
 *
 * 元になっているのは店舗で使っているエクセル2枚（「冷凍在庫」「在庫表」）で、
 * 商品名・並び順・目標数（絶対在庫数・定数）はそこに入っている値をそのまま写してある。
 * 目標数は設定画面から書き換えられる（lib/settings 相当は Settings 型）ので、
 * ここにあるのは「紙と同じ初期値」という位置づけ。
 */

/** 冷凍在庫（缶商品）の1品目 */
export type CanItem = {
  id: string;
  name: string;
  /** 絶対在庫数。充足率の分母になる。0 なら充足率を出さない */
  target: number;
  /**
   * 紙に書いてある表記そのまま。「未開封2pc」のように個数でないものがあるため、
   * 表示はこちらを使い、計算には target を使う。
   */
  targetLabel: string;
};

export type CanGroup = {
  id: string;
  name: string;
  emoji: string;
  /** 紙の見出し行の色。書き出す画像でも同じ色を使う */
  color: string;
  items: CanItem[];
};

/** 個数の目標。「45個」のような素直なもの */
function pcs(n: number): { target: number; targetLabel: string } {
  return { target: n, targetLabel: `${n}個` };
}

/** 冷凍在庫。エクセル「冷凍在庫」そのまま */
export const CAN_GROUPS: CanGroup[] = [
  {
    id: "pancake",
    name: "パンケーキ缶",
    emoji: "🥞",
    color: "#bdd7ee",
    items: [
      { id: "pc_ichigo", name: "いちご", ...pcs(400) },
      { id: "pc_chocobanana", name: "チョコバナナ", ...pcs(135) },
      { id: "pc_pine", name: "パイン", ...pcs(90) },
      { id: "pc_kiwi", name: "キウイ", ...pcs(90) },
      { id: "pc_matcha_ichigo", name: "抹茶いちご", ...pcs(30) },
      { id: "pc_houji_warabi", name: "ほうじ茶わらび餅", ...pcs(30) },
      { id: "pc_nama_kuri_an", name: "生栗あん", ...pcs(30) },
      { id: "pc_beniimo_annou", name: "紅芋＆安納芋", ...pcs(30) },
      { id: "pc_chococream_ichigo", name: "チョコクリームいちご", ...pcs(45) },
      { id: "pc_chococream_banana", name: "チョコクリームバナナ", ...pcs(45) },
      { id: "pc_custard_pudding", name: "生カスタードプリン", ...pcs(45) },
      { id: "pc_chocomint", name: "チョコミント", ...pcs(30) },
      { id: "pc_ichigocream_ichigo", name: "いちごクリームいちご", ...pcs(45) },
      { id: "pc_ichigo_daifuku", name: "いちご大福", ...pcs(45) },
    ],
  },
  {
    id: "acai",
    name: "アサイー缶",
    emoji: "🫐",
    color: "#e4c7f5",
    items: [
      { id: "ac_ichigo", name: "いちご", ...pcs(100) },
      { id: "ac_chocobanana", name: "チョコバナナ", ...pcs(45) },
      { id: "ac_kiwi", name: "キウイ", ...pcs(45) },
      { id: "ac_pine", name: "パイン", ...pcs(45) },
    ],
  },
  {
    id: "oreo",
    name: "オレオ系",
    emoji: "🍪",
    color: "#ffff99",
    items: [
      { id: "or_sand", name: "オレオサンド", ...pcs(96) },
      { id: "or_choco", name: "チョコオレオ", ...pcs(48) },
      { id: "or_matcha", name: "抹茶オレオ", ...pcs(48) },
      { id: "or_ichigo", name: "いちごオレオ", ...pcs(48) },
      { id: "or_mango", name: "マンゴーオレオ", ...pcs(48) },
      { id: "or_tonyu", name: "豆乳オレオ", ...pcs(15) },
      // 紙でも絶対在庫数が空欄。数えるだけで充足率は出さない
      { id: "or_shikaku", name: "四角オレオ", target: 0, targetLabel: "" },
    ],
  },
  {
    id: "acai_material",
    name: "アサイー材料",
    emoji: "🥣",
    color: "#c6e0b4",
    items: [
      { id: "am_acai", name: "アサイー", target: 2, targetLabel: "未開封2pc" },
      { id: "am_container", name: "容器・蓋", target: 200, targetLabel: "各200個" },
      { id: "am_mixberry", name: "ミックスベリー", target: 3, targetLabel: "未開封3pc" },
      { id: "am_nuts", name: "ナッツ", target: 6, targetLabel: "6pc" },
      { id: "am_honeycomb", name: "巣蜜", target: 10, targetLabel: "10個" },
    ],
  },
];

/** 冷凍在庫の全品目をフラットに並べたもの */
export const CAN_ITEMS: CanItem[] = CAN_GROUPS.flatMap((g) => g.items);

/**
 * 在庫表の系統。
 * 1つの商品に、生地違いで最大4系統ある（紙の列グループと同じ）。
 */
export type SweetVariant = "plain" | "tonyu" | "matcha" | "choco";

export const SWEET_VARIANTS: { id: SweetVariant; name: string; color: string }[] = [
  { id: "plain", name: "プレーン", color: "#ffffff" },
  { id: "tonyu", name: "豆乳", color: "#ffe699" },
  { id: "matcha", name: "抹茶", color: "#c6e0b4" },
  { id: "choco", name: "チョコ", color: "#f8cbad" },
];

/** 在庫表の1品目 */
export type SweetItem = {
  id: string;
  name: string;
  /**
   * 系統ごとの定数。紙でグレーに潰してある系統はキーを持たない。
   * 「その商品にその生地は無い」という意味なので、入力欄も出さない。
   */
  targets: Partial<Record<SweetVariant, number>>;
};

/** 在庫表。エクセル「在庫表」そのまま */
export const SWEET_ITEMS: SweetItem[] = [
  { id: "sw_three", name: "THREEサンド", targets: { plain: 10, tonyu: 10, matcha: 10, choco: 10 } },
  { id: "sw_namachoco", name: "生チョコサンド", targets: { plain: 10, tonyu: 10, choco: 10 } },
  { id: "sw_chocochip", name: "チョコチップ", targets: { plain: 10, tonyu: 10, matcha: 10 } },
  { id: "sw_w_kuri_an", name: "W栗あん", targets: { matcha: 10 } },
  { id: "sw_anmochi", name: "あん餅", targets: { matcha: 10 } },
  { id: "sw_fondant", name: "フォンダンショコラ", targets: { plain: 10, choco: 10 } },
  { id: "sw_berry_honey", name: "ベリーハニーナッツ", targets: { plain: 10 } },
  { id: "sw_blueberry", name: "ブルーベリーチーズ", targets: { plain: 10 } },
  { id: "sw_anbutter", name: "あんバター", targets: { plain: 10 } },
  { id: "sw_yakiimo", name: "焼き芋（安納芋）", targets: { plain: 10 } },
  { id: "sw_chocomint", name: "チョコミント", targets: { plain: 15 } },
  { id: "sw_mintcream", name: "ミントクリーム", targets: { plain: 15 } },
  { id: "sw_oreomint", name: "オレオミント", targets: { plain: 15 } },
  { id: "sw_namachocomint", name: "生チョコミント", targets: { plain: 15 } },
  { id: "sw_basley", name: "バスリー", targets: { plain: 10 } },
  { id: "sw_tiramisu", name: "ティラミス", targets: { plain: 10 } },
  { id: "sw_coffee_three", name: "コーヒースリー", targets: { plain: 10 } },
  { id: "sw_montblanc", name: "モンブラン（和栗）", targets: { plain: 10 } },
  { id: "sw_pudding_sand", name: "とろ〜りプリンサンド", targets: { plain: 48 } },
];

/** 在庫表の入力1マスを指すキー。商品と系統の組で1つ */
export function sweetKey(itemId: string, variant: SweetVariant): string {
  return `${itemId}__${variant}`;
}

/** 在庫表に実際に存在する（商品, 系統）の組をすべて並べる */
export const SWEET_CELLS: { item: SweetItem; variant: SweetVariant; target: number }[] =
  SWEET_ITEMS.flatMap((item) =>
    SWEET_VARIANTS.filter((v) => item.targets[v.id] !== undefined).map((v) => ({
      item,
      variant: v.id,
      target: item.targets[v.id] as number,
    })),
  );

/** 商品別販売数の1品目 */
export type ProductItem = { id: string; name: string };

export type ProductGroup = {
  id: string;
  name: string;
  emoji: string;
  items: ProductItem[];
};

/** 商品別販売数。LINE日報の「販売個数（詳細）」と同じ並び */
export const PRODUCT_GROUPS: ProductGroup[] = [
  {
    id: "acai_bowl",
    name: "アサイーボウル",
    emoji: "🍓",
    items: [
      { id: "ab_classic", name: "クラシック" },
      { id: "ab_premium", name: "プレミアム" },
      { id: "ab_choco", name: "チョコ" },
    ],
  },
  {
    id: "kakigori",
    name: "かき氷",
    emoji: "🍧",
    items: [
      { id: "kg_acai", name: "アサイー" },
      { id: "kg_power", name: "パワーエナジー" },
      { id: "kg_hawaiian", name: "ハワイアンブルー" },
      { id: "kg_melon", name: "メロン" },
      { id: "kg_ichigo", name: "いちご" },
      { id: "kg_matcha", name: "抹茶" },
      { id: "kg_lemon", name: "レモン" },
      { id: "kg_cola", name: "コーラ" },
    ],
  },
  {
    id: "season_sand",
    name: "季節揚げサンド",
    emoji: "🥪",
    items: [
      { id: "ss_banana_brulee", name: "バナナブリュレ" },
      { id: "ss_dubai_choco", name: "ドバイチョコレート" },
      { id: "ss_peanut", name: "ピーナッツバター" },
      { id: "ss_tiramisu", name: "ティラミス" },
      { id: "ss_napolitan", name: "旨辛ナポリタン" },
      { id: "ss_cheese_curry", name: "旨辛チーズカレー" },
      { id: "ss_yakiniku", name: "旨辛焼肉" },
    ],
  },
  {
    id: "ice_sand",
    name: "アイス揚げサンド",
    emoji: "🍨",
    items: [
      { id: "is_brulee", name: "クレームブリュレ" },
      { id: "is_chocobanana", name: "チョコバナナ" },
      { id: "is_matcha_anko", name: "抹茶あんこ" },
      { id: "is_jam_ichigo", name: "ジャムいちご" },
      { id: "is_choco_ichigo", name: "チョコいちご" },
    ],
  },
  {
    id: "botayama",
    name: "ボタ山ソフト",
    emoji: "🍦",
    items: [
      { id: "bs_cookie", name: "クッキー" },
      { id: "bs_matcha", name: "抹茶" },
      { id: "bs_pistachio", name: "ピスタチオ" },
      { id: "bs_cocoa", name: "ココア" },
      { id: "bs_ichigo", name: "いちご" },
      { id: "bs_crunch", name: "クランチ" },
    ],
  },
  {
    id: "dubai_mochi",
    name: "ドバイ餅",
    emoji: "🧆",
    items: [
      { id: "dm_choco1", name: "チョコ1個入" },
      { id: "dm_choco4", name: "チョコ4個入" },
      { id: "dm_matcha1", name: "抹茶1個入" },
      { id: "dm_matcha4", name: "抹茶4個入" },
    ],
  },
];

/** 商品IDから「グループ名＋商品名」を引くための索引 */
export const PRODUCT_INDEX: Record<string, { group: string; name: string; emoji: string }> =
  Object.fromEntries(
    PRODUCT_GROUPS.flatMap((g) =>
      g.items.map((it) => [it.id, { group: g.name, name: it.name, emoji: g.emoji }] as const),
    ),
  );

/** 口コミ返信の対象店舗 */
export const REVIEW_STORES = ["銀座", "浅草", "原宿", "嘉麻"] as const;

/** 客層のプルダウン */
export const CUSTOMER_SEGMENTS = [
  "家族連れ",
  "カップル",
  "女性グループ",
  "男性グループ",
  "外国人観光客",
  "その他",
] as const;

/** 来店ピーク時間帯のプルダウン */
export const PEAK_HOURS = [
  "10時〜12時",
  "12時〜14時",
  "14時〜16時",
  "16時〜18時",
  "18時〜20時",
  "20時以降",
] as const;

/** 手が空いた時に行った作業のチェックボックス */
export const IDLE_TASKS = [
  "箱組み立て",
  "清掃",
  "仕込み",
  "備品補充",
  "SNS投稿",
  "発注",
  "在庫整理",
  "POP作成",
] as const;

/** スタッフ名の初期値。設定画面で書き換える前提のダミー */
export const DEFAULT_STAFF = [
  "山田 さくら",
  "佐藤 みなと",
  "鈴木 ひなた",
  "田中 あおい",
  "高橋 りく",
  "伊藤 ゆい",
] as const;
