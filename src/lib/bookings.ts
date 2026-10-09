import { randomBytes } from "node:crypto";
import { canBook } from "./availability";
import { config } from "./config";
import { db, type Tx } from "./db";
import { mailCancelled, mailConfirmed, mailDepositRequest } from "./mail";
import { daysUntil, formatKst, isSlotClosedByTime, isValidDate, isValidTime, shortDate } from "./time";
import { describeMethod, tossCancel, tossConfirm, tossGetPayment, TossError } from "./toss";

export class BookingError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

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
  dress_image: string;
  amount: number;
  amount_usd: string | null;
  currency: string;
  status: "holding" | "awaiting_deposit" | "paid" | "cancelled" | "expired";
  payment_mode: string;
  payment_method: string | null;
  payment_key: string | null;
  hold_expires_at: Date | null;
  paid_at: Date | null;
  cancelled_at: Date | null;
  cancelled_by: string | null;
  refund_amount: number;
  refund_reason: string | null;
  refund_done_at: Date | null;
  admin_memo: string | null;
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
    dressImage: r.dress_image,
    dressSize: r.dress_size,
    amount: r.amount,
    amountUsd: r.amount_usd,
    currency: r.currency,
    status: status as Row["status"],
    paymentMode: r.payment_mode,
    paymentMethod: r.payment_method,
    hasPaymentKey: Boolean(r.payment_key),
    holdExpiresAt: r.hold_expires_at?.toISOString() ?? null,
    paidAt: r.paid_at?.toISOString() ?? null,
    cancelledAt: r.cancelled_at?.toISOString() ?? null,
    cancelledBy: r.cancelled_by,
    refundAmount: r.refund_amount,
    refundReason: r.refund_reason,
    refundDoneAt: r.refund_done_at?.toISOString() ?? null,
    adminMemo: r.admin_memo,
    createdAt: r.created_at.toISOString(),
  };
}

