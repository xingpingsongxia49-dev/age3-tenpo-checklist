import type { Metadata, Viewport } from "next";

import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Age.3 銀座店 売上報告",
  description: "売上・客数・口コミを、スマホだけで入力してLINEに送る売上報告アプリ",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#1f2b45",
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
