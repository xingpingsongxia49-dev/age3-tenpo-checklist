"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const params = useSearchParams();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    setBusy(false);
    if (res.ok) {
      // 認証の境目はページごと読み直す。クライアント側に残った転送に引っかからない
      window.location.href = params.get("next") || "/";
    } else {
      setError(true);
      setPasscode("");
    }
  }

  return (
    <form onSubmit={submit} className="card mt-6 p-6">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-ink-soft">共通パスコード</span>
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
          パスコードが違います
        </p>
      ) : null}
      <button type="submit" disabled={busy || !passcode} className="btn btn-primary mt-5 w-full disabled:opacity-40">
        {busy ? "確認中…" : "はじめる"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="px-4 pt-16">
      <div className="text-center">
        <p className="text-sm font-bold tracking-[0.2em] text-gold">AGE.3</p>
        <h1 className="mt-1 text-2xl font-bold">嘉麻店 日報</h1>
        <p className="mt-2 text-sm text-ink-soft">
          在庫・製造・シフト・売上を、スマホだけで入力します
        </p>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
