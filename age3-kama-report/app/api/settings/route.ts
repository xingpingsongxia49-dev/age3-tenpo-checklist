import { NextResponse } from "next/server";

import { emptySettings } from "@/lib/calc";
import { dbGetSettings, dbSaveSettings, hasDb } from "@/lib/db";
import type { Settings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDb()) return NextResponse.json({ settings: emptySettings(), db: false });
  try {
    return NextResponse.json({ settings: await dbGetSettings(), db: true });
  } catch (e) {
    return NextResponse.json({ settings: emptySettings(), error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!hasDb()) return NextResponse.json({ ok: false, db: false }, { status: 503 });
  const body = (await req.json().catch(() => null)) as Settings | null;
  if (!body) return NextResponse.json({ ok: false, error: "body required" }, { status: 400 });
  try {
    await dbSaveSettings({ ...emptySettings(), ...body });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
