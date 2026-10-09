// 지원 언어: 한국어 / 영어 / 중국어(간체)

export const LOCALES = ["ko", "en", "zh"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ko";
export const LOCALE_COOKIE = "pd_lang";

export const LOCALE_LABELS: Record<Locale, string> = { ko: "KO", en: "EN", zh: "中文" };
export const HTML_LANG: Record<Locale, string> = { ko: "ko", en: "en", zh: "zh-CN" };
/** 포트원 결제창 언어 */
export const PORTONE_LOCALE: Record<Locale, "KO_KR" | "EN_US" | "ZH_CN"> = { ko: "KO_KR", en: "EN_US", zh: "ZH_CN" };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** 브라우저 언어 설정으로 첫 화면 언어 고르기 (한국어 → ko, 중국어 → zh, 그 외 → en) */
export function detectLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const first = acceptLanguage.split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("ko")) return "ko";
  if (first.startsWith("zh")) return "zh";
  if (first === "" || first === "*") return DEFAULT_LOCALE;
  return "en";
}
