"use client";

/**
 * 小さな棒グラフ。
 * グラフ用のライブラリは入れていない。見せたいのは「日ごとの高さの差」と
 * 「社員が居なかった日がどれか」の2つだけなので、SVGを直接描いたほうが軽い。
 */
export type Point = {
  /** X軸のラベル（日付） */
  label: string;
  value: number;
  /** 社員なしの日。棒の色を変えて見分ける */
  flagged: boolean;
};

export function BarSeries({
  points,
  unit = "",
  format,
}: {
  points: Point[];
  unit?: string;
  format?: (n: number) => string;
}) {
  if (points.length === 0) {
    return <p className="py-6 text-center text-xs text-ink-soft">データがありません</p>;
  }

  const max = Math.max(...points.map((p) => p.value), 1);
  const H = 120;
  const barW = 14;
  const gap = 6;
  const W = points.length * (barW + gap);
  const fmt = format ?? ((n: number) => `${n}${unit}`);

  return (
    <div className="scroll-x -mx-1 px-1">
      <div style={{ minWidth: Math.max(W, 240) }}>
        <svg
          viewBox={`0 0 ${Math.max(W, 240)} ${H}`}
          width="100%"
          height={H}
          role="img"
          aria-label={`直近${points.length}日の推移。最大 ${fmt(max)}`}
        >
          {/* 目安の横線 */}
          {[0.25, 0.5, 0.75, 1].map((r) => (
            <line
              key={r}
              x1={0}
              x2={Math.max(W, 240)}
              y1={H - H * r}
              y2={H - H * r}
              stroke="var(--color-line)"
              strokeWidth={1}
            />
          ))}
          {points.map((p, i) => {
            const h = Math.max(2, (p.value / max) * (H - 4));
            return (
              <rect
                key={p.label + i}
                x={i * (barW + gap)}
                y={H - h}
                width={barW}
                height={h}
                rx={3}
                fill={p.flagged ? "var(--color-warn)" : "var(--color-brand)"}
              >
                <title>{`${p.label}　${fmt(p.value)}${p.flagged ? "（社員なし）" : ""}`}</title>
              </rect>
            );
          })}
        </svg>
        <div className="mt-1 flex justify-between text-[10px] text-ink-soft">
          <span>{points[0]?.label}</span>
          <span className="tnum">最大 {fmt(max)}</span>
          <span>{points[points.length - 1]?.label}</span>
        </div>
      </div>
    </div>
  );
}
