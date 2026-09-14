"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { CountField, MoneyField, Section, Select, TextArea, Toggle } from "@/components/ui";
import {
  canSend,
  completion,
  paymentGap,
  paymentTotal,
  prettyDate,
  unitPrice,
  yen,
} from "@/lib/calc";
import { warnings } from "@/lib/format";
import { useReport } from "@/lib/useReport";

export default function ReportPage() {
  return (
    <Suspense fallback={<main className="px-4 pt-10 text-center text-sm text-ink-soft">読み込み中…</main>}>
      <Body />
    </Suspense>
  );
}

function Body() {
  const params = useSearchParams();
  const { date, setDate, report, patch, settings, loading, saveState, sent, restoreSent } =
    useReport(params.get("date") ?? undefined);

  if (loading) {
    return <main className="px-4 pt-10 text-center text-sm text-ink-soft">読み込み中…</main>;
  }

  const s = report.sales;
  const setSales = (k: keyof typeof s, v: number | null) =>
    patch((r) => ({ ...r, sales: { ...r.sales, [k]: v } }));

  const gap = paymentGap(report);
  const done = Math.round(completion(report) * 100);
  const warns = warnings(report);

  return (
    <main className="px-3 pt-4">
      <header className="mb-3">
        <p className="text-[11px] font-bold tracking-[0.3em] text-ink-soft">AGE.3　GINZA</p>
        <h1 className="text-xl font-bold">銀座店 売上報告</h1>
      </header>

      <section className="card mb-4 p-4">
        <label className="flex items-center gap-3">
          <span className="shrink-0 text-sm font-medium text-ink-soft">日付</span>
          <input
            type="date"
            value={date}
            aria-label="報告する日付"
            onChange={(e) => setDate(e.target.value)}
            className="field tnum flex-1 font-bold"
          />
          <span className="tnum shrink-0 rounded-lg bg-cream-deep px-3 py-2 text-sm font-bold">
            {prettyDate(date).replace(/^\d+\/\d+/, "").trim()}
          </span>
        </label>
        <div className="mt-2 flex items-center gap-2">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream-deep">
            <span
              className="block h-full rounded-full bg-brand"
              style={{ width: `${done}%` }}
              aria-hidden
            />
          </span>
          <span className="tnum shrink-0 text-xs text-ink-soft">入力 {done}%</span>
        </div>
        <p className="mt-1 text-xs text-ink-soft">
          {saveState === "saving"
            ? "保存中…"
            : saveState === "saved"
              ? "保存しました（サーバー）"
              : saveState === "local"
                ? "この端末に保存しました"
                : "打つたびに自動で保存されます"}
        </p>
      </section>

      {sent ? (
        <div className="card mb-4 border-l-4 border-l-ok p-4">
          <p className="text-sm font-bold text-ok">この日はもう報告済みです</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            入力欄は次の報告のために空にしてあります。打ち間違いを直したいときは呼び戻してください。
          </p>
          <button type="button" onClick={restoreSent} className="btn btn-ghost mt-3 w-full">
            報告した内容を呼び戻して直す
          </button>
        </div>
      ) : null}

      <Section title="売上" emoji="💰">
        <MoneyField label="総売上" value={s.total} onChange={(v) => setSales("total", v)} big />
        <MoneyField label="現金" value={s.cash} onChange={(v) => setSales("cash", v)} />
        <MoneyField label="PayPay" value={s.paypay} onChange={(v) => setSales("paypay", v)} />
        <MoneyField label="CR" value={s.credit} onChange={(v) => setSales("credit", v)} />

        <div className="mt-3 rounded-xl bg-cream px-3 py-2">
          <div className="flex items-baseline gap-2">
            <span className="flex-1 text-xs font-bold text-ink-soft">内訳合計</span>
            <span className="tnum text-sm font-bold">{yen(paymentTotal(report))}</span>
          </div>
          {gap === null ? (
            <p className="mt-0.5 text-xs text-ink-soft">現金＋PayPay＋CR。総売上と合うか確かめます。</p>
          ) : gap === 0 ? (
            <p className="mt-0.5 text-xs font-bold text-ok">✓ 総売上と合っています</p>
          ) : (
            <p className="mt-0.5 text-xs font-bold text-low">
              ⚠️ 総売上より {yen(Math.abs(gap))} {gap > 0 ? "多い" : "少ない"}です
            </p>
          )}
        </div>
      </Section>

      <Section title="客数" emoji="🙋">
        <CountField label="客数" value={s.guests} onChange={(v) => setSales("guests", v)} unit="組" />
        <div className="mt-2 flex items-baseline gap-2 rounded-xl bg-cream px-3 py-2">
          <span className="flex-1 text-xs font-bold text-ink-soft">客単価（自動）</span>
          <span className="tnum text-base font-bold text-brand">{yen(unitPrice(report))}</span>
        </div>
        <p className="mt-1 text-xs text-ink-soft">総売上 ÷ 客数 で自動で出ます。計算はいりません。</p>
      </Section>

      <Section title="口コミ" emoji="⭐">
        <Toggle
          label="Googleマップに反映されていましたか"
          value={!report.reviews.notReflected}
          onChange={(v) =>
            patch((r) => ({
              ...r,
              reviews: { ...r.reviews, notReflected: !v, today: v ? r.reviews.today : null },
            }))
          }
          yes="反映されていた"
          no="反映なし"
        />
        {report.reviews.notReflected ? (
          <p className="mt-1 rounded-xl bg-warn-bg px-3 py-2 text-xs font-bold text-warn">
            「反映なし」として報告します。件数は入れなくて大丈夫です。
          </p>
        ) : (
          <div className="mt-1">
            <CountField
              label="本日の口コミ"
              value={report.reviews.today}
              onChange={(v) => patch((r) => ({ ...r, reviews: { ...r.reviews, today: v } }))}
              unit="件"
              allowNegative
            />
            <p className="pl-27 text-xs text-ink-soft">減った日は「-1」のようにマイナスで入れられます。</p>
          </div>
        )}
        <CountField
          label="総口コミ"
          value={report.reviews.total}
          onChange={(v) => patch((r) => ({ ...r, reviews: { ...r.reviews, total: v } }))}
          unit="件"
        />
      </Section>

      <Section title="Uber" emoji="🛵">
        <CountField
          label="件数"
          value={s.uberOrders}
          onChange={(v) => setSales("uberOrders", v)}
          unit="件"
        />
        <p className="mt-1 text-xs text-ink-soft">0件の日も「0」と入れてください。</p>
      </Section>

      <Section title="金庫・連絡" emoji="🔐">
        <Toggle
          label="金庫の10万円を確認しましたか"
          value={report.safe.checked}
          onChange={(v) => patch((r) => ({ ...r, safe: { ...r.safe, checked: v } }))}
          yes="確認した"
          no="まだ"
        />
        {report.safe.checked ? (
          <div className="mt-1">
            <CountField
              label="誤差"
              value={report.safe.diff}
              onChange={(v) => patch((r) => ({ ...r, safe: { ...r.safe, diff: v } }))}
              unit="円"
              allowNegative
            />
            <p className="pl-27 text-xs text-ink-soft">
              誤差がなければ 0 のままで大丈夫です。「誤差なし」と報告されます。
            </p>
          </div>
        ) : null}

        <Select
          label="報告者"
          value={report.reporter}
          onChange={(v) => patch((r) => ({ ...r, reporter: v }))}
          options={settings.staff}
          placeholder="選ばなくても送れます"
        />

        <TextArea
          label="その他連絡事項"
          value={report.note}
          onChange={(v) => patch((r) => ({ ...r, note: v }))}
          placeholder="無ければ空のままで大丈夫です"
        />
      </Section>

      {warns.length ? (
        <div className="card mb-4 border-l-4 border-l-warn p-4">
          <p className="text-sm font-bold text-warn">送る前に確認してください</p>
          <ul className="mt-2 space-y-1">
            {warns.map((w, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed">
                <span aria-hidden className="text-warn">
                  ●
                </span>
                <span className="flex-1">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Link
        href={`/preview?date=${date}`}
        aria-disabled={!canSend(report)}
        className={`btn btn-primary w-full ${canSend(report) ? "" : "pointer-events-none opacity-40"}`}
      >
        報告を確認して送る →
      </Link>
      {canSend(report) ? null : (
        <p className="mt-2 text-center text-xs text-ink-soft">
          総売上と客数を入れると送れるようになります。
        </p>
      )}
    </main>
  );
}
