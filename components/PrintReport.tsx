"use client";

/**
 * A4 1枚に収める報告書。画面には出さず、印刷（＝PDFとして保存）のときだけ表示する。
 * ブラウザの「PDFとして保存」を使うので、文字が選択できる軽いPDFになり、
 * 日本語フォントを埋め込む必要もない（端末のゴシック体をそのまま使う）。
 *
 * 1枚に収めるため、行数の上限と各行の高さを固定してある。
 * 溢れた分は件数を明記して落とす（黙って切ると「全部載っている」と誤読されるため）。
 */

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

/** 1枚に確実に収まる要改善の行数。これを超えた分は件数だけ出す */
const MAX_ISSUE_ROWS = 12;
const MAX_LEDGER_ROWS = 12;

function verdictInk(v: Summary["verdict"]) {
  return v === "green" ? INK.ok : v === "yellow" ? INK.mid : v === "red" ? INK.ng : INK.na;
}

function RowBar({ rate }: { rate: number | null }) {
  return (
    <div className="pr-bar">
      <span style={{ width: `${Math.round((rate ?? 0) * 100)}%` }} />
    </div>
  );
}

function Head({
  title,
  meta,
  issuedOn,
}: {
  title: string;
  meta: string;
  issuedOn: string;
}) {
  return (
    <div className="pr-head">
      <p className="pr-brand">Age.3</p>
      <h1>{title}</h1>
      <p className="pr-head-meta">{meta}</p>
      <p className="pr-head-sub">出力日 {issuedOn}</p>
    </div>
  );
}

