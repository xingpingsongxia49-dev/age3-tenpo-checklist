/**
 * PINはこのファイルの2行だけで決まる。
 * 環境変数で上書きできるようにすると、コードとVercelのどちらが効いているのか
 * 分からなくなるので、置き場所を1か所にしてある。変えたい時はここを書き換えてデプロイ。
 */

/** 入店PIN。アプリ全体 */
export const APP_PASSCODE = "1959";
/** 管理PIN。分析と設定だけ */
export const ADMIN_PASSCODE = "3030";

export const AUTH_COOKIE = "age3_ginza_auth";
export const ADMIN_COOKIE = "age3_ginza_admin";

export function expectedPasscode(): string {
  return APP_PASSCODE;
}

export function expectedAdminPasscode(): string {
  return ADMIN_PASSCODE;
}

/**
 * PINをそのままCookieに入れない。
 * scope を混ぜてあるので、入店PINのCookieを管理用に使い回すこともできない。
 */
export async function hashPasscode(passcode: string, scope: "app" | "admin" = "app"): Promise<string> {
  const data = new TextEncoder().encode(`age3-ginza:${scope}:${passcode}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
