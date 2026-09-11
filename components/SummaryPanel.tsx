"use client";

import { useRouter } from "next/navigation";

import { useMemo, useRef, useState } from "react";
import { Bar, Card, JUDGEMENT_COLOR, Notice } from "./ui";
import { STORES } from "@/lib/checklist";
import {
  collectCorrections,
  compareCategories,
  hasAnswers,
  itemsForStore,
  pct,
  summarize,
  VERDICT_LABEL,
  type Correction,
} from "@/lib/score";
import { correctionsCsv, download, historyCsv } from "@/lib/export";
import { todayISO, useStore } from "@/lib/store";
import { AllStoresReport } from "./PrintReport";
import { useComparePicks, useDocumentTitle } from "@/lib/hooks";
import { usePrint } from "@/lib/usePrint";
import { PrintPortal } from "./PrintPortal";
import { PreviewBar } from "./PreviewBar";
import type { StoreName } from "@/lib/types";

/** 達成率を3段階に振り分ける。色だけに頼らないよう、セルには数字と横棒も出す */
function heatClass(rate: number | null) {
  if (rate === null) return "is-none";
  if (rate >= 0.8) return "is-ok";
  if (rate >= 0.6) return "is-mid";
  return "is-ng";
}

const STATUS_INK: Record<Correction["status"], string> = {
  期限切れ: "var(--color-ng)",
  対応中: "var(--color-mid)",
  完了: "var(--color-ok)",
};

const STATUS_BG: Record<Correction["status"], string> = {
  期限切れ: "var(--color-ng-bg)",
  対応中: "var(--color-mid-bg)",
  完了: "var(--color-ok-bg)",
};

