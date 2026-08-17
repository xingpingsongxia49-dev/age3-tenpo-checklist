"use client";

/**
 * A4 最大2枚の報告書。画面には出さず、印刷（＝PDFとして保存）のときだけ表示する。
 * ブラウザの「PDFとして保存」を使うので、文字が選択できる軽いPDFになり、
 * 日本語フォントを埋め込む必要もない（端末のゴシック体をそのまま使う）。
 *
 * 中身が少なければ1枚で終わる。多いときも2枚に収まるよう行数の上限を設けており、
 * 溢れた分は件数を明記して落とす（黙って切ると「全部載っている」と誤読されるため）。
 */

import { usePhotoUrls } from "@/lib/store";
import {
  answerOf,
  batsuStreak,
  collectCorrections,
  compareJudgement,
  dueSummary,
  findPrevious,
  hasAnswers,
  isFixed,
  itemsForStore,
  pct,
  summarize,
  unconfirmedPreviousBatsu,
  VERDICT_LABEL,
  type Summary,
} from "@/lib/score";
import { CATEGORIES, STORES } from "@/lib/checklist";
import type { Answer, ChecklistItem, Inspection } from "@/lib/types";

const INK = { ok: "#2F6B46", mid: "#8A6D22", ng: "#A33A2E", na: "#8A7A6D" };

/** 本編（表と集計）を2枚に収めるための上限。超えた分は件数だけ明記して落とす */
const MAX_ISSUE_ROWS = 16;
const MAX_LEDGER_ROWS = 16;
const MAX_HISTORY_ROWS = 8;

/**
 * 写真は本編の後ろに別ページで付ける。枚数に応じてページが増える。
 * 印刷が終わらなくなるのを防ぐための上限で、1ページ9枚 × 4ページ分。
 */
const MAX_PHOTOS = 36;

function verdictInk(v: Summary["verdict"]) {
  return v === "green" ? INK.ok : v === "yellow" ? INK.mid : v === "red" ? INK.ng : INK.na;
}

function signed(v: number, digits = 0) {
  const sign = v > 0 ? "＋" : v < 0 ? "−" : "±";
  return `${sign}${pct(Math.abs(v), digits)}`;
}

function RowBar({ rate }: { rate: number | null }) {
  return (
    <div className="pr-bar">
      <span style={{ width: `${Math.round((rate ?? 0) * 100)}%` }} />
    </div>
  );
}

function Head({ title, meta, issuedOn }: { title: string; meta: string; issuedOn: string }) {
  return (
    <header className="pr-head">
      <p className="pr-brand">Age.3</p>
      <h1>{title}</h1>
      <p className="pr-head-meta">{meta}</p>
      <p className="pr-head-sub">出力日 {issuedOn}</p>
    </header>
  );
}

function Kpi({
  label,
  value,
  unit,
  alert,
  ink,
}: {
  label: string;
  value: string;
  unit?: string;
  alert?: boolean;
  ink?: string;
}) {
  return (
    <div className={`pr-kpi-cell${alert ? " is-alert" : ""}`}>
      <span className="pr-kpi-label">{label}</span>
      <span className="pr-kpi-value" style={{ color: ink }}>
        {value}
        {unit && <span className="pr-kpi-unit">{unit}</span>}
      </span>
    </div>
  );
}

