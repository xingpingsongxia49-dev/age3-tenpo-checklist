"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * 報告書は body 直下に出す。
 * 印刷時は画面用UI（.app-shell）を display:none にするため、
 * その中に入れたままだと報告書ごと消えてしまう。
 *
 * ふだんは画面に出さない（@media print のときだけ出る）。
 * preview を立てると画面上にも出す。印刷に対応していないブラウザ
 * （LINEのアプリ内ブラウザ等）で中身を確認・共有するための逃げ道。
 */
export function PrintPortal({
  children,
  preview = false,
}: {
  children: React.ReactNode;
  preview?: boolean;
}) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.className = "print-only";
    document.body.appendChild(el);
    setHost(el);
    return () => {
      el.remove();
    };
  }, []);

  useEffect(() => {
    if (!host) return;
    host.classList.toggle("print-preview", preview);
    // プレビュー中は裏の画面がスクロールしないようにする
    document.body.style.overflow = preview ? "hidden" : "";
    if (!preview) return;

    // A4の刷り面(190mm)＋左右の余白(8mm×2)を、画面幅に収まる倍率に縮める
    const fit = () => {
      const sheetPx = (190 + 16) * (96 / 25.4);
      const zoom = Math.min(1, (window.innerWidth - 20) / sheetPx);
      host.style.setProperty("--preview-zoom", String(Math.max(0.2, zoom)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      document.body.style.overflow = "";
    };
  }, [host, preview]);

  if (!host) return null;
  return createPortal(children, host);
}
