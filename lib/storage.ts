/**
 * 永続化はこのファイルだけが担当する。
 * UI・画面コンポーネントから localStorage / IndexedDB を直接触ってはいけない。
 * 将来 Supabase に差し替えるときは、この Storage インターフェースの実装を
 * 入れ替えるだけで済むよう、外向きの API は全て非同期にしてある。
 */

import { createSupabaseStorage, isSupabaseConfigured } from "./storage-supabase";
import type { AppData } from "./types";
import { EMPTY_APP_DATA } from "./types";

const LS_KEY = "age3-tenpo-checklist:v1";
const DB_NAME = "age3-tenpo-checklist";
const DB_VERSION = 1;
const PHOTO_STORE = "photos";

export interface Storage {
  /** 保存済みデータを丸ごと読む */
  loadAll(): Promise<AppData>;
  /** 保存済みデータを丸ごと書く */
  saveAll(data: AppData): Promise<void>;
  /** 写真を保存し、参照IDを返す */
  putPhoto(blob: Blob): Promise<string>;
  /** 写真を取り出す。無ければ null */
  getPhoto(id: string): Promise<Blob | null>;
  /** 写真を消す */
  deletePhoto(id: string): Promise<void>;
  /** バックアップJSONを作る（写真を含めるかを選べる） */
  exportBundle(withPhotos: boolean): Promise<string>;
  /** バックアップJSONを取り込む。成功したら復元後のデータを返す */
  importBundle(json: string): Promise<AppData>;
  /** 全消去 */
  clearAll(): Promise<void>;
  /** 使用中の目安容量（バイト） */
  usageBytes(): Promise<number>;
}

/* ------------------------------------------------------------------ */
/* IndexedDB（写真の実体を置く。localStorageは容量が小さく写真に耐えない） */
/* ------------------------------------------------------------------ */

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbRun<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(PHOTO_STORE, mode);
        const req = fn(tx.objectStore(PHOTO_STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

/** 取り込んだデータが壊れていてもアプリが落ちないよう、形を整えてから返す */
function normalize(raw: unknown): AppData {
  const d = raw as Partial<AppData> | null;
  if (!d || !Array.isArray(d.inspections)) return { ...EMPTY_APP_DATA };
  return {
    version: 1,
    lastInspector: typeof d.lastInspector === "string" ? d.lastInspector : "",
    inspections: d.inspections.map((insp) => ({
      ...insp,
      answers: Object.fromEntries(
        Object.entries(insp.answers ?? {}).map(([k, v]) => [
          k,
          { ...v, photos: Array.isArray(v?.photos) ? v.photos : [] },
        ]),
      ),
    })),
  };
}

/* ------------------------------------------------------------------ */
/* 端末内実装                                                          */
/* ------------------------------------------------------------------ */

export const localStorageBacked: Storage = {
  async loadAll() {
    if (typeof window === "undefined") return { ...EMPTY_APP_DATA };
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (!raw) return { ...EMPTY_APP_DATA };
      return normalize(JSON.parse(raw));
    } catch {
      return { ...EMPTY_APP_DATA };
    }
  },

  async saveAll(data) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LS_KEY, JSON.stringify(data));
  },

  async putPhoto(blob) {
    const id = newId("photo");
    await idbRun("readwrite", (s) => s.put(blob, id));
    return id;
  },

  async getPhoto(id) {
    try {
      const v = await idbRun<Blob | undefined>("readonly", (s) => s.get(id));
      return v ?? null;
    } catch {
      return null;
    }
  },

  async deletePhoto(id) {
    try {
      await idbRun("readwrite", (s) => s.delete(id));
    } catch {
      // 既に無い場合は何もしない
    }
  },

  async exportBundle(withPhotos) {
    const data = await this.loadAll();
    const photos: Record<string, string> = {};
    if (withPhotos) {
      // 項目に付いた写真を1枚残らず集める。ここを漏らすと復元時に写真が消える。
      const ids = new Set<string>();
      for (const insp of data.inspections) {
        for (const a of Object.values(insp.answers)) {
          for (const pid of a.photos ?? []) ids.add(pid);
        }
      }
      for (const pid of ids) {
        const blob = await this.getPhoto(pid);
        if (blob) photos[pid] = await blobToDataUrl(blob);
      }
    }
    return JSON.stringify(
      {
        app: "age3-tenpo-checklist",
        exportedAt: new Date().toISOString(),
        withPhotos,
        data,
        photos,
      },
      null,
      2,
    );
  },

  async importBundle(json) {
    const parsed = JSON.parse(json) as {
      app?: string;
      data?: AppData;
      photos?: Record<string, string>;
    };
    // 旧形式（AppDataそのもの）も受け付ける
    const rawData = parsed?.data ?? (parsed as unknown as AppData);
    const data = normalize(rawData);
    if (parsed?.photos) {
      for (const [id, dataUrl] of Object.entries(parsed.photos)) {
        try {
          const blob = await dataUrlToBlob(dataUrl);
          await idbRun("readwrite", (s) => s.put(blob, id));
        } catch {
          // 1枚失敗しても取り込み全体は続ける
        }
      }
    }
    await this.saveAll(data);
    return data;
  },

  async clearAll() {
    if (typeof window !== "undefined") window.localStorage.removeItem(LS_KEY);
    try {
      await idbRun("readwrite", (s) => s.clear());
    } catch {
      // IndexedDBが使えない環境では何もしない
    }
  },

  async usageBytes() {
    try {
      const est = await navigator.storage?.estimate?.();
      return est?.usage ?? 0;
    } catch {
      return 0;
    }
  },
};

/**
 * 実際に使う保存先。
 * NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY が両方あるときだけ
 * クラウド版に切り替わる。未設定なら従来どおり端末内だけで完結する。
 * 画面側は storage しか参照していないので、差し替えはここ1か所で済む。
 */
export const storage: Storage = isSupabaseConfigured
  ? createSupabaseStorage(localStorageBacked)
  : localStorageBacked;

/* ------------------------------------------------------------------ */
/* 写真の前処理（そのまま保存すると1枚数MBで容量を食い潰す）           */
/* ------------------------------------------------------------------ */

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.8;

/** 長辺1600pxのJPEG(品質0.8)に縮小してから保存する。項目ごとに増えても容量が破綻しないように */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  return blob ?? file;
}
