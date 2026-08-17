"use client";

/**
 * A4の報告書。画面には出さず、印刷（＝PDFとして保存）のときだけ表示する。
 * ブラウザの「PDFとして保存」を使うので、文字が選択できる軽いPDFになり、
 * 日本語フォントを埋め込む必要もない（端末のゴシック体をそのまま使う）。
 */

import { usePhotoUrl } from "@/lib/store";
import {
  answerOf,
  collectCorrections,
  compareJudgement,
  findPrevious,
  isFixed,
  itemsForStore,
  pct,
  summarize,
  VERDICT_LABEL,
  type Summary,
} from "@/lib/score";
import { CATEGORIES, STORES } from "@/lib/checklist";
import type { Answer, ChecklistItem, Inspection } from "@/lib/types";

const INK = { ok: "#2F6B46", mid: "#8A6D22", ng: "#A33A2E", na: "#8A7A6D" };

function verdictInk(v: Summary["verdict"]) {
  return v === "green" ? INK.ok : v === "yellow" ? INK.mid : v === "red" ? INK.ng : INK.na;
}

/** 表の中に入れる横棒。印刷でも色が出るよう print-color-adjust を効かせている */
function RowBar({ rate }: { rate: number | null }) {
  return (
    <div className="pr-bar">
      <span style={{ width: `${Math.round((rate ?? 0) * 100)}%` }} />
    </div>
  );
}

