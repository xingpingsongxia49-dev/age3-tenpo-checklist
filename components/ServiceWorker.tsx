"use client";

import { useEffect } from "react";

/** オフラインで開けるようにする。電波の弱い店舗の裏や地下でも動かすため */
export function ServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // 登録に失敗してもオンラインでは通常どおり動く
    });
  }, []);

  return null;
}