function PhotoCell({
  url,
  judgement,
  caption,
  note,
}: {
  url?: string;
  judgement: string | null;
  caption: string;
  note?: string;
}) {
  const ink =
    judgement === "×" ? INK.ng : judgement === "△" ? INK.mid : judgement === "○" ? INK.ok : INK.na;
  return (
    <figure className="pr-photo">
      <div className="pr-photo-frame">
        {/* 端末内の写真をそのまま印刷するだけなので next/image は使わない */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && <img src={url} alt={caption} />}
        {judgement && (
          <span className="pr-photo-judge" style={{ background: ink }}>
            判定 {judgement}
          </span>
        )}
      </div>
      <figcaption>
        <span className="pr-photo-cap">{caption}</span>
        {note && <span className="pr-photo-note">{note}</span>}
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* 店舗レポート                                                        */
/* ------------------------------------------------------------------ */

export function StoreReport({
  inspection,
  all,
  issuedOn,
  includePhotos = true,
}: {
  inspection: Inspection;
  all: Inspection[];
  issuedOn: string;
  includePhotos?: boolean;
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
      return {
        item,
        a,
        prevJudgement: pj,
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

  const issues = allIssues.slice(0, MAX_ISSUE_ROWS);
  const omitted = allIssues.length - issues.length;

  // 毎回同じ×が並ぶ項目と、前回×のまま未確認の項目を明示する
  const streaks = new Map(
    items.map((i) => [i.id, batsuStreak(all, inspection, i.id)] as const),
  );
  const repeated = items.filter((i) => (streaks.get(i.id) ?? 0) >= 2);
  const unconfirmed = unconfirmedPreviousBatsu(all, inspection);

  const fixedItems = previous
    ? items.filter((i) =>
        isFixed(previous.answers[i.id]?.judgement ?? null, answerOf(inspection, i.id).judgement),
      )
    : [];
  const worsenedCount = allIssues.filter((r) => r.worsened).length;

  // 要改善の写真はカード内に出す。カードに載らなかったもの（カテゴリ単位で撮った写真、
  // ○・対象外の項目に直接付いた写真、掲載枠から外れた要改善）は
  // 落とさず「そのほかの写真」に回す。ここはカードの1ページ8枚とは無関係。
  const cardIds = new Set(issues.map(({ item }) => item.id));

  const otherPhotos: {
    pid: string;
    caption: string;
    judgement: string | null;
    note?: string;
  }[] = [
    // カテゴリ単位で撮った写真
    ...CATEGORIES.flatMap((cat) =>
      (inspection.categoryPhotos?.[cat] ?? []).map((pid, i, arr) => ({
        pid,
        caption: `${cat}${arr.length > 1 ? `（${i + 1}/${arr.length}）` : ""}`,
        judgement: null as string | null,
        note: undefined,
      })),
    ),
    // 項目に直接付いた写真のうち、カードに出ていないもの
    ...items
      .filter((i) => !cardIds.has(i.id))
      .map((item) => ({ item, a: answerOf(inspection, item.id) }))
      .filter(({ a }) => a.photos.length > 0)
      .flatMap(({ item, a }) =>
        a.photos.map((pid, i) => ({
          pid,
          caption: `${item.id}. ${item.text}${a.photos.length > 1 ? `（${i + 1}/${a.photos.length}）` : ""}`,
          judgement: a.judgement as string | null,
          note: a.note || undefined,
        })),
      ),
  ];

  const issuePhotoIds = includePhotos
    ? issues.flatMap(({ a }) => a.photos).slice(0, MAX_PHOTOS)
    : [];
  const refPhotos = includePhotos
    ? otherPhotos.slice(0, Math.max(0, MAX_PHOTOS - issuePhotoIds.length))
    : [];
  const photoOmitted = includePhotos
    ? issues.flatMap(({ a }) => a.photos).length +
      otherPhotos.length -
      issuePhotoIds.length -
      refPhotos.length
    : 0;

  // 写真は端末内(IndexedDB)から非同期に読む。全部そろう前に印刷すると
  // 空枠のまま出てしまうので、揃ったことを data-photos-ready で外に伝える。
  const { urls, ready: photosReady } = usePhotoUrls([
    ...issuePhotoIds,
    ...refPhotos.map((p) => p.pid),
  ]);

  return (
    <div className="pr-doc pr-sheet" data-photos-ready={photosReady ? "true" : "false"}>
      <Head
        title="店舗チェック報告書"
        meta={`${inspection.store}　${inspection.date}　視察者：${inspection.inspector || "—"}`}
        issuedOn={issuedOn}
      />

      {/* 要約 */}
      <div className="pr-summary">
        <div className="pr-score-main" style={{ borderColor: verdictInk(s.verdict) }}>
          <span className="pr-label">総合スコア（加重達成率）</span>
          <span className="pr-score-value" style={{ color: verdictInk(s.verdict) }}>
            {pct(s.weightedRate)}
          </span>
          <span className="pr-verdict" style={{ color: verdictInk(s.verdict) }}>
            {VERDICT_LABEL[s.verdict]}
          </span>
          {diff !== null && (
            <span className="pr-note">
              前回比 {signed(diff, 1)}（前回 {pct(prevS?.weightedRate ?? null)}）
            </span>
          )}
        </div>

        <div className="pr-kpi-grid">
          <Kpi label="○ 基準を満たす" value={`${s.maru}`} unit="件" ink={INK.ok} />
          <Kpi label="△ 不十分・差がある" value={`${s.sankaku}`} unit="件" ink={INK.mid} />
          <Kpi label="× できていない" value={`${s.batsu}`} unit="件" ink={INK.ng} />
          <Kpi label="対象外" value={`${s.excluded}`} unit="件" ink={INK.na} />
          <Kpi
            label="S項目の×（即日是正）"
            value={`${s.criticalBatsu}`}
            unit="件"
            alert={s.criticalBatsu > 0}
            ink={s.criticalBatsu > 0 ? INK.ng : undefined}
          />
          <Kpi
            label="是正未完了"
            value={`${s.openCorrections}`}
            unit="件"
            alert={s.openCorrections > 0}
            ink={s.openCorrections > 0 ? INK.ng : undefined}
          />
          <Kpi
            label="担当・期限が未記入の×"
            value={`${s.missingDue}`}
            unit="件"
            alert={s.missingDue > 0}
            ink={s.missingDue > 0 ? INK.ng : undefined}
          />
          <Kpi
            label="未入力"
            value={`${s.unanswered}`}
            unit={`/${s.total}件`}
            alert={s.unanswered > 0}
          />
        </div>
      </div>

      {s.criticalBatsu > 0 && (
        <p className="pr-alert">
          S項目（食品衛生・食品安全・行政/近隣リスク）の×が{s.criticalBatsu}件。総合何%でも赤。
          他を中断して、その場で是正する。営業を止める判断も含めて検討する。
        </p>
      )}
      {unconfirmed.length > 0 && (
        <p className="pr-alert">
          前回×だった項目のうち{unconfirmed.length}件が未入力のままです。
          是正できたかを確認していないため、この報告書では「直ったか不明」として扱う。
          {unconfirmed
            .slice(0, 4)
            .map((i) => `${i.id}. ${i.text}`)
            .join("／")}
          {unconfirmed.length > 4 && `　ほか${unconfirmed.length - 4}件`}
        </p>
      )}
      {repeated.length > 0 && (
        <p className="pr-caution">
          2回以上続けて×の項目が{repeated.length}件あります。
          毎回同じ×が並ぶ項目は、現場の能力ではなく基準が決まっていないことが原因のことが多い。
          現場を叱る前に、本部・店長側で基準の有無を確認する。
        </p>
      )}
      {s.unanswered > 0 && (
        <p className="pr-caution">
          未入力が{s.unanswered}件あります。未入力は集計の分母から除外しているため、
          このスコアは「見た範囲」の評価です。
        </p>
      )}

      {/* 1. カテゴリ別 */}
      <h2 className="pr-h2">1. カテゴリ別 加重達成率</h2>
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
            <th className="w-rate">前回</th>
            <th className="w-rate">前回比</th>
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
                <td className="w-rate pr-strong">{pct(c.rate)}</td>
                <td className="w-bar">
                  <RowBar rate={c.rate} />
                </td>
                <td className="w-rate">{pct(p)}</td>
                <td
                  className="w-rate"
                  style={{
                    color: d === null ? undefined : d > 0 ? INK.ok : d < 0 ? INK.ng : undefined,
                  }}
                >
                  {d === null ? "—" : signed(d)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="pr-foot-note">
        加重達成率 ＝ Σ(重み×判定係数) ÷ Σ(重み)。重み S=5／A=3／B=1、判定 ○=1.0／△=0.5／×=0。対象外と未入力は分母から除外。
      </p>

      {/* 2. 前回比較 */}
      {previous && prevS && (
        <>
          <h2 className="pr-h2">2. 前回（{previous.date}）との比較</h2>
          <table className="pr-table">
            <thead>
              <tr>
                <th>指標</th>
                <th className="w-rate">前回</th>
                <th className="w-rate">今回</th>
                <th className="w-rate">増減</th>
                <th className="w-read">読み方</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>総合スコア（加重達成率）</td>
                <td className="w-rate">{pct(prevS.weightedRate)}</td>
                <td className="w-rate pr-strong">{pct(s.weightedRate)}</td>
                <td
                  className="w-rate pr-strong"
                  style={{
                    color:
                      diff === null ? undefined : diff > 0 ? INK.ok : diff < 0 ? INK.ng : undefined,
                  }}
                >
                  {diff === null ? "—" : signed(diff, 1)}
                </td>
                <td className="w-read">80%以上=緑／60〜79%=黄／60%未満=赤</td>
              </tr>
              <tr>
                <td>×の件数</td>
                <td className="w-rate">{prevS.batsu}</td>
                <td className="w-rate pr-strong">{s.batsu}</td>
                <td
                  className="w-rate"
                  style={{ color: s.batsu > prevS.batsu ? INK.ng : s.batsu < prevS.batsu ? INK.ok : undefined }}
                >
                  {s.batsu - prevS.batsu >= 0 ? "＋" : "−"}
                  {Math.abs(s.batsu - prevS.batsu)}
                </td>
                <td className="w-read">増えていれば現場が回っていない</td>
              </tr>
              <tr>
                <td>S項目の×（食品衛生・行政/近隣）</td>
                <td className="w-rate">{prevS.criticalBatsu}</td>
                <td className="w-rate pr-strong">{s.criticalBatsu}</td>
                <td
                  className="w-rate"
                  style={{
                    color:
                      s.criticalBatsu > prevS.criticalBatsu
                        ? INK.ng
                        : s.criticalBatsu < prevS.criticalBatsu
                          ? INK.ok
                          : undefined,
                  }}
                >
                  {s.criticalBatsu - prevS.criticalBatsu >= 0 ? "＋" : "−"}
                  {Math.abs(s.criticalBatsu - prevS.criticalBatsu)}
                </td>
                <td className="w-read">1件でもあれば総合何%でも赤</td>
              </tr>
              <tr>
                <td>是正済み（前回×→今回○か△）</td>
                <td className="w-rate">—</td>
                <td className="w-rate pr-strong" style={{ color: INK.ok }}>
                  {fixedItems.length}
                </td>
                <td className="w-rate">—</td>
                <td className="w-read">前回の指摘が実際に潰れた数</td>
              </tr>
              <tr>
                <td>悪化（前回より判定が下がった）</td>
                <td className="w-rate">—</td>
                <td
                  className="w-rate pr-strong"
                  style={{ color: worsenedCount > 0 ? INK.ng : undefined }}
                >
                  {worsenedCount}
                </td>
                <td className="w-rate">—</td>
                <td className="w-read">一度できたことが戻っている</td>
              </tr>
            </tbody>
          </table>

          {fixedItems.length > 0 && (
            <p className="pr-fixed">
              <span className="pr-fixed-label">是正済み</span>
              {fixedItems.map((i) => `${i.id}. ${i.text}`).join("／")}
            </p>
          )}
        </>
      )}

      {/* 3. 要改善（写真主体のカード。写真の下に詳細をテキストで置く）
          1ページ8枚（2列×4段）に揃えるため、必ずページの頭から始める */}
      <h2 className="pr-h2 pr-h2-break">
        {previous ? "3" : "2"}. 要改善（×と△／{allIssues.length}件
        {omitted > 0 ? `　※重要度の高い${issues.length}件を掲載` : ""}）
      </h2>
      {allIssues.length === 0 ? (
        <p className="pr-empty">×・△の項目はありません。</p>
      ) : (
        <div className="pr-cards">
          {issues.map(({ item, a, prevJudgement, worsened }) => {
            const shots = includePhotos
              ? a.photos.filter((pid) => urls.has(pid)).map((pid) => urls.get(pid)!)
              : [];
            const ink = a.judgement === "×" ? INK.ng : INK.mid;
            return (
              <article className="pr-card" key={item.id}>
                {shots.length > 0 ? (
                  <div className={`pr-card-shots${shots.length > 1 ? " is-multi" : ""}`}>
                    {shots.slice(0, 2).map((u, i) => (
                      <span className="pr-card-shot" key={i}>
                        {/* 端末内の写真をそのまま印刷するだけなので next/image は使わない */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u} alt="" />
                      </span>
                    ))}
                    {shots.length > 2 && (
                      <span className="pr-card-more">ほか{shots.length - 2}枚</span>
                    )}
                    <span className="pr-card-judge" style={{ background: ink }}>
                      {a.judgement}
                    </span>
                  </div>
                ) : (
                  <div className="pr-card-noshot" style={{ borderColor: ink, color: ink }}>
                    <span className="pr-card-noshot-j">{a.judgement}</span>
                    <span className="pr-card-noshot-t">写真なし</span>
                  </div>
                )}

                <div className="pr-card-body">
                  <p className="pr-card-meta">
                    <span
                      className="pr-card-w"
                      style={
                        item.weight === "S"
                          ? { background: INK.ng, color: "#fff" }
                          : undefined
                      }
                    >
                      重要度{item.weight}
                    </span>
                    <span className="pr-card-cat">{item.category}</span>
                  </p>
                  <p className="pr-card-title">
                    <span className="pr-card-no">{item.id}.</span>
                    {item.text}
                  </p>
                  {a.note && <p className="pr-card-fact">事実：{a.note}</p>}
                  <p className="pr-card-fix">
                    {a.judgement === "×" ? (
                      <>
                        担当：
                        <span className={a.owner ? "pr-strong" : "pr-missing"}>
                          {a.owner || "未記入"}
                        </span>
                        　期限：
                        <span className={a.due ? "pr-strong" : "pr-missing"}>
                          {a.due || "未記入"}
                        </span>
                        {a.doneAt && <>　完了：{a.doneAt}</>}
                      </>
                    ) : (
                      <span className="pr-card-hint">△は是正担当・期限の記入対象外</span>
                    )}
                  </p>
                  {(prevJudgement || worsened || (streaks.get(item.id) ?? 0) >= 2) && (
                    <p className="pr-card-tags">
                      {prevJudgement && <span className="pr-tag">前回 {prevJudgement}</span>}
                      {worsened && <span className="pr-tag is-ng">悪化</span>}
                      {(streaks.get(item.id) ?? 0) >= 2 && (
                        <span className="pr-tag is-ng">{streaks.get(item.id)}回連続×</span>
                      )}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {omitted > 0 && (
        <p className="pr-omit">
          ほか{omitted}件（△の重要度が低いもの）は本紙に載せていません。
          全件はアプリの「要改善」またはCSV書き出しで確認してください。
        </p>
      )}
      {photoOmitted > 0 && (
        <p className="pr-omit">
          写真ほか{photoOmitted}枚はアプリの各項目で確認してください。
        </p>
      )}

      {refPhotos.length > 0 && (
        <>
          <h2 className="pr-h2">
            {previous ? "4" : "3"}. そのほかの写真（{refPhotos.length}枚）
          </h2>
          <p className="pr-foot-note">
            カテゴリ単位で撮った写真と、上のカードに載らなかった項目の写真。
          </p>
          <div className="pr-photos">
            {refPhotos.map(({ pid, caption, judgement, note }) => (
              <PhotoCell
                key={pid}
                url={urls.get(pid)}
                judgement={judgement}
                caption={caption}
                note={note}
              />
            ))}
          </div>
        </>
      )}

      <p className="pr-foot-note">
        判定基準：○=基準を満たす／△=やってはいるが不十分・人によって差がある／×=できていない、または基準そのものが存在しない／対象外=その店舗に該当しない。
        合格ライン 80%以上=緑／60〜79%=黄／60%未満=赤。ただしS項目に×が1件でもあれば総合何%でも赤。
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 全店レポート                                                        */
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
  const due = dueSummary(all, issuedOn);
  const overdue = due.overdue.length;

  const history = all
    .filter(hasAnswers)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const historyRows = history.slice(0, MAX_HISTORY_ROWS);

  const scored = latest.filter((l) => l.s?.weightedRate != null);
  const avg =
    scored.length > 0
      ? scored.reduce((n, l) => n + (l.s!.weightedRate ?? 0), 0) / scored.length
      : null;
  const totalCritical = latest.reduce((n, l) => n + (l.s?.criticalBatsu ?? 0), 0);

  return (
    <div className="pr-doc pr-sheet">
      <Head title="全店 店舗チェック報告書" meta="銀座・原宿・浅草" issuedOn={issuedOn} />

      <div className="pr-summary">
        <div className="pr-score-main">
          <span className="pr-label">3店平均（加重達成率）</span>
          <span className="pr-score-value" style={{ color: verdictInk(avg === null ? "none" : avg >= 0.8 ? "green" : avg >= 0.6 ? "yellow" : "red") }}>
            {pct(avg)}
          </span>
          <span className="pr-note">直近視察の単純平均</span>
        </div>
        <div className="pr-kpi-grid">
          {latest.map(({ store, s }) => (
            <Kpi
              key={store}
              label={`${store}`}
              value={s && s.weightedRate !== null ? pct(s.weightedRate) : "未実施"}
              ink={s ? verdictInk(s.verdict) : undefined}
            />
          ))}
          <Kpi
            label="S項目の×（全店）"
            value={`${totalCritical}`}
            unit="件"
            alert={totalCritical > 0}
            ink={totalCritical > 0 ? INK.ng : undefined}
          />
          <Kpi
            label="是正未完了（全店）"
            value={`${allCorrections.length}`}
            unit="件"
            alert={allCorrections.length > 0}
            ink={allCorrections.length > 0 ? INK.ng : undefined}
          />
          <Kpi
            label="うち期限切れ"
            value={`${overdue}`}
            unit="件"
            alert={overdue > 0}
            ink={overdue > 0 ? INK.ng : undefined}
          />
          <Kpi
            label="期限が3日以内"
            value={`${due.dueSoon.length}`}
            unit="件"
            alert={due.dueSoon.length > 0}
            ink={due.dueSoon.length > 0 ? INK.mid : undefined}
          />
          <Kpi
            label="期限が未記入"
            value={`${due.noDue.length}`}
            unit="件"
            alert={due.noDue.length > 0}
            ink={due.noDue.length > 0 ? INK.ng : undefined}
          />
        </div>
      </div>

      <h2 className="pr-h2">1. 3店舗比較（各店の直近視察）</h2>
      <table className="pr-table">
        <thead>
          <tr>
            <th className="w-store">店舗</th>
            <th className="w-due">視察日</th>
            <th className="w-own">視察者</th>
            <th className="w-rate">総合スコア</th>
            <th className="w-bar">達成度</th>
            <th className="w-num">S×</th>
            <th className="w-num">×</th>
            <th className="w-num">△</th>
            <th className="w-num">未入力</th>
            <th className="w-verdict">判定</th>
          </tr>
        </thead>
        <tbody>
          {latest.map(({ store, insp, s }) => (
            <tr key={store}>
              <td className="w-store pr-strong">{store}</td>
              <td className="w-due">{insp?.date ?? "—"}</td>
              <td className="w-own">{insp?.inspector || "—"}</td>
              <td className="w-rate pr-strong">{s ? pct(s.weightedRate) : "未実施"}</td>
              <td className="w-bar">
                <RowBar rate={s?.weightedRate ?? null} />
              </td>
              <td
                className="w-num pr-strong"
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
      <p className="pr-foot-note">
        3店を同じ基準で並べることで、「1店だけの問題」か「全社の問題」かを判別する。
        全店で同じカテゴリが低い場合、原因は現場ではなく本部の基準づくりにある。
      </p>

      <h2 className="pr-h2">2. カテゴリ別 3店比較（加重達成率）</h2>
      <table className="pr-table pr-cat">
        <thead>
          <tr>
            <th className="w-cat">カテゴリ</th>
            {latest.map(({ store }) => (
              <th key={store} className="w-rate">
                {store}
              </th>
            ))}
            <th className="w-rate">3店平均</th>
            <th className="w-bar3">達成度（銀座／原宿／浅草）</th>
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((cat) => {
            const rates = latest.map(
              ({ s }) => s?.categories.find((x) => x.category === cat)?.rate ?? null,
            );
            const valid = rates.filter((r): r is number => r !== null);
            const catAvg = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
            return (
              <tr key={cat}>
                <td className="w-cat">{cat}</td>
                {rates.map((r, i) => (
                  <td
                    key={i}
                    className="w-rate"
                    style={{ color: r !== null && r < 0.6 ? INK.ng : undefined }}
                  >
                    {pct(r)}
                  </td>
                ))}
                <td className="w-rate pr-strong">{pct(catAvg)}</td>
                <td className="w-bar3">
                  {rates.map((r, i) => (
                    <RowBar key={i} rate={r} />
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="pr-h2">
        3. 是正管理台帳（未完了 {allCorrections.length}件
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
                  <span className="pr-item-text">{c.text}</span>
                  {c.note && <span className="pr-fact">事実：{c.note}</span>}
                </td>
                <td className="w-own">
                  {c.owner || <span style={{ color: INK.ng }}>未記入</span>}
                </td>
                <td className="w-due">{c.due || <span style={{ color: INK.ng }}>未記入</span>}</td>
                <td
                  className="w-own pr-strong"
                  style={{ color: c.status === "期限切れ" ? INK.ng : INK.mid }}
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

      <h2 className="pr-h2">
        4. 視察履歴（{history.length}件
        {history.length > historyRows.length ? `　※直近${historyRows.length}件を掲載` : ""}）
      </h2>
      <table className="pr-table pr-cat">
        <thead>
          <tr>
            <th className="w-due">視察日</th>
            <th className="w-store">店舗</th>
            <th className="w-own">視察者</th>
            <th className="w-rate">総合スコア</th>
            <th className="w-bar">達成度</th>
            <th className="w-num">S×</th>
            <th className="w-num">×</th>
            <th className="w-num">△</th>
            <th className="w-num">未入力</th>
          </tr>
        </thead>
        <tbody>
          {historyRows.map((insp) => {
            const s = summarize(insp);
            return (
              <tr key={insp.id}>
                <td className="w-due">{insp.date}</td>
                <td className="w-store">{insp.store}</td>
                <td className="w-own">{insp.inspector || "—"}</td>
                <td className="w-rate pr-strong">{pct(s.weightedRate)}</td>
                <td className="w-bar">
                  <RowBar rate={s.weightedRate} />
                </td>
                <td className="w-num" style={{ color: s.criticalBatsu > 0 ? INK.ng : undefined }}>
                  {s.criticalBatsu}
                </td>
                <td className="w-num">{s.batsu}</td>
                <td className="w-num">{s.sankaku}</td>
                <td className="w-num">{s.unanswered}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="pr-foot-note">
        加重達成率 ＝ Σ(重み×判定係数) ÷ Σ(重み)。重み S=5／A=3／B=1、判定 ○=1.0／△=0.5／×=0。
        合格ライン 80%以上=緑／60〜79%=黄／60%未満=赤。ただしS項目に×が1件でもあれば総合何%でも赤。
      </p>
    </div>
  );
}
