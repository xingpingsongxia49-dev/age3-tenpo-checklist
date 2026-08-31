"use client";

import { canTarget, prettyDate, sweetTarget, weekOf, weekdayOf } from "./calc";
import { CAN_GROUPS, SWEET_ITEMS, SWEET_VARIANTS, sweetKey } from "./masters";
import type { Report, Settings } from "./types";

/**
 * 紙の在庫表・冷凍在庫と同じ形の表を、そのまま画像にする。
 *
 * 「摘出するときはこの形で出したい」という要望に合わせ、列の並び・見出しの色・
 * 系統ごとのグレー潰しまで、店舗で使っているエクセルに寄せてある。
 * HTMLを画像に変換する方式はiPhoneのSafariで崩れるので、canvas に直接描いている。
 * 文字はゴシック体だけを使う。
 */

const GOTHIC =
  '"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP","Yu Gothic UI","Yu Gothic",Meiryo,sans-serif';

const INK = "#1f1f1f";
const INK_SOFT = "#6b6b6b";
const LINE = "#9a9a9a";
const GREY = "#d9d9d9";
const TODAY_BG = "#fff3d6";
const PAD = 32;
const SCALE = 2;

function font(size: number, weight: 400 | 700 = 400): string {
  return `${weight} ${size}px ${GOTHIC}`;
}

/** 表の1マス */
type Cell = {
  text?: string;
  /** マスの下に小さく添える文字（作成数など） */
  sub?: string;
  /** 添え文字の色。既定は作成数を表す赤 */
  subColor?: string;
  bg?: string;
  bold?: boolean;
  align?: "left" | "center" | "right";
  size?: number;
  /** 右にいくつ分のマスを飲み込むか */
  span?: number;
  /** 文字色 */
  color?: string;
};

type Table = {
  /** 列の幅 */
  cols: number[];
  rows: { height: number; cells: Cell[] }[];
};

/** 文字がマスに収まらないときだけ、収まる大きさまで詰める */
function fitText(ctx: CanvasRenderingContext2D, text: string, max: number, size: number, weight: 400 | 700) {
  let s = size;
  ctx.font = font(s, weight);
  while (ctx.measureText(text).width > max && s > 8) {
    s -= 1;
    ctx.font = font(s, weight);
  }
}

/** 表を描いて、使った高さを返す */
function drawTable(ctx: CanvasRenderingContext2D, table: Table, x0: number, y0: number): number {
  let y = y0;
  for (const row of table.rows) {
    let x = x0;
    let col = 0;
    for (const cell of row.cells) {
      const span = cell.span ?? 1;
      let w = 0;
      for (let i = 0; i < span; i += 1) w += table.cols[col + i] ?? 0;

      ctx.fillStyle = cell.bg ?? "#ffffff";
      ctx.fillRect(x, y, w, row.height);
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, row.height - 1);

      if (cell.text) {
        const size = cell.size ?? 15;
        const weight = cell.bold ? 700 : 400;
        fitText(ctx, cell.text, w - 10, size, weight);
        ctx.fillStyle = cell.color ?? INK;
        ctx.textBaseline = cell.sub ? "alphabetic" : "middle";
        const cy = cell.sub ? y + row.height / 2 + 2 : y + row.height / 2;
        const align = cell.align ?? "center";
        ctx.textAlign = align;
        const tx = align === "left" ? x + 8 : align === "right" ? x + w - 8 : x + w / 2;
        ctx.fillText(cell.text, tx, cy);
      }
      if (cell.sub) {
        ctx.font = font(11, 700);
        ctx.fillStyle = cell.subColor ?? "#c0392b";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(cell.sub, x + w / 2, y + row.height / 2 + 3);
      }

      x += w;
      col += span;
    }
    y += row.height;
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  return y - y0;
}

/** 表の全体の幅 */
function tableWidth(t: Table): number {
  return t.cols.reduce((a, b) => a + b, 0);
}

/** 表の全体の高さ */
function tableHeight(t: Table): number {
  return t.rows.reduce((a, r) => a + r.height, 0);
}

/** 見出し帯を描いて、使った高さを返す */
function drawTitle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  title: string,
  right: string,
): number {
  ctx.fillStyle = "#7a2e1e";
  ctx.fillRect(x, y, w, 56);
  ctx.fillStyle = "#ffffff";
  ctx.font = font(24, 700);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(title, x + 14, y + 29);
  ctx.font = font(17, 700);
  ctx.fillStyle = "#f2e2bf";
  ctx.textAlign = "right";
  ctx.fillText(right, x + w - 14, y + 29);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  return 56;
}

