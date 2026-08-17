/**
 * Supabase 版の保存先。端末内保存（storage.ts の既定実装）と同じ Storage
 * インターフェースを満たすので、画面側は一切変更せずに差し替えられる。
 *
 * 環境変数が両方そろっているときだけ有効になる。未設定なら端末内保存のまま。
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * 設計方針：
 * - 端末内(localStorage / IndexedDB)を常に正として書き、そのうえでクラウドへ写す。
 *   電波が無い店舗でも入力が止まらないようにするため。
 * - 読み込みはクラウドを優先し、失敗したら端末内にフォールバックする。
 * - 写真はサイズが大きいので Storage バケットに置き、DBには参照だけを持つ。
 *
 * セットアップ手順とSQLは docs/supabase.md にある。
 */

// supabase-js は重い。設定されていない端末に配りたくないので静的 import せず、
// 実際にクラウドへ行くときだけ動的に読み込む（別チャンクになる）。
import type { SupabaseClient } from "@supabase/supabase-js";
// 型だけを取り込む。実体を import すると storage.ts と循環参照になる
import type { Storage } from "./storage";
import type { AppData } from "./types";
import { EMPTY_APP_DATA } from "./types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** 1行だけを使う。誰が入れても同じ台帳を見る運用（松下さん＋店長数名を想定） */
const ROW_ID = process.env.NEXT_PUBLIC_SUPABASE_ROW_ID || "age3-tenpo-checklist";
const TABLE = "checklist_data";
const BUCKET = "checklist-photos";

export const isSupabaseConfigured = Boolean(URL && KEY);

let client: SupabaseClient | null = null;
async function db(): Promise<SupabaseClient> {
  if (!client) {
    const { createClient } = await import("@supabase/supabase-js");
    client = createClient(URL!, KEY!);
  }
  return client;
}

/** クラウドが落ちていても現場の入力は止めない。失敗は握って端末内保存を正とする */
async function tryCloud<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

/**
 * 端末内保存の実装を受け取り、その上にクラウド同期をかぶせたものを返す。
 * 依存を一方向にするため、端末内実装は import せず引数で受け取る。
 */
export function createSupabaseStorage(local: Storage): Storage {
  const cloud: Storage = {
    async loadAll() {
      const cloud = await tryCloud(async () => {
        const { data, error } = await (await db())
          .from(TABLE)
          .select("payload")
          .eq("id", ROW_ID)
          .maybeSingle();
        if (error) throw error;
        return (data?.payload as AppData | undefined) ?? null;
      });

      if (cloud && Array.isArray(cloud.inspections)) {
        // 次にオフラインで開いたときのために端末内にも写しておく
        await local.saveAll(cloud);
        return cloud;
      }
      return local.loadAll();
    },

    async saveAll(data) {
      // 端末内が正。先に確実に保存してからクラウドへ送る
      await local.saveAll(data);
      await tryCloud(async () => {
        const { error } = await (await db())
          .from(TABLE)
          .upsert({ id: ROW_ID, payload: data, updated_at: new Date().toISOString() });
        if (error) throw error;
        return true;
      });
    },

    async putPhoto(blob) {
      const id = await local.putPhoto(blob);
      await tryCloud(async () => {
        const { error } = await (await db())
          .storage.from(BUCKET)
          .upload(`${id}.jpg`, blob, { contentType: blob.type || "image/jpeg", upsert: true });
        if (error) throw error;
        return true;
      });
      return id;
    },

    async getPhoto(id) {
      const onDevice = await local.getPhoto(id);
      if (onDevice) return onDevice;

      // 別の端末で撮った写真はここに来る
      return tryCloud(async () => {
        const { data, error } = await (await db()).storage.from(BUCKET).download(`${id}.jpg`);
        if (error) throw error;
        return data ?? null;
      });
    },

    async deletePhoto(id) {
      await local.deletePhoto(id);
      await tryCloud(async () => {
        const { error } = await (await db()).storage.from(BUCKET).remove([`${id}.jpg`]);
        if (error) throw error;
        return true;
      });
    },

    exportBundle(withPhotos) {
      return local.exportBundle(withPhotos);
    },

    async importBundle(json) {
      const data = await local.importBundle(json);
      await cloud.saveAll(data);
      return data;
    },

    async clearAll() {
      await local.clearAll();
      await tryCloud(async () => {
        const { error } = await (await db())
          .from(TABLE)
          .upsert({ id: ROW_ID, payload: EMPTY_APP_DATA, updated_at: new Date().toISOString() });
        if (error) throw error;
        return true;
      });
    },

    usageBytes() {
      return local.usageBytes();
    },
  };

  return cloud;
}
