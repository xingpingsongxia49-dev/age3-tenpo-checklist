"use client";

import { useState, type ReactNode } from "react";

/**
 * 折りたためるセクション。
 *
 * 缶24品目・サンド19品目・商品32品目を全部開いたまま並べるとスマホでは長すぎるので、
 * 見出しに「今どうなっているか」を出したうえで畳んでおく。
 * 見出しだけ見て次に進めることが、現場では速さになる。
 */
export function Fold({
  title,
  emoji,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  emoji?: string;
  /** 畳んだままでも状況が分かる要約（バッジなど） */
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="card mb-3 overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="tap flex w-full items-center gap-2 px-4 py-3.5 text-left"
      >
        {emoji ? (
          <span aria-hidden className="text-xl leading-none">
            {emoji}
          </span>
        ) : null}
        <span className="flex-1 text-base font-bold">{title}</span>
        {summary}
        <span aria-hidden className={`text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open ? <div className="border-t border-line px-4 py-4">{children}</div> : null}
    </section>
  );
}
