"use client";

import { useRef, useState } from "react";
import { usePhotoUrl, useStore } from "@/lib/store";

/**
 * 項目単位の写真欄。各項目の判定ボタンの直下に置く。
 *
 * 追加口は「撮影」と「アルバム」の2つ。
 * input に capture を付けるとiOSはカメラしか出さないので、
 * アルバム用には capture を付けない（付けないほうは、iOSでは
 * 「写真を撮る／フォトライブラリ／ファイルを選択」の選択メニューが出る）。
 * どの項目の証拠写真かが1対1で分かるようにするため、写真は項目に紐づける。
 *
 * タイルは2列。縦写真と横写真が混ざっても並びが崩れないよう、
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

export function ItemPhotos({
  inspectionId,
  itemId,
  photos,
}: {
  inspectionId: string;
  itemId: number;
  photos: string[];
}) {
  const { addPhoto, removePhoto } = useStore();
  const cameraRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);

  const pickCamera = () => cameraRef.current?.click();
  const pickAlbum = () => albumRef.current?.click();

  const onPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    for (const file of files) {
      await addPhoto(inspectionId, itemId, file);
    }
    setBusy(false);
  };

  return (
    <section className="cp">
      <div className="cp-head">
        <span className="cp-title">この項目の写真</span>
        <span className="cp-count">{photos.length}枚</span>
        {busy && <span className="cp-count">保存中…</span>}
      </div>

      <div className="cp-actions">
        <button type="button" className="cp-add-btn" onClick={pickCamera} disabled={busy}>
          ＋ 撮影
        </button>
        <button type="button" className="cp-add-btn" onClick={pickAlbum} disabled={busy}>
          ＋ アルバムから選ぶ
        </button>
      </div>

      {/* 撮影：その場でカメラが開く */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={onPicked}
      />
      {/* アルバム：capture を付けないので、保存済みの写真から選べる */}
      <input
        ref={albumRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onPicked}
      />

      <div className="cp-grid">
        {photos.map((pid) => (
          <Tile
            key={pid}
            photoId={pid}
            onRemove={() => void removePhoto(inspectionId, itemId, pid)}
            onOpen={setZoom}
          />
        ))}

        {/* 空でも枠の大きさが分かるよう、1マス分のプレースホルダを置く */}
        {photos.length === 0 && (
          <button type="button" className="cp-placeholder" onClick={pickAlbum} disabled={busy}>
            <span className="cp-placeholder-plus">＋</span>
            <span className="cp-placeholder-text">写真を追加</span>
          </button>
        )}
      </div>

      {zoom && <Lightbox url={zoom} onClose={() => setZoom(null)} />}
    </section>
  );
}
