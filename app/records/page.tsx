"use client";

import { useRef, useState } from "react";
import { Card, GoldButton, JudgementChip, PlainButton } from "@/components/ui";
import { STORES } from "@/lib/checklist";
import {
  collectCorrections,
  hasAnswers,
  pct,
  summarize,
  type Correction,
} from "@/lib/score";
import {
  correctionsCsv,
  download,
  historyCsv,
} from "@/lib/export";
import { todayISO, useStore } from "@/lib/store";

type Tab = "履歴" | "是正台帳" | "データ";

const STATUS_STYLE: Record<Correction["status"], string> = {
  期限切れ: "border-[var(--color-ng)] bg-[var(--color-ng-soft)] text-[var(--color-ng)]",
  対応中: "border-[var(--color-warn)] bg-[var(--color-warn-soft)] text-[var(--color-warn)]",
  完了: "border-[var(--color-ok)] bg-[var(--color-ok-soft)] text-[var(--color-ok)]",
};

export default function Records() {
  const { data, ready, updateAnswer, deleteInspection, exportBundle, importBundle, clearAll } =
    useStore();
  const [tab, setTab] = useState<Tab>("履歴");
  const [showDone, setShowDone] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const today = todayISO();

  if (!ready) return <div className="p-4 text-sm">読み込み中…</div>;

  // 画面を開いただけの空の視察は履歴に出さない
  const sorted = data.inspections
    .filter(hasAnswers)
    .sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
  const corrections = collectCorrections(data.inspections, today).filter(
    (c) => showDone || c.status !== "完了",
  );

  return (
    <div className="px-3 pt-3">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded bg-[var(--color-ink)] px-2 py-1 text-sm font-bold tracking-wide text-[var(--color-gold)]">
          Age.3
        </span>
        <h1 className="text-base font-bold">記録</h1>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-gold-soft)] p-1">
        {(["履歴", "是正台帳", "データ"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`min-h-[44px] rounded-md text-sm font-bold ${
              tab === t
                ? "bg-[var(--color-gold)] text-white"
                : "bg-white text-[var(--color-ink)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "履歴" && (
        <>
          <h2 className="mb-2 mt-4 text-sm font-bold text-[var(--color-ink-sub)]">
            店舗比較（各店の直近スコア）
          </h2>
          <Card className="p-3">
            <div className="grid grid-cols-3 gap-2">
              {STORES.map((st) => {
                const latest = sorted.find((i) => i.store === st);
                const s = latest ? summarize(latest) : null;
                return (
                  <div key={st} className="text-center">
                    <p className="text-sm font-bold">{st}</p>
                    <p className="tabular text-2xl font-bold">
                      {s ? pct(s.weightedRate) : "—"}
                    </p>
                    <p className="text-[11px] text-[var(--color-ink-sub)]">
                      {latest ? latest.date : "未実施"}
                    </p>
                    {s && s.criticalBatsu > 0 && (
                      <p className="text-[11px] font-bold text-[var(--color-ng)]">
                        S× {s.criticalBatsu}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-[var(--color-ink-sub)]">
              3店を同じ基準で並べることで「原宿だけの問題」か「全社の問題」かが判別できる。
            </p>
          </Card>

          <h2 className="mb-2 mt-4 text-sm font-bold text-[var(--color-ink-sub)]">
            視察履歴（{sorted.length}件）
          </h2>
          {sorted.length === 0 ? (
            <Card className="p-4 text-sm text-[var(--color-ink-sub)]">
              まだ視察の記録がありません。
            </Card>
          ) : (
            <Card>
              <ul>
                {sorted.map((insp) => {
                  const s = summarize(insp);
                  return (
                    <li
                      key={insp.id}
                      className="flex items-center gap-2 border-b border-[var(--color-line)] px-3 py-2.5 last:border-b-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">
                          {insp.store}
                          <span className="tabular ml-2 text-xs font-normal text-[var(--color-ink-sub)]">
                            {insp.date}／{insp.inspector || "—"}
                          </span>
                        </p>
                        <p className="text-[11px] text-[var(--color-ink-sub)]">
                          ○{s.maru} △{s.sankaku} ×{s.batsu}／未入力{s.unanswered}
                          {s.criticalBatsu > 0 && (
                            <span className="ml-1 font-bold text-[var(--color-ng)]">
                              S×{s.criticalBatsu}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="tabular text-lg font-bold">
                        {pct(s.weightedRate)}
                      </span>
                      <button
                        type="button"
                        aria-label="この視察を削除"
                        onClick={() => {
                          if (
                            window.confirm(
                              `${insp.store}／${insp.date} の記録を削除します。取り消せません。`,
                            )
                          ) {
                            void deleteInspection(insp.id);
                          }
                        }}
                        className="shrink-0 px-1 text-xs text-[var(--color-ink-sub)] underline"
                      >
                        削除
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {sorted.length > 0 && (
            <PlainButton
              className="mt-3 w-full"
              onClick={() =>
                download(`Age3_履歴_${today}.csv`, historyCsv(sorted), "text/csv")
              }
            >
              履歴CSVを書き出す
            </PlainButton>
          )}
        </>
      )}

      {tab === "是正台帳" && (
        <>
          <div className="mt-4 flex items-center gap-2">
            <h2 className="text-sm font-bold text-[var(--color-ink-sub)]">
              ×項目の持ち越し（{corrections.length}件）
            </h2>
            <label className="ml-auto flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={showDone}
                onChange={(e) => setShowDone(e.target.checked)}
                className="h-4 w-4"
              />
              完了も表示
            </label>
          </div>

          {corrections.length === 0 ? (
            <Card className="mt-2 p-4 text-sm text-[var(--color-ink-sub)]">
              未完了の是正はありません。
            </Card>
          ) : (
            <Card className="mt-2">
              <ul>
                {corrections.map((c) => (
                  <li
                    key={`${c.inspectionId}-${c.itemId}`}
                    className="border-b border-[var(--color-line)] px-3 py-3 last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[11px] font-bold ${STATUS_STYLE[c.status]}`}
                      >
                        {c.status}
                      </span>
                      <span className="text-[11px] text-[var(--color-ink-sub)]">
                        {c.store}／{c.date}
                      </span>
                      <span className="ml-auto">
                        <JudgementChip j="×" />
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-snug">
                      <span className="mr-1 font-bold">[{c.weight}]</span>
                      {c.text}
                    </p>
                    {c.note && (
                      <p className="mt-0.5 text-xs text-[var(--color-ink-sub)]">
                        事実：{c.note}
                      </p>
                    )}
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <label className="block">
                        <span className="text-[11px] text-[var(--color-ink-sub)]">
                          担当
                        </span>
                        <input
                          value={c.owner}
                          onChange={(e) =>
                            updateAnswer(c.inspectionId, c.itemId, {
                              owner: e.target.value,
                            })
                          }
                          className="mt-0.5 w-full rounded-md border border-[var(--color-line)] p-1.5 text-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[11px] text-[var(--color-ink-sub)]">
                          期限
                        </span>
                        <input
                          type="date"
                          value={c.due}
                          onChange={(e) =>
                            updateAnswer(c.inspectionId, c.itemId, {
                              due: e.target.value,
                            })
                          }
                          className="mt-0.5 w-full rounded-md border border-[var(--color-line)] p-1.5 text-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[11px] text-[var(--color-ink-sub)]">
                          完了日
                        </span>
                        <input
                          type="date"
                          value={c.doneAt}
                          onChange={(e) =>
                            updateAnswer(c.inspectionId, c.itemId, {
                              doneAt: e.target.value,
                            })
                          }
                          className="mt-0.5 w-full rounded-md border border-[var(--color-line)] p-1.5 text-sm"
                        />
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {corrections.length > 0 && (
            <PlainButton
              className="mt-3 w-full"
              onClick={() =>
                download(
                  `Age3_是正管理_${today}.csv`,
                  correctionsCsv(data.inspections, today),
                  "text/csv",
                )
              }
            >
              是正台帳CSVを書き出す
            </PlainButton>
          )}
        </>
      )}

      {tab === "データ" && (
        <>
          <Card className="mt-4 p-3">
            <p className="text-sm font-bold">バックアップ（JSON）</p>
            <p className="mt-1 text-xs text-[var(--color-ink-sub)]">
              データはこの端末のブラウザ内にだけ保存されています。機種変更やキャッシュ削除で消えるため、
              視察が終わったら必ず書き出してください。
            </p>
            <div className="mt-3 space-y-2">
              <GoldButton
                className="w-full"
                onClick={async () => {
                  download(
                    `Age3_バックアップ_${today}.json`,
                    await exportBundle(true),
                    "application/json",
                  );
                }}
              >
                JSONを書き出す（写真を含む）
              </GoldButton>
              <PlainButton
                className="w-full"
                onClick={async () => {
                  download(
                    `Age3_バックアップ_軽量_${today}.json`,
                    await exportBundle(false),
                    "application/json",
                  );
                }}
              >
                JSONを書き出す（写真なし・軽量）
              </PlainButton>

              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  if (
                    !window.confirm(
                      "現在この端末にあるデータは、読み込んだ内容で置き換わります。よろしいですか？",
                    )
                  )
                    return;
                  try {
                    await importBundle(await file.text());
                    setMsg("読み込みました。");
                  } catch {
                    setMsg("読み込めませんでした。ファイルを確認してください。");
                  }
                  setTimeout(() => setMsg(""), 4000);
                }}
              />
              <PlainButton className="w-full" onClick={() => fileRef.current?.click()}>
                JSONを読み込む（復元）
              </PlainButton>
            </div>
            {msg && <p className="mt-2 text-xs font-bold">{msg}</p>}
          </Card>

          <Card className="mt-3 p-3">
            <p className="text-sm font-bold">ホーム画面に追加</p>
            <p className="mt-1 text-xs text-[var(--color-ink-sub)]">
              iPhoneはSafariの共有ボタン →「ホーム画面に追加」。
              Androidはメニュー →「アプリをインストール」。
              追加しておけば電波が弱くてもオフラインで開けます。
            </p>
          </Card>

          <Card className="mt-3 border-[var(--color-ng)] p-3">
            <p className="text-sm font-bold text-[var(--color-ng)]">全データ削除</p>
            <button
              type="button"
              onClick={async () => {
                if (
                  window.confirm(
                    "この端末の全ての視察記録と写真を削除します。取り消せません。",
                  )
                ) {
                  await clearAll();
                  setMsg("削除しました。");
                  setTimeout(() => setMsg(""), 4000);
                }
              }}
              className="mt-2 min-h-[44px] w-full rounded-lg border border-[var(--color-ng)] text-sm font-bold text-[var(--color-ng)]"
            >
              全データを削除する
            </button>
          </Card>
        </>
      )}
    </div>
  );
}
