"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 報告書を描画してから印刷ダイアログを開く。
 *
 * 片付けのタイミングが肝。afterprint は「印刷ジョブを渡した時点」で発火するため、
 * それで報告書を畳むと、まだプレビューを見ている最中に中身が消える。
 * iOS Safari のプレビューはこれで真っ白／崩れた状態になる。
 * そこで afterprint では畳まず、利用者がアプリに戻って操作したときに畳む。
 * 画面上では常に非表示（@media print のときだけ出る）なので、
 * 残っていても見た目の実害は無い。
 */
export function usePrint(): {
  printing: boolean;
  print: () => void;
} {
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!printing) return;

    let done = false;
    let armed = false;
    let fallback: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      if (done) return;
      done = true;
      document.removeEventListener("pointerdown", onInteract, true);
      document.removeEventListener("keydown", onInteract, true);
      window.removeEventListener("afterprint", arm);
      if (fallback) clearTimeout(fallback);
      setPrinting(false);
    };

    function onInteract() {
      // 印刷シートを閉じてアプリに戻ってきた合図。ここで初めて畳む
      if (armed) finish();
    }

    function arm() {
      armed = true;
    }

    const run = async () => {
      // 描画が反映されるのを待つ
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      // 写真は端末内(IndexedDB)から非同期に読むので、img要素が現れる前に
      // 印刷を始めると空枠のまま出てしまう。報告書が「揃った」と言うまで待つ。
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        const doc = document.querySelector(".print-only [data-photos-ready]");
        if (!doc || doc.getAttribute("data-photos-ready") === "true") break;
        await new Promise((r) => setTimeout(r, 80));
      }
      if (done) return;

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

      window.addEventListener("afterprint", arm);
      document.addEventListener("pointerdown", onInteract, true);
      document.addEventListener("keydown", onInteract, true);

      // 印刷シートが出ないまま放置された場合の保険。
      // プレビューを見ている時間を十分に取る
      fallback = setTimeout(finish, 5 * 60_000);

      window.print();

      // 印刷シートを開かないブラウザ（afterprint が来ない）でも、
      // 一定時間後の操作で畳めるようにしておく
      setTimeout(arm, 2000);
    };

    void run();

    return () => {
      done = true;
      document.removeEventListener("pointerdown", onInteract, true);
      document.removeEventListener("keydown", onInteract, true);
      window.removeEventListener("afterprint", arm);
      if (fallback) clearTimeout(fallback);
    };
  }, [printing]);

  const print = useCallback(() => setPrinting(true), []);

  return { printing, print };
}
