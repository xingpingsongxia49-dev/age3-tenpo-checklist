import { NextResponse } from "next/server";

import { dbDeleteExpense, hasDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasDb()) return NextResponse.json({ ok: false, db: false }, { status: 503 });
  const { id } = await ctx.params;
  try {
    await dbDeleteExpense(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
