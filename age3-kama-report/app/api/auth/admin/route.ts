import { NextResponse } from "next/server";

import { ADMIN_COOKIE, expectedAdminPasscode, hashPasscode } from "@/lib/auth";

export const runtime = "nodejs";

/** 設定画面の管理PIN。ここに届く時点で入店PINは middleware が確かめている */
export async function POST(req: Request) {
  const { passcode } = (await req.json().catch(() => ({}))) as { passcode?: string };
  if (!passcode || passcode.trim() !== expectedAdminPasscode()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await hashPasscode(expectedAdminPasscode(), "admin"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // 設定はたまにしか触らないので、入店PINより短く1日で切れるようにする
    maxAge: 60 * 60 * 24,
  });
  return res;
}

/** 設定画面に鍵を掛け直す */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
