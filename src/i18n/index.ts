import en from "./messages/en";
import ko, { type Messages } from "./messages/ko";
import zh from "./messages/zh";
import type { Locale } from "./locales";

export type { Messages };
export * from "./locales";
export * from "./format";

const ALL: Record<Locale, Messages> = { ko, en, zh };

export function getMessages(locale: Locale): Messages {
  return ALL[locale] ?? ko;
}
