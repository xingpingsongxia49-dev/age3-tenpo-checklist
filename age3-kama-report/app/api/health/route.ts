import { NextResponse } from "next/server";

import { hasDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 画面側が「サーバーに保存できるか」を判断するための問い合わせ先 */
export async function GET() {
  return NextResponse.json({ db: hasDb() });
}
