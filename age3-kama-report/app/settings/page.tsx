"use client";

import { useEffect, useState } from "react";

import { Fold } from "@/components/Fold";
import { Section } from "@/components/ui";
import { canTarget, emptySettings, prettyDate, productName, sweetTarget, todayISO } from "@/lib/calc";
import { CAN_GROUPS, PRODUCT_GROUPS, SWEET_ITEMS, SWEET_VARIANTS, sweetKey } from "@/lib/masters";
import {
  clearAllReports,
  deleteReport,
  loadSettings,
  saveSettings,
  serverInfo,
} from "@/lib/storage";
import { renderTargetTablePng, shareOrDownloadPng, type TableGroup } from "@/lib/tableImage";
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

/** 表を画像にして共有／保存するボタン。押している間だけ「作成中…」に変わる */
function ShareTableButton({
  label,
  onShare,
}: {
  label: string;
  onShare: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void onShare().finally(() => setBusy(false));
      }}
      className="btn btn-primary mb-3 w-full disabled:opacity-40"
    >
      {busy ? "画像を作成中…" : label}
    </button>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [info, setInfo] = useState<{
    db: boolean;
    appPasscodeFromEnv: boolean;
    adminPasscodeFromEnv: boolean;
  } | null>(null);
  /** 削除の対象日。既定は今日 */
  const [delDate, setDelDate] = useState(todayISO());
  /** 全消しは2段階。1回目で確認、2回目で実行 */
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [delNotice, setDelNotice] = useState<string | null>(null);
  const [newStaff, setNewStaff] = useState("");
  const [saved, setSaved] = useState(false);
  const [imageNotice, setImageNotice] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setSettings(await loadSettings());
      setInfo(await serverInfo());
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

  /** 冷凍在庫（缶）の絶対在庫表を画像で共有／保存する */
  async function shareCanTable() {
    if (!settings) return;
    setImageNotice(null);
    try {
      const groups: TableGroup[] = CAN_GROUPS.map((g) => ({
        emoji: g.emoji,
        name: g.name,
        items: g.items.map((it) => {
          const target = canTarget(it.id, settings);
          return {
            name: it.name,
            value: target,
            // 紙の表記をそのまま出す。設定で数を変えていればその数を出す
            label: target === it.target ? it.targetLabel || "—" : `${target}個`,
          };
        }),
      }));
      const blob = await renderTargetTablePng("冷凍在庫 絶対在庫表", "絶対在庫", groups);
      const r = await shareOrDownloadPng(blob, `age3-kama-can-target-${Date.now()}.png`);
      if (r.message) setImageNotice(r.message);
    } catch (e) {
      setImageNotice(`画像を作れませんでした：${String(e)}`);
    }
  }

  /** スイーツサンド在庫の定数表を画像で共有／保存する */
  async function shareSweetTable() {
    if (!settings) return;
    setImageNotice(null);
    try {
      // 紙の在庫表と同じく、1商品に最大4系統あるので系統ごとに1行にする
      const groups: TableGroup[] = SWEET_VARIANTS.map((v) => ({
        name: v.name,
        items: SWEET_ITEMS.filter((it) => it.targets[v.id] !== undefined).map((it) => ({
          name: it.name,
          value: sweetTarget(sweetKey(it.id, v.id), settings),
        })),
      })).filter((g) => g.items.length > 0);
      const blob = await renderTargetTablePng("在庫表 定数", "定数", groups);
      const r = await shareOrDownloadPng(blob, `age3-kama-sweet-target-${Date.now()}.png`);
      if (r.message) setImageNotice(r.message);
    } catch (e) {
      setImageNotice(`画像を作れませんでした：${String(e)}`);
    }
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
      {imageNotice ? (
        <p className="mb-3 rounded-xl bg-info-bg px-3 py-2 text-sm font-bold text-info">
          {imageNotice}
        </p>
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
        <ShareTableButton label="🖼 冷凍在庫の表を画像で共有" onShare={shareCanTable} />
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
        <ShareTableButton label="🖼 在庫表の定数を画像で共有" onShare={shareSweetTable} />
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
        {info === null ? (
          <p className="text-sm text-ink-soft">確認中…</p>
        ) : info.db ? (
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

      <Section title="PIN" emoji="🔑">
        {info === null ? (
          <p className="text-sm text-ink-soft">確認中…</p>
        ) : (
          <>
            <div className="flex items-center gap-2 border-t border-line py-2 first:border-t-0">
              <span className="flex-1 text-sm font-bold">入店PIN</span>
              <span className={`badge ${info.appPasscodeFromEnv ? "badge-info" : "badge-warn"}`}>
                {info.appPasscodeFromEnv ? "環境変数で設定" : "コードの初期値（1959）"}
              </span>
            </div>
            <div className="flex items-center gap-2 border-t border-line py-2">
              <span className="flex-1 text-sm font-bold">管理PIN</span>
              <span className={`badge ${info.adminPasscodeFromEnv ? "badge-info" : "badge-warn"}`}>
                {info.adminPasscodeFromEnv ? "環境変数で設定" : "コードの初期値（3030）"}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              「環境変数で設定」のときは、Vercelに入れた値がコードの初期値より優先されます。
              PINを変えるときは Vercel の Settings → Environment Variables で
              <code>APP_PASSCODE</code> / <code>ADMIN_PASSCODE</code> を書き換えて、
              再デプロイしてください。安全のため、実際の値はここには出しません。
            </p>
          </>
        )}
      </Section>

      <Section title="データの削除" emoji="🗑">
        <p className="mb-3 text-xs leading-relaxed text-ink-soft">
          消せるのは日報だけです。スタッフ名・目標数・商品名の設定は残ります。
          <b>元に戻せません。</b>
        </p>

        {delNotice ? (
          <p className="mb-3 rounded-xl bg-info-bg px-3 py-2 text-sm font-bold text-info">
            {delNotice}
          </p>
        ) : null}

        <label className="mb-2 flex items-center gap-2">
          <span className="w-16 shrink-0 text-sm text-ink-soft">日付</span>
          <input
            type="date"
            value={delDate}
            aria-label="削除する日付"
            onChange={(e) => setDelDate(e.target.value || todayISO())}
            className="field tnum flex-1 font-bold"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm(`${prettyDate(delDate)} の日報を消します。よろしいですか？`)) return;
            void deleteReport(delDate).then(() => {
              setDelNotice(`${prettyDate(delDate)} の日報を消しました。`);
            });
          }}
          className="btn btn-ghost w-full"
        >
          この日の日報を消す
        </button>

        <div className="my-4 h-px bg-line" />

        {/* 全消しは押し間違いが致命的なので、2回押させる */}
        {confirmWipe ? (
          <div className="rounded-2xl bg-low-bg p-3">
            <p className="text-sm font-bold text-low">
              すべての日報（履歴・分析のもとになる記録）を消します。
              <br />
              本当によろしいですか？
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmWipe(false)}
                className="btn btn-ghost"
              >
                やめる
              </button>
              <button
                type="button"
                onClick={() => {
                  void clearAllReports().then(({ remote }) => {
                    setConfirmWipe(false);
                    setDelNotice(
                      remote
                        ? "すべての日報を消しました。"
                        : "この端末の日報を消しました（サーバー未接続のため端末内のみ）。",
                    );
                  });
                }}
                className="btn w-full bg-low font-bold text-white"
              >
                本当に消す
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setConfirmWipe(true);
              setDelNotice(null);
            }}
            className="btn w-full border border-low bg-white font-bold text-low"
          >
            すべての日報を消す
          </button>
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
