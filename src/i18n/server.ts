import { cookies, headers } from "next/headers";
import { detectLocale, getMessages, isLocale, LOCALE_COOKIE, type Locale } from "./index";

/** 지금 요청의 언어: 쿠키(직접 고른 언어) → 브라우저 언어 */
export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;
  return detectLocale((await headers()).get("accept-language"));
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: getMessages(locale) };
}
