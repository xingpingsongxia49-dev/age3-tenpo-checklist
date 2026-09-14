"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "売上", icon: "📝" },
  { href: "/expenses", label: "経費", icon: "🧾" },
  { href: "/history", label: "履歴", icon: "📚" },
  { href: "/dashboard", label: "分析", icon: "📊" },
  { href: "/settings", label: "設定", icon: "⚙️" },
];

/** 画面下のタブ。親指の届く位置に置く */
export function Nav() {
  const pathname = usePathname();
  // ログイン画面と解錠画面では出さない。まだ中に入れていないので行き先がない
  if (pathname === "/login" || pathname === "/settings/unlock") return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-[560px] grid-cols-5">
        {TABS.map((t) => {
          const on = t.href === "/" ? pathname === "/" || pathname === "/preview" : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`tap flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold ${
                  on ? "text-brand" : "text-ink-soft"
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
