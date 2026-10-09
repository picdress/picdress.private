import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import btn from "@/components/Button.module.css";
import { getBookingByToken, refundQuote } from "@/lib/bookings";
import { config } from "@/lib/config";
import { formatKst, isSlotClosedByTime, longDate, shortDate, won } from "@/lib/time";
import CancelForm from "./CancelForm";
import ClearReservation from "./ClearReservation";
import styles from "./booking.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "예약 확인 — pic.dress", robots: { index: false } };

const STATUS: Record<string, string> = {
  paid: "예약 확정",
  awaiting_deposit: "입금 대기",
  holding: "결제 진행 중",
  cancelled: "예약 취소",
  expired: "기한 만료",
};

// 결제 완료 화면 + 예약 확인/취소 화면 (메일의 링크로도 들어와요)
export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string; cancelled?: string; error?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const b = await getBookingByToken(token);
  if (!b) notFound();

  const quote = refundQuote(b);
  const canCancel = (b.status === "paid" || b.status === "awaiting_deposit") && !isSlotClosedByTime(b.slotDate, b.slotTime);
  const justDone = sp.done === "1";

  return (
    <>
      <Header />
      {justDone && <ClearReservation />}
      <main className={btn.page}>
        <section className={styles.hero}>
          {b.status === "paid" && (
            <>
              <p className={`title ${styles.big}`}>{justDone ? "예약이 확정되었어요" : "예약 확정"}</p>
              <p>확인 메일을 {b.email}(으)로 보내드렸어요.</p>
            </>
          )}
          {b.status === "awaiting_deposit" && (
            <>
              <p className={`title ${styles.big}`}>입금하시면 예약이 확정돼요</p>
              <div className={styles.bank}>
                <p>
                  <b>입금 계좌</b> {config.bankAccount || "준비 중"}
                </p>
                <p>
                  <b>입금자명</b> {b.customerName}
                </p>
                <p>
                  <b>입금 기한</b> {formatKst(b.holdExpiresAt)}까지
                </p>
              </div>
              <p className={styles.small}>기한 안에 입금이 확인되지 않으면 자동으로 취소돼요.</p>
            </>
          )}
          {b.status === "cancelled" && (
            <>
              <p className={`title ${styles.big}`}>취소된 예약이에요</p>
              {b.refundAmount > 0 && (
                <p>
                  환불 금액 {won(b.refundAmount)}
                  {b.paymentMode === "manual"
                    ? b.refundDoneAt
                      ? " · 환불 완료"
                      : " · 확인 후 계좌로 보내드려요"
                    : " · 결제 수단으로 환불돼요 (영업일 3~7일)"}
                </p>
              )}
            </>
          )}
          {(b.status === "expired" || b.status === "holding") && (
            <>
              <p className={`title ${styles.big}`}>완료되지 않은 예약이에요</p>
              <p>결제/입금 기한이 지났어요. 다시 예약해 주세요.</p>
            </>
          )}
          {sp.cancelled === "1" && <p className={styles.ok}>취소가 완료됐어요.</p>}
          {sp.error && <p className={btn.error}>{sp.error}</p>}
        </section>

        <section className={styles.card}>
          <div className={styles.row}>
            <h2 className="title">예약 정보</h2>
            <div className={styles.chips}>
              <span className={styles.chip}>{shortDate(b.slotDate)}</span>
              <span className={styles.chip}>{b.slotTime}</span>
            </div>
          </div>
          <div className={styles.row}>
            <h2 className="title">드레스</h2>
            <div className={styles.chips}>
              <span className={styles.chip}>{b.dressName}</span>
              <span className={styles.chip}>{b.dressSize}</span>
            </div>
          </div>
          <hr className={styles.line} />
          <dl className={styles.dl}>
            <dt>상태</dt>
            <dd>{STATUS[b.status] ?? b.status}</dd>
            <dt>일정</dt>
            <dd>
              {longDate(b.slotDate)} {b.slotTime} (2시간)
            </dd>
            <dt>예약자</dt>
            <dd>
              {b.customerName} · {b.phone.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3")}
            </dd>
            <dt>금액</dt>
            <dd>
              {b.currency === "USD" && b.amountUsd ? `$${b.amountUsd}` : won(b.amount)}
              {b.paymentMethod && b.paymentMethod !== "BANK" ? ` · ${b.paymentMethod}` : ""}
            </dd>
            <dt>예약번호</dt>
            <dd className={styles.mono}>{b.orderId}</dd>
          </dl>
        </section>

        {b.status === "paid" && (
          <section className={styles.notice}>
            <p className="title">방문 안내</p>
            <ul>
              <li>예약 시간 5분 전까지 {config.business.address}로 와주세요.</li>
              <li>제휴 음식점·카페 쿠폰 3장은 현장에서 드려요.</li>
              <li>문의: {config.business.phone} · 인스타그램 @pic.dress</li>
            </ul>
          </section>
        )}

        {canCancel && (
          <section className={styles.cancel}>
            <CancelForm
              action={`/api/booking/${b.manageToken}/cancel`}
              summary={
                b.status === "paid"
                  ? quote.amount > 0
                    ? `지금 취소하면 ${won(quote.amount)} (${quote.percent}%) 환불돼요.`
                    : "지금 취소하면 환불되지 않아요. (취소·환불 규정 참고)"
                  : "입금 전이라 바로 취소돼요."
              }
            />
            <Link href="/policy#refund" className={styles.policyLink}>
              취소·환불 규정 보기
            </Link>
          </section>
        )}

        <div className={btn.bottom} style={{ paddingTop: 28, paddingBottom: 60 }}>
          <Link href="/" className={btn.primary}>
            홈으로
          </Link>
        </div>
      </main>
    </>
  );
}
