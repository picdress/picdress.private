import type { Locale } from "./locales";
import type { Messages } from "./messages/ko";

// 언어별 날짜·금액 표시 (클라이언트에서도 써요. 문구 사전은 여기서 불러오지 않아요)

/** "{name}님" + {name: "A"} → "A님" */
export function fmt(template: string, vars: Record<string, string | number> = {}) {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** 한국어 조사 '로/으로' 붙이기 (받침이 있으면 '으로', 없거나 ㄹ 받침이면 '로') */
export function withRo(word: string) {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return `${word}로`;
  const jong = (c - 0xac00) % 28;
  return jong === 0 || jong === 8 ? `${word}로` : `${word}으로`;
}

/** 서버 오류 코드 → 현재 언어 문구 (없으면 서버가 준 문구) */
export function errorText(t: Messages, code: string | undefined | null, fallback?: string) {
  if (code && t.errors[code]) return t.errors[code];
  return fallback || t.errors.SERVER_ERROR;
}

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_EN_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WD = {
  ko: ["일", "월", "화", "수", "목", "금", "토"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  zh: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
};

function parts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const wd = new Date(`${date}T00:00:00Z`).getUTCDay();
  return { y, m, d, wd };
}

/** 2026-11-02 → 11월 2일 (월) / Mon, Nov 2 / 11月2日（周一） */
export function longDate(date: string, locale: Locale) {
  const { m, d, wd } = parts(date);
  if (locale === "en") return `${WD.en[wd]}, ${MONTHS_EN_SHORT[m - 1]} ${d}`;
  if (locale === "zh") return `${m}月${d}日（${WD.zh[wd]}）`;
  return `${m}월 ${d}일 (${WD.ko[wd]})`;
}

/** 2026-11-02 → 11/2 */
export function shortDate(date: string) {
  const { m, d } = parts(date);
  return `${m}/${d}`;
}

export function monthLabel(t: Messages, date: string, locale: Locale) {
  const { y, m } = parts(date);
  return fmt(t.schedule.month, { year: y, month: m, monthName: locale === "en" ? MONTHS_EN[m - 1] : String(m) });
}

export function dayLabel(t: Messages, date: string, locale: Locale) {
  const { m, d } = parts(date);
  return fmt(t.schedule.dayLabel, { month: m, day: d, monthName: locale === "en" ? MONTHS_EN[m - 1] : String(m) });
}

/** 30000 → 30,000원 / ₩30,000 */
export function money(amount: number, locale: Locale) {
  const n = amount.toLocaleString("en-US");
  return locale === "ko" ? `${n}원` : `₩${n}`;
}

export function usd(amount: string | number) {
  return `$${Number(amount).toFixed(2)}`;
}

/** 드레스 이름 (영어/중국어 이름이 없으면 한국어) */
export function dressName(d: { name: string; nameEn?: string | null; nameZh?: string | null }, locale: Locale) {
  if (locale === "en" && d.nameEn) return d.nameEn;
  if (locale === "zh" && d.nameZh) return d.nameZh;
  return d.name;
}
