"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "日報入力", icon: "📝" },
  { href: "/history", label: "履歴", icon: "📚" },
  { href: "/dashboard", label: "分析", icon: "📊" },
  { href: "/settings", label: "設定", icon: "⚙️" },
];

/** 画面下のタブ。片手で親指が届く位置に置く */
export function Nav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-[560px] grid-cols-4">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`tap flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-bold ${
                  active ? "text-brand" : "text-ink-soft"
                }`}
              >
                <span aria-hidden className="text-xl leading-none">
                  {t.icon}
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
