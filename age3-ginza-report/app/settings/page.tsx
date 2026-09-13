"use client";

import { useEffect, useState } from "react";

import { Section } from "@/components/ui";
import { emptySettings, prettyDate } from "@/lib/calc";
import {
  adminPins,
  clearAllReports,
  deleteReport,
  listReports,
  loadSettings,
  saveSettings,
  serverInfo,
} from "@/lib/storage";
import type { Report, Settings } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [reports, setReports] = useState<Report[]>([]);
  const [info, setInfo] = useState<{ db: boolean } | null>(null);
  const [pins, setPins] = useState<{ appPasscode: string; adminPasscode: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmAll, setConfirmAll] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void (async () => {
      const [s, r, i] = await Promise.all([loadSettings(), listReports(), serverInfo()]);
      setSettings(s);
      setReports(r);
      setInfo(i);
    })();
  }, []);

  const update = (next: Settings) => {
    setSettings(next);
    void saveSettings(next);
  };

  const addStaff = () => {
    const name = draft.trim();
    if (!name || settings.staff.includes(name)) return;
    update({ ...settings, staff: [...settings.staff, name] });
    setDraft("");
  };

  const removeStaff = (name: string) =>
    update({ ...settings, staff: settings.staff.filter((s) => s !== name) });

  return (
    <main className="px-3 pt-4">
      <h1 className="mb-4 text-xl font-bold">⚙️ 設定</h1>

      {notice ? (
        <p className="mb-4 rounded-xl bg-ok-bg px-3 py-2 text-sm font-bold text-ok">{notice}</p>
      ) : null}

      <Section title="報告者の名前" emoji="🧑‍🍳">
        <p className="mb-3 text-xs leading-relaxed text-ink-soft">
          報告画面のプルダウンに出る名前です。並び順はここで足した順になります。
        </p>
        {settings.staff.map((name) => (
          <div
            key={name}
            className="flex items-center gap-2 border-t border-line py-2 first:border-t-0"
          >
            <span className="flex-1 text-sm font-medium">{name}</span>
            <button
              type="button"
              onClick={() => removeStaff(name)}
              aria-label={`${name}を消す`}
              className="tap shrink-0 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink-soft active:bg-line"
            >
              消す
            </button>
          </div>
        ))}
        <div className="mt-2 flex items-center gap-2">
          <input
            value={draft}
            placeholder="名前を足す"
            aria-label="足す報告者の名前"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addStaff();
              }
            }}
            className="field flex-1"
          />
          <button
            type="button"
            onClick={addStaff}
            disabled={!draft.trim()}
            className="tap shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-30"
          >
            ＋ 追加
          </button>
        </div>
      </Section>

      <Section title="🔑 PIN" emoji="">
        <p className="mb-3 text-xs leading-relaxed text-ink-soft">
          この画面は管理PINの内側なので、入店PINしか知らない人には見えません。
        </p>
        {pins ? (
          <>
            <div className="flex items-baseline gap-3 py-1.5">
              <span className="flex-1 text-sm text-ink-soft">入店PIN（アプリ全体）</span>
              <span className="tnum text-lg font-bold">{pins.appPasscode}</span>
            </div>
            <div className="flex items-baseline gap-3 border-t border-line py-1.5">
              <span className="flex-1 text-sm text-ink-soft">管理PIN（分析・設定）</span>
              <span className="tnum text-lg font-bold">{pins.adminPasscode}</span>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void adminPins().then(setPins)}
            className="btn btn-ghost w-full"
          >
            PINを表示する
          </button>
        )}
      </Section>

      <Section title="🗑 データの削除" emoji="">
        <p className="mb-3 text-xs leading-relaxed text-ink-soft">
          消したデータは戻せません。履歴と分析からも消えます。
        </p>
        {reports.length === 0 ? (
          <p className="py-2 text-sm text-ink-soft">消せる報告がありません</p>
        ) : (
          <>
            <p className="mb-2 text-xs font-bold text-ink-soft">日付ごとに消す</p>
            <div className="max-h-64 overflow-auto">
              {reports.map((r) => (
                <div
                  key={r.date}
                  className="flex items-center gap-2 border-t border-line py-2 first:border-t-0"
                >
                  <span className="tnum flex-1 text-sm">{prettyDate(r.date)}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteReport(r.date);
                      setReports(await listReports());
                      setNotice(`${prettyDate(r.date)} の報告を消しました`);
                    }}
                    className="tap shrink-0 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink-soft active:bg-line"
                  >
                    消す
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl bg-low-bg p-3">
              {confirmAll ? (
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-xs font-bold leading-tight text-low">
                    {reports.length}日ぶんの報告がすべて消えます
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await clearAllReports();
                      setReports(await listReports());
                      setConfirmAll(false);
                      setNotice("報告をすべて消しました");
                    }}
                    className="tap shrink-0 rounded-lg bg-low px-3 py-1.5 text-xs font-bold text-white"
                  >
                    消す
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmAll(false)}
                    className="tap shrink-0 rounded-lg border border-line bg-white px-2 py-1.5 text-xs font-bold text-ink-soft"
                  >
                    やめる
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmAll(true)}
                  className="tap w-full text-xs font-bold text-low"
                >
                  すべての報告を消す
                </button>
              )}
            </div>
          </>
        )}
      </Section>

      <Section title="保存先" emoji="💾">
        <p className="text-sm leading-relaxed">
          {info === null
            ? "確認中…"
            : info.db
              ? "サーバー（データベース）に保存しています。どの端末からでも同じ履歴が見えます。"
              : "この端末のブラウザにだけ保存しています。別の端末では見えません。"}
        </p>
        {info && !info.db ? (
          <p className="mt-2 rounded-xl bg-warn-bg px-3 py-2 text-xs leading-relaxed text-warn">
            Vercelでデータベースをつなぐと、自動でサーバー保存に切り替わります。
            つなぐまでは、報告する端末を1台に決めてください。
          </p>
        ) : null}
      </Section>

      <div className="mb-6 space-y-2">
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth/admin", { method: "DELETE" });
            window.location.href = "/";
          }}
          className="btn btn-ghost w-full"
        >
          🔒 設定に鍵を掛け直す
        </button>
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth", { method: "DELETE" });
            window.location.href = "/login";
          }}
          className="btn btn-ghost w-full"
        >
          ログアウト
        </button>
      </div>
    </main>
  );
}
