"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * 報告書は body 直下に出す。
 * 印刷時は画面用UI（.app-shell）を display:none にするため、
 * その中に入れたままだと報告書ごと消えてしまう。
 */
export function PrintPortal({ children }: { children: React.ReactNode }) {
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

  if (!host) return null;
  return createPortal(children, host);
}
