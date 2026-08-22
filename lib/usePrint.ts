"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 報告書を印刷ダイアログに渡す。
 *
 * iPhone対策その1：window.print() は「利用者が押した操作の中」で呼ばないと、
 * iOS Safari が黙って無視する。写真の読み込みを待ってから呼ぶと待ち時間の分だけ
 * 操作から離れてしまい、ボタンを押しても何も起きない。
 * そのため報告書は常に（画面には出さずに）置いておき、写真が揃っていれば
 * ボタンを押したその場で同期的に print() を呼ぶ。
 * 揃っていないときだけ、従来どおり待ってから呼ぶ。
 *
 * iPhone対策その2：印刷そのものに対応していないブラウザがある
 * （LINEやInstagramのアプリ内ブラウザ、ホーム画面に追加したPWA）。
 * 押しても何も出ないので、呼んだあと印刷が始まった気配が無ければ
 * 「出なかった」ことを外に伝え、画面プレビューや画像保存に逃がす。
 *
 * 片付けのタイミングも肝。afterprint は「印刷ジョブを渡した時点」で発火するため、
 * それで報告書を畳むと、まだプレビューを見ている最中に中身が消える。
 * そこで afterprint では畳まず、利用者がアプリに戻って操作したときに畳む。
 */
export function usePrint(): {
  /** 写真の読み込み待ちで、まだ印刷を呼べていない */
  printing: boolean;
  /** 印刷を呼んだのに印刷シートが出た気配が無かった */
  printFailed: boolean;
  print: () => void;
  clearFailed: () => void;
} {
  const [printing, setPrinting] = useState(false);
  const [printFailed, setPrintFailed] = useState(false);
  const teardown = useRef<(() => void) | null>(null);

  /** 印刷シートを閉じてアプリに戻ってきたときに片付ける仕掛けを張る */
  const armTeardown = useCallback(() => {
    teardown.current?.();

    let armed = false;
    let sawPrint = false;

    const onBefore = () => {
      sawPrint = true;
    };
    const arm = () => {
      sawPrint = true;
      armed = true;
    };
    const onInteract = () => {
      if (armed) stop();
    };
    const stop = () => {
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint", arm);
      document.removeEventListener("pointerdown", onInteract, true);
      document.removeEventListener("keydown", onInteract, true);
      clearTimeout(late);
      clearTimeout(check);
      teardown.current = null;
      setPrinting(false);
    };

    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", arm);
    document.addEventListener("pointerdown", onInteract, true);
    document.addEventListener("keydown", onInteract, true);

    // 印刷シートを出さないブラウザでも、しばらく後の操作で畳めるようにする
    const late = setTimeout(arm, 2500);
    // 印刷に対応していないブラウザの検出。before/afterprint も
    // 画面のちらつきも無ければ「出なかった」とみなす
    const check = setTimeout(() => {
      if (!sawPrint) setPrintFailed(true);
    }, 1200);

    teardown.current = stop;
  }, []);

  /** 報告書が印刷できる状態か（中身があり、写真が全部そろっている） */
  const reportReady = () => {
    const root = document.querySelector(".print-only");
    if (!root?.firstElementChild) return false;
    // 写真を載せる報告書だけが data-photos-ready を持つ。全店レポートには無い
    const doc = root.querySelector("[data-photos-ready]");
    if (doc && doc.getAttribute("data-photos-ready") !== "true") return false;
    return Array.from(root.querySelectorAll("img")).every(
      (img) => img.complete && img.naturalWidth > 0,
    );
  };

  const print = useCallback(() => {
    setPrintFailed(false);
    if (reportReady()) {
      // 利用者の操作の中で同期的に呼ぶ（iOSはこれを外すと無視される）
      armTeardown();
      window.print();
      return;
    }
    setPrinting(true);
  }, [armTeardown]);

  // 写真がまだ読めていないときだけ、待ってから印刷する
  useEffect(() => {
    if (!printing) return;
    let cancelled = false;

    const run = async () => {
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline && !reportReady()) {
        await new Promise((r) => setTimeout(r, 80));
      }
      try {
        await document.fonts?.ready;
      } catch {
        // フォント待ちに失敗しても印刷自体は続行する
      }
      if (cancelled) return;
      armTeardown();
      window.print();
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [printing, armTeardown]);

  useEffect(() => () => teardown.current?.(), []);

  const clearFailed = useCallback(() => setPrintFailed(false), []);

  return { printing, printFailed, print, clearFailed };
}
