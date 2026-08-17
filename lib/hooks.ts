"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { STORES } from "./checklist";
import { todayISO, useStore } from "./store";
import type { Inspection, StoreName } from "./types";

export type Tab = StoreName | "まとめ";

const TABS: Tab[] = [...STORES, "まとめ"];

function isTab(v: string | null): v is Tab {
  return !!v && (TABS as string[]).includes(v);
}

/** 選択中のタブはURLに持たせる。再読み込みしても戻らないようにするため */
export function useTabParam(): [Tab, (t: Tab) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const raw = params.get("store");
  const tab: Tab = isTab(raw) ? raw : STORES[0];

  const setTab = useCallback(
    (t: Tab) => {
      const next = new URLSearchParams(params.toString());
      next.set("store", t);
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  return [tab, setTab];
}

/** その店舗の「今日の視察」。無ければ undefined */
export function useTodayInspection(store: StoreName): Inspection | undefined {
  const { data } = useStore();
  const today = todayISO();
  return useMemo(
    () =>
      data.inspections
        .filter((i) => i.store === store && i.date === today)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
    [data.inspections, store, today],
  );
}

/**
 * チェック画面で使う視察。今日の分が無ければその場で作る。
 * 出張中にタップ数を増やさないため、店舗を選んだ時点で入力を始められるようにする。
 */
export function useEnsureTodayInspection(store: StoreName): Inspection | undefined {
  const { createInspection, data, ready } = useStore();
  const existing = useTodayInspection(store);

  useEffect(() => {
    if (!ready || existing) return;
    createInspection(store, todayISO(), data.lastInspector || "松下");
  }, [ready, existing, createInspection, store, data.lastInspector]);

  return existing;
}
