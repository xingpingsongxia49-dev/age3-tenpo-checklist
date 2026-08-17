/**
 * 視察結果を1枚の画像にする。LINEに画像で送れると現場で効くため、
 * 外部ライブラリに頼らずcanvasに直接描いている（オフラインでも確実に動く）。
 */

import { answerOf, itemsForStore, pct, summarize, VERDICT_LABEL } from "./score";
import type { Inspection } from "./types";

const W = 1080;
const PAD = 56;
const BROWN = "#3E2C23";
const BROWN2 = "#5A4234";
const SUB = "#8A7A6D";
const LINE = "#E7DED5";
const NG = "#A33A2E";
const MID = "#8A6D22";
const OK = "#2F6B46";

const FONT = `-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", sans-serif`;

function font(size: number, weight: 400 | 700 = 400) {
  return `${weight} ${size}px ${FONT}`;
}

/** 日本語は単語境界が無いので1文字ずつ測って折り返す */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const ch of text) {
    if (ch === "\n") {
      lines.push(cur);
      cur = "";
      continue;
    }
    if (ctx.measureText(cur + ch).width > maxWidth && cur !== "") {
      lines.push(cur);
      cur = ch;
    } else {
      cur += ch;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function renderReportImage(inspection: Inspection): HTMLCanvasElement {
  const s = summarize(inspection);
  const items = itemsForStore(inspection.store);

  const issues = items
    .map((item) => ({ item, a: answerOf(inspection, item.id) }))
    .filter(({ a }) => a.judgement === "×" || a.judgement === "△")
    .sort((x, y) => {
      const jr = (j: string | null) => (j === "×" ? 0 : 1);
      const wr = { S: 0, A: 1, B: 2 } as const;
      return (
        jr(x.a.judgement) - jr(y.a.judgement) ||
        wr[x.item.weight] - wr[y.item.weight] ||
        x.item.id - y.item.id
      );
    });

  // 先に高さを測る
  const measure = document.createElement("canvas").getContext("2d")!;
  const contentW = W - PAD * 2;

  let h = 0;
  h += 150; // ヘッダー
  h += 40 + 96 + 30 + 20 + 46; // スコア・バー・内訳
  if (s.criticalBatsu > 0) h += 76;
  h += 48 + s.categories.filter((c) => c.rate !== null).length * 50 + 24; // カテゴリ

  const issueBlocks: { head: string[]; note: string[]; meta: string | null }[] = [];
  if (issues.length > 0) {
    h += 60;
    for (const { item, a } of issues) {
      measure.font = font(25, 700);
      const head = wrap(measure, `${a.judgement} [${item.weight}] ${item.text}`, contentW - 20);
      measure.font = font(23);
      const note = a.note ? wrap(measure, `事実：${a.note}`, contentW - 40) : [];
      const meta =
        a.judgement === "×"
          ? `担当：${a.owner || "未定（要記入）"}／期限：${a.due || "未定（要記入）"}`
          : null;
      issueBlocks.push({ head, note, meta });
      h += head.length * 34 + note.length * 32 + (meta ? 32 : 0) + 22;
    }
  }
  h += 92; // フッター

  const canvas = document.createElement("canvas");
  const dpr = 2;
  canvas.width = W * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // 背景
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, h);

  // ヘッダー（濃茶に白抜き）
  ctx.fillStyle = BROWN;
  ctx.fillRect(0, 0, W, 150);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = font(38, 700);
  ctx.fillText("Age.3 店舗チェック", PAD, 66);
  ctx.fillStyle = "#D9C9BC";
  ctx.font = font(26);
  ctx.fillText(
    `${inspection.store}店　${inspection.date}　視察者：${inspection.inspector || "—"}`,
    PAD,
    110,
  );

  let y = 150 + 56;

  // 総合スコア
  ctx.fillStyle = SUB;
  ctx.font = font(24);
  ctx.fillText("総合スコア（加重）", PAD, y);

  const verdictInk =
    s.verdict === "green" ? OK : s.verdict === "yellow" ? MID : NG;
  ctx.fillStyle = verdictInk;
  ctx.font = font(30, 700);
  const vLabel = VERDICT_LABEL[s.verdict];
  ctx.fillText(vLabel, W - PAD - ctx.measureText(vLabel).width, y);

  y += 62;
  ctx.fillStyle = BROWN;
  ctx.font = font(76, 700);
  ctx.fillText(pct(s.weightedRate), PAD, y);

  ctx.fillStyle = SUB;
  ctx.font = font(24);
  ctx.fillText(`単純○率（参考）${pct(s.simpleRate, 1)}`, PAD + 220, y - 8);

  y += 30;
  // 進捗バー
  const barW = contentW;
  ctx.fillStyle = "#EFE9E3";
  ctx.beginPath();
  ctx.roundRect(PAD, y, barW, 12, 6);
  ctx.fill();
  const grad = ctx.createLinearGradient(PAD, 0, PAD + barW, 0);
  grad.addColorStop(0, "#6B4E3A");
  grad.addColorStop(1, "#3E2C23");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(PAD, y, Math.max(6, barW * (s.weightedRate ?? 0)), 12, 6);
  ctx.fill();

  y += 46;
  ctx.font = font(25, 700);
  const chips: [string, string][] = [
    [`✓ ○ ${s.maru}`, OK],
    [`！ △ ${s.sankaku}`, MID],
    [`✕ × ${s.batsu}`, NG],
    [`— 対象外 ${s.excluded}`, SUB],
    [`未入力 ${s.unanswered}`, SUB],
  ];
  let cx = PAD;
  for (const [label, color] of chips) {
    ctx.fillStyle = color;
    ctx.fillText(label, cx, y);
    cx += ctx.measureText(label).width + 34;
  }

  y += 42;

  // S項目の×は別枠で強調する
  if (s.criticalBatsu > 0) {
    ctx.fillStyle = "#FBEEEC";
    ctx.beginPath();
    ctx.roundRect(PAD, y, contentW, 60, 12);
    ctx.fill();
    ctx.strokeStyle = NG;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(PAD, y, contentW, 60, 12);
    ctx.stroke();
    ctx.fillStyle = NG;
    ctx.font = font(26, 700);
    ctx.fillText(
      `✕ S項目の×が${s.criticalBatsu}件。総合何%でも赤。その場で是正。`,
      PAD + 20,
      y + 38,
    );
    y += 76;
  }

  // カテゴリ別
  ctx.fillStyle = BROWN;
  ctx.font = font(27, 700);
  ctx.fillText("カテゴリ別 加重達成率", PAD, y + 30);
  y += 48;

  for (const c of s.categories.filter((c) => c.rate !== null)) {
    ctx.fillStyle = BROWN2;
    ctx.font = font(24);
    ctx.fillText(c.category, PAD, y + 22);

    const rateLabel = pct(c.rate);
    ctx.fillStyle = BROWN;
    ctx.font = font(24, 700);
    ctx.fillText(rateLabel, W - PAD - ctx.measureText(rateLabel).width, y + 22);

    const detail = `○${c.maru} △${c.sankaku} ×${c.batsu}`;
    ctx.fillStyle = SUB;
    ctx.font = font(21);
    ctx.fillText(detail, W - PAD - 90 - ctx.measureText(detail).width, y + 22);

    ctx.fillStyle = "#EFE9E3";
    ctx.beginPath();
    ctx.roundRect(PAD, y + 34, barW, 7, 4);
    ctx.fill();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(PAD, y + 34, Math.max(4, barW * (c.rate ?? 0)), 7, 4);
    ctx.fill();

    y += 50;
  }

  y += 24;

  // 要改善リスト
  if (issueBlocks.length > 0) {
    ctx.fillStyle = BROWN;
    ctx.font = font(27, 700);
    ctx.fillText(`要改善（×と△／${issues.length}件）`, PAD, y + 30);
    y += 60;

    issueBlocks.forEach((block, i) => {
      const a = issues[i].a;
      const ink = a.judgement === "×" ? NG : MID;
      ctx.fillStyle = ink;
      ctx.font = font(25, 700);
      for (const line of block.head) {
        ctx.fillText(line, PAD, y + 24);
        y += 34;
      }
      ctx.fillStyle = SUB;
      ctx.font = font(23);
      for (const line of block.note) {
        ctx.fillText(line, PAD + 20, y + 22);
        y += 32;
      }
      if (block.meta) {
        ctx.fillStyle = BROWN2;
        ctx.font = font(23);
        ctx.fillText(block.meta, PAD + 20, y + 22);
        y += 32;
      }
      y += 22;
    });
  }

  // フッター
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, h - 74);
  ctx.lineTo(W - PAD, h - 74);
  ctx.stroke();
  ctx.fillStyle = SUB;
  ctx.font = font(20);
  ctx.fillText("判定 ○=1.0／△=0.5／×=0　重み S=5／A=3／B=1", PAD, h - 44);
  ctx.fillText(
    "80%以上=緑・60〜79%=黄・60%未満=赤。S項目に×が1件でもあれば総合何%でも赤。",
    PAD,
    h - 16,
  );

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/**
 * 画像を共有する。共有シートが使える端末ではLINEに直接送れる。
 * 使えない場合はダウンロードに落とす。
 */
export async function shareReportImage(
  inspection: Inspection,
): Promise<"shared" | "downloaded" | "failed"> {
  try {
    const canvas = renderReportImage(inspection);
    const blob = await canvasToBlob(canvas);
    if (!blob) return "failed";

    const filename = `Age3_${inspection.store}_${inspection.date}.png`;
    const file = new File([blob], filename, { type: "image/png" });

    const nav = navigator as Navigator & {
      canShare?: (data: { files: File[] }) => boolean;
    };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: `${inspection.store} 店舗チェック` });
      return "shared";
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "downloaded";
  } catch (e) {
    // 共有シートをユーザーが閉じただけの場合はエラー扱いにしない
    if (e instanceof DOMException && e.name === "AbortError") return "shared";
    return "failed";
  }
}
