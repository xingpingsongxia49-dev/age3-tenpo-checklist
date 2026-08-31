/**
 * 嘉麻店の商品マスタ。
 *
 * 元になっているのは店舗に貼ってある紙2枚（「冷凍ストック」「在庫表」）で、
 * 目標数（絶対在庫・定数）はそこに印刷されている数字をそのまま写してある。
 * 目標数は設定画面から店舗ごとに書き換えられる（lib/settings.ts）ので、
 * ここにあるのは「紙と同じ初期値」という位置づけ。
 */

/** 冷凍在庫（缶商品）の1品目 */
export type CanItem = {
  id: string;
  name: string;
  /** 絶対在庫＝これだけは常に持っておきたい数 */
  target: number;
};

export type CanGroup = {
  id: string;
  name: string;
  emoji: string;
  items: CanItem[];
};

/** 冷凍在庫（缶商品）。紙の「冷凍ストック」1枚目そのまま */
export const CAN_GROUPS: CanGroup[] = [
  {
    id: "pancake",
    name: "パンケーキ缶",
    emoji: "🥞",
    items: [
      { id: "pc_ichigo", name: "いちご", target: 200 },
      { id: "pc_chocobanana", name: "チョコバナナ", target: 80 },
      { id: "pc_pine", name: "パイン", target: 80 },
      { id: "pc_kiwi", name: "キウイ", target: 80 },
      { id: "pc_matcha_ichigo", name: "抹茶いちご", target: 30 },
      { id: "pc_houji_warabi", name: "ほうじ茶わらび餅", target: 30 },
      { id: "pc_shoga_an", name: "生姜あん", target: 30 },
      { id: "pc_beniimo_annou", name: "紅芋＆安納芋", target: 30 },
      { id: "pc_chococream_ichigo", name: "チョコクリームいちご", target: 45 },
      { id: "pc_chococream_banana", name: "チョコクリームバナナ", target: 45 },
      { id: "pc_custard_pudding", name: "生カスタードプリン", target: 45 },
      { id: "pc_chocomint", name: "チョコミント", target: 30 },
      { id: "pc_ichigocream_ichigo", name: "いちごクリームいちご", target: 45 },
      { id: "pc_ichigo_daifuku", name: "いちご大福", target: 45 },
    ],
  },
  {
    id: "acai",
    name: "アサイー缶",
    emoji: "🫐",
    items: [
      { id: "ac_ichigo", name: "いちご", target: 20 },
      { id: "ac_chocobanana", name: "チョコバナナ", target: 20 },
      { id: "ac_kiwi", name: "キウイ", target: 20 },
      { id: "ac_pine", name: "パイン", target: 20 },
    ],
  },
  {
    id: "cookiecream",
    name: "クッキークリーム",
    emoji: "🍪",
    items: [
      { id: "cc_whip", name: "ホイップ", target: 96 },
      { id: "cc_choco", name: "チョコクリーム", target: 48 },
      { id: "cc_matcha", name: "抹茶クリーム", target: 48 },
      { id: "cc_ichigo", name: "いちごクリーム", target: 48 },
      { id: "cc_mango", name: "マンゴークリーム", target: 48 },
      { id: "cc_tonyu", name: "豆乳クリーム", target: 15 },
    ],
  },
];

/** 冷凍在庫の全品目をフラットに並べたもの */
export const CAN_ITEMS: CanItem[] = CAN_GROUPS.flatMap((g) => g.items);

/** スイーツ在庫（フルーツサンド・冷凍サンド）の1品目 */
export type SweetItem = {
  id: string;
  name: string;
  /** 定数＝紙の「定数」列 */
  target: number;
};

/** スイーツ在庫。紙の「在庫表」そのまま */
export const SWEET_ITEMS: SweetItem[] = [
  { id: "sw_three", name: "THREEサンド", target: 10 },
  { id: "sw_namachoco", name: "生チョコサンド", target: 10 },
  { id: "sw_chocochip", name: "チョコチップ", target: 10 },
  { id: "sw_w_kuri_an", name: "W栗あん", target: 10 },
  { id: "sw_anmochi", name: "あん餅", target: 10 },
  { id: "sw_fondant", name: "フォンダンショコラ", target: 10 },
  { id: "sw_berry_honey", name: "ベリーハニーナッツ", target: 10 },
  { id: "sw_blueberry", name: "ブルーベリーチーズ", target: 10 },
  { id: "sw_anbutter", name: "あんバター", target: 10 },
  { id: "sw_yakiimo", name: "焼き芋（安納芋）", target: 10 },
  { id: "sw_chocomint", name: "チョコミント", target: 15 },
  { id: "sw_mintcream", name: "ミントクリーム", target: 15 },
  { id: "sw_oreomint", name: "オレオミント", target: 15 },
  { id: "sw_namachocomint", name: "生チョコミント", target: 15 },
  { id: "sw_pasley", name: "パスリー", target: 10 },
  { id: "sw_tiramisu", name: "ティラミス", target: 10 },
  { id: "sw_coffee_three", name: "コーヒースリー", target: 10 },
  { id: "sw_montblanc", name: "モンブラン（和栗）", target: 10 },
  { id: "sw_pudding_sand", name: "とろ〜りプリンサンド", target: 48 },
];

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
