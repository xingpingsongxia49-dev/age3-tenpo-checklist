"use client";

import {
  canMadeTotal,
  levelOf,
  pct,
  prettyDate,
  productTotal,
  reviewReplyTotal,
  topProduct,
  unitPrice,
  yen,
} from "./calc";
import { CAN_ITEMS } from "./masters";
import type { Level, Report, Settings } from "./types";

/**
 * 日報カードをPNGにする。
 *
 * HTMLをそのまま画像に変換するやり方（foreignObject等）は、iPhoneのSafariで
 * 白紙になったり書体が入れ替わったりして現場で当てにできない。
 * ここでは同じ内容を canvas に直接描いている。書体・余白は画面のカードに
 * 合わせてあるので、見た目はほぼ同じものが出る。
 */

const W = 1080;
const PAD = 48;

const C = {
  cream: "#fbf7f0",
  creamDeep: "#f3ebde",
  ink: "#2b1f18",
  inkSoft: "#6b5a4e",
  line: "#e6dccb",
  brand: "#7a2e1e",
  brandDeep: "#4d1c11",
  gold: "#c8952f",
  goldSoft: "#f2e2bf",
  ok: "#2f8a4e",
  okBg: "#e6f4ea",
  warn: "#b8801b",
  warnBg: "#fdf3dc",
  low: "#c0392b",
  lowBg: "#fbe6e3",
  info: "#2b6cb0",
  infoBg: "#e5eefa",
};

/** 指定どおりゴシック体だけを使う */
const GOTHIC =
  '"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP","Yu Gothic UI","Yu Gothic",Meiryo,sans-serif';

function font(size: number, weight: 400 | 700 = 400): string {
  return `${weight} ${size}px ${GOTHIC}`;
}

const LEVEL_COLOR: Record<Level, { fg: string; bg: string; mark: string }> = {
  ok: { fg: C.ok, bg: C.okBg, mark: "🟢" },
  warn: { fg: C.warn, bg: C.warnBg, mark: "🟡" },
  low: { fg: C.low, bg: C.lowBg, mark: "🔴" },
};

/** 角丸の矩形を塗る。古いSafariに roundRect が無いので自前で描く */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.fill();
}

/** 長い文章を幅に合わせて折り返す */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const ch of para) {
      if (ctx.measureText(line + ch).width > maxWidth && line) {
        out.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    out.push(line);
  }
  return out;
}

/** 描く内容を組み立てる小さな道具。y を進めながら積んでいく */
class Painter {
  y = 0;
  constructor(readonly ctx: CanvasRenderingContext2D) {}

  gap(h: number) {
    this.y += h;
  }

  /** セクション見出し。金の下線つき */
  heading(text: string) {
    const { ctx } = this;
    this.y += 12;
    ctx.fillStyle = C.ink;
    ctx.font = font(30, 700);
    ctx.textBaseline = "top";
    ctx.fillText(text, PAD, this.y);
    const w = ctx.measureText(text).width;
    ctx.fillStyle = C.goldSoft;
    ctx.fillRect(PAD + w + 16, this.y + 18, W - PAD * 2 - w - 16, 3);
    this.y += 48;
  }

  /** 「項目 …… 値」の1行 */
  row(label: string, value: string, opts: { valueColor?: string; big?: boolean } = {}) {
    const { ctx } = this;
    const size = opts.big ? 34 : 27;
    ctx.textBaseline = "middle";
    ctx.font = font(25);
    ctx.fillStyle = C.inkSoft;
    ctx.textAlign = "left";
    ctx.fillText(label, PAD + 8, this.y + size / 2 + 4);
    ctx.font = font(size, 700);
    ctx.fillStyle = opts.valueColor ?? C.ink;
    ctx.textAlign = "right";
    ctx.fillText(value, W - PAD - 8, this.y + size / 2 + 4);
    ctx.textAlign = "left";
    this.y += size + 20;
  }

