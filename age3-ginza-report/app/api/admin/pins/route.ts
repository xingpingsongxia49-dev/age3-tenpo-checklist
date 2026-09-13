import { NextResponse } from "next/server";

import { ADMIN_PASSCODE, APP_PASSCODE } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 今このアプリで使えるPIN。設定画面で忘れたときに確認するためのもの。
 *
 * middleware が /api/admin/ 以下に管理PINを要求しているので、
 * 入店PINしか持っていない人には届かない。ここを /api/health に置いていたときは
 * 入店PINだけで管理PINが読めてしまい、2段階にした意味が無くなっていた。
 */
export async function GET() {
  return NextResponse.json({ appPasscode: APP_PASSCODE, adminPasscode: ADMIN_PASSCODE });
}
