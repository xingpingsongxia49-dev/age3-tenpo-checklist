"use client";

import { useRef, useState } from "react";
import { usePhotoUrl, useStore } from "@/lib/store";
import { compareJudgement, isFixed } from "@/lib/score";
import type { Answer, ChecklistItem, Judgement } from "@/lib/types";
import { ChangeBadge, JUDGEMENT_ICON, JUDGEMENT_STYLE, WeightBadge } from "./ui";

const JUDGEMENTS: Judgement[] = ["○", "△", "×", "対象外"];

function Thumb({
  photoId,
  onRemove,
}: {
  photoId: string;
  onRemove: () => void;
}) {
  const url = usePhotoUrl(photoId);
  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-[var(--color-line)] bg-[var(--color-na-soft)]">
      {url && (
        // 端末内の写真をそのまま出すだけなので next/image は使わない
        // eslint-disable-next-line @next/next/no-img-element
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt="現場写真" className="h-full w-full object-cover" />
        </a>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="この写真を削除"
        className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center bg-black/60 text-xs font-bold text-white"
      >
        ✕
      </button>
    </div>
  );
}

export function ItemCard({
  item,
  answer,
  inspectionId,
  prevAnswer,
  prevDate,
}: {
  item: ChecklistItem;
  answer: Answer;
  inspectionId: string;
  prevAnswer?: Answer;
  prevDate?: string;
}) {
  const { updateAnswer, addPhoto, removePhoto } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const patch = (p: Partial<Answer>) => updateAnswer(inspectionId, item.id, p);

  const isNg = answer.judgement === "×";
  const needsDetail = isNg && (!answer.owner || !answer.due);
  const change = compareJudgement(prevAnswer?.judgement ?? null, answer.judgement);
  const fixed = isFixed(prevAnswer?.judgement ?? null, answer.judgement);
  const showDetail = open || isNg || !!answer.note || answer.photos.length > 0;

  return (
    <li
      className={`border-b border-[var(--color-line)] px-3 py-3 last:border-b-0 ${
        isNg ? "bg-[var(--color-ng-soft)]/40" : ""
      }`}
    >
      <div className="flex gap-2">
        <WeightBadge w={item.weight} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-snug">
            <span className="tabular mr-1 text-xs text-[var(--color-ink-sub)]">
              {item.id}.
            </span>
            {item.text}
          </p>

          {prevAnswer?.judgement && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--color-ink-sub)]">
              <span>
                前回（{prevDate}）:{" "}
                <span
                  className={`font-bold ${JUDGEMENT_STYLE[prevAnswer.judgement].text}`}
                >
                  {JUDGEMENT_ICON[prevAnswer.judgement]} {prevAnswer.judgement}
                </span>
              </span>
              {answer.judgement && <ChangeBadge change={change} fixed={fixed} />}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {JUDGEMENTS.map((j) => {
          const selected = answer.judgement === j;
          const s = JUDGEMENT_STYLE[j];
          return (
            <button
              key={j}
              type="button"
              aria-pressed={selected}
              onClick={() => patch({ judgement: selected ? null : j })}
              className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg border-2 text-sm font-bold ${
                selected ? s.on : `${s.off} opacity-80`
              }`}
            >
              <span aria-hidden className="text-base leading-none">
                {JUDGEMENT_ICON[j]}
              </span>
              <span className="text-[11px] leading-none">{j}</span>
            </button>
          );
        })}
      </div>

      {!showDetail && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 text-xs font-bold text-[var(--color-gold-dark)] underline"
        >
          ＋ メモ・写真を追加
        </button>
      )}

      {showDetail && (
        <div className="mt-2 space-y-2">
          <textarea
            value={answer.note}
            onChange={(e) => patch({ note: e.target.value })}
            rows={2}
            placeholder="事実を書く（例：レジで一言なし、5組中4組。15:00〜15:20観察）"
            className="w-full rounded-md border border-[var(--color-line)] p-2 text-sm"
          />

          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setBusy(true);
                await addPhoto(inspectionId, item.id, file);
                setBusy(false);
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="min-h-[40px] rounded-md border border-[var(--color-line)] px-3 text-sm font-bold active:bg-[var(--color-gold-soft)] disabled:opacity-40"
            >
              {busy ? "保存中…" : "📷 写真を撮る／選ぶ"}
            </button>
            {answer.photos.length > 0 && (
              <span className="text-xs text-[var(--color-ink-sub)]">
                {answer.photos.length}枚（端末内のみ）
              </span>
            )}
          </div>

          {answer.photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {answer.photos.map((pid) => (
                <Thumb
                  key={pid}
                  photoId={pid}
                  onRemove={() => void removePhoto(inspectionId, item.id, pid)}
                />
              ))}
            </div>
          )}

          {isNg && (
            <div className="rounded-md border border-[var(--color-ng)] bg-white p-2">
              <p className="mb-2 text-xs font-bold text-[var(--color-ng)]">
                ×をつけたら、その場で担当と期限を埋める。空欄のまま帰らない。
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[11px] text-[var(--color-ink-sub)]">
                    是正担当
                  </span>
                  <input
                    value={answer.owner}
                    onChange={(e) => patch({ owner: e.target.value })}
                    placeholder="店長"
                    className="mt-0.5 w-full rounded-md border border-[var(--color-line)] p-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] text-[var(--color-ink-sub)]">期限</span>
                  <input
                    type="date"
                    value={answer.due}
                    onChange={(e) => patch({ due: e.target.value })}
                    className="mt-0.5 w-full rounded-md border border-[var(--color-line)] p-2 text-sm"
                  />
                </label>
              </div>
              <label className="mt-2 block">
                <span className="text-[11px] text-[var(--color-ink-sub)]">
                  完了日（是正が済んだら入れる）
                </span>
                <input
                  type="date"
                  value={answer.doneAt}
                  onChange={(e) => patch({ doneAt: e.target.value })}
                  className="mt-0.5 w-full rounded-md border border-[var(--color-line)] p-2 text-sm"
                />
              </label>
              {needsDetail && (
                <p className="mt-2 text-xs font-bold text-[var(--color-ng)]">
                  ⚠ 担当・期限が未記入です
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
