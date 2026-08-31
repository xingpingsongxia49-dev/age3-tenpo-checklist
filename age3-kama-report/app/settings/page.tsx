"use client";

import { useEffect, useState } from "react";

import { Fold } from "@/components/Fold";
import { Section } from "@/components/ui";
import { canTarget, emptySettings, productName, sweetTarget } from "@/lib/calc";
import { CAN_GROUPS, PRODUCT_GROUPS, SWEET_ITEMS, SWEET_VARIANTS, sweetKey } from "@/lib/masters";
import { loadSettings, remoteAvailable, saveSettings } from "@/lib/storage";
import type { Settings } from "@/lib/types";

/** 目標数を1つ書き換える入力欄 */
function TargetRow({
  name,
  value,
  onChange,
}: {
  name: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-3 border-t border-line py-2 first:border-t-0">
      <span className="flex-1 text-sm">{name}</span>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={0}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="field tnum w-24 text-right font-bold"
        aria-label={`${name}の目標数`}
      />
    </label>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [db, setDb] = useState<boolean | null>(null);
  const [newStaff, setNewStaff] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      setSettings(await loadSettings());
      setDb(await remoteAvailable());
    })();
  }, []);

  if (!settings) {
    return <main className="px-4 pt-10 text-center text-sm text-ink-soft">読み込み中…</main>;
  }

  /** 書き換えたら都度保存する。設定画面に保存ボタンを置かないほうが取りこぼしが無い */
  function update(next: Settings) {
    setSettings(next);
    void saveSettings(next).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    });
  }

  return (
    <main className="px-3 pt-4">
      <h1 className="mb-1 text-xl font-bold">⚙️ 設定</h1>
      <p className="mb-3 text-xs text-ink-soft">
        スタッフ名と、在庫の目標数（絶対在庫・定数）をここで変えられます。
      </p>
      {saved ? (
        <p className="mb-3 rounded-xl bg-ok-bg px-3 py-2 text-sm font-bold text-ok">保存しました</p>
      ) : null}

      <Section title="スタッフ一覧" emoji="👥">
        <ul className="mb-3 space-y-2">
          {settings.staff.map((name, i) => (
            <li key={`${name}-${i}`} className="flex items-center gap-2">
              <input
                value={name}
                aria-label={`スタッフ${i + 1}の名前`}
                onChange={(e) => {
                  const staff = [...settings.staff];
                  staff[i] = e.target.value;
                  update({ ...settings, staff });
                }}
                className="field flex-1"
              />
              <button
                type="button"
                aria-label={`${name}を削除`}
                onClick={() =>
                  update({ ...settings, staff: settings.staff.filter((_, j) => j !== i) })
                }
                className="tap grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-line text-low"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <input
            value={newStaff}
            placeholder="スタッフ名を追加"
            aria-label="追加するスタッフ名"
            onChange={(e) => setNewStaff(e.target.value)}
            className="field flex-1"
          />
          <button
            type="button"
            disabled={!newStaff.trim()}
            onClick={() => {
              update({ ...settings, staff: [...settings.staff, newStaff.trim()] });
              setNewStaff("");
            }}
            className="btn btn-primary shrink-0 px-5 disabled:opacity-40"
          >
            追加
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          はじめはダミーの名前が入っています。実際のスタッフ名に書き換えてください。
        </p>
      </Section>

      <Fold title="冷凍在庫の絶対在庫" emoji="🧊">
        {CAN_GROUPS.map((g) => (
          <div key={g.id} className="mb-4">
            <h3
              className="mb-1 rounded-lg px-3 py-1.5 text-sm font-bold"
              style={{ background: g.color }}
            >
              {g.emoji} {g.name}
            </h3>
            {g.items.map((it) => (
              <TargetRow
                key={it.id}
                name={it.name}
                value={canTarget(it.id, settings)}
                onChange={(v) =>
                  update({ ...settings, canTargets: { ...settings.canTargets, [it.id]: v } })
                }
              />
            ))}
          </div>
        ))}
      </Fold>

      <Fold title="在庫表の定数" emoji="🥪">
        {SWEET_ITEMS.map((it) => (
          <div key={it.id} className="mb-3">
            <h3 className="mb-1 rounded-lg bg-cream-deep px-3 py-1.5 text-sm font-bold">
              {it.name}
            </h3>
            {SWEET_VARIANTS.filter((v) => it.targets[v.id] !== undefined).map((v) => {
              const key = sweetKey(it.id, v.id);
              return (
                <TargetRow
                  key={v.id}
                  name={v.name}
                  value={sweetTarget(key, settings)}
                  onChange={(n) =>
                    update({ ...settings, sweetTargets: { ...settings.sweetTargets, [key]: n } })
                  }
                />
              );
            })}
          </div>
        ))}
      </Fold>

      <Fold title="商品別販売数の商品名" emoji="🍦">
        <p className="mb-3 text-xs leading-relaxed text-ink-soft">
          季節で入れ替わる商品はここで名前を書き換えてください。
          空欄にすると元の名前に戻ります。過去の日報の数字はそのまま残ります。
        </p>
        {PRODUCT_GROUPS.map((g) => (
          <div key={g.id} className="mb-4">
            <h3 className="mb-1 rounded-lg bg-cream-deep px-3 py-1.5 text-sm font-bold">
              {g.emoji} {g.name}
            </h3>
            {g.items.map((it) => {
              const custom = settings.productNames?.[it.id] ?? "";
              return (
                <label
                  key={it.id}
                  className="flex items-center gap-2 border-t border-line py-2 first:border-t-0"
                >
                  <span className="w-28 shrink-0 text-xs text-ink-soft">{it.name}</span>
                  <input
                    value={custom}
                    placeholder={it.name}
                    aria-label={`${it.name}の表示名`}
                    onChange={(e) =>
                      update({
                        ...settings,
                        productNames: { ...settings.productNames, [it.id]: e.target.value },
                      })
                    }
                    className="field flex-1"
                  />
                </label>
              );
            })}
          </div>
        ))}
        <button
          type="button"
          onClick={() => update({ ...settings, productNames: {} })}
          className="btn btn-ghost w-full"
        >
          すべて元の商品名に戻す
        </button>
      </Fold>

      <Section title="保存先" emoji="💾">
        {db === null ? (
          <p className="text-sm text-ink-soft">確認中…</p>
        ) : db ? (
          <p className="text-sm">
            <span className="badge badge-ok">サーバー保存</span>
            <span className="ml-2 text-ink-soft">日報はデータベースに残ります。</span>
          </p>
        ) : (
          <div className="text-sm">
            <span className="badge badge-warn">この端末のみ</span>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              データベースが繋がっていないため、日報はこのブラウザの中だけに保存されます。
              Vercelの画面でデータベースを追加し、環境変数 <code>POSTGRES_URL</code> を
              設定すると、全員で同じ履歴を見られるようになります。
            </p>
          </div>
        )}
      </Section>

      <Section title="このアプリについて" emoji="🍓">
        <p className="text-xs leading-relaxed text-ink-soft">
          株式会社ANCHOR／Age.3 嘉麻店の日報アプリです。紙の在庫表とLINEの手打ち日報を
          1つにまとめ、入力したその場でLINEに送れるようにしています。
        </p>
        <button
          type="button"
          onClick={() => {
            void fetch("/api/auth/admin", { method: "DELETE" }).then(() => {
              window.location.href = "/";
            });
          }}
          className="btn btn-ghost mt-3 w-full"
        >
          🔒 設定に鍵を掛けて出る
        </button>
        <button
          type="button"
          onClick={() => {
            void fetch("/api/auth", { method: "DELETE" }).then(() => {
              window.location.href = "/login";
            });
          }}
          className="btn btn-ghost mt-2 w-full"
        >
          アプリからログアウト
        </button>
      </Section>
    </main>
  );
}