function ScoreBlock({ s, prev }: { s: Summary; prev: Summary | null }) {
  const diff =
    prev?.weightedRate != null && s.weightedRate != null
      ? s.weightedRate - prev.weightedRate
      : null;

  return (
    <div className="pr-score">
      <div className="pr-score-main">
        <p className="pr-label">総合スコア（加重達成率）</p>
        <p className="pr-score-value" style={{ color: verdictInk(s.verdict) }}>
          {pct(s.weightedRate)}
        </p>
        <p className="pr-verdict" style={{ color: verdictInk(s.verdict) }}>
          判定：{VERDICT_LABEL[s.verdict]}
        </p>
        {diff !== null && (
          <p className="pr-note">
            前回比 {diff > 0 ? "＋" : diff < 0 ? "−" : "±"}
            {pct(Math.abs(diff), 1)}（前回 {pct(prev?.weightedRate ?? null)}）
          </p>
        )}
      </div>
      <table className="pr-kpi">
        <tbody>
          <tr>
            <th>S項目の×</th>
            <td style={{ color: s.criticalBatsu > 0 ? INK.ng : undefined }}>
              {s.criticalBatsu}件
            </td>
            <th>是正未完了</th>
            <td style={{ color: s.openCorrections > 0 ? INK.ng : undefined }}>
              {s.openCorrections}件
            </td>
          </tr>
          <tr>
            <th>期限未記入の×</th>
            <td style={{ color: s.missingDue > 0 ? INK.ng : undefined }}>{s.missingDue}件</td>
            <th>未入力</th>
            <td>{s.unanswered}件</td>
          </tr>
          <tr>
            <th>○ / △ / ×</th>
            <td colSpan={3}>
              <span style={{ color: INK.ok }}>○ {s.maru}</span>
              <span style={{ color: INK.mid }}>△ {s.sankaku}</span>
              <span style={{ color: INK.ng }}>× {s.batsu}</span>
              <span style={{ color: INK.na }}>対象外 {s.excluded}</span>
              　／　単純○率（参考）{pct(s.simpleRate, 1)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function CategoryTable({ s, prev }: { s: Summary; prev: Summary | null }) {
  const prevMap = new Map((prev?.categories ?? []).map((c) => [c.category, c.rate] as const));

  return (
    <table className="pr-table">
      <thead>
        <tr>
          <th className="w-cat">カテゴリ</th>
          <th className="w-num">項目</th>
          <th className="w-num">○</th>
          <th className="w-num">△</th>
          <th className="w-num">×</th>
          <th className="w-num">対象外</th>
          <th className="w-rate">加重達成率</th>
          <th className="w-bar">達成度</th>
          <th className="w-num">前回比</th>
        </tr>
      </thead>
      <tbody>
        {s.categories.map((c) => {
          const p = prevMap.get(c.category) ?? null;
          const d = p !== null && c.rate !== null ? c.rate - p : null;
          return (
            <tr key={c.category}>
              <td className="w-cat">{c.category}</td>
              <td className="w-num">{c.total}</td>
              <td className="w-num" style={{ color: INK.ok }}>{c.maru}</td>
              <td className="w-num" style={{ color: INK.mid }}>{c.sankaku}</td>
              <td className="w-num" style={{ color: c.batsu > 0 ? INK.ng : undefined }}>
                {c.batsu}
              </td>
              <td className="w-num">{c.excluded}</td>
              <td className="w-rate">{pct(c.rate)}</td>
              <td className="w-bar">
                <RowBar rate={c.rate} />
              </td>
              <td
                className="w-num"
                style={{ color: d === null ? undefined : d > 0 ? INK.ok : d < 0 ? INK.ng : undefined }}
              >
                {d === null ? "—" : `${d > 0 ? "＋" : d < 0 ? "−" : "±"}${pct(Math.abs(d))}`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function IssueTable({
  rows,
}: {
  rows: { item: ChecklistItem; a: Answer; fixedNow: boolean; worsened: boolean }[];
}) {
  if (rows.length === 0) {
    return <p className="pr-empty">×・△の項目はありません。</p>;
  }
  return (
    <table className="pr-table">
      <thead>
        <tr>
          <th className="w-j">判定</th>
          <th className="w-w">重要度</th>
          <th className="w-cat2">カテゴリ</th>
          <th>チェック項目／確認した事実</th>
          <th className="w-own">是正担当</th>
          <th className="w-due">期限</th>
          <th className="w-due">完了日</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ item, a, worsened }) => (
          <tr key={item.id}>
            <td
              className="w-j"
              style={{ color: a.judgement === "×" ? INK.ng : INK.mid, fontWeight: 700 }}
            >
              {a.judgement}
            </td>
            <td className="w-w" style={{ color: item.weight === "S" ? INK.ng : undefined }}>
              {item.weight}
            </td>
            <td className="w-cat2">{item.category}</td>
            <td>
              <span className="pr-item-text">{item.text}</span>
              {a.note && <span className="pr-fact">事実：{a.note}</span>}
              {worsened && <span className="pr-worse">前回より悪化</span>}
            </td>
            <td className="w-own">
              {a.judgement === "×" ? a.owner || <span style={{ color: INK.ng }}>未記入</span> : "—"}
            </td>
            <td className="w-due">
              {a.judgement === "×" ? a.due || <span style={{ color: INK.ng }}>未記入</span> : "—"}
            </td>
            <td className="w-due">{a.doneAt || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PhotoCell({ photoId, caption }: { photoId: string; caption: string }) {
  const url = usePhotoUrl(photoId);
  return (
    <figure className="pr-photo">
      {/* 端末内の写真をそのまま印刷するだけなので next/image は使わない */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt={caption} />}
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function FullTable({ inspection, items }: { inspection: Inspection; items: ChecklistItem[] }) {
  return (
    <table className="pr-table pr-table-sm">
      <thead>
        <tr>
          <th className="w-no">No</th>
          <th className="w-w">重要度</th>
          <th>チェック項目</th>
          <th className="w-j">判定</th>
          <th className="w-note">備考</th>
        </tr>
      </thead>
      <tbody>
        {CATEGORIES.map((cat) => {
          const catItems = items.filter((i) => i.category === cat);
          if (catItems.length === 0) return null;
          return (
            <FullTableGroup key={cat} cat={cat} catItems={catItems} inspection={inspection} />
          );
        })}
      </tbody>
    </table>
  );
}

function FullTableGroup({
  cat,
  catItems,
  inspection,
}: {
  cat: string;
  catItems: ChecklistItem[];
  inspection: Inspection;
}) {
  return (
    <>
      <tr className="pr-group">
        <td colSpan={5}>{cat}</td>
      </tr>
      {catItems.map((item) => {
        const a = answerOf(inspection, item.id);
        const ink =
          a.judgement === "×"
            ? INK.ng
            : a.judgement === "△"
              ? INK.mid
              : a.judgement === "○"
                ? INK.ok
                : INK.na;
        return (
          <tr key={item.id}>
            <td className="w-no">{item.id}</td>
            <td className="w-w" style={{ color: item.weight === "S" ? INK.ng : undefined }}>
              {item.weight}
            </td>
            <td>{item.text}</td>
            <td className="w-j" style={{ color: ink, fontWeight: 700 }}>
              {a.judgement ?? "未入力"}
            </td>
            <td className="w-note">{a.note}</td>
          </tr>
        );
      })}
    </>
  );
}

function ReportHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="pr-head">
      <div>
        <p className="pr-brand">Age.3</p>
        <h1>{title}</h1>
      </div>
      <p className="pr-head-sub">{sub}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1店舗分の報告書                                                     */
/* ------------------------------------------------------------------ */

export function StoreReport({
  inspection,
  all,
  issuedOn,
}: {
  inspection: Inspection;
  all: Inspection[];
  issuedOn: string;
}) {
  const s = summarize(inspection);
  const previous = findPrevious(all, inspection);
  const prevS = previous ? summarize(previous) : null;
  const items = itemsForStore(inspection.store);

  const weightRank = { S: 0, A: 1, B: 2 } as const;
  const issueRows = items
    .map((item) => {
      const a = answerOf(inspection, item.id);
      const pj = previous?.answers[item.id]?.judgement ?? null;
      return {
        item,
        a,
        fixedNow: isFixed(pj, a.judgement),
        worsened: compareJudgement(pj, a.judgement) === "worsened",
      };
    })
    .filter(({ a }) => a.judgement === "×" || a.judgement === "△")
    .sort(
      (x, y) =>
        (x.a.judgement === "×" ? 0 : 1) - (y.a.judgement === "×" ? 0 : 1) ||
        weightRank[x.item.weight] - weightRank[y.item.weight] ||
        x.item.id - y.item.id,
    );

  const fixedCount = previous
    ? items.filter((i) =>
        isFixed(previous.answers[i.id]?.judgement ?? null, answerOf(inspection, i.id).judgement),
      ).length
    : 0;
  const worsenedCount = issueRows.filter((r) => r.worsened).length;

  const photoRows = issueRows.filter(({ a }) => a.photos.length > 0);

  return (
    <div className="pr-doc">
      <ReportHeader
        title="店舗チェック報告書"
        sub={`出力日 ${issuedOn}`}
      />

      <table className="pr-meta">
        <tbody>
          <tr>
            <th>店舗</th>
            <td>{inspection.store}</td>
            <th>視察日</th>
            <td>{inspection.date}</td>
            <th>視察者</th>
            <td>{inspection.inspector || "—"}</td>
          </tr>
          <tr>
            <th>対象項目</th>
            <td>{s.total}項目（共通＋{inspection.store}追加）</td>
            <th>前回視察</th>
            <td colSpan={3}>
              {previous ? `${previous.date}（${pct(prevS?.weightedRate ?? null)}）` : "なし"}
            </td>
          </tr>
        </tbody>
      </table>

      <ScoreBlock s={s} prev={prevS} />

      {s.criticalBatsu > 0 && (
        <p className="pr-alert">
          S項目（食品衛生・食品安全・行政/近隣リスク）の×が{s.criticalBatsu}件。
          総合何%でも赤。他を中断して、その場で是正する。営業を止める判断も含めて検討する。
        </p>
      )}

      <h2 className="pr-h2">1. カテゴリ別 加重達成率</h2>
      <CategoryTable s={s} prev={prevS} />
      <p className="pr-foot-note">
        加重達成率 ＝ Σ(重み×判定係数) ÷ Σ(重み)。重み S=5／A=3／B=1、判定 ○=1.0／△=0.5／×=0。
        対象外と未入力は分母から除外。
      </p>

      {previous && (
        <>
          <h2 className="pr-h2">2. 前回（{previous.date}）との比較</h2>
          <table className="pr-table">
            <thead>
              <tr>
                <th>指標</th>
                <th className="w-rate">前回</th>
                <th className="w-rate">今回</th>
                <th className="w-rate">増減</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>総合スコア（加重）</td>
                <td className="w-rate">{pct(prevS?.weightedRate ?? null)}</td>
                <td className="w-rate">{pct(s.weightedRate)}</td>
                <td className="w-rate">
                  {prevS?.weightedRate != null && s.weightedRate != null
                    ? `${s.weightedRate - prevS.weightedRate >= 0 ? "＋" : "−"}${pct(Math.abs(s.weightedRate - prevS.weightedRate), 1)}`
                    : "—"}
                </td>
              </tr>
              <tr>
                <td>×の件数</td>
                <td className="w-rate">{prevS?.batsu ?? "—"}</td>
                <td className="w-rate">{s.batsu}</td>
                <td className="w-rate">
                  {prevS ? `${s.batsu - prevS.batsu >= 0 ? "＋" : "−"}${Math.abs(s.batsu - prevS.batsu)}` : "—"}
                </td>
              </tr>
              <tr>
                <td>S項目の×</td>
                <td className="w-rate">{prevS?.criticalBatsu ?? "—"}</td>
                <td className="w-rate">{s.criticalBatsu}</td>
                <td className="w-rate">
                  {prevS
                    ? `${s.criticalBatsu - prevS.criticalBatsu >= 0 ? "＋" : "−"}${Math.abs(s.criticalBatsu - prevS.criticalBatsu)}`
                    : "—"}
                </td>
              </tr>
              <tr>
                <td>前回×で今回○か△になった項目（是正済み）</td>
                <td className="w-rate">—</td>
                <td className="w-rate" style={{ color: INK.ok, fontWeight: 700 }}>
                  {fixedCount}件
                </td>
                <td className="w-rate">—</td>
              </tr>
              <tr>
                <td>前回より判定が下がった項目（悪化）</td>
                <td className="w-rate">—</td>
                <td
                  className="w-rate"
                  style={{ color: worsenedCount > 0 ? INK.ng : undefined, fontWeight: 700 }}
                >
                  {worsenedCount}件
                </td>
                <td className="w-rate">—</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      <h2 className="pr-h2">{previous ? "3" : "2"}. 要改善一覧（×と△／{issueRows.length}件）</h2>
      <IssueTable rows={issueRows} />

      {photoRows.length > 0 && (
        <>
          <h2 className="pr-h2 pr-break">現場写真</h2>
          <div className="pr-photos">
            {photoRows.flatMap(({ item, a }) =>
              a.photos.map((pid, i) => (
                <PhotoCell
                  key={pid}
                  photoId={pid}
                  caption={`${item.id}. ${item.text}${a.photos.length > 1 ? `（${i + 1}）` : ""}`}
                />
              )),
            )}
          </div>
        </>
      )}

      <h2 className="pr-h2 pr-break">付録：全項目の判定一覧</h2>
      <FullTable inspection={inspection} items={items} />

      <p className="pr-foot-note">
        判定基準：○=基準を満たす／△=やってはいるが不十分・人によって差がある／×=できていない、
        または基準そのものが存在しない／対象外=その店舗に該当しない。
        合格ライン：80%以上=緑、60〜79%=黄、60%未満=赤。ただしS項目に×があれば総合何%でも赤。
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 全店まとめの報告書                                                  */
/* ------------------------------------------------------------------ */

export function AllStoresReport({
  all,
  issuedOn,
}: {
  all: Inspection[];
  issuedOn: string;
}) {
  const latest = STORES.map((store) => {
    const insp = all
      .filter((i) => i.store === store)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0];
    return { store, insp, s: insp ? summarize(insp) : null };
  });

  const corrections = collectCorrections(all, issuedOn).filter((c) => c.status !== "完了");

  const history = all
    .filter((i) => Object.values(i.answers).some((a) => a.judgement !== null))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="pr-doc">
      <ReportHeader title="全店 店舗チェック報告書" sub={`出力日 ${issuedOn}`} />

      <h2 className="pr-h2">1. 3店舗比較（各店の直近視察）</h2>
      <table className="pr-table">
        <thead>
          <tr>
            <th className="w-store">店舗</th>
            <th className="w-due">視察日</th>
            <th className="w-own">視察者</th>
            <th className="w-rate">総合スコア</th>
            <th className="w-bar">達成度</th>
            <th className="w-num">S項目×</th>
            <th className="w-num">×</th>
            <th className="w-num">△</th>
            <th className="w-rate">判定</th>
          </tr>
        </thead>
        <tbody>
          {latest.map(({ store, insp, s }) => (
            <tr key={store}>
              <td className="w-store">{store}</td>
              <td className="w-due">{insp?.date ?? "—"}</td>
              <td className="w-own">{insp?.inspector || "—"}</td>
              <td className="w-rate">{s ? pct(s.weightedRate) : "未実施"}</td>
              <td className="w-bar">
                <RowBar rate={s?.weightedRate ?? null} />
              </td>
              <td className="w-num" style={{ color: (s?.criticalBatsu ?? 0) > 0 ? INK.ng : undefined }}>
                {s?.criticalBatsu ?? "—"}
              </td>
              <td className="w-num">{s?.batsu ?? "—"}</td>
              <td className="w-num">{s?.sankaku ?? "—"}</td>
              <td className="w-rate" style={{ color: s ? verdictInk(s.verdict) : undefined }}>
                {s ? VERDICT_LABEL[s.verdict] : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="pr-foot-note">
        3店を同じ基準で並べることで、「1店だけの問題」か「全社の問題」かを判別する。
      </p>

      <h2 className="pr-h2">2. カテゴリ別 3店比較</h2>
      <table className="pr-table">
        <thead>
          <tr>
            <th className="w-cat">カテゴリ</th>
            {latest.map(({ store }) => (
              <th key={store} className="w-rate">
                {store}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((cat) => (
            <tr key={cat}>
              <td className="w-cat">{cat}</td>
              {latest.map(({ store, s }) => {
                const c = s?.categories.find((x) => x.category === cat);
                return (
                  <td key={store} className="w-rate">
                    {c ? pct(c.rate) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="pr-h2">3. 是正管理台帳（未完了 {corrections.length}件）</h2>
      {corrections.length === 0 ? (
        <p className="pr-empty">未完了の是正はありません。</p>
      ) : (
        <table className="pr-table">
          <thead>
            <tr>
              <th className="w-due">検出日</th>
              <th className="w-store">店舗</th>
              <th className="w-w">重要度</th>
              <th>指摘内容（事実）</th>
              <th className="w-own">担当</th>
              <th className="w-due">期限</th>
              <th className="w-own">状況</th>
            </tr>
          </thead>
          <tbody>
            {corrections.map((c) => (
              <tr key={`${c.inspectionId}-${c.itemId}`}>
                <td className="w-due">{c.date}</td>
                <td className="w-store">{c.store}</td>
                <td className="w-w" style={{ color: c.weight === "S" ? INK.ng : undefined }}>
                  {c.weight}
                </td>
                <td>
                  <span className="pr-item-text">{c.text}</span>
                  {c.note && <span className="pr-fact">事実：{c.note}</span>}
                </td>
                <td className="w-own">
                  {c.owner || <span style={{ color: INK.ng }}>未記入</span>}
                </td>
                <td className="w-due">{c.due || <span style={{ color: INK.ng }}>未記入</span>}</td>
                <td
                  className="w-own"
                  style={{ color: c.status === "期限切れ" ? INK.ng : INK.mid, fontWeight: 700 }}
                >
                  {c.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="pr-h2">4. 視察履歴</h2>
      <table className="pr-table">
        <thead>
          <tr>
            <th className="w-due">視察日</th>
            <th className="w-store">店舗</th>
            <th className="w-own">視察者</th>
            <th className="w-rate">総合スコア</th>
            <th className="w-bar">達成度</th>
            <th className="w-num">S項目×</th>
            <th className="w-num">×</th>
            <th className="w-num">未入力</th>
          </tr>
        </thead>
        <tbody>
          {history.map((insp) => {
            const s = summarize(insp);
            return (
              <tr key={insp.id}>
                <td className="w-due">{insp.date}</td>
                <td className="w-store">{insp.store}</td>
                <td className="w-own">{insp.inspector || "—"}</td>
                <td className="w-rate">{pct(s.weightedRate)}</td>
                <td className="w-bar">
                  <RowBar rate={s.weightedRate} />
                </td>
                <td className="w-num" style={{ color: s.criticalBatsu > 0 ? INK.ng : undefined }}>
                  {s.criticalBatsu}
                </td>
                <td className="w-num">{s.batsu}</td>
                <td className="w-num">{s.unanswered}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="pr-foot-note">
        加重達成率 ＝ Σ(重み×判定係数) ÷ Σ(重み)。重み S=5／A=3／B=1、判定 ○=1.0／△=0.5／×=0。
        合格ライン：80%以上=緑、60〜79%=黄、60%未満=赤。ただしS項目に×があれば総合何%でも赤。
      </p>
    </div>
  );
}
