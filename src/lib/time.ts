import { config } from "./config";

// 모든 날짜·시간은 한국 시간(KST) 기준 문자열로 다뤄요. 서버(Vercel)는 UTC라서 직접 계산해요.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 예약 가능한 시작 시간 목록 (예: 11:00, 11:30 ... 18:00) */
export function slotTimes(): string[] {
  const out: string[] = [];
  const start = toMinutes(config.slotStart);
  const end = toMinutes(config.slotEnd);
  for (let t = start; t <= end; t += config.slotIntervalMinutes) out.push(fromMinutes(t));
  return out;
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 영업일 목록 (휴무일 제외) */
export function openDates(): string[] {
  const out: string[] = [];
  for (let d = config.openStart; d <= config.openEnd; d = addDays(d, 1)) {
    if (!config.closedDates.includes(d)) out.push(d);
  }
  return out;
}

export function isValidDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && openDates().includes(date);
}

export function isValidTime(time: string) {
  return slotTimes().includes(time);
}

/** 해당 타임 시작 시각 (절대 시각) */
export function slotStartAt(date: string, time: string) {
  return new Date(`${date}T${time}:00+09:00`);
}

export function todayKst(now = new Date()) {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 이미 지났거나 마감 시간이 지난 타임인지 */
export function isSlotClosedByTime(date: string, time: string, now = new Date()) {
  return slotStartAt(date, time).getTime() - config.bookingCutoffMinutes * 60_000 <= now.getTime();
}

/** 이용일까지 남은 일수 (오늘 이용이면 0) */
export function daysUntil(date: string, now = new Date()) {
  const today = todayKst(now);
  const a = Date.parse(`${today}T00:00:00Z`);
  const b = Date.parse(`${date}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 2026-11-02 → 11/2 */
export function shortDate(date: string) {
  const [, m, d] = date.split("-").map(Number);
  return `${m}/${d}`;
}

/** 2026-11-02 → 11월 2일 (월) */
export function longDate(date: string) {
  const [, m, d] = date.split("-").map(Number);
  const wd = new Date(`${date}T00:00:00Z`).getUTCDay();
  return `${m}월 ${d}일 (${WEEKDAYS[wd]})`;
}

export function formatKst(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const k = new Date(date.getTime() + KST_OFFSET_MS);
  const iso = k.toISOString();
  return `${iso.slice(5, 7)}/${iso.slice(8, 10)} ${iso.slice(11, 16)}`;
}

export function won(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}
