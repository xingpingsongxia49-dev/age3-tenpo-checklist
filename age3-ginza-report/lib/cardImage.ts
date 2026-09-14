"use client";

import { paymentGap, paymentShare, paymentTotal, pct, prettyDate, safeDiffText, unitPrice, yen } from "./calc";
import type { Report } from "./types";

/**
 * 売上報告カードをPNGにする。
 *
 * HTMLをそのまま画像に変換するやり方（foreignObject等）は、iPhoneのSafariで
 * 白紙になったり書体が入れ替わったりして現場で当てにできない。
 * ここでは同じ内容を canvas に直接描いている。書体・余白は画面のカードに
 * 合わせてあるので、見た目はほぼ同じものが出る。
 */

const W = 1080;
const PAD = 48;

const C = {
  cream: "#f7f6f3",
  creamDeep: "#eceae4",
  ink: "#1d232e",
  inkSoft: "#5c6473",
  line: "#dcdad3",
  brand: "#1f2b45",
  brandDeep: "#121a2c",
  gold: "#b8912f",
  goldSoft: "#efe4c6",
  matcha: "#4b6b45",
  ok: "#2f7d4f",
  low: "#b5362a",
  lowBg: "#f9e5e2",
  info: "#27568f",
};

/** 指定どおりゴシック体だけを使う */
const GOTHIC =
  '"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP","Yu Gothic UI","Yu Gothic",Meiryo,sans-serif';

function font(size: number, weight: 400 | 700 = 400): string {
  return `${weight} ${size}px ${GOTHIC}`;
}

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

/**
 * 行のあたまに来てはいけない文字。
 * 「3」で行が終わって次の行が「件」からはじまると、数と単位が離れて読みにくい。
 */
const NO_LINE_START = "、。，．・：；？！ー〜）」』】〉》〕｝］%％個点件名組円分時";

/** 長い文章を幅に合わせて折り返す。行頭に来てはいけない文字は前の行から送る */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const ch of para) {
      if (ctx.measureText(line + ch).width > maxWidth && line) {
        if (NO_LINE_START.includes(ch) && line.length > 1) {
          out.push(line.slice(0, -1));
          line = line.slice(-1) + ch;
        } else {
          out.push(line);
          line = ch;
        }
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
    this.y += 14;
    ctx.fillStyle = C.ink;
    ctx.font = font(30, 700);
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText(text, PAD, this.y);
    const w = ctx.measureText(text).width;
    ctx.fillStyle = C.goldSoft;
    ctx.fillRect(PAD + w + 16, this.y + 18, W - PAD * 2 - w - 16, 3);
    this.y += 50;
  }

  /** 「項目 …… 値」の1行 */
  row(label: string, value: string, opts: { valueColor?: string } = {}) {
    const { ctx } = this;
    ctx.textBaseline = "middle";
    ctx.font = font(26);
    ctx.fillStyle = C.inkSoft;
    ctx.textAlign = "left";
    ctx.fillText(label, PAD + 8, this.y + 20);
    ctx.font = font(28, 700);
    ctx.fillStyle = opts.valueColor ?? C.ink;
    ctx.textAlign = "right";
    ctx.fillText(value, W - PAD - 8, this.y + 20);
    ctx.textAlign = "left";
    this.y += 48;
  }

  /** 決済手段の1行。金額と、内訳に占める割合の棒 */
  payRow(name: string, value: number | null, rate: number | null, color: string) {
    const { ctx } = this;
    ctx.textBaseline = "middle";
    ctx.font = font(27);
    ctx.fillStyle = C.ink;
    ctx.textAlign = "left";
    ctx.fillText(name, PAD + 8, this.y + 18);
    ctx.font = font(29, 700);
    ctx.textAlign = "right";
    ctx.fillText(yen(value), W - PAD - 78, this.y + 18);
    ctx.font = font(22);
    ctx.fillStyle = C.inkSoft;
    ctx.fillText(rate === null ? "" : pct(rate), W - PAD - 8, this.y + 18);
    ctx.textAlign = "left";

    const barY = this.y + 42;
    const barW = W - PAD * 2 - 16;
    ctx.fillStyle = C.creamDeep;
    roundRect(ctx, PAD + 8, barY, barW, 12, 6);
    if (rate !== null) {
      ctx.fillStyle = color;
      roundRect(ctx, PAD + 8, barY, Math.max(6, barW * Math.min(1, Math.max(0, rate))), 12, 6);
    }
    this.y += 72;
  }

  /** 自由記述のかたまり */
  paragraph(text: string) {
    const { ctx } = this;
    ctx.font = font(26);
    ctx.fillStyle = C.ink;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    for (const line of wrap(ctx, text, W - PAD * 2 - 16)) {
      ctx.fillText(line, PAD + 8, this.y);
      this.y += 38;
    }
    this.y += 8;
  }
}

