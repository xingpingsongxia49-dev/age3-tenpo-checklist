"use client";

import { Suspense } from "react";
import { Guide } from "@/components/Guide";
import { StoreChips } from "@/components/StoreChips";
import { StorePanel } from "@/components/StorePanel";
import { SummaryPanel } from "@/components/SummaryPanel";
import { useTabParam } from "@/lib/hooks";
import { todayISO } from "@/lib/store";

function App() {
  const [tab, setTab] = useTabParam();

  return (
    <div className="container-app app-shell">
      <header className="pb-4 pt-2 text-center">
        <h1
          className="text-[21px] font-bold text-white"
          style={{ letterSpacing: ".06em" }}
        >
          Age.3 店舗チェック
        </h1>
        <p className="mt-1 text-[12px] text-[var(--color-head-sub)]">
          銀座・原宿・浅草／全店共通版　{todayISO()}
        </p>
      </header>

      <StoreChips tab={tab} onChange={setTab} />

      <div className="mt-4">
        {tab === "まとめ" ? (
          <SummaryPanel onJump={setTab} />
        ) : (
          <StorePanel key={tab} store={tab} />
        )}
      </div>

      <div className="mt-4">
        <Guide />
      </div>

      <p className="px-1 py-6 text-center text-[11px] leading-relaxed text-[var(--color-head-sub)]">
        データはこの端末のブラウザ内にだけ保存されます。
        <br />
        視察が終わったら「まとめ」からJSONを書き出してください。
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={<div className="container-app text-[13px] text-white">読み込み中…</div>}
    >
      <App />
    </Suspense>
  );
}
