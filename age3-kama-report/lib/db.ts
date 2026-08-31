import { sql } from "@vercel/postgres";

import { emptySettings, normalizeReport } from "./calc";
import type { Report, Settings } from "./types";

/**
 * 日報の保存先。
 *
 * POSTGRES_URL が入っていればサーバー側のDBに、入っていなければ何もしない。
 * DBを繋がなくてもアプリは動く（その場合はブラウザの localStorage が保存先になる）。
 * 店舗で先に使い始めて、あとからVercel側でDBを足す、という順番にできるようにしてある。
 */
export function hasDb(): boolean {
  return Boolean(process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING);
}

let ready: Promise<void> | null = null;

/** 初回アクセス時にテーブルを作る。マイグレーションを回さずに済ませるための割り切り */
function ensureTables(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS reports (
          date TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS app_settings (
          id INT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
    })().catch((e) => {
      // 次のリクエストでやり直せるように、失敗したら覚えておかない
      ready = null;
      throw e;
    });
  }
  return ready;
}

export async function dbListReports(limit = 120): Promise<Report[]> {
  await ensureTables();
  const { rows } = await sql<{ data: Report }>`
    SELECT data FROM reports ORDER BY date DESC LIMIT ${limit}
  `;
  return rows.map((r) => normalizeReport(r.data));
}

export async function dbGetReport(date: string): Promise<Report | null> {
  await ensureTables();
  const { rows } = await sql<{ data: Report }>`
    SELECT data FROM reports WHERE date = ${date}
  `;
  return rows[0] ? normalizeReport(rows[0].data) : null;
}

export async function dbSaveReport(report: Report): Promise<void> {
  await ensureTables();
  await sql`
    INSERT INTO reports (date, data, updated_at)
    VALUES (${report.date}, ${JSON.stringify(report)}::jsonb, now())
    ON CONFLICT (date) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
  `;
}

export async function dbDeleteReport(date: string): Promise<void> {
  await ensureTables();
  await sql`DELETE FROM reports WHERE date = ${date}`;
}

export async function dbGetSettings(): Promise<Settings> {
  await ensureTables();
  const { rows } = await sql<{ data: Settings }>`
    SELECT data FROM app_settings WHERE id = 1
  `;
  return rows[0] ? { ...emptySettings(), ...rows[0].data } : emptySettings();
}

export async function dbSaveSettings(settings: Settings): Promise<void> {
  await ensureTables();
  await sql`
    INSERT INTO app_settings (id, data, updated_at)
    VALUES (1, ${JSON.stringify(settings)}::jsonb, now())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
  `;
}
