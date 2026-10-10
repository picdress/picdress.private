import { randomBytes } from "node:crypto";
import { canBook } from "./availability";
import { config, manualMethods, usdAmount, type ManualMethod } from "./config";
import { db, type Tx } from "./db";
import { isLocale, type Locale } from "@/i18n/locales";
import { mailCancelled, mailConfirmed, mailDepositRequest, mailRefundDone } from "./mail";
import { cancelPayment, fetchPayment, METHOD_LABEL, PaymentApiError, type PaymentInfo } from "./portone";
import { daysUntil, isSlotClosedByTime, isValidDate, isValidTime, shortDate, slotStartAt } from "./time";

export class BookingError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

// 서버 기록·관리자용 한국어 문구 (고객 화면은 오류 코드로 각 언어 문구를 보여줘요)
const MESSAGES: Record<string, string> = {
  SLOT_CLOSED: "예약이 마감된 시간이에요. 다른 시간을 골라주세요.",
  SLOT_FULL: "방금 그 시간이 다 찼어요. 다른 시간을 골라주세요.",
  DRESS_UNAVAILABLE: "그 시간에는 이 드레스·사이즈가 이미 예약됐어요. 다른 사이즈나 드레스를 골라주세요.",
};

type Row = {
  id: string;
  order_id: string;
  manage_token: string;
  customer_name: string;
  phone: string;
  email: string;
  slot_date: string;
  slot_time: string;
  dress_id: string;
  dress_size: string;
  dress_name: string;
  dress_name_en: string | null;
  dress_name_zh: string | null;
  dress_image: string;
  amount: number;
  amount_usd: string | null;
  currency: string;
  status: "holding" | "awaiting_deposit" | "paid" | "cancelled" | "expired";
  payment_mode: string;
  payment_method: string | null;
  payment_channel: string | null;
  payment_key: string | null;
  hold_expires_at: Date | null;
  paid_at: Date | null;
  cancelled_at: Date | null;
  cancelled_by: string | null;
  refund_amount: number;
  refund_reason: string | null;
  refund_done_at: Date | null;
  admin_memo: string | null;
  locale: string;
  created_at: Date;
};

export type BookingView = ReturnType<typeof toView>;

function toView(r: Row) {
  const holdActive = r.hold_expires_at ? r.hold_expires_at.getTime() > Date.now() : false;
  let status: string = r.status;
  if ((r.status === "holding" || r.status === "awaiting_deposit") && !holdActive) status = "expired";
  return {
    id: r.id,
    orderId: r.order_id,
    manageToken: r.manage_token,
    customerName: r.customer_name,
    phone: r.phone,
    email: r.email,
    slotDate: r.slot_date,
    slotTime: r.slot_time,
    dressId: r.dress_id,
    dressName: r.dress_name,
    dressNameEn: r.dress_name_en,
    dressNameZh: r.dress_name_zh,
    dressImage: r.dress_image,
    dressSize: r.dress_size,
    amount: r.amount,
    amountUsd: r.amount_usd,
    currency: r.currency,
    status: status as Row["status"],
    paymentMode: r.payment_mode,
    paymentMethod: r.payment_method,
    paymentChannel: r.payment_channel,
    hasPaymentKey: Boolean(r.payment_key),
    holdExpiresAt: r.hold_expires_at?.toISOString() ?? null,
    paidAt: r.paid_at?.toISOString() ?? null,
    cancelledAt: r.cancelled_at?.toISOString() ?? null,
    cancelledBy: r.cancelled_by,
    refundAmount: r.refund_amount,
    /** PayPal(달러) 결제의 환불 달러 금액 */
    refundUsd:
      r.currency === "USD" && r.amount_usd && r.amount > 0
        ? ((Number(r.amount_usd) * r.refund_amount) / r.amount).toFixed(2)
        : null,
    refundReason: r.refund_reason,
    refundDoneAt: r.refund_done_at?.toISOString() ?? null,
    adminMemo: r.admin_memo,
    locale: (isLocale(r.locale) ? r.locale : "ko") as Locale,
    createdAt: r.created_at.toISOString(),
  };
}

const SELECT = (tx: Tx) => tx`
  select b.*, d.name as dress_name, d.name_en as dress_name_en, d.name_zh as dress_name_zh, d.image as dress_image
  from bookings b join dresses d on d.id = b.dress_id
`;