export function SummaryPanel({ onJump }: { onJump: (s: StoreName) => void }) {
  const router = useRouter();
  const { data, ready, updateAnswer, deleteInspection, exportBundle, importBundle, clearAll } =
    useStore();
  const [showDone, setShowDone] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { printing, printFailed, print, clearFailed } = usePrint();
  const [preview, setPreview] = useState(false);
  const today = todayISO();
  const [picked, setPicked] = useComparePicks();

  /**
   * 比べる視察を店舗ごとに選ぶ。
   *
   * 3店を同じ日には回れないので、日付をひとつ選ぶ形だと比較資料にならない。
   * 店舗ごとに「どの回と比べるか」を選び、視察日は各行と帳票に明記する。
   * 既定は各店の直近（中身のある視察のうち、いちばん新しいもの）。
   */
  const picks = useMemo(
    () =>
      STORES.map((store) => {
        const history = data.inspections
          .filter((i) => i.store === store)
          .sort(
            (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
          );
        const chosen = history.find((i) => picked.includes(i.id));
        const insp = chosen ?? history.find(hasAnswers);
        return { store, history, insp, total: itemsForStore(store).length };
      }),
    [data.inspections, picked],
  );

  /** ある店の選択を差し替える。ほかの店の選択はそのまま残す */
  const choose = (store: StoreName, id: string) => {
    const others = picks
      .filter((p) => p.store !== store)
      .map((p) => p.insp?.id)
      .filter((v): v is string => !!v);
    setPicked([...others, id]);
  };

  // PDFの保存名になるので、画面を開いた時点で入れておく。
  // 店ごとに視察日が違うので、名前に入れるのは出力日
  const docTitle = `全店　店舗チェック ${today}`;
  useDocumentTitle(docTitle);

  if (!ready) {
    return (
      <Card>
        <p className="text-[14px] text-[var(--color-sub)]">読み込み中…</p>
      </Card>
    );
  }

  const say = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 3000);
  };

  const history = data.inspections
    .filter(hasAnswers)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  const corrections = collectCorrections(data.inspections, today).filter(
    (c) => showDone || c.status !== "完了",
  );

  const rows = picks.map((p) => ({ ...p, s: p.insp ? summarize(p.insp) : null }));

  // カテゴリ別の比較。2店以上そろっていないと比較にならないので、そのときだけ出す
  const cats = compareCategories(picks);
  const comparable = picks.filter((p) => p.insp).length >= 2;

  return (
    <div className="space-y-4">
      {/* 全店舗の進捗一覧 */}
      <Card>
        <h2 className="text-[16px] font-bold">3店舗比較</h2>
        <p className="mt-0.5 text-[12px] text-[var(--color-sub)]">
          3店を同じ基準で並べると、「原宿だけの問題」か「全社の問題」かが判別できる。
          3店を同じ日には回れないので、比べる回は店舗ごとに選ぶ。
        </p>

        <ul className="mt-3 space-y-4">
          {rows.map(({ store, s, total, history, insp }) => {
            const done = s ? s.total - s.unanswered : 0;
            return (
              <li key={store}>
                {/* 店舗ごとに、どの回と比べるかを選ぶ */}
                <div className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-[15px] font-bold">{store}</span>
                  {history.length > 0 ? (
                    <select
                      value={insp?.id ?? ""}
                      onChange={(e) => choose(store, e.target.value)}
                      aria-label={`${store}の比較する視察`}
                      className="chip min-h-[40px] flex-1 px-3 text-[13px]"
                    >
                      {history.map((i) => {
                        const si = summarize(i);
                        return (
                          <option key={i.id} value={i.id}>
                            {i.date}
                            {i.date === today ? "（今日）" : ""}／{si.total - si.unanswered}/
                            {si.total}
                            {si.batsu > 0 ? ` ×${si.batsu}` : ""}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <span className="flex-1 text-[13px] text-[var(--color-sub)]">
                      視察の記録がまだありません
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onJump(store)}
                  className="mt-2 w-full text-left"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="tabular text-[12px] text-[var(--color-sub)]">
                      {done}/{total}
                    </span>
                    {s && s.criticalBatsu > 0 && (
                      <span
                        className="rounded-full px-1.5 text-[11px] font-bold"
                        style={{
                          background: JUDGEMENT_COLOR["×"].bg,
                          color: JUDGEMENT_COLOR["×"].ink,
                        }}
                      >
                        S項目× {s.criticalBatsu}
                      </span>
                    )}
                    <span className="tabular ml-auto text-[17px] font-bold">
                      {s && s.weightedRate !== null ? pct(s.weightedRate) : "未着手"}
                    </span>
                  </div>
                  <div className="mt-1">
                    <Bar value={s ? (s.weightedRate ?? 0) : 0} />
                  </div>
                  {s && s.weightedRate !== null && (
                    <p className="mt-1 text-[11px] text-[var(--color-sub)]">
                      判定：{VERDICT_LABEL[s.verdict]}／○{s.maru} △{s.sankaku} ×{s.batsu}
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="btn btn-primary mt-4 w-full"
          onClick={() => print(docTitle)}
          disabled={printing}
        >
          {printing ? "準備中…" : "全店PDF報告書を作る"}
        </button>
        <button
          type="button"
          className="btn mt-2 w-full"
          onClick={() => {
            clearFailed();
            setPreview(true);
          }}
        >
          報告書を画面で見る（PDFが出ないとき）
        </button>
        <p className="mt-1 text-[11px] text-[var(--color-sub)]">
          3店比較・カテゴリ別比較・是正台帳・視察履歴をA4の帳票にまとめて出します。
        </p>
        {printFailed && (
          <div className="notice mt-2 px-3 py-2.5 text-[12px] leading-relaxed">
            <p className="font-bold">印刷シートが出ませんでしたか？</p>
            <p className="mt-1">
              LINEやInstagramのアプリ内ブラウザ、ホーム画面に追加したアプリでは印刷が動きません。
              右上の「…」から<span className="font-bold">Safariで開く</span>と使えます。
              このままなら「報告書を画面で見る」でスクリーンショットを撮ってください。
            </p>
          </div>
        )}
      </Card>

      {/* カテゴリ別の比較。どこが弱いかを一目で見る */}
      {comparable && (
        <Card>
          <h2 className="text-[16px] font-bold">カテゴリ別 3店比較</h2>
          <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-sub)]">
            緑=80%以上／黄=60〜79%／赤=60%未満。
            <span className="font-bold">3店とも赤いカテゴリは本部の基準の問題</span>、
            <span className="font-bold">1店だけ赤いカテゴリはその店のやり方の問題</span>。
          </p>

          <table className="cmp mt-3">
            <thead>
              <tr>
                <th>カテゴリ</th>
                {picks.map(({ store }) => (
                  <th key={store}>{store}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cats.map(({ category, cells }) => (
                <tr key={category}>
                  <td>{category}</td>
                  {cells.map(({ store, rate }) => (
                    <td key={store}>
                      <span className={`cmp-cell ${heatClass(rate)}`}>
                        <span className="cmp-v">{pct(rate)}</span>
                        <span className="cmp-bar">
                          <span style={{ width: `${Math.round((rate ?? 0) * 100)}%` }} />
                        </span>
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-sub)]">
            3店の平均は出していません。平均にすると悪い店が良い店に隠れて、
            どこを直すのかが分からなくなるためです。
            項目ごとの食い違い（どの店だけができていないか）は全店PDFに載ります。
          </p>
        </Card>
      )}

      {/* 是正管理台帳 */}
      <Card>
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-bold">是正台帳（{corrections.length}件）</h2>
          <label className="ml-auto flex items-center gap-1 text-[12px] text-[var(--color-sub)]">
            <input
              type="checkbox"
              checked={showDone}
              onChange={(e) => setShowDone(e.target.checked)}
              className="h-4 w-4"
            />
            完了も表示
          </label>
        </div>
        <p className="mt-0.5 text-[12px] text-[var(--color-sub)]">
          ここが埋まらない限り、視察は「見ただけ」で終わる。
        </p>

        {corrections.length === 0 ? (
          <p className="mt-3 text-[13px] text-[var(--color-sub)]">未完了の是正はありません。</p>
        ) : (
          <ul className="mt-3">
            {corrections.map((c) => (
              <li
                key={`${c.inspectionId}-${c.itemId}`}
                className="border-b border-[var(--color-line)] py-3 last:border-b-0"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className="rounded-full px-2 py-[1px] text-[11px] font-bold"
                    style={{ background: STATUS_BG[c.status], color: STATUS_INK[c.status] }}
                  >
                    {c.status}
                  </span>
                  <span className="text-[11px] text-[var(--color-sub)]">
                    {c.store}／{c.date}
                  </span>
                  <span
                    className="rounded-full px-2 py-[1px] text-[11px] font-bold"
                    style={{
                      background: JUDGEMENT_COLOR["×"].bg,
                      color: JUDGEMENT_COLOR["×"].ink,
                    }}
                  >
                    重要度{c.weight}
                  </span>
                </div>
                <p className="mt-1 text-[14px] leading-snug">{c.text}</p>
                {c.note && (
                  <p className="mt-0.5 text-[12px] text-[var(--color-sub)]">事実：{c.note}</p>
                )}
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <label className="block">
                    <span className="text-[11px] text-[var(--color-sub)]">担当</span>
                    <input
                      value={c.owner}
                      onChange={(e) =>
                        updateAnswer(c.inspectionId, c.itemId, { owner: e.target.value })
                      }
                      className="mt-0.5 w-full rounded-lg border border-[var(--color-line)] p-1.5 text-[14px]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-[var(--color-sub)]">期限</span>
                    <input
                      type="date"
                      value={c.due}
                      onChange={(e) =>
                        updateAnswer(c.inspectionId, c.itemId, { due: e.target.value })
                      }
                      className="mt-0.5 w-full rounded-lg border border-[var(--color-line)] p-1.5 text-[14px]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-[var(--color-sub)]">完了日</span>
                    <input
                      type="date"
                      value={c.doneAt}
                      onChange={(e) =>
                        updateAnswer(c.inspectionId, c.itemId, { doneAt: e.target.value })
                      }
                      className="mt-0.5 w-full rounded-lg border border-[var(--color-line)] p-1.5 text-[14px]"
                    />
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}

        {corrections.length > 0 && (
          <button
            type="button"
            className="btn mt-3 w-full"
            onClick={() =>
              download(
                `Age3_是正管理_${today}.csv`,
                correctionsCsv(data.inspections, today),
                "text/csv",
              )
            }
          >
            是正台帳CSVを書き出す
          </button>
        )}
      </Card>

      {/* 視察履歴 */}
      <Card>
        <h2 className="text-[16px] font-bold">視察履歴（{history.length}件）</h2>
        <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-sub)]">
          「開く」を押すと、その日の記録をそのまま呼び戻して続きを入力できます。
        </p>
        {history.length === 0 ? (
          <p className="mt-3 text-[13px] text-[var(--color-sub)]">まだ記録がありません。</p>
        ) : (
          <ul className="mt-3">
            {history.map((insp) => {
              const s = summarize(insp);
              return (
                <li
                  key={insp.id}
                  className="flex items-center gap-2 border-b border-[var(--color-line)] py-2.5 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold">
                      {insp.store}
                      <span className="tabular ml-2 text-[12px] font-normal text-[var(--color-sub)]">
                        {insp.date}／{insp.inspector || "—"}
                      </span>
                    </p>
                    <p className="text-[11px] text-[var(--color-sub)]">
                      ○{s.maru} △{s.sankaku} ×{s.batsu}／未入力{s.unanswered}
                      {s.criticalBatsu > 0 && (
                        <span className="ml-1 font-bold" style={{ color: "var(--color-ng)" }}>
                          S×{s.criticalBatsu}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="tabular text-[16px] font-bold">{pct(s.weightedRate)}</span>
                  {/* 過去の記録を開いて、続きを入力できるようにする */}
                  <button
                    type="button"
                    onClick={() =>
                      router.replace(
                        `?store=${encodeURIComponent(insp.store)}&id=${encodeURIComponent(insp.id)}`,
                        { scroll: true },
                      )
                    }
                    className="chip min-h-[36px] shrink-0 px-3 text-[12px] font-bold"
                  >
                    開く
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `${insp.store}／${insp.date} の記録を削除します。取り消せません。`,
                        )
                      )
                        void deleteInspection(insp.id);
                    }}
                    className="shrink-0 px-1 text-[11px] text-[var(--color-sub)] underline"
                  >
                    削除
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {history.length > 0 && (
          <button
            type="button"
            className="btn mt-3 w-full"
            onClick={() => download(`Age3_履歴_${today}.csv`, historyCsv(history), "text/csv")}
          >
            履歴CSVを書き出す
          </button>
        )}
      </Card>

      {/* バックアップ */}
      <Card>
        <h2 className="text-[16px] font-bold">バックアップ（JSON）</h2>
        <div className="mt-3">
          <Notice>
            データはこの端末のブラウザ内にだけ保存されます。機種変更やキャッシュ削除で消えるため、
            視察が終わったら必ず書き出してください。
          </Notice>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () =>
              download(
                `Age3_バックアップ_${today}.json`,
                await exportBundle(true),
                "application/json",
              )
            }
          >
            JSON書き出し（写真込み）
          </button>
          <button
            type="button"
            className="btn"
            onClick={async () =>
              download(
                `Age3_バックアップ_軽量_${today}.json`,
                await exportBundle(false),
                "application/json",
              )
            }
          >
            JSON書き出し（軽量）
          </button>

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
                !window.confirm("現在この端末にあるデータは、読み込んだ内容で置き換わります。よろしいですか？")
              )
                return;
              try {
                await importBundle(await file.text());
                say("読み込みました。");
              } catch {
                say("読み込めませんでした。ファイルを確認してください。");
              }
            }}
          />
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            JSON読み込み（復元）
          </button>
          <button
            type="button"
            className="btn"
            style={{ borderColor: "var(--color-ng)", color: "var(--color-ng)" }}
            onClick={async () => {
              if (window.confirm("この端末の全ての視察記録と写真を削除します。取り消せません。")) {
                await clearAll();
                say("削除しました。");
              }
            }}
          >
            全データ削除
          </button>
        </div>

        {msg && <p className="mt-2 text-[13px] font-bold">{msg}</p>}

        <p className="mt-3 text-[12px] leading-relaxed text-[var(--color-sub)]">
          ホーム画面に追加：iPhoneはSafariの共有ボタン →「ホーム画面に追加」。
          Androidはメニュー →「アプリをインストール」。追加しておけば電波が弱くてもオフラインで開けます。
        </p>
      </Card>

      {/* 報告書は常に置いておく（画面には出ない）。写真と組版を先に済ませておかないと、
          iOSでは「押したその場で印刷を呼ぶ」ことができない */}
      <PrintPortal preview={preview}>
        <AllStoresReport all={data.inspections} picks={picks} issuedOn={today} />
      </PrintPortal>
      {preview && (
        <PreviewBar
          onPrint={() => print(docTitle)}
          onClose={() => setPreview(false)}
        />
      )}
    </div>
  );
}
