"use client";

import { useEffect, useMemo, useState } from "react";

import { MoneyField, Section } from "@/components/ui";
import {
  canSendExpense,
  emptyExpense,
  emptySettings,
  expenseTotal,
  prettyDate,
  todayISO,
  yen,
} from "@/lib/calc";
import { toExpenseText } from "@/lib/format";
import { deleteExpense, listExpenses, loadSettings, saveExpense } from "@/lib/storage";
import type { Expense, Settings } from "@/lib/types";

type Notice = { tone: "ok" | "warn"; text: string } | null;

/** 名前や店名を1タップで選ぶボタン。よく使うものを並べて、打つ手間をなくす */
function PickRow({
  options,
  value,
  onPick,
  label,
}: {
  options: string[];
  value: string;
  onPick: (v: string) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map((o) => {
        const on = value === o;
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(on ? "" : o)}
            className={`tap rounded-full border px-3 py-1.5 text-sm font-bold ${
              on ? "border-brand bg-brand text-white" : "border-line bg-white text-ink-soft"
            }`}
          >
            {on ? "✓ " : ""}
            {o}
          </button>
        );
      })}
    </div>
  );
}

export default function ExpensesPage() {
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [list, setList] = useState<Expense[] | null>(null);
  const [draft, setDraft] = useState<Expense>(() => emptyExpense(todayISO()));
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    void (async () => {
      const [s, l] = await Promise.all([loadSettings(), listExpenses()]);
      setSettings(s);
      setList(l);
    })();
  }, []);

  /** 今月ぶん。月がまたがると合計が意味を失うので、同じ月だけ数える */
  const thisMonth = useMemo(() => {
    const m = draft.date.slice(0, 7);
    return (list ?? []).filter((e) => e.date.startsWith(m));
  }, [list, draft.date]);

  const sameDay = useMemo(
    () => (list ?? []).filter((e) => e.date === draft.date),
    [list, draft.date],
  );

  if (!list) {
    return <main className="px-4 pt-10 text-center text-sm text-ink-soft">読み込み中…</main>;
  }

  const set = (k: keyof Expense, v: string | number | null) =>
    setDraft((d) => ({ ...d, [k]: v }) as Expense);

  /**
   * 経費をLINEに送って、1件として記録する。
   * 送れたらその場で欄を空にして、続けて2件目を入れられるようにする。
   */
  async function send() {
    const text = toExpenseText(draft);
    const store = async () => {
      const saved: Expense = { ...draft, sentAt: new Date().toISOString() };
      await saveExpense(saved);
      setList(await listExpenses());
      // 使用者はそのままにして、次の1件を入れやすくする
      setDraft({ ...emptyExpense(draft.date), user: draft.user });
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text });
        await store();
        setNotice({ tone: "ok", text: "送信しました。続けて次の経費を入れられます。" });
        return;
      } catch (e) {
        // 利用者が共有シートを閉じただけなら、送信扱いにしない
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      await store();
      setNotice({ tone: "ok", text: "コピーしました。LINEを開いて貼り付けてください。" });
    } catch {
      setNotice({
        tone: "warn",
        text: "共有もコピーもできませんでした。下の文面を選んでコピーしてください。",
      });
    }
  }

  return (
    <main className="px-3 pt-4">
      <header className="mb-3">
        <p className="text-[11px] font-bold tracking-[0.3em] text-ink-soft">AGE.3　GINZA</p>
        <h1 className="text-xl font-bold">🧾 経費</h1>
        <p className="mt-1 text-xs text-ink-soft">
          立て替えて買ったものを、その場で報告します。レシートの写真は今までどおり別に送ってください。
        </p>
      </header>

      {notice ? (
        <p
          className={`mb-3 rounded-xl px-3 py-2 text-sm font-bold ${
            notice.tone === "ok" ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"
          }`}
        >
          {notice.text}
        </p>
      ) : null}

      <Section title="1件ぶんを入れる" emoji="✏️">
        <label className="flex items-center gap-3 pb-2">
          <span className="w-16 shrink-0 text-sm text-ink-soft">日付</span>
          <input
            type="date"
            value={draft.date}
            aria-label="経費の日付"
            onChange={(e) => set("date", e.target.value)}
            className="field tnum flex-1 font-bold"
          />
        </label>

        <div className="border-t border-line py-2.5">
          <p className="mb-2 text-sm text-ink-soft">使用者</p>
          <PickRow
            options={settings.expenseUsers}
            value={draft.user}
            onPick={(v) => set("user", v)}
            label="使用者を選ぶ"
          />
          <input
            value={draft.user}
            placeholder="一覧にない人はここに入力"
            aria-label="使用者"
            onChange={(e) => set("user", e.target.value)}
            className="field mt-2"
          />
        </div>

        <div className="border-t border-line py-2.5">
          <p className="mb-2 text-sm text-ink-soft">店名</p>
          <PickRow
            options={settings.expenseStores}
            value={draft.store}
            onPick={(v) => set("store", v)}
            label="店名を選ぶ"
          />
          <input
            value={draft.store}
            placeholder="一覧にない店はここに入力"
            aria-label="店名"
            onChange={(e) => set("store", e.target.value)}
            className="field mt-2"
          />
        </div>

        <div className="border-t border-line pt-2.5">
          <MoneyField label="金額" value={draft.amount} onChange={(v) => set("amount", v)} big />
        </div>

        <label className="block border-t border-line pt-2.5">
          <span className="mb-1.5 block text-sm text-ink-soft">ひとこと（任意）</span>
          <input
            value={draft.note}
            placeholder="何を買ったか。無ければ空のままで大丈夫です"
            aria-label="ひとこと"
            onChange={(e) => set("note", e.target.value)}
            className="field"
          />
        </label>

        <button
          type="button"
          onClick={() => void send()}
          disabled={!canSendExpense(draft)}
          className="btn btn-line mt-3 w-full disabled:opacity-40"
        >
          💬 LINEに送る
        </button>
        {canSendExpense(draft) ? null : (
          <p className="mt-2 text-center text-xs text-ink-soft">
            使用者・店名・金額を入れると送れるようになります。
          </p>
        )}

        {canSendExpense(draft) ? (
          <details className="mt-3">
            <summary className="tap cursor-pointer text-sm font-bold">送られる文面を確認する</summary>
            <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-cream p-3 text-xs leading-relaxed">
              {toExpenseText(draft)}
            </pre>
          </details>
        ) : null}
      </Section>

      <Section
        title={`${prettyDate(draft.date)} の経費`}
        emoji="📅"
        right={
          <span className="tnum text-sm font-bold text-brand">{yen(expenseTotal(sameDay))}</span>
        }
      >
        {sameDay.length === 0 ? (
          <p className="py-2 text-sm text-ink-soft">この日はまだありません</p>
        ) : (
          sameDay.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-2 border-t border-line py-2 first:border-t-0 first:pt-0"
            >
              <span className="flex-1 text-sm leading-tight">
                <b>{e.user}</b>　{e.store}
                {e.note ? <span className="text-ink-soft">　{e.note}</span> : null}
              </span>
              <span className="tnum shrink-0 text-sm font-bold">{yen(e.amount)}</span>
              <button
                type="button"
                onClick={async () => {
                  await deleteExpense(e.id);
                  setList(await listExpenses());
                  setNotice({ tone: "ok", text: "1件消しました" });
                }}
                aria-label={`${e.user}の${e.store} ${yen(e.amount)} を消す`}
                className="tap shrink-0 rounded-lg border border-line bg-white px-2 py-1 text-xs font-bold text-ink-soft active:bg-line"
              >
                消す
              </button>
            </div>
          ))
        )}
      </Section>

      <Section
        title={`${Number(draft.date.slice(5, 7))}月の合計`}
        emoji="📊"
        right={
          <span className="tnum text-sm font-bold text-brand">{yen(expenseTotal(thisMonth))}</span>
        }
      >
        {thisMonth.length === 0 ? (
          <p className="py-2 text-sm text-ink-soft">この月はまだありません</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-ink-soft">{thisMonth.length}件</p>
            {/* 使用者ごとに合計する。誰にいくら返すかがそのまま分かる */}
            {Object.entries(
              thisMonth.reduce<Record<string, number>>((acc, e) => {
                acc[e.user] = (acc[e.user] ?? 0) + (e.amount ?? 0);
                return acc;
              }, {}),
            )
              .sort((a, b) => b[1] - a[1])
              .map(([user, sum]) => (
                <div key={user} className="flex items-baseline gap-2 border-t border-line py-1.5">
                  <span className="flex-1 text-sm">{user}</span>
                  <span className="tnum text-sm font-bold">{yen(sum)}</span>
                </div>
              ))}
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              立て替えた人ごとの合計です。精算のときにそのまま使えます。
            </p>
          </>
        )}
      </Section>
    </main>
  );
}