async function findBy(tx: Tx, field: "id" | "order_id" | "manage_token", value: string, lock = false) {
  if (field === "id" && !/^[0-9a-f-]{36}$/i.test(value)) return null;
  const rows = await tx<Row[]>`
    ${SELECT(tx)}
    where ${tx(`b.${field}`)} = ${value}
    ${lock ? tx`for update of b` : tx``}
  `;
  return rows[0] ?? null;
}

export async function getBookingByToken(token: string) {
  const r = await findBy(db(), "manage_token", token);
  return r ? toView(r) : null;
}

export async function getBookingByOrderId(orderId: string) {
  const r = await findBy(db(), "order_id", orderId);
  return r ? toView(r) : null;
}

async function logEvent(tx: Tx, bookingId: string, type: string, detail: unknown) {
  await tx`insert into booking_events (booking_id, type, detail) values (${bookingId}, ${type}, ${tx.json(detail as never)})`;
}

function lockDate(tx: Tx, date: string) {
  // 같은 날짜 예약은 한 번에 하나씩 처리 → 동시에 눌러도 정원 초과 없음
  return tx`select pg_advisory_xact_lock(hashtext(${"picdress:" + date}))`;
}

function token(bytes: number) {
  return randomBytes(bytes).toString("base64url");
}

// ───────────────────────── 입력 검증 ─────────────────────────

export type HoldInput = {
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  dressId: string;
  size: string;
  locale?: string;
};

/** 한국 번호는 숫자만(01012345678), 해외 번호는 +국가번호(+8613800000000) */
export function normalizePhone(p: string) {
  const t = p.trim();
  const digits = t.replace(/\D/g, "");
  return t.startsWith("+") ? `+${digits}` : digits;
}

export function formatPhone(p: string) {
  if (p.startsWith("+")) return p;
  return p.replace(/^(01\d)(\d{3,4})(\d{4})$/, "$1-$2-$3");
}

