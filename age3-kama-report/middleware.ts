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
    (pathname === "/api/settings" && req.method !== "GET");

  if (needsAdmin) {
    const admin = req.cookies.get(ADMIN_COOKIE)?.value;
    if (!admin || admin !== (await hashPasscode(expectedAdminPasscode(), "admin"))) {
      if (isApi) return NextResponse.json({ error: "admin required" }, { status: 401 });
      const url = req.nextUrl.clone();
      url.pathname = UNLOCK_PATH;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
