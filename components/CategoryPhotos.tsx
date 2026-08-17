"use client";

import { useRef, useState } from "react";
import { usePhotoUrl, useStore } from "@/lib/store";

/**
 * カテゴリ単位の写真欄。項目リストの直後に常時表示する。
 *
 * タイルは 2列 × 4段 = 1画面8枚。縦写真と横写真が混ざっても並びが崩れないよう、
 * aspect-ratio を 4/3 に固定して object-fit: cover で切り抜く。
 * タップで拡大したときは切り抜かず、元の比率のまま全体を見せる。
 */

function Tile({
  photoId,
  onRemove,
  onOpen,
}: {
  photoId: string;
  onRemove: () => void;
  onOpen: (url: string) => void;
}) {
  const url = usePhotoUrl(photoId);
  return (
    <div className="cp-tile">
      <button
        type="button"
        className="cp-tile-btn"
        onClick={() => url && onOpen(url)}
        aria-label="写真を拡大"
      >
        {/* 端末内の写真をそのまま出すだけなので next/image は使わない */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && <img src={url} alt="現場写真" />}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="この写真を削除"
        className="cp-tile-del"
      >
        ✕
      </button>
    </div>
  );
}

/** 拡大表示。切り抜かず元の比率で全体を見せる */
function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="cp-lightbox" onClick={onClose} role="dialog" aria-modal="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="現場写真（拡大）" />
      <button type="button" className="cp-lightbox-close" onClick={onClose}>
        閉じる
      </button>
    </div>
  );
}

export function CategoryPhotos({
  inspectionId,
  category,
  photos,
}: {
  inspectionId: string;
  category: string;
  photos: string[];
}) {
  const { addCategoryPhoto, removeCategoryPhoto } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);

  const pick = () => fileRef.current?.click();

  return (
    <section className="cp">
      <div className="cp-head">
        <span className="cp-title">このカテゴリの写真</span>
        <span className="cp-count">{photos.length}枚</span>
        <button type="button" className="cp-add-btn" onClick={pick} disabled={busy}>
          {busy ? "保存中…" : "＋ 写真を追加"}
        </button>
      </div>

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
            await addCategoryPhoto(inspectionId, category, file);
          }
          setBusy(false);
        }}
      />

      <div className="cp-grid">
        {photos.map((pid) => (
          <Tile
            key={pid}
            photoId={pid}
            onRemove={() => void removeCategoryPhoto(inspectionId, category, pid)}
            onOpen={setZoom}
          />
        ))}

        {/* 空でも枠の大きさが分かるよう、1マス分のプレースホルダを置く */}
        {photos.length === 0 && (
          <button type="button" className="cp-placeholder" onClick={pick} disabled={busy}>
            <span className="cp-placeholder-plus">＋</span>
            <span className="cp-placeholder-text">写真を追加</span>
          </button>
        )}
      </div>

      {zoom && <Lightbox url={zoom} onClose={() => setZoom(null)} />}
    </section>
  );
}
