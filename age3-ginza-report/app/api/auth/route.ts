import { NextResponse } from "next/server";

import { ADMIN_COOKIE, AUTH_COOKIE, expectedPasscode, hashPasscode } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { passcode } = (await req.json().catch(() => ({}))) as { passcode?: string };
  if (!passcode || passcode.trim() !== expectedPasscode()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await hashPasscode(expectedPasscode(), "app"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // 店舗の端末で毎日入力するので、そう何度も聞かれないよう90日
    maxAge: 60 * 60 * 24 * 90,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  // 出るときは設定画面のロックも一緒に掛け直す
  res.cookies.delete(AUTH_COOKIE);
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
