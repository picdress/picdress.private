import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { daySlots } from "@/lib/availability";
import { listBookings, MANUAL_LABEL, type BookingView } from "@/lib/bookings";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { formatKst, longDate, openDates, shortDate, todayKst, won } from "@/lib/time";
import AdminNav from "./AdminNav";
import ConfirmButton from "./ConfirmButton";
import Flash from "./Flash";
import styles from "./admin.module.css";

export const metadata: Metadata = { title: "예약 현황 — pic.dress 관리자", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; tone: string }> = {
  paid: { label: "확정", tone: "ok" },
  awaiting_deposit: { label: "결제대기", tone: "warn" },
  holding: { label: "결제중", tone: "muted" },
  cancelled: { label: "취소", tone: "bad" },
  expired: { label: "만료", tone: "muted" },
};

function phoneFmt(p: string) {
  if (p.startsWith("+")) return p;
  return p.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3");
}

const LANG_BADGE: Record<string, string> = { ko: "", en: "EN", zh: "中文" };

function BookingCard({ b, back }: { b: BookingView; back: string }) {
  const st = STATUS[b.status] ?? { label: b.status, tone: "muted" };
  const needsRefundTransfer = b.status === "cancelled" && b.paymentMode === "manual" && b.refundAmount > 0 && !b.refundDoneAt;
  return (
    <article className={styles.booking} data-status={b.status}>
      <header>
        <span className={styles.badge} data-tone={st.tone}>
          {st.label}
        </span>
        <b>{b.customerName}</b>
        <a href={`tel:${b.phone}`}>{phoneFmt(b.phone)}</a>
        {LANG_BADGE[b.locale] && <span className={styles.badge}>{LANG_BADGE[b.locale]}</span>}
      </header>
      <p>
        {b.dressName} · <b>{b.dressSize}</b> · {b.currency === "USD" && b.amountUsd ? `$${b.amountUsd}` : won(b.amount)}
        {b.paymentMethod ? ` · ${MANUAL_LABEL[b.paymentMethod] ?? b.paymentMethod}` : ""}
      </p>
      <p className={styles.sub}>
        {b.email} · {b.orderId}
        {b.paidAt && ` · 결제 ${formatKst(b.paidAt)}`}
        {b.status === "awaiting_deposit" && b.holdExpiresAt && (b.paymentMethod === "ONSITE" ? " · 현장 결제 예정" : ` · 송금 기한 ${formatKst(b.holdExpiresAt)}`)}
        {b.status === "holding" && b.holdExpiresAt && ` · ${formatKst(b.holdExpiresAt)}까지 결제 진행`}
      </p>
      {b.status === "cancelled" && (
        <p className={styles.sub}>
          취소 {formatKst(b.cancelledAt)} ({b.cancelledBy === "customer" ? "고객" : "관리자"}) · 환불 {b.refundUsd ? `$${b.refundUsd}` : won(b.refundAmount)}
          {b.refundReason ? ` · ${b.refundReason}` : ""}
          {b.paymentMode === "manual" && b.refundAmount > 0 && (b.refundDoneAt ? " · 송금 완료" : " · 송금 필요")}
        </p>
      )}

      <div className={styles.actions}>
        {b.status === "awaiting_deposit" && (
          <form action={`/api/admin/bookings/${b.id}`} method="post">
            <input type="hidden" name="action" value="confirm-deposit" />
            <input type="hidden" name="back" value={back} />
            <ConfirmButton
              className={styles.btnPrimary}
              message={
                b.paymentMethod === "ONSITE"
                  ? `${b.customerName}님에게 현장에서 ${won(b.amount)}을 받았나요? 예약이 확정 처리돼요.`
                  : `${b.customerName}님이 ${MANUAL_LABEL[b.paymentMethod ?? ""] ?? "송금"}으로 ${b.currency === "USD" && b.amountUsd ? `$${b.amountUsd}` : won(b.amount)}을 보낸 걸 확인했나요? 예약이 확정되고 메일이 나가요.`
              }
            >
              {b.paymentMethod === "ONSITE" ? "현장 결제 완료" : "결제 확인"}
            </ConfirmButton>
          </form>
        )}
        {needsRefundTransfer && (
          <form action={`/api/admin/bookings/${b.id}`} method="post">
            <input type="hidden" name="action" value="refund-done" />
            <input type="hidden" name="back" value={back} />
            <ConfirmButton className={styles.btnPrimary} message={`${won(b.refundAmount)}을 고객 계좌로 보냈나요?`}>
              환불 송금 완료
            </ConfirmButton>
          </form>
        )}
        {(b.status === "paid" || b.status === "awaiting_deposit" || b.status === "holding") && (
          <details className={styles.more}>
            <summary>{b.status === "paid" ? "취소·환불" : "취소"}</summary>
            <form action={`/api/admin/bookings/${b.id}`} method="post" className={styles.cancelForm}>
              <input type="hidden" name="action" value="cancel" />
              <input type="hidden" name="back" value={back} />
              {b.status === "paid" && (
                <label>
                  환불 금액(원)
                  <input name="refundAmount" inputMode="numeric" defaultValue={b.amount} />
                </label>
              )}
              <label>
                사유
                <input name="reason" placeholder="예: 고객 요청, 우천" />
              </label>
              <ConfirmButton
                className={styles.btnDanger}
                message={
                  b.status === "paid"
                    ? b.paymentMode === "manual"
                      ? "예약을 취소할까요? 환불 {amount}원은 직접 송금해야 해요."
                      : "예약을 취소하고 {amount}원을 환불할까요? 되돌릴 수 없어요."
                    : "예약을 취소할까요?"
                }
              >
                {b.status === "paid" ? "취소하고 환불" : "취소"}
              </ConfirmButton>
            </form>
          </details>
        )}
        {(b.status === "paid" || b.status === "awaiting_deposit" || b.status === "cancelled") && (
          <form action={`/api/admin/bookings/${b.id}`} method="post">
            <input type="hidden" name="action" value="resend-mail" />
            <input type="hidden" name="back" value={back} />
            <button type="submit" className={styles.btn}>
              메일 다시 보내기
            </button>
          </form>
        )}
        <details className={styles.more}>
          <summary>메모{b.adminMemo ? " ✎" : ""}</summary>
          <form action={`/api/admin/bookings/${b.id}`} method="post" className={styles.cancelForm}>
            <input type="hidden" name="action" value="memo" />
            <input type="hidden" name="back" value={back} />
            <textarea name="memo" defaultValue={b.adminMemo ?? ""} rows={2} maxLength={500} />
            <button type="submit" className={styles.btn}>
              저장
            </button>
          </form>
        </details>
      </div>
      {b.adminMemo && <p className={styles.memo}>메모: {b.adminMemo}</p>}
    </article>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; msg?: string; err?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const dates = openDates();
  const today = todayKst();
  const date = sp.date && dates.includes(sp.date) ? sp.date : dates.includes(today) ? today : dates[0];
  const back = `/admin?date=${date}`;

  const [all, slots] = await Promise.all([listBookings(), daySlots(db(), date)]);
  const paid = all.filter((b) => b.status === "paid");
  const revenue = paid.reduce((n, b) => n + b.amount, 0) + all.filter((b) => b.status === "cancelled").reduce((n, b) => n + (b.paidAt ? b.amount - b.refundAmount : 0), 0);
  const waiting = all.filter((b) => b.status === "awaiting_deposit");
  const refundTodo = all.filter((b) => b.status === "cancelled" && b.paymentMode === "manual" && b.refundAmount > 0 && !b.refundDoneAt);
  const dayBookings = all.filter((b) => b.slotDate === date);

  return (
    <main className={styles.main} data-admin>
      <AdminNav active="bookings" />
      <Flash msg={sp.msg} err={sp.err} />

      <section className={styles.stats}>
        <div>
          <span>확정 예약</span>
          <b>{paid.length}건</b>
        </div>
        <div>
          <span>순매출</span>
          <b>{won(revenue)}</b>
        </div>
        <div>
          <span>결제 대기</span>
          <b>{waiting.length}건</b>
        </div>
        <div>
          <span>환불 송금 필요</span>
          <b>{refundTodo.length}건</b>
        </div>
      </section>

      {(waiting.length > 0 || refundTodo.length > 0) && (
        <section className={styles.attention}>
          <h2 className="title">처리할 일</h2>
          {[...waiting, ...refundTodo].map((b) => (
            <div key={b.id}>
              <p className={styles.when}>
                {shortDate(b.slotDate)} {b.slotTime}
              </p>
              <BookingCard b={b} back={back} />
            </div>
          ))}
        </section>
      )}

      <div className={styles.dateTabs} role="tablist">
        {dates.map((d) => {
          const n = all.filter((b) => b.slotDate === d && b.status === "paid").length;
          return (
            <Link key={d} href={`/admin?date=${d}`} role="tab" aria-selected={d === date} className={styles.dateTab}>
              <span>{shortDate(d)}</span>
              <small>{n}건</small>
            </Link>
          );
        })}
      </div>

      <section>
        <div className={styles.dayHead}>
          <h2 className="title">{longDate(date)}</h2>
          <form action="/api/admin/slots" method="post" className={styles.inline}>
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="time" value="ALL" />
            <button name="capacity" value="0" className={styles.btn}>
              하루 전체 마감
            </button>
            <button name="capacity" value="default" className={styles.btn}>
              기본({config.slotCapacity}명)으로
            </button>
          </form>
        </div>

        {slots.map((s) => {
          const list = dayBookings.filter((b) => b.slotTime === s.time);
          const active = list.filter((b) => b.status === "paid" || b.status === "awaiting_deposit" || b.status === "holding");
          return (
            <div key={s.time} className={styles.slot} data-closed={s.capacity === 0}>
              <div className={styles.slotHead}>
                <b className={styles.slotTime}>{s.time}</b>
                <span>
                  {active.length} / {s.capacity}명 {s.capacity === 0 && <em>(마감)</em>}
                </span>
                <form action="/api/admin/slots" method="post" className={styles.inline}>
                  <input type="hidden" name="date" value={date} />
                  <input type="hidden" name="time" value={s.time} />
                  {s.capacity === 0 ? (
                    <button name="capacity" value="default" className={styles.btn}>
                      다시 열기
                    </button>
                  ) : (
                    <button name="capacity" value="0" className={styles.btn}>
                      마감
                    </button>
                  )}
                  <select name="capacity" defaultValue="" aria-label="정원 변경" className={styles.select}>
                    <option value="" disabled>
                      정원
                    </option>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n}명
                      </option>
                    ))}
                  </select>
                  <button type="submit" className={styles.btn}>
                    변경
                  </button>
                </form>
              </div>
              {list.map((b) => (
                <BookingCard key={b.id} b={b} back={back} />
              ))}
            </div>
          );
        })}
      </section>
    </main>
  );
}
