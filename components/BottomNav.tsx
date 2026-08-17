"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const TABS = [
  { href: "/", label: "ホーム", icon: "▤" },
  { href: "/check", label: "チェック", icon: "✓" },
  { href: "/issues", label: "要改善", icon: "！" },
  { href: "/result", label: "結果", icon: "％" },
  { href: "/records", label: "記録", icon: "▦" },
];

function Tabs() {
  const pathname = usePathname();
  const params = useSearchParams();
  const store = params.get("store");
  const qs = store ? `?store=${encodeURIComponent(store)}` : "";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-screen-sm border-t border-[var(--color-line)] bg-white">
      <ul className="safe-bottom grid grid-cols-5">
        {TABS.map((t) => {
          const active = pathname === t.href;
          // 店舗に紐づく画面は選択中の店舗を引き継ぐ
          const href = t.href === "/records" || t.href === "/" ? t.href : `${t.href}${qs}`;
          return (
            <li key={t.href}>
              <Link
                href={href}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${
                  active
                    ? "text-[var(--color-gold-dark)]"
                    : "text-[var(--color-ink-sub)]"
                }`}
              >
                <span
                  aria-hidden
                  className={`text-base leading-none ${active ? "" : "opacity-70"}`}
                >
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

export function BottomNav() {
  return (
    <Suspense fallback={null}>
      <Tabs />
    </Suspense>
  );
}
