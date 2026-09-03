"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

/** 管理PINで守っている画面。解錠したあと、どこへ戻すか */
const DESTINATIONS: Record<string, { title: string; lead: string; button: string }> = {
  "/settings": {
    title: "設定画面",
    lead: "スタッフ名・在庫の目標数・商品名を変えられる画面です。",
    button: "設定を開く",
  },
  "/dashboard": {
    title: "分析",
    lead: "売上と、社員がいた日・いなかった日の比較を見る画面です。",
    button: "分析を開く",
  },
};

/**
 * 管理PINの入口。
 * 設定と分析は、現場ではなく管理側だけが見るところなので、
 * 入店PINとは別の管理PINをもう一度たずねる。
 */
export default function SettingsUnlockPage() {
  return (
    <Suspense fallback={<main className="px-4 pt-12 text-center text-sm text-ink-soft">読み込み中…</main>}>
      <Unlock />
    </Suspense>
  );
}

function Unlock() {
  const params = useSearchParams();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  // 転送先は自分のサイトの中だけに限る。"//" ではじまる外部URLを入れられないようにする
  const raw = params.get("next") ?? "/settings";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/settings";
  const dest = DESTINATIONS[next] ?? DESTINATIONS["/settings"];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await fetch("/api/auth/admin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    setBusy(false);
    if (res.ok) {
      // 一度はじかれた直後だと、クライアント側に「→解錠画面」への転送が
      // 残っていて戻されることがある。ページごと読み直して middleware を通し直す。
      window.location.href = next;
    } else {
      setError(true);
      setPasscode("");
    }
  }

  return (
    <main className="px-4 pt-12">
      <div className="text-center">
        <p className="text-4xl" aria-hidden>
          🔒
        </p>
        <h1 className="mt-2 text-xl font-bold">{dest.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {dest.lead}
          <br />
          管理PINを入れてください。
        </p>
      </div>

      <form onSubmit={submit} className="card mt-6 p-6">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-ink-soft">管理PIN</span>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="field tnum text-center text-2xl font-bold tracking-[0.4em]"
            placeholder="••••"
          />
        </label>
        {error ? (
          <p className="mt-3 rounded-xl bg-low-bg px-3 py-2 text-sm font-bold text-low">
            管理PINが違います
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy || !passcode}
          className="btn btn-primary mt-5 w-full disabled:opacity-40"
        >
          {busy ? "確認中…" : dest.button}
        </button>
      </form>

      <Link href="/" className="mt-4 block text-center text-sm font-bold text-brand">
        ← トップに戻る
      </Link>
    </main>
  );
}
