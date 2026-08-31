/**
 * 共通パスコードによるアクセス制限。
 *
 * 本格的なログインは要らない、という要件なので、店舗で共有するパスコードを持つ。
 * 段階は2つ。
 *
 *  1. 入店PIN（APP_PASSCODE）… アプリ全体。アルバイト含む全員が使う
 *  2. 管理PIN（ADMIN_PASSCODE）… 設定画面だけ。スタッフ名や在庫の目標数を
 *     書き換えられる場所なので、入店PINを知っていても入れないようにしてある
 *
 * 合っていたらパスコードのハッシュをCookieに入れ、middleware がそれを見て通す。
 * パスコード自体はCookieに入れない。
 */

/** 入店PINのCookie名 */
export const AUTH_COOKIE = "kama_pass";

/** 管理PIN（設定画面）のCookie名 */
export const ADMIN_COOKIE = "kama_admin";

/** 環境変数が無いときの初期値。Vercel側で設定して上書きする */
export const DEFAULT_PASSCODE = "1959";
export const DEFAULT_ADMIN_PASSCODE = "3030";

export function expectedPasscode(): string {
  return process.env.APP_PASSCODE || DEFAULT_PASSCODE;
}

export function expectedAdminPasscode(): string {
  return process.env.ADMIN_PASSCODE || DEFAULT_ADMIN_PASSCODE;
}

/**
 * Edge でも Node でも動く SHA-256。middleware から呼ぶので Web Crypto を使う。
 * scope を混ぜているので、設定画面のCookieを入店側に使い回すことはできない。
 */
export async function hashPasscode(passcode: string, scope: "app" | "admin" = "app"): Promise<string> {
  const bytes = new TextEncoder().encode(`age3-kama:${scope}:${passcode}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
