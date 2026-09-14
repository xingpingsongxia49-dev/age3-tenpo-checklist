import { NextResponse } from "next/server";

import { normalizeExpense } from "@/lib/calc";
import { dbDeleteAllExpenses, dbListExpenses, dbSaveExpense, hasDb } from "@/lib/db";
import type { Expense } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDb()) return NextResponse.json({ expenses: [], db: false });
  try {
    return NextResponse.json({ expenses: await dbListExpenses(), db: true });
  } catch (e) {
    return NextResponse.json({ error: String(e), expenses: [], db: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ ok: false, db: false }, { status: 503 });
  const body = (await req.json().catch(() => null)) as Expense | null;
  if (!body?.id || !body?.date) {
    return NextResponse.json({ ok: false, error: "id and date required" }, { status: 400 });
  }
  try {
    await dbSaveExpense(normalizeExpense(body));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

/**
 * 経費を全部消す。
 * middleware で管理PINを要求しているので、ここに届く時点で確認は済んでいる。
 */
export async function DELETE() {
  if (!hasDb()) return NextResponse.json({ ok: false, db: false }, { status: 503 });
  try {
    return NextResponse.json({ ok: true, deleted: await dbDeleteAllExpenses() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