/** 実際に描く手順。高さを測るためと本番用の2回まわす */
function paint(p: Painter, report: Report): void {
  const { ctx } = p;
  const s = report.sales;

  // 見出し帯
  const headH = 168;
  const grad = ctx.createLinearGradient(0, 0, W, headH);
  grad.addColorStop(0, C.brand);
  grad.addColorStop(1, C.brandDeep);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, headH);
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = C.goldSoft;
  ctx.font = font(22, 700);
  ctx.fillText("A G E . 3 　 G I N Z A", PAD, 32);
  ctx.fillStyle = "#ffffff";
  ctx.font = font(44, 700);
  ctx.fillText("銀座店 売上報告", PAD, 66);
  ctx.font = font(32, 700);
  ctx.textAlign = "right";
  ctx.fillStyle = C.goldSoft;
  ctx.fillText(`📅 ${prettyDate(report.date)}`, W - PAD, 80);
  ctx.textAlign = "left";
  p.y = headH + 32;

  // 総売上。この画像で一番見たい数字なので、大きく真ん中に出す
  const heroH = 210;
  ctx.fillStyle = C.cream;
  roundRect(ctx, PAD, p.y, W - PAD * 2, heroH, 24);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = font(26, 700);
  ctx.fillStyle = C.inkSoft;
  ctx.fillText("総売上", W / 2, p.y + 24);
  ctx.font = font(76, 700);
  ctx.fillStyle = C.brand;
  ctx.fillText(yen(s.total), W / 2, p.y + 60);
  ctx.font = font(26);
  ctx.fillStyle = C.inkSoft;
  ctx.fillText(
    `${s.guests === null ? "客数 —" : `客数 ${s.guests}組`}　／　客単価 ${yen(unitPrice(report))}`,
    W / 2,
    p.y + 152,
  );
  ctx.textAlign = "left";
  p.y += heroH + 8;

  // 内訳
  p.heading("💳 内訳");
  const share = paymentShare(report);
  p.payRow("現金", s.cash, share?.cash ?? null, C.matcha);
  p.payRow("PayPay", s.paypay, share?.paypay ?? null, C.info);
  p.payRow("CR", s.credit, share?.credit ?? null, C.gold);
  const gap = paymentGap(report);
  const mismatch = gap !== null && gap !== 0;
  p.row("内訳合計", mismatch ? `${yen(paymentTotal(report))}　⚠️総売上と不一致` : yen(paymentTotal(report)), {
    valueColor: mismatch ? C.low : C.inkSoft,
  });

  // 口コミ
  p.heading("⭐ 口コミ");
  p.row(
    "本日",
    report.reviews.notReflected
      ? "反映なし"
      : report.reviews.today === null
        ? "—"
        : `${report.reviews.today}件`,
  );
  p.row(
    "総口コミ",
    report.reviews.total === null ? "—" : `${report.reviews.total.toLocaleString("ja-JP")}件`,
  );

  // Uber
  p.heading("🛵 Uber");
  p.row("件数", s.uberOrders === null ? "—" : `${s.uberOrders}件`);

  // 金庫。確認した日だけ出す
  if (report.safe.checked) {
    p.heading("🔐 金庫");
    const d = report.safe.diff ?? 0;
    p.row("10万円", safeDiffText(d), { valueColor: d === 0 ? C.ok : C.low });
  }

  if (report.note) {
    p.heading("📮 その他連絡事項");
    p.paragraph(report.note);
  }

  if (report.reporter) {
    p.gap(8);
    ctx.font = font(23);
    ctx.fillStyle = C.inkSoft;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(`報告者：${report.reporter}`, W - PAD, p.y);
    ctx.textAlign = "left";
    p.y += 34;
  }

  p.gap(24);
}

/** 売上報告カードのPNGを作る。返すのは Blob */
export async function renderCardPng(report: Report): Promise<Blob> {
  // 1回目は高さを測るためだけに、捨てる canvas に描く
  const probe = document.createElement("canvas");
  probe.width = W;
  probe.height = 3000;
  const pctx = probe.getContext("2d");
  if (!pctx) throw new Error("canvas 2d context が取れませんでした");
  const measurer = new Painter(pctx);
  paint(measurer, report);
  const height = Math.ceil(measurer.y + PAD);

  const scale = 2; // 端末のRetina画面で見てもぼやけない濃さ
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context が取れませんでした");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, height);
  paint(new Painter(ctx), report);

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