/** 数字を出す。未入力は空欄にして、紙と同じ「まだ書いていない」見た目にする */
function n(v: number | null | undefined): string {
  return v === null || v === undefined ? "" : String(v);
}

/** 組み上げた表を1枚のPNGにする */
async function paint(
  table: Table,
  title: string,
  right: string,
  note: string,
): Promise<Blob> {
  const w = tableWidth(table);
  const canvasW = w + PAD * 2;
  const canvasH = 56 + tableHeight(table) + PAD * 2 + (note ? 30 : 0) + 12;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW * SCALE;
  canvas.height = canvasH * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context が取れませんでした");
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasW, canvasH);

  let y = PAD;
  y += drawTitle(ctx, PAD, y, w, title, right);
  y += 12;
  y += drawTable(ctx, table, PAD, y);

  if (note) {
    ctx.font = font(13);
    ctx.fillStyle = INK_SOFT;
    ctx.textBaseline = "top";
    ctx.fillText(note, PAD, y + 8);
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("画像の書き出しに失敗しました"))),
      "image/png",
    );
  });
}

/* ------------------------------------------------------------------ */
/* 在庫表                                                              */
/* ------------------------------------------------------------------ */

/**
 * 在庫表のPNG。
 * 商品ごとに、プレーン／豆乳／抹茶／チョコの4系統ぶんの
 * 定数・現在庫数・作成個数・作成角数を並べる。紙と同じ並び。
 */
export async function renderSweetSheetPng(report: Report, settings: Settings): Promise<Blob> {
  const NAME_W = 190;
  const CELL_W = 76;
  const SUM_W = 116;
  const cols = [NAME_W, ...Array(SWEET_VARIANTS.length * 4).fill(CELL_W), SUM_W];

  const rows: Table["rows"] = [];

  // 系統の見出し行
  rows.push({
    height: 34,
    cells: [
      { text: "", bg: "#f3f3f3" },
      ...SWEET_VARIANTS.map((v) => ({
        text: v.name,
        span: 4,
        bold: true,
        bg: v.color === "#ffffff" ? "#f3f3f3" : v.color,
      })),
      { text: "", bg: "#ddebf7" },
    ],
  });

  // 列の見出し行
  rows.push({
    height: 40,
    cells: [
      { text: "商品名", bold: true, bg: "#f3f3f3" },
      ...SWEET_VARIANTS.flatMap((v) =>
        ["定数", "現在庫数", "作成個数", "作成角数"].map((t) => ({
          text: t,
          size: 13,
          bold: true,
          bg: v.color === "#ffffff" ? "#f3f3f3" : v.color,
        })),
      ),
      { text: "作成合計", size: 13, bold: true, bg: "#ddebf7" },
    ],
  });

  let sumPieces = 0;
  let sumBlocks = 0;

  for (const item of SWEET_ITEMS) {
    let rowPieces = 0;
    let rowBlocks = 0;
    const cells: Cell[] = [{ text: item.name, align: "left", size: 14, bold: true }];

    for (const v of SWEET_VARIANTS) {
      if (item.targets[v.id] === undefined) {
        // 紙でグレーに潰してある＝その生地は作らない
        cells.push(
          { bg: GREY },
          { bg: GREY },
          { bg: GREY },
          { bg: GREY },
        );
        continue;
      }
      const key = sweetKey(item.id, v.id);
      const e = report.sweets[key] ?? { stock: null, madePieces: null, madeBlocks: null };
      rowPieces += e.madePieces ?? 0;
      rowBlocks += e.madeBlocks ?? 0;
      cells.push(
        { text: String(sweetTarget(key, settings)), size: 14, color: INK_SOFT },
        { text: n(e.stock), size: 17, bold: true },
        { text: n(e.madePieces), size: 17, bold: true, bg: "#fce4d6" },
        { text: n(e.madeBlocks), size: 17, bold: true, bg: "#fce4d6" },
      );
    }

    sumPieces += rowPieces;
    sumBlocks += rowBlocks;
    cells.push({
      text: rowPieces || rowBlocks ? `${rowPieces}個 ${rowBlocks}角` : "",
      size: 13,
      bold: true,
      bg: "#ddebf7",
    });
    rows.push({ height: 40, cells });
  }

  // 合計行
  rows.push({
    height: 42,
    cells: [
      { text: "合計", bold: true, bg: "#f3f3f3" },
      ...SWEET_VARIANTS.flatMap((v) => {
        let p = 0;
        let b = 0;
        for (const item of SWEET_ITEMS) {
          if (item.targets[v.id] === undefined) continue;
          const e = report.sweets[sweetKey(item.id, v.id)];
          p += e?.madePieces ?? 0;
          b += e?.madeBlocks ?? 0;
        }
        return [
          { bg: "#f3f3f3" } as Cell,
          { bg: "#f3f3f3" } as Cell,
          { text: `${p}個`, bold: true, size: 15, bg: "#fce4d6" } as Cell,
          { text: `${b}角`, bold: true, size: 15, bg: "#fce4d6" } as Cell,
        ];
      }),
      { text: `${sumPieces}個 ${sumBlocks}角`, bold: true, size: 13, bg: "#ddebf7" },
    ],
  });

  return paint(
    { cols, rows },
    "在庫表",
    `${prettyDate(report.date)}　Age.3 嘉麻店`,
    "空欄は未入力です。グレーの欄はその生地の設定がない組み合わせです。",
  );
}