const SELECT = (tx: Tx) => tx`
  select b.*, d.name as dress_name, d.image as dress_image
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
};

export function normalizePhone(p: string) {
  return p.replace(/\D/g, "");
}

export function validateCustomer(input: { name?: string; phone?: string; email?: string }) {
  const name = (input.name ?? "").trim();
  const phone = normalizePhone(input.phone ?? "");
  const email = (input.email ?? "").trim();
  if (name.length < 1 || name.length > 30) throw new BookingError("INVALID_NAME", "성함을 확인해 주세요.");
  if (!/^01\d{8,9}$/.test(phone)) throw new BookingError("INVALID_PHONE", "휴대폰 번호를 확인해 주세요.");
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

  const sql = db();
  const id = await sql.begin(async (tx) => {
    await lockDate(tx, input.date);

    const [dress] = await tx<{ price: number; price_usd: string | null; active: boolean }[]>`
      select price, price_usd, active from dresses where id = ${input.dressId}
    `;
    if (!dress || !dress.active) throw new BookingError("INVALID_DRESS", "선택한 드레스를 찾을 수 없어요.");
    if (dress.price <= 0) throw new BookingError("NO_PRICE", "드레스 가격이 아직 설정되지 않았어요.");

    // 같은 번호로 잡아둔 이전 자리는 풀어줌 (뒤로 가서 다시 고르는 경우)
    await tx`
      update bookings set status = 'expired'
      where phone = ${c.phone} and status = 'holding'
    `;

    // 한 사람이 자리를 너무 많이 잡아두지 못하게
    const [{ n }] = await tx<{ n: number }[]>`
      select count(*)::int as n from bookings
      where client_ip = ${clientIp} and status = 'holding' and hold_expires_at > now()
    `;
    if (n >= 3) throw new BookingError("TOO_MANY_HOLDS", "잠시 후 다시 시도해 주세요.", 429);

    const check = await canBook(tx, input);
    if (!check.ok) throw new BookingError(check.reason, MESSAGES[check.reason], 409);

    const orderId = `PD${input.date.replace(/-/g, "").slice(2)}${token(9).replace(/[^A-Za-z0-9]/g, "x")}`;
    const [row] = await tx<{ id: string }[]>`
      insert into bookings (
        order_id, manage_token, customer_name, phone, email,
        slot_date, slot_time, dress_id, dress_size, amount, amount_usd,
        status, payment_mode, hold_expires_at, client_ip
      ) values (
        ${orderId}, ${token(24)}, ${c.name}, ${c.phone}, ${c.email},
        ${input.date}, ${input.time}, ${input.dressId}, ${input.size}, ${dress.price}, ${dress.price_usd},
        'holding', ${config.paymentMode === "manual" ? "manual" : config.mockPayments ? "mock" : "toss"},
        now() + ${`${config.holdMinutes} minutes`}::interval, ${clientIp}
      ) returning id
    `;
    await logEvent(tx, row.id, "hold_created", { ip: clientIp });
    return row.id;
  });

  const r = await findBy(sql, "id", id);
  return toView(r!);
}

/** 결제를 그만두고 나갈 때 자리 풀기 */
export async function releaseHold(orderId: string) {
  await db()`update bookings set status = 'expired' where order_id = ${orderId} and status = 'holding'`;
}

// ───────────────────────── 토스페이먼츠 결제 승인 ─────────────────────────

export async function confirmOnlinePayment(params: { paymentKey: string; orderId: string; amount: string }) {
  const sql = db();
  const amountNum = Number(params.amount);

  // 1) 검증 + 자리 다시 확인 (락 안에서)
  const pre = await sql.begin(async (tx) => {
    const found = await findBy(tx, "order_id", params.orderId);
    if (!found) throw new BookingError("NOT_FOUND", "예약 정보를 찾을 수 없어요.", 404);
    await lockDate(tx, found.slot_date);
    const b = (await findBy(tx, "order_id", params.orderId, true))!;

    if (b.status === "paid") {
      if (b.payment_key === params.paymentKey) return { done: true as const, b };
      throw new BookingError("ALREADY_PAID", "이미 결제된 예약이에요.", 409);
    }
    if (b.status !== "holding" && b.status !== "expired")
      throw new BookingError("INVALID_STATE", "결제할 수 없는 예약 상태예요.", 409);

    let currency: "KRW" | "USD";
    if (amountNum === b.amount) currency = "KRW";
    else if (b.amount_usd && Math.abs(amountNum - Number(b.amount_usd)) < 0.001) currency = "USD";
    else throw new BookingError("AMOUNT_MISMATCH", "결제 금액이 예약 금액과 달라요.", 400);

    // 결제창에서 오래 머물러 홀드가 끝났으면, 아직 자리가 있는지 다시 확인
    if (!b.hold_expires_at || b.hold_expires_at.getTime() <= Date.now() || b.status === "expired") {
      const check = await canBook(
        tx,
        { date: b.slot_date, time: b.slot_time, dressId: b.dress_id, size: b.dress_size },
        b.id,
      );
      if (!check.ok) {
        await tx`update bookings set status = 'expired' where id = ${b.id}`;
        await logEvent(tx, b.id, "confirm_rejected", { reason: check.reason });
        throw new BookingError(check.reason, `결제 시간이 지나는 동안 ${MESSAGES[check.reason]}`, 409);
      }
    }
    // 승인 처리하는 동안 자리 유지
    await tx`
      update bookings set status = 'holding', hold_expires_at = greatest(hold_expires_at, now() + interval '5 minutes')
      where id = ${b.id}
    `;
    return { done: false as const, b, currency };
  });

  if (pre.done) return toView(pre.b);

  // 2) 토스페이먼츠 승인 요청 (이걸 해야 실제로 돈이 빠져나가요)
  let payment;
  try {
    payment = await tossConfirm(params.paymentKey, params.orderId, amountNum);
  } catch (e) {
    if (e instanceof TossError && e.code === "ALREADY_PROCESSED_PAYMENT") {
      payment = await tossGetPayment(params.paymentKey);
    } else {
      await logEvent(sql, pre.b.id, "confirm_failed", { code: (e as TossError).code, message: (e as Error).message });
      throw e;
    }
  }
  if (payment.status !== "DONE") {
    await logEvent(sql, pre.b.id, "confirm_not_done", payment);
    throw new BookingError("PAYMENT_NOT_DONE", "결제가 완료되지 않았어요.", 400);
  }

  // 3) 예약 확정
  await sql`
    update bookings set
      status = 'paid', paid_at = now(), payment_key = ${params.paymentKey},
      payment_method = ${describeMethod(payment)}, currency = ${pre.currency}
    where id = ${pre.b.id}
  `;
  await logEvent(sql, pre.b.id, "paid", { method: payment.method, provider: payment.easyPay?.provider, total: payment.totalAmount, currency: payment.currency });

  const view = toView((await findBy(sql, "id", pre.b.id))!);
  await mailConfirmed(view);
  return view;
}

// ───────────────────────── 무통장입금 ─────────────────────────

export async function submitDepositRequest(orderId: string) {
  if (config.paymentMode !== "manual") throw new BookingError("NOT_MANUAL", "계좌이체 접수를 받지 않고 있어요.");
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
    await tx`
      update bookings set status = 'awaiting_deposit', payment_method = 'BANK',
        hold_expires_at = now() + ${`${config.depositHours} hours`}::interval
      where id = ${b.id}
    `;
    await logEvent(tx, b.id, "deposit_requested", {});
    return b.id;
  });
  const view = toView((await findBy(sql, "id", id))!);
  await mailDepositRequest(view, formatKst(view.holdExpiresAt));
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
      throw new BookingError("INVALID_STATE", "입금 대기 중인 예약이 아니에요.");
    if (!b.hold_expires_at || b.hold_expires_at.getTime() <= Date.now() || b.status === "expired") {
      // 입금 기한이 지났으면 그 사이 자리가 찼는지 확인
      const check = await canBook(tx, { date: b.slot_date, time: b.slot_time, dressId: b.dress_id, size: b.dress_size }, b.id);
      if (!check.ok) throw new BookingError(check.reason, `입금 기한이 지나 그 사이 자리가 찼어요. (${MESSAGES[check.reason]})`, 409);
    }
    await tx`update bookings set status = 'paid', paid_at = now(), payment_method = 'BANK' where id = ${b.id}`;
    await logEvent(tx, b.id, "deposit_confirmed", {});
  });
  const view = toView((await findBy(sql, "id", bookingId))!);
  await mailConfirmed(view);
  return view;
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
    // 중복 클릭 방지: 먼저 취소 상태로 바꿔두고, PG 취소가 실패하면 되돌림
    await tx`
      update bookings set status = 'cancelled', cancelled_at = now(), cancelled_by = ${opts.by},
        refund_amount = ${refund}, refund_reason = ${opts.reason ?? null}
      where id = ${b.id}
    `;
    return { b, refund };
  });

  const { b, refund } = plan;
  if (b.status === "paid" && refund > 0 && b.payment_mode !== "manual" && b.payment_key) {
    try {
      const partial = refund < b.amount;
      let cancelAmount: number | undefined;
      if (partial) {
        cancelAmount =
          b.currency === "USD" && b.amount_usd ? Math.round(Number(b.amount_usd) * (refund / b.amount) * 100) / 100 : refund;
      }
      await tossCancel(b.payment_key, opts.reason || "고객 요청 취소", cancelAmount, `cancel-${b.id}`);
      await logEvent(sql, b.id, "refunded", { refund, cancelAmount, by: opts.by });
    } catch (e) {
      // PG 환불 실패 → 원래 상태로 되돌리고 알려줌
      await sql`
        update bookings set status = 'paid', cancelled_at = null, cancelled_by = null, refund_amount = 0, refund_reason = null
        where id = ${b.id}
      `;
      await logEvent(sql, b.id, "refund_failed", { code: (e as TossError).code, message: (e as Error).message });
      throw new BookingError("REFUND_FAILED", `환불 처리에 실패했어요: ${(e as Error).message}`, 502);
    }
  } else {
    await logEvent(sql, b.id, "cancelled", { refund, by: opts.by, manual: b.payment_mode === "manual" });
  }

  const view = toView((await findBy(sql, "id", b.id))!);
  if (b.status === "paid" || b.status === "awaiting_deposit") await mailCancelled(view);
  return view;
}

/** 관리자: 무통장입금 환불 송금 완료 표시 */
export async function markRefundDone(bookingId: string) {
  await db()`update bookings set refund_done_at = now() where id = ${bookingId} and status = 'cancelled' and refund_amount > 0`;
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
  return `pic.dress 드레스 투어 ${shortDate(date)} ${time} (${dressName})`;
}
