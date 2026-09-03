import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  ADMIN_COOKIE,
  AUTH_COOKIE,
  expectedAdminPasscode,
  expectedPasscode,
  hashPasscode,
} from "./lib/auth";

/** PIN無しで通す入口。ログイン画面と、その判定APIと、アイコン類 */
const PUBLIC = new Set([
  "/login",
  "/api/auth",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  // app/icon.png から Next.js が作るタブ用アイコン。
  // ここを通しておかないとログイン画面でファビコンが出ない
  "/icon.png",
]);

/** 設定画面の中で、管理PINを入れるためのページだけは入店PINだけで通す */
const UNLOCK_PATH = "/settings/unlock";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.has(pathname)) return NextResponse.next();

  const isApi = pathname.startsWith("/api/");

  // 1段目：入店PIN
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token || token !== (await hashPasscode(expectedPasscode(), "app"))) {
    if (isApi) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // 2段目：管理PIN。設定画面と、設定の書き込みだけに要る
  const needsAdmin =
    (pathname === "/settings" || (pathname.startsWith("/settings/") && pathname !== UNLOCK_PATH)) ||
    // 分析は売上と人員の話なので、現場ではなく管理側だけが見る
    pathname === "/dashboard" ||
    (pathname === "/api/settings" && req.method !== "GET") ||
    // 日報を消すのは取り返しがつかないので、設定と同じ管理PINを要求する
    (pathname.startsWith("/api/reports") && req.method === "DELETE") ||
    // 管理者しか見てはいけないもの（PINの確認など）
    pathname.startsWith("/api/admin");

  if (needsAdmin) {
    const admin = req.cookies.get(ADMIN_COOKIE)?.value;
    if (!admin || admin !== (await hashPasscode(expectedAdminPasscode(), "admin"))) {
      if (isApi) return NextResponse.json({ error: "admin required" }, { status: 401 });
      const url = req.nextUrl.clone();
      url.pathname = UNLOCK_PATH;
      // 解錠したあと、開こうとしていた画面に戻れるようにする
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