function Kpi({
  label,
  value,
  alert,
  ink,
}: {
  label: string;
  value: string;
  alert?: boolean;
  ink?: string;
}) {
  return (
    <div className={`pr-kpi-cell${alert ? " is-alert" : ""}`}>
      <span className="pr-kpi-label">{label}</span>
      <span className="pr-kpi-value" style={{ color: ink }}>
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 店舗レポート（A4 1枚）                                              */
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

  const diff =
    prevS?.weightedRate != null && s.weightedRate != null
      ? s.weightedRate - prevS.weightedRate
      : null;

  const weightRank = { S: 0, A: 1, B: 2 } as const;
  const allIssues = items
    .map((item) => {
      const a = answerOf(inspection, item.id);
      const pj = previous?.answers[item.id]?.judgement ?? null;
      return { item, a, worsened: compareJudgement(pj, a.judgement) === "worsened" };
    })
    .filter(({ a }) => a.judgement === "×" || a.judgement === "△")
    .sort(
      (x, y) =>
        (x.a.judgement === "×" ? 0 : 1) - (y.a.judgement === "×" ? 0 : 1) ||
        weightRank[x.item.weight] - weightRank[y.item.weight] ||
        x.item.id - y.item.id,
    );

  const issues = allIssues.slice(0, MAX_ISSUE_ROWS);
  const omitted = allIssues.length - issues.length;

  const fixedCount = previous
    ? items.filter((i) =>
        isFixed(previous.answers[i.id]?.judgement ?? null, answerOf(inspection, i.id).judgement),
      ).length
    : 0;
  const worsenedCount = allIssues.filter((r) => r.worsened).length;

  return (
    <div className="pr-doc pr-a4">
      <Head
        title="店舗チェック報告書"
        meta={`${inspection.store}　${inspection.date}　視察者：${inspection.inspector || "—"}`}
        issuedOn={issuedOn}
      />

      {/* 要約 */}
      <div className="pr-summary">
        <div className="pr-score-main">
          <span className="pr-label">総合スコア（加重達成率）</span>
          <span className="pr-score-value" style={{ color: verdictInk(s.verdict) }}>
            {pct(s.weightedRate)}
          </span>
          <span className="pr-verdict" style={{ color: verdictInk(s.verdict) }}>
            {VERDICT_LABEL[s.verdict]}
          </span>
        </div>
        <div className="pr-kpi-grid">
          <Kpi label="○" value={`${s.maru}`} ink={INK.ok} />
          <Kpi label="△" value={`${s.sankaku}`} ink={INK.mid} />
          <Kpi label="×" value={`${s.batsu}`} ink={INK.ng} />
          <Kpi label="対象外" value={`${s.excluded}`} ink={INK.na} />
          <Kpi label="未入力" value={`${s.unanswered}`} alert={s.unanswered > 0} />
          <Kpi
            label="S項目の×"
            value={`${s.criticalBatsu}`}
            alert={s.criticalBatsu > 0}
            ink={s.criticalBatsu > 0 ? INK.ng : undefined}
          />
          <Kpi
            label="是正未完了"
            value={`${s.openCorrections}`}
            alert={s.openCorrections > 0}
            ink={s.openCorrections > 0 ? INK.ng : undefined}
          />
          <Kpi
            label="期限未記入"
            value={`${s.missingDue}`}
            alert={s.missingDue > 0}
            ink={s.missingDue > 0 ? INK.ng : undefined}
          />
          <Kpi label="前回スコア" value={pct(prevS?.weightedRate ?? null)} />
          <Kpi
            label="前回比"
            value={
              diff === null
                ? "—"
                : `${diff > 0 ? "＋" : diff < 0 ? "−" : "±"}${pct(Math.abs(diff), 1)}`
            }
            ink={diff === null ? undefined : diff > 0 ? INK.ok : diff < 0 ? INK.ng : undefined}
          />
          <Kpi
            label="是正済み"
            value={previous ? `${fixedCount}` : "—"}
            ink={fixedCount > 0 ? INK.ok : undefined}
          />
          <Kpi
            label="悪化"
            value={previous ? `${worsenedCount}` : "—"}
            alert={worsenedCount > 0}
            ink={worsenedCount > 0 ? INK.ng : undefined}
          />
        </div>
      </div>

      {s.criticalBatsu > 0 && (
        <p className="pr-alert">
          S項目（食品衛生・食品安全・行政/近隣リスク）の×が{s.criticalBatsu}件。総合何%でも赤。
          他を中断して、その場で是正する。営業を止める判断も含めて検討する。
        </p>
      )}

      {/* カテゴリ別 */}
      <h2 className="pr-h2">カテゴリ別 加重達成率</h2>
      <table className="pr-table pr-cat">
        <thead>
          <tr>
            <th className="w-cat">カテゴリ</th>
            <th className="w-num">項目</th>
            <th className="w-num">○</th>
            <th className="w-num">△</th>
            <th className="w-num">×</th>
            <th className="w-num">対象外</th>
            <th className="w-rate">達成率</th>
            <th className="w-bar">達成度</th>
            <th className="w-num">前回比</th>
          </tr>
        </thead>
        <tbody>
          {s.categories.map((c) => {
            const p = prevS?.categories.find((x) => x.category === c.category)?.rate ?? null;
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
                  style={{
                    color: d === null ? undefined : d > 0 ? INK.ok : d < 0 ? INK.ng : undefined,
                  }}
                >
                  {d === null ? "—" : `${d > 0 ? "＋" : d < 0 ? "−" : "±"}${pct(Math.abs(d))}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 要改善 */}
      <h2 className="pr-h2">
        要改善（×と△／{allIssues.length}件
        {omitted > 0 ? `　※重要度の高い${issues.length}件を掲載` : ""}）
      </h2>
      {allIssues.length === 0 ? (
        <p className="pr-empty">×・△の項目はありません。</p>
      ) : (
        <table className="pr-table pr-issue">
          <thead>
            <tr>
              <th className="w-j">判定</th>
              <th className="w-w">重要度</th>
              <th className="w-cat2">カテゴリ</th>
              <th>チェック項目／確認した事実</th>
              <th className="w-own">担当</th>
              <th className="w-due">期限</th>
            </tr>
          </thead>
          <tbody>
            {issues.map(({ item, a, worsened }) => (
              <IssueRow key={item.id} item={item} a={a} worsened={worsened} />
            ))}
          </tbody>
        </table>
      )}
      {omitted > 0 && (
        <p className="pr-omit">
          ほか{omitted}件は本紙に載せていません。全件はアプリの「要改善」またはCSV書き出しで確認してください。
        </p>
      )}

      <p className="pr-foot-note">
        加重達成率 ＝ Σ(重み×判定係数) ÷ Σ(重み)。重み S=5／A=3／B=1、判定 ○=1.0／△=0.5／×=0。対象外と未入力は分母から除外。
        合格ライン 80%以上=緑／60〜79%=黄／60%未満=赤。ただしS項目に×があれば総合何%でも赤。
      </p>
    </div>
  );
}

function IssueRow({
  item,
  a,
  worsened,
}: {
  item: ChecklistItem;
  a: Answer;
  worsened: boolean;
}) {
  return (
    <tr>
      <td
        className="w-j"
        style={{ color: a.judgement === "×" ? INK.ng : INK.mid, fontWeight: 700 }}
      >
        {a.judgement}
      </td>
      <td className="w-w" style={{ color: item.weight === "S" ? INK.ng : undefined }}>
        {item.weight}
      </td>
      <td className="w-cat2">
        <span className="pr-clamp1">{item.category}</span>
      </td>
      <td>
        <span className="pr-clamp1 pr-item-text">{item.text}</span>
        {a.note && <span className="pr-clamp1 pr-fact">事実：{a.note}</span>}
        {worsened && <span className="pr-worse">前回より悪化</span>}
      </td>
      <td className="w-own">
        {a.judgement === "×" ? a.owner || <span style={{ color: INK.ng }}>未記入</span> : "—"}
      </td>
      <td className="w-due">
        {a.judgement === "×" ? a.due || <span style={{ color: INK.ng }}>未記入</span> : "—"}
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/* 全店レポート（A4 1枚）                                              */
/* ------------------------------------------------------------------ */

export function AllStoresReport({ all, issuedOn }: { all: Inspection[]; issuedOn: string }) {
  const latest = STORES.map((store) => {
    const insp = all
      .filter((i) => i.store === store)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0];
    return { store, insp, s: insp ? summarize(insp) : null };
  });

  const allCorrections = collectCorrections(all, issuedOn).filter((c) => c.status !== "完了");
  const corrections = allCorrections.slice(0, MAX_LEDGER_ROWS);
  const omitted = allCorrections.length - corrections.length;

  return (
    <div className="pr-doc pr-a4">
      <Head title="全店 店舗チェック報告書" meta="銀座・原宿・浅草" issuedOn={issuedOn} />

      <h2 className="pr-h2">3店舗比較（各店の直近視察）</h2>
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
            <th className="w-num">未入力</th>
            <th className="w-verdict">判定</th>
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
              <td
                className="w-num"
                style={{ color: (s?.criticalBatsu ?? 0) > 0 ? INK.ng : undefined }}
              >
                {s?.criticalBatsu ?? "—"}
              </td>
              <td className="w-num">{s?.batsu ?? "—"}</td>
              <td className="w-num">{s?.sankaku ?? "—"}</td>
              <td className="w-num">{s?.unanswered ?? "—"}</td>
              <td className="w-verdict" style={{ color: s ? verdictInk(s.verdict) : undefined }}>
                {s ? VERDICT_LABEL[s.verdict] : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="pr-h2">カテゴリ別 3店比較（加重達成率）</h2>
      <table className="pr-table pr-cat">
        <thead>
          <tr>
            <th className="w-cat">カテゴリ</th>
            {latest.map(({ store }) => (
              <th key={store} className="w-rate">
                {store}
              </th>
            ))}
            <th className="w-bar3">達成度（銀座／原宿／浅草）</th>
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
              <td className="w-bar3">
                {latest.map(({ store, s }) => {
                  const c = s?.categories.find((x) => x.category === cat);
                  return <RowBar key={store} rate={c?.rate ?? null} />;
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="pr-h2">
        是正管理台帳（未完了 {allCorrections.length}件
        {omitted > 0 ? `　※${corrections.length}件を掲載` : ""}）
      </h2>
      {allCorrections.length === 0 ? (
        <p className="pr-empty">未完了の是正はありません。</p>
      ) : (
        <table className="pr-table pr-issue">
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
                  <span className="pr-clamp1 pr-item-text">{c.text}</span>
                  {c.note && <span className="pr-clamp1 pr-fact">事実：{c.note}</span>}
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
      {omitted > 0 && (
        <p className="pr-omit">
          ほか{omitted}件は本紙に載せていません。全件はアプリの「まとめ → 是正台帳」またはCSV書き出しで確認してください。
        </p>
      )}

      <p className="pr-foot-note">
        加重達成率 ＝ Σ(重み×判定係数) ÷ Σ(重み)。重み S=5／A=3／B=1、判定 ○=1.0／△=0.5／×=0。
        合格ライン 80%以上=緑／60〜79%=黄／60%未満=赤。ただしS項目に×があれば総合何%でも赤。
      </p>
    </div>
  );
}
