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
  /** (선택) 토스 송금에 쓸 다른 링크. 비워두면 BANK_ACCOUNT로 토스 송금 화면 링크를 만들어요 */
  tossSendLink: env.TOSS_SEND_LINK ?? "",
  /** (선택) 카카오페이 송금에 쓸 다른 링크. 비워두면 BANK_ACCOUNT로 카카오페이 계좌송금 화면 링크를 만들어요 */
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
  if (config.tossSendLink || bankParts()) out.push("TOSS_SEND");
  if (config.kakaoSendLink || kakaoBankCode()) out.push("KAKAOPAY_SEND");
  if (config.paypalLink) out.push("PAYPAL");
  if (config.bankAccount) out.push("BANK");
  if (config.onsitePayment) out.push("ONSITE");
  return out;
}

/** BANK_ACCOUNT("국민은행 123456-01-234567 (예금주 홍길동)")에서 은행 이름과 계좌번호(숫자만)를 뽑아요 */
export function bankParts(): { bank: string; accountNo: string } | null {
  const raw = config.bankAccount.trim();
  const m = raw.match(/\d[\d\s-]{5,}\d/);
  if (!m) return null;
  const accountNo = m[0].replace(/\D/g, "");
  const words = (t: string) => t.replace(/[()（）:：,]/g, " ").trim().split(/\s+/).filter(Boolean);
  const name = words(raw.slice(0, m.index)).pop() ?? words(raw.slice((m.index ?? 0) + m[0].length))[0] ?? "";
  const bank = normalizeBank(name);
  return bank ? { bank, accountNo } : null;
}

const BANK_ALIASES: [RegExp, string][] = [
  [/카카오/, "카카오뱅크"],
  [/토스/, "토스뱅크"],
  [/케이뱅크|^k뱅크/i, "케이뱅크"],
  [/국민|^kb/i, "국민"],
  [/농협|^nh/i, "농협"],
  [/기업|^ibk/i, "기업"],
  [/하나|외환|^keb/i, "하나"],
  [/sc|제일/i, "SC제일"],
  [/새마을/, "새마을"],
  [/아이엠|^im|대구/i, "대구"],
  [/씨티|citi/i, "씨티"],
  [/산업|^kdb/i, "산업"],
];

// 카카오페이 계좌송금 앱링크용 금융기관 코드 (카카오페이 가이드 기준)
const KAKAO_BANK_CODE: Record<string, string> = {
  카카오뱅크: "090", 토스뱅크: "092", 케이뱅크: "089", 국민: "004", 농협: "011", 신한: "088", 우리: "020",
  하나: "081", 기업: "003", SC제일: "023", 대구: "031", 부산: "032", 광주: "034", 경남: "039", 전북: "037",
  제주: "035", 새마을: "045", 우체국: "071", 신협: "048", 수협: "007", 씨티: "027", 산업: "002",
  저축: "050", 산림조합: "064",
};

function kakaoBankCode() {
  const b = bankParts();
  return b ? (KAKAO_BANK_CODE[b.bank] ?? "") : "";
}

/** 계좌로 받는 결제수단인지 (계좌이체, 계좌로 연결되는 토스·카카오페이 송금) — 화면·메일에 계좌번호를 보여줘요 */
export function usesAccount(method: string | null | undefined) {
  if (!config.bankAccount) return false;
  if (method === "BANK") return true;
  if (method === "TOSS_SEND") return !config.tossSendLink;
  if (method === "KAKAOPAY_SEND") return !config.kakaoSendLink;
  return false;
}

function normalizeBank(name: string) {
  for (const [re, v] of BANK_ALIASES) if (re.test(name)) return v;
  return name.replace(/은행$/, "");
}

/** PayPal로 받을 달러 금액: 드레스 달러 가격이 있으면 그것, 없으면 환율로 계산 (1달러 단위 올림) */
export function usdAmount(krw: number, priceUsd: string | null | undefined) {
  if (priceUsd && Number(priceUsd) > 0) return Number(priceUsd).toFixed(2);
  return Math.ceil(krw / config.krwPerUsd).toFixed(2);
}

/** 송금 링크 만들기 */
export function sendLink(method: ManualMethod, krw: number, usd: string) {
  if (method === "TOSS_SEND") {
    if (config.tossSendLink) return config.tossSendLink.replace("{amount}", String(krw));
    // 토스아이디 송금은 2024년에 종료돼서, 우리 계좌·금액이 채워진 토스 송금 화면을 바로 열어요 (휴대폰 토스 앱)
    const b = bankParts();
    if (!b) return "";
    const q = new URLSearchParams({ bank: b.bank, accountNo: b.accountNo, amount: String(krw) });
    return `supertoss://send?${q}`;
  }
  if (method === "KAKAOPAY_SEND") {
    if (config.kakaoSendLink) return config.kakaoSendLink.replace("{amount}", String(krw));
    // 카카오페이 공식 계좌송금 앱링크: 우리 계좌·금액이 채워진 송금 화면을 열어요 (휴대폰 카카오페이 앱)
    const b = bankParts();
    const code = kakaoBankCode();
    if (!b || !code) return "";
    const q = new URLSearchParams({ bank_code: code, bank_account_number: b.accountNo, amount: String(krw) });
    return `kakaopay://money/to/bank?${q}`;
  }
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
