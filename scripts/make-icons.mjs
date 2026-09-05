/**
 * assets/icon.svg から public/ のアイコンを書き出す。
 *   node scripts/make-icons.mjs
 *
 * 生成物
 *   public/icon-192.png        … PWA（ホーム画面に追加）
 *   public/icon-512.png        … PWA・スプラッシュ
 *   public/apple-touch-icon.png… iOSのホーム画面（180px）
 *   public/favicon.png         … ブラウザのタブ（64px）
 *   public/icon-maskable-512.png … Android（外周を丸く切られる前提で内側78%に収めた版）
 *
 * 画像ライブラリを足したくないので、Chromium（Playwright）でSVGを開いて
 * その大きさのスクリーンショットを撮るだけにしてある。
 * playwright は本番の依存ではないため、無ければ `npm i -D playwright` で入れる。
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "assets/icon.svg"), "utf8");

const SIZES = [
  ["public/icon-512.png", 512, 1],
  ["public/icon-192.png", 192, 1],
  ["public/apple-touch-icon.png", 180, 1],
  ["public/favicon.png", 64, 1],
  // maskable はAndroidが外周を丸く切るので、内側78%に収めた版を別に用意する
  ["public/icon-maskable-512.png", 512, 0.78],
];

const browser = await chromium.launch();
for (const [out, size, scale] of SIZES) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:#fff}svg{display:block;width:${size}px;height:${size}px;transform:scale(${scale});transform-origin:center}</style>${svg}`,
    { waitUntil: "load" },
  );
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({ type: "png" });
  writeFileSync(join(root, out), buf);
  console.log(out, size + "px", Math.round(buf.length / 1024) + "KB");
  await page.close();
}
await browser.close();
