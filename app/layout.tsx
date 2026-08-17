import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { BottomNav } from "@/components/BottomNav";
import { ServiceWorker } from "@/components/ServiceWorker";

export const metadata: Metadata = {
  title: "Age.3 店舗チェック",
  description: "銀座・原宿・浅草の店舗チェックリスト（加重スコア・是正管理）",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Age.3 チェック",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#c9a227",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-dvh bg-white text-[var(--color-ink)]">
        <StoreProvider>
          <div className="mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col">
            <main className="flex-1 pb-24">{children}</main>
            <BottomNav />
          </div>
          <ServiceWorker />
        </StoreProvider>
      </body>
    </html>
  );
}
