import { NextResponse } from "next/server";

import { hasDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 画面側が「サーバーに保存できるか」を判断するための問い合わせ先。
 * あわせて、PINが環境変数で設定されているかも返す。
 * 設定されていないとコードの初期値が使われるので、設定画面で気づけるようにする。
 * PINの値そのものは返さない。
 */
export async function GET() {
  return NextResponse.json({
    db: hasDb(),
    appPasscodeFromEnv: Boolean(process.env.APP_PASSCODE),
    adminPasscodeFromEnv: Boolean(process.env.ADMIN_PASSCODE),
  });
}
