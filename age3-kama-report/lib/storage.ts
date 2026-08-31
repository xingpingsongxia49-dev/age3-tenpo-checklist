"use client";

import { emptySettings, normalizeReport } from "./calc";
import type { Report, Settings } from "./types";

/**
 * 画面から見た保存先。
 *
 * まず端末内（localStorage）に必ず書く。電波が切れても入力が消えないため。
 * そのうえでサーバー（/api/reports）にも送る。DBが繋がっていればそこに残り、
 * 繋がっていなければサーバーが「使えない」と返すので端末内だけの保存になる。
 * 読むときはサーバーを優先し、駄目なら端末内に落とす。
 */

const REPORT_KEY = "age3-kama-report:reports";
const SETTINGS_KEY = "age3-kama-report:settings";

/** サーバーにDBが繋がっているか。1回問い合わせたら覚えておく */
let remoteOk: boolean | null = null;

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 容量超過など。端末内に書けなくてもサーバー保存は続ける
  }
}

function localReports(): Record<string, Report> {
  return readLocal<Record<string, Report>>(REPORT_KEY, {});
}

/** サーバーが使えるかどうか。使えないと分かっている間は無駄に叩かない */
export async function remoteAvailable(): Promise<boolean> {
  if (remoteOk !== null) return remoteOk;
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    const json = (await res.json()) as { db?: boolean };
    remoteOk = Boolean(json.db);
  } catch {
    remoteOk = false;
  }
  return remoteOk;
}

/** 指定日の日報。無ければ null */
export async function loadReport(date: string): Promise<Report | null> {
  if (await remoteAvailable()) {
    try {
      const res = await fetch(`/api/reports/${date}`, { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { report: Report | null };
        if (json.report) return normalizeReport(json.report);
      }
    } catch {
      // サーバーが落ちていても端末内で続けられる
    }
  }
  const local = localReports()[date];
  return local ? normalizeReport(local) : null;
}

/** 日報を保存する。返り値はサーバーにも残せたかどうか */
export async function saveReport(report: Report): Promise<boolean> {
  const stamped: Report = { ...report, updatedAt: new Date().toISOString() };
  const all = localReports();
  all[stamped.date] = stamped;
  writeLocal(REPORT_KEY, all);

  if (!(await remoteAvailable())) return false;
  try {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(stamped),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** 日付の新しい順に並んだ日報の一覧 */
export async function listReports(): Promise<Report[]> {
  const local = Object.values(localReports()).map(normalizeReport);
  if (await remoteAvailable()) {
    try {
      const res = await fetch("/api/reports", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { reports: Report[] };
        // サーバーにあるものを正とし、サーバーにまだ無い端末内の日報だけ足す
        const merged = new Map<string, Report>();
        for (const r of local) merged.set(r.date, r);
        for (const r of json.reports) merged.set(r.date, normalizeReport(r));
        return [...merged.values()].sort((a, b) => b.date.localeCompare(a.date));
      }
    } catch {
      // 端末内のぶんだけ返す
    }
  }
  return local.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * その日を含む週（月〜日）の日報をまとめて取る。
 * 冷凍在庫の画像が紙と同じ1週間分なので、7日分をここで揃える。
 */
export async function loadWeek(date: string): Promise<Record<string, Report>> {
  const { weekOf } = await import("./calc");
  const days = new Set(weekOf(date));
  const all = await listReports();
  const out: Record<string, Report> = {};
  for (const r of all) if (days.has(r.date)) out[r.date] = r;
  return out;
}

export async function deleteReport(date: string): Promise<void> {
  const all = localReports();
  delete all[date];
  writeLocal(REPORT_KEY, all);
  if (await remoteAvailable()) {
    try {
      await fetch(`/api/reports/${date}`, { method: "DELETE" });
    } catch {
      // 端末内からは消えているので、次の同期でサーバー側も揃う
    }
  }
}

/**
 * 日報を全部消す。端末内とサーバーの両方から消す。
 * 設定（スタッフ名・目標数・商品名）は消さない。
 */
export async function clearAllReports(): Promise<{ remote: boolean }> {
  writeLocal(REPORT_KEY, {});
  if (!(await remoteAvailable())) return { remote: false };
  try {
    const res = await fetch("/api/reports", { method: "DELETE" });
    return { remote: res.ok };
  } catch {
    return { remote: false };
  }
}

/** サーバー側の状況。PINが環境変数で設定されているかも見る */
export async function serverInfo(): Promise<{
  db: boolean;
  appPasscodeFromEnv: boolean;
  adminPasscodeFromEnv: boolean;
}> {
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    const json = (await res.json()) as Partial<{
      db: boolean;
      appPasscodeFromEnv: boolean;
      adminPasscodeFromEnv: boolean;
    }>;
    return {
      db: Boolean(json.db),
      appPasscodeFromEnv: Boolean(json.appPasscodeFromEnv),
      adminPasscodeFromEnv: Boolean(json.adminPasscodeFromEnv),
    };
  } catch {
    return { db: false, appPasscodeFromEnv: false, adminPasscodeFromEnv: false };
  }
}

export async function loadSettings(): Promise<Settings> {
  if (await remoteAvailable()) {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { settings: Settings };
        return { ...emptySettings(), ...json.settings };
      }
    } catch {
      // 端末内に落とす
    }
  }
  return { ...emptySettings(), ...readLocal<Partial<Settings>>(SETTINGS_KEY, {}) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  writeLocal(SETTINGS_KEY, settings);
  if (!(await remoteAvailable())) return;
  try {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(settings),
    });
  } catch {
    // 端末内には残っている
  }
}