  /** 充足率の帯。棒＋パーセント＋内訳 */
  gauge(title: string, rate: number | null, detail: string, counts: string) {
    const { ctx } = this;
    const level = levelOf(rate);
    const col = LEVEL_COLOR[level];
    const boxH = 132;
    ctx.fillStyle = C.cream;
    roundRect(ctx, PAD, this.y, W - PAD * 2, boxH, 20);

    ctx.textBaseline = "top";
    ctx.font = font(28, 700);
    ctx.fillStyle = C.ink;
    ctx.fillText(title, PAD + 24, this.y + 20);

    // 右上にパーセントのバッジ
    ctx.font = font(28, 700);
    const label = `${col.mark} ${pct(rate)}`;
    const lw = ctx.measureText(label).width;
    ctx.fillStyle = col.bg;
    roundRect(ctx, W - PAD - 24 - lw - 32, this.y + 14, lw + 32, 44, 22);
    ctx.fillStyle = col.fg;
    ctx.fillText(label, W - PAD - 24 - lw - 16, this.y + 22);

    // 棒
    const barX = PAD + 24;
    const barW = W - PAD * 2 - 48;
    ctx.fillStyle = C.creamDeep;
    roundRect(ctx, barX, this.y + 72, barW, 14, 7);
    ctx.fillStyle = col.fg;
    roundRect(ctx, barX, this.y + 72, Math.max(8, barW * Math.min(1, rate ?? 0)), 14, 7);

    ctx.font = font(23);
    ctx.fillStyle = C.inkSoft;
    ctx.fillText(detail, barX, this.y + 96);
    ctx.textAlign = "right";
    ctx.fillText(counts, W - PAD - 24, this.y + 96);
    ctx.textAlign = "left";

    this.y += boxH + 16;
  }

  /** 注意を引きたい一枠 */
  banner(text: string, sub: string, fg: string, bg: string) {
    const { ctx } = this;
    ctx.font = font(23);
    const subLines = sub ? wrap(ctx, sub, W - PAD * 2 - 48) : [];
    const h = 74 + subLines.length * 30;
    ctx.fillStyle = bg;
    roundRect(ctx, PAD, this.y, W - PAD * 2, h, 20);
    ctx.textBaseline = "top";
    ctx.font = font(32, 700);
    ctx.fillStyle = fg;
    ctx.fillText(text, PAD + 24, this.y + 20);
    ctx.font = font(23);
    ctx.fillStyle = C.inkSoft;
    subLines.forEach((l, i) => ctx.fillText(l, PAD + 24, this.y + 62 + i * 30));
    this.y += h + 16;
  }

  /** 自由記述のかたまり */
  paragraph(text: string) {
    const { ctx } = this;
    ctx.font = font(25);
    ctx.fillStyle = C.ink;
    ctx.textBaseline = "top";
    for (const line of wrap(ctx, text, W - PAD * 2 - 16)) {
      ctx.fillText(line, PAD + 8, this.y);
      this.y += 36;
    }
    this.y += 8;
  }
}

