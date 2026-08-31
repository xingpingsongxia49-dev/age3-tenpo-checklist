"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { emptyReport, emptySettings, todayISO } from "./calc";
import { loadReport, loadSettings, saveReport } from "./storage";
import type { Report, Settings } from "./types";

export type SaveState = "idle" | "saving" | "local" | "saved" | "error";

/**
 * 日報1件分の状態。
 *
 * 入力するそばから自動保存する。店舗では途中で接客が入って画面を離れるので、
 * 「保存ボタンを押し忘れて消えた」を起こさないことを優先している。
 * 保存はサーバーとブラウザの両方に行い、サーバーが無ければブラウザだけになる。
 */
export function useReport(initialDate?: string) {
  const [date, setDate] = useState(initialDate ?? todayISO());
  const [report, setReport] = useState<Report>(() => emptyReport(initialDate ?? todayISO()));
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 読み込み直後の1回は保存しない（読んだ内容をそのまま書き戻すのを避ける） */
  const dirty = useRef(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    dirty.current = false;
    void (async () => {
      const [r, s] = await Promise.all([loadReport(date), loadSettings()]);
      if (!alive) return;
      setReport(r ?? emptyReport(date));
      setSettings(s);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [date]);

  // 入力が止まって800msしたら書き込む
  useEffect(() => {
    if (loading || !dirty.current) return;
    if (timer.current) clearTimeout(timer.current);
    setSaveState("saving");
    timer.current = setTimeout(() => {
      void saveReport(report).then((remote) => setSaveState(remote ? "saved" : "local"));
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [report, loading]);

  /** 日報の一部を書き換える */
  const patch = useCallback((fn: (r: Report) => Report) => {
    dirty.current = true;
    setReport(fn);
  }, []);

  /** 今すぐ保存する（共有ボタンを押す直前など） */
  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    setSaveState("saving");
    const remote = await saveReport(report);
    setSaveState(remote ? "saved" : "local");
  }, [report]);

  return { date, setDate, report, patch, settings, loading, saveState, flush };
}