/* ------------------------------------------------------------------ */
/* 冷凍在庫（月〜日の1週間分）                                          */
/* ------------------------------------------------------------------ */

/**
 * 冷凍在庫のPNG。紙と同じく月〜日の1週間分を横に並べる。
 * 各マスの大きい数字が現在庫数、その下の赤い数字がその日の作成数。
 */
export async function renderCanSheetPng(
  report: Report,
  settings: Settings,
  /** その週の日報。日付をキーにしたもの。無い日は空欄になる */
  week: Record<string, Report>,
): Promise<Blob> {
  const days = weekOf(report.date);
  const NAME_W = 220;
  const TARGET_W = 130;
  const DAY_W = 96;
  const cols = [NAME_W, TARGET_W, ...Array(7).fill(DAY_W)];

  const rows: Table["rows"] = [];

  rows.push({
    height: 40,
    cells: [
      { text: "冷凍在庫", bold: true, bg: "#f3f3f3", align: "left" },
      { text: "絶対在庫数", bold: true, size: 14, bg: "#f3f3f3" },
      ...days.map((d) => ({
        text: `${weekdayOf(d)}`,
        sub: d.slice(5).replace("-", "/"),
        subColor: INK_SOFT,
        bold: true,
        size: 15,
        bg: d === report.date ? TODAY_BG : "#f3f3f3",
      })),
    ],
  });

  for (const g of CAN_GROUPS) {
    // グループの色帯
    rows.push({
      height: 34,
      cells: [
        { text: g.name, bold: true, align: "left", bg: g.color },
        { bg: g.color },
        ...days.map(() => ({ bg: g.color })),
      ],
    });

    for (const it of g.items) {
      const cells: Cell[] = [
        { text: it.name, align: "left", size: 14 },
        { text: it.targetLabel || "—", size: 15, bold: true, color: INK_SOFT },
      ];
      for (const d of days) {
        const r = week[d];
        const e = r?.cans[it.id];
        const made = e?.made ?? 0;
        cells.push({
          text: n(e?.stock),
          sub: made ? `+${made}` : undefined,
          size: 18,
          bold: true,
          bg: d === report.date ? TODAY_BG : undefined,
        });
      }
      rows.push({ height: 42, cells });
    }
  }

  // 目標は品目ごとに単位が違うので、合計は作成数だけ出す
  rows.push({
    height: 40,
    cells: [
      { text: "作成数 合計", bold: true, align: "left", bg: "#f3f3f3" },
      { bg: "#f3f3f3" },
      ...days.map((d) => {
        const r = week[d];
        const total = r ? Object.values(r.cans).reduce((s, c) => s + (c.made ?? 0), 0) : 0;
        return {
          text: total ? `${total}個` : "",
          bold: true,
          size: 15,
          bg: d === report.date ? TODAY_BG : "#f3f3f3",
        } as Cell;
      }),
    ],
  });

  // 設定で目標を変えている品目があると紙と数字が食い違うので、そのときだけ添える
  const changed = CAN_GROUPS.flatMap((g) => g.items).filter(
    (it) => canTarget(it.id, settings) !== it.target,
  );
  const note =
    "大きい数字＝現在庫数、赤い数字＝その日の作成数。色のついた列が今日です。" +
    (changed.length ? `　※目標を変更中：${changed.map((c) => c.name).join("・")}` : "");

  return paint({ cols, rows }, "冷凍在庫", `${prettyDate(report.date)} の週　Age.3 嘉麻店`, note);
}
