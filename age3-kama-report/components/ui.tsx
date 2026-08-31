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

const LEVEL_LABEL: Record<Level, string> = { ok: "十分", warn: "やや不足", low: "大幅不足" };
const LEVEL_MARK: Record<Level, string> = { ok: "🟢", warn: "🟡", low: "🔴" };

/** 充足率のバッジ。色だけでなく丸印と文字でも段階が分かるようにしてある */
export function LevelBadge({ level, text }: { level: Level; text?: string }) {
  return (
    <span className={`badge badge-${level} tnum`}>
      <span aria-hidden>{LEVEL_MARK[level]}</span>
      {text ?? LEVEL_LABEL[level]}
    </span>
  );
}

/**
 * 数値ステッパー。
 * キーボードを出さずに ± で入れられるが、大きい数は直接打ったほうが速いので
 * 真ん中は数字キーボードの入力欄にしてある。
 */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  label,
  compact = false,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  step?: number;
  min?: number;
  max?: number;
  label?: string;
  compact?: boolean;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const bump = (d: number) => onChange(clamp((value ?? 0) + d));

  return (
    <div className={`flex items-center ${compact ? "gap-1" : "gap-1.5"}`}>
      <button
        type="button"
        aria-label={`${label ?? ""}を${step}減らす`}
        onClick={() => bump(-step)}
        className={`tap grid ${compact ? "h-11 w-10" : "h-11 w-11"} shrink-0 place-items-center rounded-xl border border-line bg-cream-deep text-xl font-bold text-ink-soft active:bg-line`}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        value={value ?? ""}
        placeholder="—"
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? null : clamp(Number(raw)));
        }}
        className={`field tnum min-w-0 flex-1 px-1 text-center font-bold ${compact ? "" : "max-w-24"}`}
      />
      <button
        type="button"
        aria-label={`${label ?? ""}を${step}増やす`}
        onClick={() => bump(step)}
        className={`tap grid ${compact ? "h-11 w-10" : "h-11 w-11"} shrink-0 place-items-center rounded-xl border border-line bg-cream-deep text-xl font-bold text-ink-soft active:bg-line`}
      >
        ＋
      </button>
    </div>
  );
}

/** 金額・件数などの数値入力。単位を右に出す */
export function NumberField({
  value,
  onChange,
  unit,
  label,
  placeholder = "—",
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  unit?: string;
  label: string;
  placeholder?: string;
}) {
  return (
    <label className="flex items-center gap-3 py-1.5">
      <span className="w-24 shrink-0 text-sm text-ink-soft">{label}</span>
      <div className="flex flex-1 items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value ?? ""}
          placeholder={placeholder}
          aria-label={label}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className="field tnum flex-1 text-right font-bold"
        />
        {unit ? <span className="w-8 shrink-0 text-sm text-ink-soft">{unit}</span> : null}
      </div>
    </label>
  );
}

/** はい／いいえのトグル。社員在店など、見落とすと困るものは色を強くする */
export function Toggle({
  value,
  onChange,
  label,
  yes = "はい",
  no = "いいえ",
  tone = "info",
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  yes?: string;
  no?: string;
  /** loud＝社員在店のように一目で分かってほしいもの */
  tone?: "info" | "loud";
}) {
  const onStyle =
    tone === "loud"
      ? "bg-info text-white border-info"
      : "bg-ink text-white border-ink";
  const offStyle =
    tone === "loud"
      ? "bg-[color:var(--color-warn)] text-white border-[color:var(--color-warn)]"
      : "bg-ink text-white border-ink";

  return (
    <div className="py-1.5">
      <div className="mb-2 text-sm font-medium text-ink-soft">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={value}
          onClick={() => onChange(true)}
          className={`tap rounded-xl border px-3 py-3 text-base font-bold ${
            value ? onStyle : "border-line bg-white text-ink-soft"
          }`}
        >
          {yes}
        </button>
        <button
          type="button"
          aria-pressed={!value}
          onClick={() => onChange(false)}
          className={`tap rounded-xl border px-3 py-3 text-base font-bold ${
            !value ? offStyle : "border-line bg-white text-ink-soft"
          }`}
        >
          {no}
        </button>
      </div>
    </div>
  );
}

/** 名前を複数選ぶチップ。スタッフ一覧から製造・販売の担当を選ぶのに使う */
export function ChipMultiSelect({
  options,
  value,
  onChange,
  empty = "設定画面でスタッフを登録してください",
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  empty?: string;
}) {
  if (options.length === 0) {
    return <p className="text-sm text-ink-soft">{empty}</p>;
  }
  const toggle = (name: string) =>
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((name) => {
        const on = value.includes(name);
        return (
          <button
            key={name}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(name)}
            className={`tap rounded-full border px-4 py-2 text-sm font-bold ${
              on
                ? "border-brand bg-brand text-white"
                : "border-line bg-white text-ink-soft"
            }`}
          >
            {on ? "✓ " : ""}
            {name}
          </button>
        );
      })}
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

/** チェックボックスの並び。手が空いた時の作業に使う */
export function CheckGrid({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (name: string) =>
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);

  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(o)}
            className={`tap flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-bold ${
              on ? "border-matcha bg-[color:var(--color-ok-bg)] text-ink" : "border-line bg-white text-ink-soft"
            }`}
          >
            <span
              aria-hidden
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border text-xs ${
                on ? "border-matcha bg-matcha text-white" : "border-line bg-white"
              }`}
            >
              {on ? "✓" : ""}
            </span>
            {o}
          </button>
        );
      })}
    </div>
  );
}

/** 進捗バー */
export function Bar({ rate, level }: { rate: number | null; level?: Level }) {
  const w = Math.max(0, Math.min(1, rate ?? 0)) * 100;
  const bg =
    level === "low"
      ? "var(--color-low)"
      : level === "warn"
        ? "var(--color-warn)"
        : level === "ok"
          ? "var(--color-ok)"
          : "var(--color-gold)";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-cream-deep">
      <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, background: bg }} />
    </div>
  );
}
