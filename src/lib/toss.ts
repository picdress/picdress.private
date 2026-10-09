import { config } from "./config";

// 토스페이먼츠 코어 API (결제 승인 / 조회 / 취소)
// https://docs.tosspayments.com/reference

const API = "https://api.tosspayments.com/v1";

export class TossError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export type TossPayment = {
  paymentKey: string;
  orderId: string;
  status: string; // DONE, CANCELED, PARTIAL_CANCELED, ...
  method?: string; // 카드, 간편결제, 계좌이체, 해외간편결제 ...
  totalAmount: number;
  balanceAmount?: number;
  currency?: string;
  easyPay?: { provider?: string } | null;
  approvedAt?: string;
  receipt?: { url?: string } | null;
};

function isMock(paymentKey: string) {
  return config.mockPayments && paymentKey.startsWith("mock_");
}

async function call<T>(path: string, init: { method: "GET" | "POST"; body?: unknown; idempotencyKey?: string }) {
  if (!config.tossSecretKey) throw new TossError("NO_SECRET_KEY", "결제 설정(TOSS_SECRET_KEY)이 안 되어 있어요.", 500);
  const res = await fetch(`${API}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.tossSecretKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
      ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new TossError(data.code ?? "TOSS_ERROR", data.message ?? "결제사 응답 오류", res.status);
  }
  return data as T;
}

export async function tossConfirm(paymentKey: string, orderId: string, amount: number) {
  if (isMock(paymentKey)) {
    return {
      paymentKey,
      orderId,
      status: "DONE",
      method: "모의결제",
      totalAmount: amount,
      currency: "KRW",
      approvedAt: new Date().toISOString(),
    } satisfies TossPayment;
  }
  return call<TossPayment>("/payments/confirm", {
    method: "POST",
    body: { paymentKey, orderId, amount },
    idempotencyKey: `confirm-${orderId}`,
  });
}

export async function tossGetPayment(paymentKey: string) {
  return call<TossPayment>(`/payments/${encodeURIComponent(paymentKey)}`, { method: "GET" });
}

export async function tossCancel(paymentKey: string, reason: string, cancelAmount: number | undefined, key: string) {
  if (isMock(paymentKey)) return { paymentKey, status: "CANCELED" } as TossPayment;
  return call<TossPayment>(`/payments/${encodeURIComponent(paymentKey)}/cancel`, {
    method: "POST",
    body: cancelAmount === undefined ? { cancelReason: reason } : { cancelReason: reason, cancelAmount },
    idempotencyKey: key,
  });
}

export function describeMethod(p: TossPayment) {
  const provider = p.easyPay?.provider;
  if (provider) return provider; // 토스페이, 카카오페이
  return p.method ?? "";
}
