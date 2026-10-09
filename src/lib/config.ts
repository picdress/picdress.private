// 운영 설정. 대부분 환경변수로 바꿀 수 있고, 기본값은 피그마 기준이에요.
// (영업일 11/2~11/13, 11:00~18:00 30분 간격, 타임당 4명, 2시간 대여)

function int(v: string | undefined, fallback: number) {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}

export type RefundRule = { daysBefore: number; percent: number };

function parseRefundRules(raw: string): RefundRule[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [d, p] = s.split(":").map((x) => Number.parseInt(x, 10));
      return { daysBefore: d, percent: Math.max(0, Math.min(100, p)) };
    })
    .filter((r) => Number.isFinite(r.daysBefore) && Number.isFinite(r.percent))
    .sort((a, b) => b.daysBefore - a.daysBefore);
}

const env = process.env;

export const config = {
  // SITE_URL을 안 넣으면 Vercel이 알려주는 기본 주소(xxx.vercel.app)를 써요
  siteUrl: (
    env.SITE_URL ||
    (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
  ).replace(/\/$/, ""),

  // 영업 일정
  openStart: env.OPEN_START ?? "2026-11-02",
  openEnd: env.OPEN_END ?? "2026-11-13",
  closedDates: (env.CLOSED_DATES ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  slotStart: env.SLOT_START ?? "11:00",
  slotEnd: env.SLOT_END ?? "18:00",
  slotIntervalMinutes: int(env.SLOT_INTERVAL_MINUTES, 30),
  slotCapacity: int(env.SLOT_CAPACITY, 4),
  /** 이 시간(분) 전까지만 예약 가능 */
  bookingCutoffMinutes: int(env.BOOKING_CUTOFF_MINUTES, 30),

  // 드레스 재고 계산: 대여 시간 + 정리 시간 동안 같은 드레스·사이즈는 다른 사람이 못 씀
  rentalMinutes: int(env.RENTAL_MINUTES, 120),
  dressBufferMinutes: int(env.DRESS_BUFFER_MINUTES, 0),

  // 결제
  /** toss: 토스페이먼츠 실결제 / manual: 계좌이체(무통장입금) 후 관리자 확인 */
  paymentMode: (env.PAYMENT_MODE === "manual" ? "manual" : "toss") as "toss" | "manual",
  /** 로컬 테스트용 모의 결제. 운영 서버에서는 절대 켜지 마세요. */
  mockPayments: env.PAYMENT_MOCK === "1",
  tossClientKey: env.TOSS_CLIENT_KEY ?? "",
  tossSecretKey: env.TOSS_SECRET_KEY ?? "",
  /** 결제 화면에서 자리를 잡아두는 시간 */
  holdMinutes: int(env.HOLD_MINUTES, 10),
  /** 무통장입금 모드에서 입금 기한 */
  depositHours: int(env.DEPOSIT_HOURS, 2),
  bankAccount: env.BANK_ACCOUNT ?? "",

  // 환불 규정 "남은일수:환불%" (이용일 기준). 기본: 3일 전 100%, 1일 전 50%, 당일 0%
  refundRules: parseRefundRules(env.REFUND_RULES ?? "3:100,1:50,0:0"),

  // 관리자
  adminPassword: env.ADMIN_PASSWORD ?? "",
  sessionSecret: env.SESSION_SECRET ?? "",

  // 메일 (Gmail 앱 비밀번호)
  gmailUser: env.GMAIL_USER ?? "",
  gmailAppPassword: env.GMAIL_APP_PASSWORD ?? "",
  mailFromName: env.MAIL_FROM_NAME ?? "pic.dress",
  adminNotifyEmail: env.ADMIN_NOTIFY_EMAIL ?? "",

  // 사이트 하단 사업자 정보 (PG 심사에 필요)
  business: {
    name: env.BUSINESS_NAME ?? "",
    owner: env.BUSINESS_OWNER ?? "",
    regNo: env.BUSINESS_REG_NO ?? "",
    mailOrderNo: env.BUSINESS_MAIL_ORDER_NO ?? "",
    address: env.BUSINESS_ADDRESS ?? "서울 서대문구 대현동 60-11 2층",
    phone: env.BUSINESS_PHONE ?? "010-9618-0879",
    email: env.BUSINESS_EMAIL ?? "picdress012@gmail.com",
  },
} as const;

export function paymentsReady() {
  if (config.paymentMode === "manual") return true;
  return config.mockPayments || (config.tossClientKey !== "" && config.tossSecretKey !== "");
}
