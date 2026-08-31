import type { Metadata, Viewport } from "next";

import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Age.3 嘉麻店 日報",
  description: "在庫・製造・シフト・売上を、スマホだけで入力してLINEに送る日報アプリ",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#7a2e1e",
  width: "device-width",
  initialScale: 1,
  // 入力欄が小さく見えると困るので拡大は許可する
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="mx-auto min-h-dvh w-full max-w-[560px] pb-28">{children}</div>
        <Nav />
      </body>
    </html>
  );
}
