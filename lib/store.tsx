"use client";

/**
 * 画面から使う状態管理。永続化は lib/storage.ts に丸投げしており、
 * ここでも画面側でも localStorage / IndexedDB を直接触らない。
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { compressImage, storage } from "./storage";
import type { AppData, Answer, Inspection, StoreName } from "./types";
import { EMPTY_ANSWER, EMPTY_APP_DATA } from "./types";

export function todayISO(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

type Ctx = {
  ready: boolean;
  data: AppData;
  createInspection: (store: StoreName, date: string, inspector: string) => Inspection;
  getInspection: (id: string | null | undefined) => Inspection | undefined;
  updateAnswer: (id: string, itemId: number, patch: Partial<Answer>) => void;
  updateInspection: (
    id: string,
    patch: Partial<Omit<Inspection, "id" | "answers">>,
  ) => void;
  deleteInspection: (id: string) => Promise<void>;
  addPhoto: (id: string, itemId: number, file: File) => Promise<void>;
  removePhoto: (id: string, itemId: number, photoId: string) => Promise<void>;
  exportBundle: (withPhotos: boolean) => Promise<string>;
  importBundle: (json: string) => Promise<void>;
  clearAll: () => Promise<void>;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY_APP_DATA);
  const [ready, setReady] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    let alive = true;
    storage.loadAll().then((d) => {
      if (!alive) return;
      setData(d);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 現地でタブを閉じても消えないよう、変更のたびに即保存する
  useEffect(() => {
    if (!ready || !dirty.current) return;
    void storage.saveAll(data);
  }, [data, ready]);

  const mutate = useCallback((fn: (d: AppData) => AppData) => {
    dirty.current = true;
    setData(fn);
  }, []);

  const stamp = () => new Date().toISOString();

  const createInspection = useCallback(
    (store: StoreName, date: string, inspector: string) => {
      const insp: Inspection = {
        id: newId(),
        store,
        date,
        inspector,
        answers: {},
        createdAt: stamp(),
        updatedAt: stamp(),
        completedAt: null,
      };
      mutate((d) => ({
        ...d,
        lastInspector: inspector || d.lastInspector,
        inspections: [insp, ...d.inspections],
      }));
      return insp;
    },
    [mutate],
  );

  const getInspection = useCallback(
    (id: string | null | undefined) =>
      id ? data.inspections.find((i) => i.id === id) : undefined,
    [data.inspections],
  );

  const updateAnswer = useCallback(
    (id: string, itemId: number, patch: Partial<Answer>) => {
      mutate((d) => ({
        ...d,
        inspections: d.inspections.map((insp) =>
          insp.id !== id
            ? insp
            : {
                ...insp,
                updatedAt: stamp(),
                answers: {
                  ...insp.answers,
                  [itemId]: {
                    ...EMPTY_ANSWER,
                    ...insp.answers[itemId],
                    ...patch,
                  },
                },
              },
        ),
      }));
    },
    [mutate],
  );

  const updateInspection = useCallback(
    (id: string, patch: Partial<Omit<Inspection, "id" | "answers">>) => {
      mutate((d) => ({
        ...d,
        lastInspector: patch.inspector ?? d.lastInspector,
        inspections: d.inspections.map((insp) =>
          insp.id !== id ? insp : { ...insp, ...patch, updatedAt: stamp() },
        ),
      }));
    },
    [mutate],
  );

  const deleteInspection = useCallback(
    async (id: string) => {
      const target = data.inspections.find((i) => i.id === id);
      if (target) {
        for (const a of Object.values(target.answers)) {
          for (const pid of a.photos ?? []) await storage.deletePhoto(pid);
        }
      }
      mutate((d) => ({
        ...d,
        inspections: d.inspections.filter((i) => i.id !== id),
      }));
    },
    [data.inspections, mutate],
  );

  const addPhoto = useCallback(
    async (id: string, itemId: number, file: File) => {
      const blob = await compressImage(file);
      const photoId = await storage.putPhoto(blob);
      mutate((d) => ({
        ...d,
        inspections: d.inspections.map((insp) => {
          if (insp.id !== id) return insp;
          const prev = insp.answers[itemId] ?? EMPTY_ANSWER;
          return {
            ...insp,
            updatedAt: stamp(),
            answers: {
              ...insp.answers,
              [itemId]: { ...prev, photos: [...(prev.photos ?? []), photoId] },
            },
          };
        }),
      }));
    },
    [mutate],
  );

  const removePhoto = useCallback(
    async (id: string, itemId: number, photoId: string) => {
      await storage.deletePhoto(photoId);
      mutate((d) => ({
        ...d,
        inspections: d.inspections.map((insp) => {
          if (insp.id !== id) return insp;
          const prev = insp.answers[itemId] ?? EMPTY_ANSWER;
          return {
            ...insp,
            updatedAt: stamp(),
            answers: {
              ...insp.answers,
              [itemId]: {
                ...prev,
                photos: (prev.photos ?? []).filter((p) => p !== photoId),
              },
            },
          };
        }),
      }));
    },
    [mutate],
  );

  const exportBundle = useCallback(
    (withPhotos: boolean) => storage.exportBundle(withPhotos),
    [],
  );

  const importBundle = useCallback(async (json: string) => {
    const next = await storage.importBundle(json);
    dirty.current = false;
    setData(next);
  }, []);

  const clearAll = useCallback(async () => {
    await storage.clearAll();
    dirty.current = false;
    setData({ ...EMPTY_APP_DATA });
  }, []);

  const value = useMemo(
    () => ({
      ready,
      data,
      createInspection,
      getInspection,
      updateAnswer,
      updateInspection,
      deleteInspection,
      addPhoto,
      removePhoto,
      exportBundle,
      importBundle,
      clearAll,
    }),
    [
      ready,
      data,
      createInspection,
      getInspection,
      updateAnswer,
      updateInspection,
      deleteInspection,
      addPhoto,
      removePhoto,
      exportBundle,
      importBundle,
      clearAll,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("StoreProvider の外で useStore が呼ばれた");
  return ctx;
}

/** 写真IDから表示用URLを作る。画面側が保存先を意識しなくて済むようにする */
export function usePhotoUrl(photoId: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoId) {
      setUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    let alive = true;
    storage.getPhoto(photoId).then((blob) => {
      if (!alive || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId]);

  return url;
}