export function validateCustomer(input: { name?: string; phone?: string; email?: string }) {
  const name = (input.name ?? "").trim();
  const phone = normalizePhone(input.phone ?? "");
  const email = (input.email ?? "").trim();
  if (name.length < 1 || name.length > 50) throw new BookingError("INVALID_NAME", "성함을 확인해 주세요.");
  if (!/^\+?\d{7,15}$/.test(phone)) throw new BookingError("INVALID_PHONE", "연락처를 확인해 주세요.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100)
    throw new BookingError("INVALID_EMAIL", "이메일 주소를 확인해 주세요.");
  return { name, phone, email };
}

// ───────────────────────── 자리 잡기 (결제 화면 진입) ─────────────────────────

export async function createHold(input: HoldInput, clientIp: string) {
  const c = validateCustomer(input);
  if (!isValidDate(input.date)) throw new BookingError("INVALID_DATE", "예약할 수 없는 날짜예요.");
  if (!isValidTime(input.time)) throw new BookingError("INVALID_TIME", "예약할 수 없는 시간이에요.");
  if (isSlotClosedByTime(input.date, input.time)) throw new BookingError("SLOT_CLOSED", MESSAGES.SLOT_CLOSED);
  const locale = isLocale(input.locale) ? input.locale : "ko";

  const sql = db();
  const id = await sql.begin(async (tx) => {
    await lockDate(tx, input.date);

    const [dress] = await tx<{ price: number; price_usd: string | null; active: boolean }[]>`
      select price, price_usd, active from dresses where id = ${input.dressId}
    `;
    if (!dress || !dress.active) throw new BookingError("INVALID_DRESS", "선택한 드레스를 찾을 수 없어요.");
    if (dress.price <= 0) throw new BookingError("NO_PRICE", "드레스 가격이 아직 설정되지 않았어요.");

    // 같은 번호로 잡아둔 이전 자리는 풀어줌 (뒤로 가서 다시 고르는 경우)
    await tx`update bookings set status = 'expired' where phone = ${c.phone} and status = 'holding'`;

    // 한 사람이 자리를 너무 많이 잡아두지 못하게
    const [{ n }] = await tx<{ n: number }[]>`
      select count(*)::int as n from bookings
      where client_ip = ${clientIp} and status = 'holding' and hold_expires_at > now()
    `;
    if (n >= 3) throw new BookingError("TOO_MANY_HOLDS", "잠시 후 다시 시도해 주세요.", 429);

    const check = await canBook(tx, input);
    if (!check.ok) throw new BookingError(check.reason, MESSAGES[check.reason], 409);

    const orderId = `PD${input.date.replace(/-/g, "").slice(2)}${token(9).replace(/[^A-Za-z0-9]/g, "x")}`;
    const mode = config.paymentMode === "manual" ? "manual" : config.mockPayments ? "mock" : "online";
    const [row] = await tx<{ id: string }[]>`
      insert into bookings (
        order_id, manage_token, customer_name, phone, email,
        slot_date, slot_time, dress_id, dress_size, amount, amount_usd,
        status, payment_mode, hold_expires_at, client_ip, locale
      ) values (
        ${orderId}, ${token(24)}, ${c.name}, ${c.phone}, ${c.email},
        ${input.date}, ${input.time}, ${input.dressId}, ${input.size}, ${dress.price}, ${dress.price_usd},
        'holding', ${mode}, now() + ${`${config.holdMinutes} minutes`}::interval, ${clientIp}, ${locale}
      ) returning id
    `;
    await logEvent(tx, row.id, "hold_created", { ip: clientIp, locale });
    return row.id;
  });

  const r = await findBy(sql, "id", id);
  return toView(r!);
}

/** 결제를 그만두고 나갈 때 자리 풀기 */
export async function releaseHold(orderId: string) {
  await db()`update bookings set status = 'expired' where order_id = ${orderId} and status = 'holding'`;
}

// ───────────────────────── 온라인 결제 완료 처리 (포트원) ─────────────────────────
// 결제창에서 돌아올 때(리디렉트)와 포트원 웹훅 두 곳에서 불러요. 여러 번 불러도 한 번만 처리돼요.

export async function completeOnlinePayment(paymentId: string, opts: { mockMethod?: string } = {}) {
  const sql = db();
  const found = await findBy(sql, "order_id", paymentId);
  if (!found) throw new BookingError("NOT_FOUND", "예약 정보를 찾을 수 없어요.", 404);
  if (found.status === "paid" && found.payment_key === paymentId) return toView(found);

  // 1) 포트원에서 실제 결제 상태·금액 조회 (브라우저가 보낸 값은 믿지 않아요)
  let info: PaymentInfo;
  if (opts.mockMethod !== undefined) {
    if (!config.mockPayments) throw new BookingError("PAYMENT_NOT_DONE", "모의결제가 꺼져 있어요.");
    const usd = opts.mockMethod !== "" && isGlobalMethod(opts.mockMethod) && config.globalCurrency === "USD";
    info = {
      status: "PAID",
      currency: usd ? "USD" : "KRW",
      total: usd ? Math.round(Number(found.amount_usd) * 100) : found.amount,
      method: METHOD_LABEL[opts.mockMethod] ?? "모의결제",
    };
  } else {
    info = await fetchPayment(paymentId);
  }
  if (info.status === "READY" || info.status === "PAY_PENDING")
    throw new BookingError("PAYMENT_PENDING", "결제 확인 중이에요.", 202);
  if (info.status !== "PAID") throw new BookingError("PAYMENT_NOT_DONE", "결제가 완료되지 않았어요.");

  // 2) 금액 검증. 다르면 자동 취소(환불)
  const expectedUsd = found.amount_usd ? Math.round(Number(found.amount_usd) * 100) : null;
  let currency: "KRW" | "USD";
  if (info.currency === "KRW" && info.total === found.amount) currency = "KRW";
  else if (info.currency === "USD" && expectedUsd !== null && info.total === expectedUsd) currency = "USD";
  else {
    await logEvent(sql, found.id, "amount_mismatch", info);
    if (opts.mockMethod === undefined) await cancelPayment(paymentId, { reason: "결제 금액 불일치 자동 취소", requester: "ADMIN" });
    throw new BookingError("AMOUNT_MISMATCH", "결제 금액이 예약 금액과 달라 자동 취소했어요.");
  }

  // 3) 자리 다시 확인하고 확정 (락 안에서)
  const result = await sql.begin(async (tx) => {
    await lockDate(tx, found.slot_date);
    const b = (await findBy(tx, "order_id", paymentId, true))!;
    if (b.status === "paid") return { kind: "already" as const };
    if (b.status === "cancelled" || b.status === "awaiting_deposit") return { kind: "invalid" as const };
    const holdOver = !b.hold_expires_at || b.hold_expires_at.getTime() <= Date.now() || b.status === "expired";
    if (holdOver) {
      const check = await canBook(tx, { date: b.slot_date, time: b.slot_time, dressId: b.dress_id, size: b.dress_size }, b.id);
      if (!check.ok) {
        await tx`update bookings set status = 'expired' where id = ${b.id}`;
        await logEvent(tx, b.id, "sold_out_after_payment", { reason: check.reason });
        return { kind: "soldout" as const };
      }
    }
    await tx`
      update bookings set
        status = 'paid', paid_at = now(), payment_key = ${paymentId},
        payment_method = ${info.method || null}, currency = ${currency}
      where id = ${b.id}
    `;
    await logEvent(tx, b.id, "paid", info);
    return { kind: "paid" as const };
  });

  if (result.kind === "soldout" || result.kind === "invalid") {
    if (opts.mockMethod === undefined) await cancelPayment(paymentId, { reason: "예약 마감으로 자동 취소", requester: "ADMIN" });
    throw new BookingError("SOLD_OUT_REFUNDED", "결제하는 동안 자리가 마감돼 자동 취소했어요.", 409);
  }

  const view = toView((await findBy(sql, "order_id", paymentId))!);
  if (result.kind === "paid") await mailConfirmed(view);
  return view;
}

/** 포트원 쪽에서 취소된 경우 (관리자 콘솔에서 직접 취소 등) */
export async function markCancelledExternally(paymentId: string) {
  const sql = db();
  const b = await findBy(sql, "order_id", paymentId);
  if (!b || b.status !== "paid") return;
  await sql`
    update bookings set status = 'cancelled', cancelled_at = now(), cancelled_by = 'system',
      refund_amount = amount, refund_reason = '결제사에서 취소됨'
    where id = ${b.id} and status = 'paid'
  `;
  await logEvent(sql, b.id, "cancelled_externally", {});
}

const GLOBAL_METHODS = new Set(["ALIPAY", "WECHAT", "UNIONPAY", "INTL_CARD", "PAYPAL"]);
export function isGlobalMethod(m: string) {
  return GLOBAL_METHODS.has(m);
}

// ───────────────────────── 송금·계좌이체·현장결제 (사업자 없이) ─────────────────────────
// 고객이 결제수단을 골라 신청 → "결제 대기" → 관리자가 송금을 확인하면 예약 확정

export const MANUAL_LABEL: Record<string, string> = {
  TOSS_SEND: "토스 송금",
  KAKAOPAY_SEND: "카카오페이 송금",
  PAYPAL: "PayPal",
  BANK: "계좌이체",
  ONSITE: "현장 결제",
};

export async function submitDepositRequest(orderId: string, method: string) {
  if (config.paymentMode !== "manual" && !config.mockPayments)
    throw new BookingError("NOT_MANUAL", "송금 신청을 받지 않고 있어요.");
  const allowed = config.mockPayments ? ["TOSS_SEND", "KAKAOPAY_SEND", "PAYPAL", "BANK", "ONSITE"] : manualMethods();
  if (!allowed.includes(method as ManualMethod)) throw new BookingError("INVALID_METHOD", "선택할 수 없는 결제 수단이에요.");
  const sql = db();
  const id = await sql.begin(async (tx) => {
    const found = await findBy(tx, "order_id", orderId);
    if (!found) throw new BookingError("NOT_FOUND", "예약 정보를 찾을 수 없어요.", 404);
    await lockDate(tx, found.slot_date);
    const b = (await findBy(tx, "order_id", orderId, true))!;
    if (b.status === "awaiting_deposit") return b.id;
    if (b.status !== "holding" && b.status !== "expired") throw new BookingError("INVALID_STATE", "접수할 수 없는 예약이에요.", 409);
    if (!b.hold_expires_at || b.hold_expires_at.getTime() <= Date.now() || b.status === "expired") {
      const check = await canBook(tx, { date: b.slot_date, time: b.slot_time, dressId: b.dress_id, size: b.dress_size }, b.id);
      if (!check.ok) throw new BookingError(check.reason, MESSAGES[check.reason], 409);
    }
    // 송금 기한: 신청 후 N시간, 단 이용 시작 시각을 넘기지 않음. 현장결제는 이용 시작 시각까지 자리 유지
    const start = slotStartAt(b.slot_date, b.slot_time);
    const deadline =
      method === "ONSITE" ? start : new Date(Math.min(Date.now() + config.depositHours * 3_600_000, start.getTime()));
    const paypal = method === "PAYPAL";
    await tx`
      update bookings set status = 'awaiting_deposit', payment_method = ${method},
        hold_expires_at = ${deadline},
        amount_usd = ${paypal ? usdAmount(b.amount, b.amount_usd) : b.amount_usd},
        currency = ${paypal ? "USD" : "KRW"}
      where id = ${b.id}
    `;
    await logEvent(tx, b.id, "payment_requested", { method });
    return b.id;
  });
  const view = toView((await findBy(sql, "id", id))!);
  await mailDepositRequest(view);
  return view;
}

/** 관리자: 입금 확인 → 예약 확정 */
export async function confirmDeposit(bookingId: string) {
  const sql = db();
  await sql.begin(async (tx) => {
    const found = await findBy(tx, "id", bookingId);
    if (!found) throw new BookingError("NOT_FOUND", "예약을 찾을 수 없어요.", 404);
    await lockDate(tx, found.slot_date);
    const b = (await findBy(tx, "id", bookingId, true))!;
    if (b.status === "paid") return;
    if (b.status !== "awaiting_deposit" && b.status !== "expired")
      throw new BookingError("INVALID_STATE", "결제 대기 중인 예약이 아니에요.");
    if (!b.hold_expires_at || b.hold_expires_at.getTime() <= Date.now() || b.status === "expired") {
      const check = await canBook(tx, { date: b.slot_date, time: b.slot_time, dressId: b.dress_id, size: b.dress_size }, b.id);
      if (!check.ok) throw new BookingError(check.reason, `입금 기한이 지나 그 사이 자리가 찼어요. (${MESSAGES[check.reason]})`, 409);
    }
    await tx`update bookings set status = 'paid', paid_at = now(), payment_method = coalesce(payment_method, 'BANK') where id = ${b.id}`;
    await logEvent(tx, b.id, "deposit_confirmed", {});
  });
  const view = toView((await findBy(sql, "id", bookingId))!);
  const mailError = await mailConfirmed(view);
  if (mailError) await logEvent(sql, view.id, "mail_failed", { kind: "confirmed", error: mailError });
  return { booking: view, mailError };
}

/** 관리자: 지금 상태에 맞는 메일(확정·송금 안내·취소)을 손님에게 다시 보내요 */
export async function resendMail(bookingId: string) {
  const sql = db();
  const row = await findBy(sql, "id", bookingId);
  if (!row) throw new BookingError("NOT_FOUND", "예약을 찾을 수 없어요.", 404);
  const view = toView(row);
  let mailError: string | null;
  if (view.status === "paid") mailError = await mailConfirmed(view);
  else if (view.status === "awaiting_deposit") mailError = await mailDepositRequest(view);
  else if (view.status === "cancelled") mailError = await mailCancelled(view);
  else throw new BookingError("INVALID_STATE", "이 상태에서는 보낼 메일이 없어요.");
  await logEvent(sql, view.id, mailError ? "mail_failed" : "mail_resent", mailError ? { error: mailError } : {});
  return { booking: view, mailError };
}

// ───────────────────────── 취소 · 환불 ─────────────────────────

/** 환불 규정에 따른 환불 금액 (고객이 직접 취소할 때) */
export function refundQuote(b: { slotDate: string; amount: number; status: string }, now = new Date()) {
  if (b.status !== "paid") return { percent: 0, amount: 0, daysBefore: daysUntil(b.slotDate, now) };
  const daysBefore = daysUntil(b.slotDate, now);
  const rule = config.refundRules.find((r) => daysBefore >= r.daysBefore);
  const percent = rule?.percent ?? 0;
  return { percent, amount: Math.floor((b.amount * percent) / 100), daysBefore };
}

export async function cancelBooking(
  bookingId: string,
  opts: { by: "customer" | "admin"; refundAmount?: number; reason?: string },
) {
  const sql = db();
  const before = await findBy(sql, "id", bookingId);
  if (!before) throw new BookingError("NOT_FOUND", "예약을 찾을 수 없어요.", 404);

  // 상태 잠그고 환불 금액 확정
  const plan = await sql.begin(async (tx) => {
    const b = (await findBy(tx, "id", bookingId, true))!;
    if (b.status === "cancelled") throw new BookingError("ALREADY_CANCELLED", "이미 취소된 예약이에요.", 409);
    if (b.status === "expired") throw new BookingError("EXPIRED", "이미 만료된 예약이에요.", 409);
    const v = toView(b);
    if (opts.by === "customer" && isSlotClosedByTime(b.slot_date, b.slot_time))
      throw new BookingError("TOO_LATE", "이용 시간이 지나 취소할 수 없어요. 매장으로 문의해 주세요.");

    let refund = 0;
    if (b.status === "paid") {
      refund = opts.by === "admin" && opts.refundAmount !== undefined ? opts.refundAmount : refundQuote(v).amount;
      if (!Number.isInteger(refund) || refund < 0 || refund > b.amount)
        throw new BookingError("INVALID_REFUND", "환불 금액을 확인해 주세요.");
    }
    // 중복 클릭 방지: 먼저 취소 상태로 바꿔두고, 결제사 취소가 실패하면 되돌림
    await tx`
      update bookings set status = 'cancelled', cancelled_at = now(), cancelled_by = ${opts.by},
        refund_amount = ${refund}, refund_reason = ${opts.reason ?? null}
      where id = ${b.id}
    `;
    return { b, refund };
  });

  const { b, refund } = plan;
  const online = b.payment_mode !== "manual";
  if (b.status === "paid" && refund > 0 && online && b.payment_key) {
    try {
      let amount: number | undefined;
      if (refund < b.amount) {
        // 부분 환불: 결제 통화 최소 단위로 (KRW: 원, USD: 센트)
        amount = b.currency === "USD" && b.amount_usd ? Math.round(Number(b.amount_usd) * 100 * (refund / b.amount)) : refund;
      }
      if (b.payment_mode !== "mock") {
        await cancelPayment(b.payment_key, {
          reason: opts.reason || (opts.by === "customer" ? "고객 요청 취소" : "관리자 취소"),
          amount,
          requester: opts.by === "customer" ? "CUSTOMER" : "ADMIN",
        });
      }
      await logEvent(sql, b.id, "refunded", { refund, amount, by: opts.by });
    } catch (e) {
      // 결제사 환불 실패 → 원래 상태로 되돌리고 알려줌
      await sql`
        update bookings set status = 'paid', cancelled_at = null, cancelled_by = null, refund_amount = 0, refund_reason = null
        where id = ${b.id}
      `;
      await logEvent(sql, b.id, "refund_failed", { code: (e as PaymentApiError).code, message: (e as Error).message });
      throw new BookingError("REFUND_FAILED", `환불 처리에 실패했어요: ${(e as Error).message}`, 502);
    }
  } else {
    await logEvent(sql, b.id, "cancelled", { refund, by: opts.by, manual: !online });
  }

  const view = toView((await findBy(sql, "id", b.id))!);
  if (b.status === "paid" || b.status === "awaiting_deposit") await mailCancelled(view);
  return view;
}

/** 관리자: 무통장입금 환불 송금 완료 표시 */
export async function markRefundDone(bookingId: string) {
  const sql = db();
  const updated = await sql`
    update bookings set refund_done_at = now()
    where id = ${bookingId} and status = 'cancelled' and refund_amount > 0 and refund_done_at is null
    returning id
  `;
  if (updated.length === 0) return { booking: null, mailError: null };
  await logEvent(sql, bookingId, "refund_done", {});
  const view = toView((await findBy(sql, "id", bookingId))!);
  const mailError = await mailRefundDone(view);
  if (mailError) await logEvent(sql, bookingId, "mail_failed", { kind: "refund_done", error: mailError });
  return { booking: view, mailError };
}

export async function setMemo(bookingId: string, memo: string) {
  await db()`update bookings set admin_memo = ${memo.slice(0, 500)} where id = ${bookingId}`;
}

// ───────────────────────── 관리자 조회 ─────────────────────────

export async function listBookings(opts: { date?: string; includeInactive?: boolean } = {}) {
  const sql = db();
  const rows = await sql<Row[]>`
    ${SELECT(sql)}
    where true
      ${opts.date ? sql`and b.slot_date = ${opts.date}` : sql``}
      ${opts.includeInactive ? sql`` : sql`and (b.status in ('paid', 'cancelled', 'awaiting_deposit') or (b.status = 'holding' and b.hold_expires_at > now()))`}
    order by b.slot_date, b.slot_time, b.created_at
  `;
  return rows.map(toView);
}

export function orderName(dressName: string, date: string, time: string) {
  return `pic.dress Dress Tour ${shortDate(date)} ${time} (${dressName})`;
}
