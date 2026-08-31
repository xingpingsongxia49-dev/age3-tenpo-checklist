import { NextResponse } from "next/server";

import { normalizeReport } from "@/lib/calc";
import { dbDeleteAllReports, dbListReports, dbSaveReport, hasDb } from "@/lib/db";
import type { Report } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDb()) return NextResponse.json({ reports: [], db: false });
  try {
    return NextResponse.json({ reports: await dbListReports(), db: true });
  } catch (e) {
    return NextResponse.json({ error: String(e), reports: [], db: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ ok: false, db: false }, { status: 503 });
  const body = (await req.json().catch(() => null)) as Report | null;
  if (!body?.date) return NextResponse.json({ ok: false, error: "date required" }, { status: 400 });
  try {
    await dbSaveReport(normalizeReport(body));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

/**
 * 日報を全部消す。設定（スタッフ名・目標数・商品名）は消さない。
 * middleware で管理PINを要求しているので、ここに届く時点で確認は済んでいる。
 */
export async function DELETE() {
  if (!hasDb()) return NextResponse.json({ ok: false, db: false }, { status: 503 });
  try {
    return NextResponse.json({ ok: true, deleted: await dbDeleteAllReports() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
