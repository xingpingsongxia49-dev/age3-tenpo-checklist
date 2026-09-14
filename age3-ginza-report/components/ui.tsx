"use client";

import type { ReactNode } from "react";

import type { Level } from "@/lib/types";

/** セクションの外枠。見出し＋中身 */
export function Section({
  title,
  emoji,
  right,
  children,
}: {
  title: string;
  emoji?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card mb-4 p-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="section-title flex-1">
          {emoji ? <span aria-hidden>{emoji}</span> : null}
          <span>{title}</span>
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

const LEVEL_MARK: Record<Level, string> = { ok: "🟢", warn: "🟡", low: "🔴" };

/** 増減のバッジ。色だけでなく丸印でも段階が分かるようにしてある */
export function LevelBadge({ level, text }: { level: Level; text: string }) {
  return (
    <span className={`badge badge-${level} tnum`}>
      <span aria-hidden>{LEVEL_MARK[level]}</span>
      {text}
    </span>
  );
}

/** 割合の棒 */
export function Bar({ rate, color }: { rate: number; color: string }) {
  return (
    <span className="block h-2.5 w-full overflow-hidden rounded-full bg-cream-deep">
      <span
        className="block h-full rounded-full"
        style={{ width: `${Math.max(0, Math.min(1, rate)) * 100}%`, background: color }}
        aria-hidden
      />
    </span>
  );
}

/**
 * 金額の入力欄。
 *
 * 売上報告はほぼ全部が金額なので、ここが一番使いやすい必要がある。
 * ￥を欄の中に出して単位を迷わせない。数字キーボードが出るようにしてあり、
 * 打ち終わったら3桁区切りにして、桁を数え直さなくても確かめられるようにする。
 */
export function MoneyField({
  label,
  value,
  onChange,
  big = false,
  hint,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  /** 総売上のように、この画面で一番大事な欄 */
  big?: boolean;
  hint?: ReactNode;
}) {
  return (
    <label className="block border-t border-line py-2.5 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-3">
        <span className={`w-24 shrink-0 ${big ? "text-base font-bold" : "text-sm"} text-ink-soft`}>
          {label}
        </span>
        <div
          className={`flex flex-1 items-center gap-1 rounded-xl border border-line bg-white pl-3 ${
            big ? "focus-within:outline focus-within:outline-2 focus-within:outline-gold" : ""
          }`}
        >
          <span aria-hidden className={`shrink-0 ${big ? "text-lg" : "text-base"} text-ink-soft`}>
            ￥
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={value === null ? "" : value.toLocaleString("ja-JP")}
            placeholder="—"
            aria-label={label}
            onChange={(e) => {
              // 3桁区切りで表示しているので、数字以外を落としてから数に戻す
              const raw = e.target.value.replace(/[^0-9]/g, "");
              onChange(raw === "" ? null : Number(raw));
            }}
            className={`tnum min-h-12 w-full rounded-xl bg-transparent px-2 text-right font-bold outline-none ${
              big ? "text-2xl" : "text-base"
            }`}
          />
        </div>
      </div>
      {hint ? <div className="mt-1 pl-27 text-xs">{hint}</div> : null}
    </label>
  );
}

/**
 * 件数・組数の入力欄。単位を右に出す。
 * マイナスを許さない欄は3桁区切りにする。総口コミのように5桁になる数を
 * 「17034」のまま出すと、桁を数え直さないと確かめられないため。
 */
export function CountField({
  label,
  value,
  onChange,
  unit,
  allowNegative = false,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  unit: string;
  /** 口コミは減ることがあるのでマイナスを入れられる */
  allowNegative?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0 first:pt-0">
      <span className="w-24 shrink-0 text-sm text-ink-soft">{label}</span>
      <div className="flex flex-1 items-center gap-2">
        <input
          type="text"
          inputMode={allowNegative ? "text" : "numeric"}
          value={value === null ? "" : allowNegative ? String(value) : value.toLocaleString("ja-JP")}
          placeholder="—"
          aria-label={label}
          onChange={(e) => {
            const raw = allowNegative
              ? e.target.value.replace(/[^0-9-]/g, "")
              : e.target.value.replace(/[^0-9]/g, "");
            if (raw === "" || raw === "-") {
              onChange(raw === "" ? null : 0);
              return;
            }
            onChange(Number(raw));
          }}
          className="field tnum flex-1 text-right text-base font-bold"
        />
        <span className="w-8 shrink-0 text-sm text-ink-soft">{unit}</span>
      </div>
    </label>
  );
}

/** はい／いいえのトグル */
export function Toggle({
  value,
  onChange,
  label,
  yes = "はい",
  no = "いいえ",
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  yes?: string;
  no?: string;
}) {
  return (
    <div className="py-1.5">
      <div className="mb-2 text-sm font-medium text-ink-soft">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={value}
          onClick={() => onChange(true)}
          className={`tap rounded-xl border px-3 py-3 text-base font-bold ${
            value ? "border-brand bg-brand text-white" : "border-line bg-white text-ink-soft"
          }`}
        >
          {yes}
        </button>
        <button
          type="button"
          aria-pressed={!value}
          onClick={() => onChange(false)}
          className={`tap rounded-xl border px-3 py-3 text-base font-bold ${
            !value ? "border-brand bg-brand text-white" : "border-line bg-white text-ink-soft"
          }`}
        >
          {no}
        </button>
      </div>
    </div>
  );
}

/** プルダウン */
export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = "選択してください",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <label className="block py-1.5">
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>
      <select
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className="field appearance-none bg-white font-medium"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

/** 自由記述 */
export function TextArea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block py-1.5">
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className="field resize-y leading-relaxed"
      />
    </label>
  );
}
