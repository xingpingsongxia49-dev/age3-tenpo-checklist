import { NextResponse } from "next/server";

import { dbDeleteReport, dbGetReport, hasDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ date: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { date } = await ctx.params;
  if (!hasDb()) return NextResponse.json({ report: null, db: false });
  try {
    return NextResponse.json({ report: await dbGetReport(date), db: true });
  } catch (e) {
    return NextResponse.json({ report: null, error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { date } = await ctx.params;
  if (!hasDb()) return NextResponse.json({ ok: false, db: false }, { status: 503 });
  try {
    await dbDeleteReport(date);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
