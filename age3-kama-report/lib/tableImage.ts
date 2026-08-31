"use client";

/**
 * 「冷凍在庫の絶対在庫」「スイーツ在庫の定数」を、紙の一覧表と同じ見た目で
 * そのままLINEに貼れる1枚のPNGにする。
 *
 * 日報カード（lib/cardImage.ts）と同じ理由で、HTML→画像変換ではなく canvas に直接描く。
 * こちらは日付に紐づく実績ではなく「今設定されている固定値」を印刷するだけなので、
 * カードより単純な、名前と数字だけの表になっている。
 */

const W = 1080;
const PAD = 40;

const C = {
  cream: "#fbf7f0",
  creamDeep: "#f3ebde",
  ink: "#2b1f18",
  inkSoft: "#6b5a4e",
  line: "#e6dccb",
  brand: "#7a2e1e",
  brandDeep: "#4d1c11",
  goldSoft: "#f2e2bf",
  gold: "#c8952f",
};

/** 指定どおりゴシック体だけを使う */
const GOTHIC =
  '"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP","Yu Gothic UI","Yu Gothic",Meiryo,sans-serif';

function font(size: number, weight: 400 | 700 = 400): string {
  return `${weight} ${size}px ${GOTHIC}`;
}

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

/** 「8/30（日）」の表記。日付だけの小さな関数をここでも持っておく（循環import回避） */
function prettyToday(): string {
  const d = new Date();
  const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）更新`;
}

export type TableGroup = {
  emoji?: string;
  name: string;
  items: { name: string; value: number }[];
};

/** 表の中身を積みながら描く小さな道具 */
class TablePainter {
  y = 0;
  constructor(readonly ctx: CanvasRenderingContext2D) {}

  groupHeading(emoji: string | undefined, text: string) {
    const { ctx } = this;
    this.y += 10;
    ctx.fillStyle = C.creamDeep;
    roundRect(ctx, PAD, this.y, W - PAD * 2, 56, 12);
    ctx.textBaseline = "middle";
    ctx.font = font(26, 700);
    ctx.fillStyle = C.ink;
    ctx.fillText(`${emoji ? emoji + " " : ""}${text}`, PAD + 20, this.y + 30);
    this.y += 56 + 8;
  }

  row(name: string, valueLabel: string, value: number) {
    const { ctx } = this;
    const h = 56;
    ctx.textBaseline = "middle";
    ctx.font = font(26);
    ctx.fillStyle = C.ink;
    ctx.textAlign = "left";
    ctx.fillText(name, PAD + 20, this.y + h / 2);

    ctx.font = font(20);
    ctx.fillStyle = C.inkSoft;
    ctx.textAlign = "right";
    const vw = ctx.measureText(String(value)).width;
    ctx.fillText(valueLabel, W - PAD - 20 - vw - 12, this.y + h / 2);

    ctx.font = font(30, 700);
    ctx.fillStyle = C.brand;
    ctx.fillText(String(value), W - PAD - 20, this.y + h / 2);
    ctx.textAlign = "left";

    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD + 12, this.y + h);
    ctx.lineTo(W - PAD - 12, this.y + h);
    ctx.stroke();

    this.y += h;
  }
}

function paint(
  p: TablePainter,
  title: string,
  valueLabel: string,
  groups: TableGroup[],
): void {
  const { ctx } = p;
  const headH = 150;
  const grad = ctx.createLinearGradient(0, 0, W, headH);
  grad.addColorStop(0, C.brand);
  grad.addColorStop(1, C.brandDeep);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, headH);
  ctx.textBaseline = "top";
  ctx.fillStyle = C.goldSoft;
  ctx.font = font(22, 700);
  ctx.fillText("A G E . 3 　 K A M A", PAD, 30);
  ctx.fillStyle = "#ffffff";
  ctx.font = font(42, 700);
  ctx.fillText(title, PAD, 62);
  ctx.font = font(24, 700);
  ctx.textAlign = "right";
  ctx.fillStyle = C.goldSoft;
  ctx.fillText(prettyToday(), W - PAD, 108);
  ctx.textAlign = "left";
  p.y = headH + 24;

  for (const g of groups) {
    p.groupHeading(g.emoji, g.name);
    for (const it of g.items) {
      p.row(it.name, valueLabel, it.value);
    }
    p.y += 16;
  }
}

/** 冷凍在庫・スイーツ在庫の目標数一覧をPNGにする。返すのは Blob */
export async function renderTargetTablePng(
  title: string,
  valueLabel: string,
  groups: TableGroup[],
): Promise<Blob> {
  const probe = document.createElement("canvas");
  probe.width = W;
  probe.height = 6000;
  const pctx = probe.getContext("2d");
  if (!pctx) throw new Error("canvas 2d context が取れませんでした");
  const measurer = new TablePainter(pctx);
  paint(measurer, title, valueLabel, groups);
  const height = Math.ceil(measurer.y + PAD);

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context が取れませんでした");
  ctx.scale(scale, scale);
  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, W, height);
  paint(new TablePainter(ctx), title, valueLabel, groups);

  ctx.fillStyle = C.gold;
  ctx.fillRect(0, height - 6, W, 6);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("画像の書き出しに失敗しました"))),
      "image/png",
    );
  });
}

/** 画像を共有シートに渡す。使えない端末ではダウンロードに落とす */
export async function shareOrDownloadPng(
  blob: Blob,
  filename: string,
): Promise<{ ok: boolean; message: string }> { 
  const file = new File([blob], filename, { type: "image/png" });

  if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return { ok: true, message: "共有しました." };
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return { ok: true, message: "" };
      }
      // 共有に失敗したらダウンロードに落とす
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return { ok: true, message: "画像を保存しました. LINEに添付して送れます." };
}
