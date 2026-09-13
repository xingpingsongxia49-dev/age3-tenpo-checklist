import { NextResponse } from "next/server";

import { hasDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 画面側が「サーバーに保存できるか」を判断するための問い合わせ先。
 * 入店PINさえあれば誰でも叩けるので、秘密は載せない。
 * PINの確認は管理PINが要る /api/admin/pins にある。
 */
export async function GET() {
  return NextResponse.json({ db: hasDb() });
}
