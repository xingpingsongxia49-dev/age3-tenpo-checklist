import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AUTH_COOKIE, expectedPasscode, hashPasscode } from "./lib/auth";

/** パスコード無しで通す入口。ログイン画面と、その判定APIと、アイコン類 */
const PUBLIC = ["/login", "/api/auth", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (token && token === (await hashPasscode(expectedPasscode()))) {
    return NextResponse.next();
  }

  // APIは中身を返さず401。画面はログインに飛ばし、戻り先を覚えておく
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
