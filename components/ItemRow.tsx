"use client";

import { useRef, useState } from "react";
import { usePhotoUrl, useStore } from "@/lib/store";
import { compareJudgement, isFixed } from "@/lib/score";
import type { Answer, ChecklistItem, Judgement } from "@/lib/types";
import { ChangeBadge, JUDGEMENT_COLOR, JUDGEMENT_ICON, WeightBadge } from "./ui";

const JUDGEMENTS: Judgement[] = ["○", "△", "×", "対象外"];

function Thumb({ photoId, onRemove }: { photoId: string; onRemove: () => void }) {
  const url = usePhotoUrl(photoId);
  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-chip-bg)]">
      {url && (
        <a href={url} target="_blank" rel="noreferrer">
          {/* 端末内の写真をそのまま出すだけなので next/image は使わない */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="現場写真" className="h-full w-full object-cover" />
        </a>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="この写真を削除"
        className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center bg-black/55 text-[11px] font-bold text-white"
      >
        ✕
      </button>
    </div>
  );
}

export function ItemRow({
  item,
  answer,
  inspectionId,
  prevAnswer,
  prevDate,
  streak = 0,
}: {
  item: ChecklistItem;
  answer: Answer;
  inspectionId: string;
  prevAnswer?: Answer;
  prevDate?: string;
  /** 今回を含めて何回連続で×か。2以上なら現場ではなく基準の問題を疑う */
  streak?: number;
}) {
  const { updateAnswer, addPhoto, removePhoto } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [openNote, setOpenNote] = useState(false);

  const patch = (p: Partial<Answer>) => updateAnswer(inspectionId, item.id, p);

  const isNg = answer.judgement === "×";
  const needsDetail = isNg && (!answer.owner || !answer.due);
  // 参考アプリの「完了項目」に相当。手を打つ必要が無くなった行を沈める
  const settled = answer.judgement === "○" || answer.judgement === "対象外";
  const change = compareJudgement(prevAnswer?.judgement ?? null, answer.judgement);
  const fixed = isFixed(prevAnswer?.judgement ?? null, answer.judgement);
  const showNote = openNote || isNg || !!answer.note;

  return (
    <li className="border-b border-[var(--color-line)] py-3 last:border-b-0">
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <WeightBadge w={item.weight} />
        {prevAnswer?.judgement && answer.judgement && (
          <ChangeBadge change={change} fixed={fixed} />
        )}
        {streak >= 2 && (
          <span
            className="rounded-full px-2 py-[1px] text-[11px] font-bold"
            style={{
              background: JUDGEMENT_COLOR["×"].bg,
              color: JUDGEMENT_COLOR["×"].ink,
              border: `1px solid ${JUDGEMENT_COLOR["×"].ink}`,
            }}
            title="毎回同じ×が並ぶ項目は、現場の能力ではなく基準が決まっていないことが原因のことが多い"
          >
            {streak}回連続×
          </span>
        )}
        {prevAnswer?.judgement && (
          <span className="text-[11px] text-[var(--color-sub)]">
            前回（{prevDate}）
            <span
              className="ml-0.5 font-bold"
              style={{ color: JUDGEMENT_COLOR[prevAnswer.judgement].ink }}
            >
              {JUDGEMENT_ICON[prevAnswer.judgement]} {prevAnswer.judgement}
            </span>
          </span>
        )}
      </div>

      <p className={`text-[14px] leading-snug ${settled ? "item-done" : ""}`}>
        <span className="tabular mr-1 text-[12px] text-[var(--color-sub)]">
          {item.id}.
        </span>
        {item.text}
      </p>

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {JUDGEMENTS.map((j) => {
          const on = answer.judgement === j;
          const c = JUDGEMENT_COLOR[j];
          return (
            <button
              key={j}
              type="button"
              aria-pressed={on}
              onClick={() => patch({ judgement: on ? null : j })}
              className="flex min-h-[46px] flex-col items-center justify-center gap-0.5 rounded-xl border text-[11px] font-bold"
              style={
                on
                  ? { background: c.ink, borderColor: c.ink, color: "#fff" }
                  : { background: c.bg, borderColor: "var(--color-line)", color: c.ink }
              }
            >
              <span aria-hidden className="text-[15px] leading-none">
                {JUDGEMENT_ICON[j]}
              </span>
              <span className="leading-none">{j}</span>
            </button>
          );
        })}
      </div>

      {/* 判定に関わらず、どの項目にも写真とメモを付けられるようにする。
          良い状態の記録（基準写真）も報告書に載せたいため。 */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length === 0) return;
            setBusy(true);
            for (const file of files) {
              await addPhoto(inspectionId, item.id, file);
            }
            setBusy(false);
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="chip min-h-[38px] px-3 text-[13px] font-bold disabled:opacity-45"
        >
          {busy ? "保存中…" : "📷 写真を追加"}
        </button>

        {!showNote && (
          <button
            type="button"
            onClick={() => setOpenNote(true)}
            className="chip min-h-[38px] px-3 text-[13px] font-bold"
          >
            ＋ メモ
          </button>
        )}

        {answer.photos.length > 0 && (
          <span className="text-[11px] text-[var(--color-sub)]">
            写真{answer.photos.length}枚（PDFに載ります）
          </span>
        )}
      </div>

      {answer.photos.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {answer.photos.map((pid) => (
            <Thumb
              key={pid}
              photoId={pid}
              onRemove={() => void removePhoto(inspectionId, item.id, pid)}
            />
          ))}
        </div>
      )}

      {showNote && (
        <textarea
          value={answer.note}
          onChange={(e) => patch({ note: e.target.value })}
          rows={2}
          placeholder="事実を書く（例：レジで一言なし、5組中4組。15:00〜15:20観察）"
          className="mt-2 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-chip-bg)] p-2.5 text-[14px]"
        />
      )}

      {isNg && (
        <div className="notice mt-2 px-3 py-2.5">
          <p className="mb-2 text-[12px] font-bold">
            ×をつけたら、その場で担当と期限を埋める。空欄のまま帰らない。
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px]">是正担当</span>
              <input
                value={answer.owner}
                onChange={(e) => patch({ owner: e.target.value })}
                placeholder="店長"
                className="mt-0.5 w-full rounded-lg border border-[var(--color-line)] bg-white p-2 text-[14px] text-[var(--color-brown)]"
              />
            </label>
            <label className="block">
              <span className="text-[11px]">期限</span>
              <input
                type="date"
                value={answer.due}
                onChange={(e) => patch({ due: e.target.value })}
                className="mt-0.5 w-full rounded-lg border border-[var(--color-line)] bg-white p-2 text-[14px] text-[var(--color-brown)]"
              />
            </label>
          </div>
          <label className="mt-2 block">
            <span className="text-[11px]">完了日（是正が済んだら入れる）</span>
            <input
              type="date"
              value={answer.doneAt}
              onChange={(e) => patch({ doneAt: e.target.value })}
              className="mt-0.5 w-full rounded-lg border border-[var(--color-line)] bg-white p-2 text-[14px] text-[var(--color-brown)]"
            />
          </label>
          {needsDetail && (
            <p className="mt-2 text-[12px] font-bold" style={{ color: "var(--color-ng)" }}>
              ⚠ 担当・期限が未記入です
            </p>
          )}
        </div>
      )}
    </li>
  );
}
