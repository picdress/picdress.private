import { PortOneClient, PortOneError } from "@portone/server-sdk";
import { config } from "./config";

// 포트원 V2 서버 API: 결제 조회 / 취소
// 국내(토스페이먼츠)·해외(엑심베이) 결제 모두 포트원을 거쳐요.

export class PaymentApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

type Client = ReturnType<typeof PortOneClient>;
type Payment = Awaited<ReturnType<Client["payment"]["getPayment"]>>;

let client: Client | null = null;
function api() {
  if (!config.portoneApiSecret) throw new PaymentApiError("NO_API_SECRET", "PORTONE_API_SECRET이 설정되지 않았어요.", 500);
  // PORTONE_API_BASE_URL은 로컬 테스트(가짜 포트원 서버)용이에요. 운영에서는 비워두세요.
  client ??= PortOneClient({ secret: config.portoneApiSecret, ...(process.env.PORTONE_API_BASE_URL ? { baseUrl: process.env.PORTONE_API_BASE_URL } : {}) });
  return client;
}

export type PaymentInfo = {
  status: string; // PAID, FAILED, READY, PAY_PENDING, CANCELLED, PARTIAL_CANCELLED, ...
  total: number; // 통화 최소 단위 (KRW: 원, USD: 센트)
  currency: string;
  method: string; // 화면·관리자용 결제수단 이름
};

const PROVIDER_LABEL: Record<string, string> = {
  TOSSPAY: "토스페이",
  KAKAOPAY: "카카오페이",
  NAVERPAY: "네이버페이",
  ALIPAY: "알리페이",
  ALIPAY_HK: "알리페이HK",
  WECHAT: "위챗페이",
  PAYPAL: "PayPal",
};

export const METHOD_LABEL: Record<string, string> = {
  TOSSPAY: "토스페이",
  KAKAOPAY: "카카오페이",
  TRANSFER: "계좌이체",
  CARD: "국내카드",
  ALIPAY: "알리페이",
  WECHAT: "위챗페이",
  UNIONPAY: "유니온페이",
  INTL_CARD: "해외카드",
  PAYPAL: "PayPal",
};

function describe(p: Payment, fallback: string) {
  if (!("method" in p) || !p.method) return fallback;
  const m = p.method as { type: string; provider?: string };
  if (m.type === "PaymentMethodEasyPay" && m.provider) return PROVIDER_LABEL[m.provider] ?? m.provider;
  if (m.type === "PaymentMethodTransfer") return "계좌이체";
  if (m.type === "PaymentMethodCard") return fallback || "카드";
  return fallback;
}

export async function fetchPayment(paymentId: string): Promise<PaymentInfo> {
  try {
    const p = await api().payment.getPayment({ paymentId });
    let selected = "";
    if ("customData" in p && p.customData) {
      try {
        const cd = typeof p.customData === "string" ? JSON.parse(p.customData) : p.customData;
        selected = METHOD_LABEL[cd?.method] ?? "";
      } catch {}
    }
    const amount = "amount" in p ? p.amount : undefined;
    return {
      status: String(p.status),
      total: amount?.total ?? 0,
      currency: "currency" in p ? String(p.currency) : "KRW",
      method: describe(p, selected),
    };
  } catch (e) {
    if (e instanceof PortOneError) throw new PaymentApiError("PORTONE_ERROR", e.message);
    throw e;
  }
}

export async function cancelPayment(paymentId: string, opts: { reason: string; amount?: number; requester: "CUSTOMER" | "ADMIN" }) {
  try {
    await api().payment.cancelPayment({
      paymentId,
      reason: opts.reason,
      amount: opts.amount,
      requester: opts.requester,
    });
  } catch (e) {
    if (e instanceof PortOneError) throw new PaymentApiError("PORTONE_CANCEL_ERROR", e.message);
    throw e;
  }
}
