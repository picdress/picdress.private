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
  /**
   * manual(기본): 사업자 없이 운영 — 토스·카카오페이 송금 링크, PayPal, (선택) 계좌이체·현장결제 → 관리자가 확인
   * online: 사업자 등록 후 포트원 자동 결제 (토스페이먼츠·엑심베이)
   */
  paymentMode: (env.PAYMENT_MODE === "online" || env.PAYMENT_MODE === "toss" ? "toss" : "manual") as "toss" | "manual",
  /** 로컬 테스트용 모의 결제. 운영 서버에서는 절대 켜지 마세요. */
  mockPayments: env.PAYMENT_MOCK === "1",
  // 포트원 (https://admin.portone.io → 결제 연동)
  portoneStoreId: env.PORTONE_STORE_ID ?? "",
  portoneApiSecret: env.PORTONE_API_SECRET ?? "",
  portoneWebhookSecret: env.PORTONE_WEBHOOK_SECRET ?? "",
  /** 국내 결제 채널 (토스페이먼츠): 토스페이·카카오페이·계좌이체·카드 */
  portoneChannelKr: env.PORTONE_CHANNEL_KR ?? "",
  /** 해외 결제 채널 (엑심베이): 알리페이·위챗페이·유니온페이·해외카드·PayPal */
  portoneChannelGlobal: env.PORTONE_CHANNEL_GLOBAL ?? "",
  /** 해외 결제 청구 통화: KRW(기본, 원화 가격 그대로) 또는 USD(드레스별 달러 가격 사용) */
  globalCurrency: (env.GLOBAL_CURRENCY === "USD" ? "USD" : "KRW") as "KRW" | "USD",
  /** 결제 화면에서 자리를 잡아두는 시간 */
  holdMinutes: int(env.HOLD_MINUTES, 10),
  /** 송금 기한 (신청 후 몇 시간 안에 보내야 하는지) */
  depositHours: int(env.DEPOSIT_HOURS, 2),

  // manual 모드 결제수단 — 값을 넣은 것만 결제 화면에 보여요
  /** 토스아이디 링크 (예: https://toss.me/picdress). {amount}를 넣으면 금액이 채워진 링크로 바뀌어요 */
  tossSendLink: env.TOSS_SEND_LINK ?? "",
  /** 카카오페이 송금코드 링크 (카카오페이 앱 → 송금 → 송금코드 → 링크 복사) */
  kakaoSendLink: env.KAKAOPAY_SEND_LINK ?? "",
  /** PayPal.Me 링크 (예: https://paypal.me/picdress) — 달러 금액이 자동으로 붙어요 */
  paypalLink: env.PAYPAL_LINK ?? "",
  /** 계좌이체 (예: 국민은행 000-000 (예금주 홍길동)) */
  bankAccount: env.BANK_ACCOUNT ?? "",
  /** 1이면 '현장 결제(현금)' 선택지 표시 */
  onsitePayment: env.ONSITE_PAYMENT === "1",
  /** 드레스에 달러 가격이 없을 때 PayPal 금액 계산용 환율 (1달러 = 몇 원) */
  krwPerUsd: int(env.KRW_PER_USD, 1400),

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

export type ManualMethod = "TOSS_SEND" | "KAKAOPAY_SEND" | "PAYPAL" | "BANK" | "ONSITE";

/** manual 모드에서 켜진 결제수단 */
export function manualMethods(): ManualMethod[] {
  const out: ManualMethod[] = [];
  if (config.tossSendLink) out.push("TOSS_SEND");
  if (config.kakaoSendLink) out.push("KAKAOPAY_SEND");
  if (config.paypalLink) out.push("PAYPAL");
  if (config.bankAccount) out.push("BANK");
  if (config.onsitePayment) out.push("ONSITE");
  return out;
}

/** PayPal로 받을 달러 금액: 드레스 달러 가격이 있으면 그것, 없으면 환율로 계산 (1달러 단위 올림) */
export function usdAmount(krw: number, priceUsd: string | null | undefined) {
  if (priceUsd && Number(priceUsd) > 0) return Number(priceUsd).toFixed(2);
  return Math.ceil(krw / config.krwPerUsd).toFixed(2);
}

/** 송금 링크 만들기 */
export function sendLink(method: ManualMethod, krw: number, usd: string) {
  if (method === "TOSS_SEND") return config.tossSendLink.replace("{amount}", String(krw));
  if (method === "KAKAOPAY_SEND") return config.kakaoSendLink.replace("{amount}", String(krw));
  if (method === "PAYPAL") {
    const base = config.paypalLink.replace(/\/$/, "");
    if (base.includes("{amount}")) return base.replace("{amount}", usd);
    return /paypal\.me\//i.test(base) ? `${base}/${usd}USD` : base;
  }
  return "";
}

export function paymentsReady() {
  if (config.mockPayments) return true;
  if (config.paymentMode === "manual") return manualMethods().length > 0;
  return Boolean(config.portoneStoreId && config.portoneApiSecret && (config.portoneChannelKr || config.portoneChannelGlobal));
}
