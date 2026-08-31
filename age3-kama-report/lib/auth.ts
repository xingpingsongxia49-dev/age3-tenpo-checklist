/**
 * 共通パスコードによるアクセス制限。
 *
 * 本格的なログインは要らない、という要件なので、店舗で共有する4桁程度の
 * パスコードを1つだけ持つ。合っていたらパスコードのハッシュをCookieに入れ、
 * middleware がそれを見て通す。パスコード自体はCookieに入れない。
 */

export const AUTH_COOKIE = "kama_pass";

/** 環境変数が無いときの初期値。Vercel側で APP_PASSCODE を設定して上書きする */
export const DEFAULT_PASSCODE = "3939";

export function expectedPasscode(): string {
  return process.env.APP_PASSCODE || DEFAULT_PASSCODE;
}

/** Edge でも Node でも動く SHA-256。middleware から呼ぶので Web Crypto を使う */
export async function hashPasscode(passcode: string): Promise<string> {
  const bytes = new TextEncoder().encode(`age3-kama:${passcode}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
