"use client";

/**
 * 画面プレビューの上に重ねる操作バー。
 * 報告書そのもの（.print-only）の外に置くので、印刷には出ない。
 */
export function PreviewBar({
  onPrint,
  onClose,
}: {
  onPrint: () => void;
  onClose: () => void;
}) {
  return (
    <div className="preview-bar">
      <button type="button" className="preview-bar-btn" onClick={onClose}>
        閉じる
      </button>
      <span className="preview-bar-text">
        iPhoneは共有ボタン →「プリント」→ 右上の共有からPDFで保存できます
      </span>
      <button type="button" className="preview-bar-btn is-main" onClick={onPrint}>
        印刷／PDF
      </button>
    </div>
  );
}