/** 実際に描く手順。高さを測るためと本番用の2回まわす */
function paint(p: Painter, report: Report, settings: Settings): void {
  const top = topProduct(report, settings);
  const { ctx } = p;

  // 見出し帯
  const headH = 168;
  const grad = ctx.createLinearGradient(0, 0, W, headH);
  grad.addColorStop(0, C.brand);
  grad.addColorStop(1, C.brandDeep);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, headH);
  ctx.textBaseline = "top";
  ctx.fillStyle = C.goldSoft;
  ctx.font = font(22, 700);
  ctx.fillText("A G E . 3 　 K A M A", PAD, 32);
  ctx.fillStyle = "#ffffff";
  ctx.font = font(46, 700);
  ctx.fillText("嘉麻店 日報", PAD, 66);
  ctx.font = font(34, 700);
  ctx.textAlign = "right";
  ctx.fillStyle = C.goldSoft;
  ctx.fillText(`📅 ${prettyDate(report.date)}`, W - PAD, 78);
  ctx.textAlign = "left";
  p.y = headH + 32;

  // シフト。社員在店は一番目立たせる
  const noStaff = !report.shift.staffPresent;
  p.banner(
    noStaff ? "⚠️ 社員なし（アルバイトのみ）" : "✅ 社員あり",
    [
      report.shift.headcount !== null ? `出勤 ${report.shift.headcount}名` : "",
      report.shift.production.length ? `製造 ${report.shift.production.join("・")}` : "",
      report.shift.sales.length ? `販売 ${report.shift.sales.join("・")}` : "",
      report.shift.partOnly
        ? `アルバイトのみ ${report.shift.partOnlyHours || "あり"}${
            report.shift.partOnlyNote ? `／${report.shift.partOnlyNote}` : ""
          }`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    noStaff ? C.warn : C.info,
    noStaff ? C.warnBg : C.infoBg,
  );

  // 缶商品の製造。在庫数は在庫チェック側の担当なので日報カードには出さない
  p.heading("🥞 缶商品の製造");
  const madeList = CAN_ITEMS.filter((i) => report.cans[i.id]?.made).map(
    (i) => `${i.name} ${report.cans[i.id]?.made}`,
  );
  p.banner(
    `本日の製造数 ${canMadeTotal(report)}個`,
    madeList.slice(0, 12).join("・") + (madeList.length > 12 ? " ほか" : ""),
    C.brand,
    C.creamDeep,
  );

  // 売上
  p.heading("💰 売上");
  p.row("総売上", yen(report.sales.total), { big: true, valueColor: C.brand });
  p.row("客数", report.sales.guests !== null ? `${report.sales.guests}組` : "—");
  p.row("客単価", yen(unitPrice(report)));
  p.row(
    "内訳",
    `現金 ${yen(report.sales.cash)}／CR ${yen(report.sales.credit)}`,
  );
  p.row("　", `PayPay ${yen(report.sales.paypay)}／QR ${yen(report.sales.qr)}`);
  if (report.sales.uberOrders) {
    p.row("Uber", `${report.sales.uberOrders}件　${yen(report.sales.uberSales)}`);
  }
  p.gap(8);

  // お客様
  p.heading("🙋 お客様");
  p.row("客層", report.customers.segment || "—");
  p.row("ピーク時間", report.customers.peakHour || "—");
  p.row(
    "リピーター / 新規",
    `${report.customers.repeat ?? "—"}組 / ${report.customers.newcomer ?? "—"}組`,
  );
  p.gap(8);

  // 販売
  p.heading("🍦 販売");
  if (top) {
    p.banner(
      `🏆 ${top.emoji} ${top.group} ${top.name}　${top.count}点`,
      `販売合計 ${productTotal(report)}点`,
      C.brand,
      C.goldSoft,
    );
  } else {
    p.row("販売合計", `${productTotal(report)}点`);
    p.gap(8);
  }

  // 口コミ返信
  p.heading("⭐ 口コミ");
  p.row("本日の口コミ", report.sales.reviewsToday !== null ? `${report.sales.reviewsToday}件` : "—");
  p.row("総口コミ", report.sales.reviewsTotal !== null ? `${report.sales.reviewsTotal}件` : "—");
  p.row("返信合計", `${reviewReplyTotal(report)}件`);
  p.gap(8);

  // 作業と連絡
  const tasks = [...report.idleTasks, report.idleNote].filter(Boolean).join("・");
  if (tasks) {
    p.heading("🧹 手が空いた時の作業");
    p.paragraph(tasks);
  }
  if (report.note) {
    p.heading("📮 その他連絡事項");
    p.paragraph(report.note);
  }

  p.gap(16);
}

/** 日報カードのPNGを作る。返すのは Blob */
export async function renderCardPng(report: Report, settings: Settings): Promise<Blob> {
  // 1回目は高さを測るためだけに、捨てる canvas に描く
  const probe = document.createElement("canvas");
  probe.width = W;
  probe.height = 4000;
  const pctx = probe.getContext("2d");
  if (!pctx) throw new Error("canvas 2d context が取れませんでした");
  const measurer = new Painter(pctx);
  paint(measurer, report, settings);
  const height = Math.ceil(measurer.y + PAD);

  const scale = 2; // 端末のRetina画面で見てもぼやけない濃さ
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context が取れませんでした");
  ctx.scale(scale, scale);
  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, W, height);
  paint(new Painter(ctx), report, settings);

  // 下端に金の細線を入れて、切れていない1枚だと分かるようにする
  ctx.fillStyle = C.gold;
  ctx.fillRect(0, height - 6, W, 6);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("画像の書き出しに失敗しました"))),
      "image/png",
    );
  });
}
