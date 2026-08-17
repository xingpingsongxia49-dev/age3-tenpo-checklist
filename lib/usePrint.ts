"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 報告書を描画してから印刷ダイアログを開く。
 * - 写真の読み込みが終わる前に印刷すると空欄のまま出るので、画像が揃うまで待つ。
 * - 片付けは afterprint を待つ。window.print() の直後に畳むと、
 *   印刷を非同期に処理するブラウザで中身が消えたまま出力されることがある。
 */
export function usePrint(): {
  printing: boolean;
  print: () => void;
} {
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!printing) return;

    let done = false;
    let fallback: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener("afterprint", finish);
      if (fallback) clearTimeout(fallback);
      setPrinting(false);
    };

    const run = async () => {
      // 描画が反映されるのを待つ
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      const root = document.querySelector(".print-only");
      if (root) {
        const imgs = Array.from(root.querySelectorAll("img"));
        await Promise.all(
          imgs.map((img) =>
            img.complete && img.naturalWidth > 0
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  const ok = () => resolve();
                  img.addEventListener("load", ok, { once: true });
                  img.addEventListener("error", ok, { once: true });
                  // 読み込めない写真があっても報告書は出す
                  setTimeout(ok, 4000);
                }),
          ),
        );
      }

      try {
        await document.fonts?.ready;
      } catch {
        // フォント待ちに失敗しても印刷自体は続行する
      }

      if (done) return;

      window.addEventListener("afterprint", finish);
      // afterprint を発火させないブラウザ向けの保険
      fallback = setTimeout(finish, 60_000);

      window.print();
    };

    void run();

    return () => {
      done = true;
      window.removeEventListener("afterprint", finish);
      if (fallback) clearTimeout(fallback);
    };
  }, [printing]);

  const print = useCallback(() => setPrinting(true), []);

  return { printing, print };
}
