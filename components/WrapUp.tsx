"use client";

import { useStore } from "@/lib/store";
import { Card } from "./ui";
import { EMPTY_WRAP_UP, type Inspection, type WrapUp as WrapUpData } from "@/lib/types";

/**
 * 視察後まとめ。○×の集計だけでは「で、何をするのか」が残らないので、
 * 視察者が自分の言葉で4つだけ書く。書いた内容は報告書の1ページ目に出る。
 *
 * 空欄でも報告書は出る（無理に埋めさせない）。
 */

const FIELDS: {
  key: keyof WrapUpData;
  label: string;
  hint: string;
  placeholder: string;
}[] = [
  {
    key: "good",
    label: "できていること",
    hint: "褒める材料。ここを書かないと指摘だけの報告書になる",
    placeholder: "例：ピーク前の仕込みが前回より15分早く終わっていた（山田）",
  },
  {
    key: "fixNow",
    label: "すぐ直すべきこと",
    hint: "今日中〜数日で手を打つもの",
    placeholder: "例：スポンジの色分けを今週中に導入。担当＝店長、期限＝金曜",
  },
  {
    key: "system",
    label: "仕組み・ルールを変えるべき点",
    hint: "現場を叱っても直らないもの。基準が無い／古いところ",
    placeholder: "例：仕込み量の基準が容器サイズ任せ。品目別の定量を本部で決める",
  },
  {
    key: "people",
    label: "人・配置・教育の課題",
    hint: "誰を、どこに、どう育てるか",
    placeholder: "例：新人2名にトレーナーが付いていない。15時台の人員が1名足りない",
  },
];

export function WrapUp({ inspection }: { inspection: Inspection }) {
  const { updateInspection } = useStore();
  const wrapUp = inspection.wrapUp ?? EMPTY_WRAP_UP;

  const patch = (key: keyof WrapUpData, value: string) =>
    updateInspection(inspection.id, { wrapUp: { ...wrapUp, [key]: value } });

  const filled = FIELDS.filter((f) => (wrapUp[f.key] ?? "").trim() !== "").length;

  return (
    <Card>
      <div className="flex items-baseline gap-2">
        <h2 className="text-[16px] font-bold">視察後まとめ</h2>
        <span className="tabular ml-auto text-[12px] text-[var(--color-sub)]">
          {filled}/4 記入
        </span>
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-sub)]">
        店を出る前に、その場で書く。ここに書いた内容はPDF報告書の1ページ目に出ます。
        空欄のままでも報告書は出せます。
      </p>

      {FIELDS.map((f) => (
        <label key={f.key} className="mt-3 block">
          <span className="text-[13px] font-bold">{f.label}</span>
          <span className="ml-2 text-[11px] text-[var(--color-sub)]">{f.hint}</span>
          <textarea
            value={wrapUp[f.key] ?? ""}
            onChange={(e) => patch(f.key, e.target.value)}
            rows={2}
            placeholder={f.placeholder}
            className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-chip-bg)] p-2.5 text-[14px]"
          />
        </label>
      ))}
    </Card>
  );
}
