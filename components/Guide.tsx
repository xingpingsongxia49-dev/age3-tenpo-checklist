"use client";

import { useState } from "react";
import { Card } from "./ui";

/** 元エクセルの「使い方」シートの内容。判断基準を現場で引けるようにアプリ内に残す */
const SECTIONS: { title: string; rows: [string, string][] }[] = [
  {
    title: "判定の基準",
    rows: [
      ["○（1.0点）", "基準を満たしている。指摘なし。"],
      ["△（0.5点）", "やってはいるが不十分・不安定・人によって差がある。"],
      ["×（0点）", "できていない、または基準そのものが存在しない。必ず担当と期限を入れる。"],
      ["対象外", "その店舗に該当しない項目。集計から自動で除外される。"],
    ],
  },
  {
    title: "重要度の重み",
    rows: [
      ["S（重み5）", "食品衛生・食品安全・行政/近隣リスク。×が1つでもあれば即日是正。他の項目より5倍重い。"],
      ["A（重み3）", "売上・品質・オペレーションに直結する。今週中に是正する。"],
      ["B（重み1）", "改善すると良いが、緊急性は低い。"],
    ],
  },
  {
    title: "運用ルール",
    rows: [
      ["視察者", "店長以外が行う。店長の自己採点にすると必ず甘くなり、店舗間の比較ができなくなる。"],
      ["×への対応", "×をつけたら、その場で「是正担当」と「期限」を必ず埋める。空欄のまま帰らない。"],
      ["S項目の×", "1件でも出たら、他を中断してその場で是正する。営業を止める判断も含めて検討する。"],
      ["合格ライン", "総合80%以上＝緑／60〜79%＝黄／60%未満＝赤。ただしS項目に×があれば、総合何%でも赤。"],
      ["備考欄の書き方", "「不十分」ではなく事実を書く。誰が・何を・どれくらい（例：レジで一言なし、5組中4組）。"],
    ],
  },
  {
    title: "なぜ重み付けをするのか",
    rows: [
      [
        "",
        "旧シートは「看板が最新か」と「手洗い・手袋交換」が同じ1点だった。この方式だと、衛生が崩れていても達成率が高く出てしまい、経営判断を誤らせる。S項目は事故が起きた時点で店舗が止まるため、点数以前に「1件でもあれば赤」という別ロジックで扱う。",
      ],
    ],
  },
  {
    title: "なぜ⓪を新設したか",
    rows: [
      [
        "",
        "2026年1月の原宿視察の×26件の多くは、スタッフの能力不足ではなく「基準が決まっていない」ことが原因だった。基準がない状態でチェックしても、毎回同じ×が並ぶだけで改善しない。よって⓪で先に「基準が存在するか」を問う。⓪が×の項目は、現場ではなく本部・店長の宿題である。",
      ],
    ],
  },
];

export function Guide() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-3 text-left"
      >
        <span className="flex-1 text-sm font-bold">使い方・判定の基準</span>
        <span aria-hidden className="text-[var(--color-ink-sub)]">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-[var(--color-line)] px-3 py-3">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h3 className="mb-1 text-xs font-bold text-[var(--color-gold-dark)]">
                {s.title}
              </h3>
              <dl className="space-y-1">
                {s.rows.map(([term, desc], i) => (
                  <div key={i} className="text-[12px] leading-relaxed">
                    {term && <dt className="font-bold">{term}</dt>}
                    <dd className="text-[var(--color-ink-sub)]">{desc}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}
