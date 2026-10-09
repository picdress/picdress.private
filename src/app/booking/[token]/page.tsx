import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import btn from "@/components/Button.module.css";
import { formatPhone, getBookingByToken, refundQuote } from "@/lib/bookings";
import { config } from "@/lib/config";
import { formatKst, isSlotClosedByTime } from "@/lib/time";
import { dressName, errorText, fmt, longDate, money, shortDate, usd } from "@/i18n";
import { getI18n } from "@/i18n/server";
import CancelForm from "./CancelForm";
import ClearReservation from "./ClearReservation";
import styles from "./booking.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "pic.dress", robots: { index: false } };

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
  const { t, locale } = await getI18n();
  const tb = t.booking;

  const quote = refundQuote(b);
  const canCancel = (b.status === "paid" || b.status === "awaiting_deposit") && !isSlotClosedByTime(b.slotDate, b.slotTime);
  const justDone = sp.done === "1";
  const name = dressName({ name: b.dressName, nameEn: b.dressNameEn, nameZh: b.dressNameZh }, locale);
  const shopPhone = locale === "ko" ? config.business.phone : `+82 ${config.business.phone.replace(/^0/, "")}`;
  const address = t.footer.address.replace(/^[^:：]+[:：]\s*/, "");

  return (
    <>
      <Header />
      {justDone && <ClearReservation />}
      <main className={btn.page}>
        <section className={styles.hero}>
          {b.status === "paid" && (
            <>
              <p className={`title ${styles.big}`}>{justDone ? tb.confirmedNow : tb.confirmed}</p>
              <p>{fmt(tb.mailSent, { email: b.email })}</p>
            </>
          )}
          {b.status === "awaiting_deposit" && (
            <>
              <p className={`title ${styles.big}`}>{tb.awaitingTitle}</p>
              <div className={styles.bank}>
                <p>
                  <b>{t.payment.bankAccount}</b> {config.bankAccount || t.payment.preparing}
                </p>
                <p>
                  <b>{t.payment.depositor}</b> {b.customerName}
                </p>
                <p>
                  <b>{tb.deadline}</b> {fmt(tb.deadlineValue, { time: formatKst(b.holdExpiresAt) })}
                </p>
              </div>
              <p className={styles.small}>{tb.awaitingNote}</p>
            </>
          )}
          {b.status === "cancelled" && (
            <>
              <p className={`title ${styles.big}`}>{tb.cancelledTitle}</p>
              {b.refundAmount > 0 && (
                <p>
                  {fmt(tb.refundAmount, { amount: money(b.refundAmount, locale) })}
                  {b.paymentMode === "manual" ? (b.refundDoneAt ? tb.refundManualDone : tb.refundManualPending) : tb.refundOnline}
                </p>
              )}
            </>
          )}
          {(b.status === "expired" || b.status === "holding") && (
            <>
              <p className={`title ${styles.big}`}>{tb.incompleteTitle}</p>
              <p>{tb.incompleteBody}</p>
            </>
          )}
          {sp.cancelled === "1" && <p className={styles.ok}>{tb.cancelledOk}</p>}
          {sp.error && <p className={btn.error}>{errorText(t, sp.error)}</p>}
        </section>

        <section className={styles.card}>
          <div className={styles.row}>
            <h2 className="title">{t.payment.booking}</h2>
            <div className={styles.chips}>
              <span className={styles.chip}>{shortDate(b.slotDate)}</span>
              <span className={styles.chip}>{b.slotTime}</span>
            </div>
          </div>
          <div className={styles.row}>
            <h2 className="title">{t.payment.dress}</h2>
            <div className={styles.chips}>
              <span className={styles.chip}>{name}</span>
              <span className={styles.chip}>{b.dressSize}</span>
            </div>
          </div>
          <hr className={styles.line} />
          <dl className={styles.dl}>
            <dt>{tb.status}</dt>
            <dd>{tb.statusLabel[b.status] ?? b.status}</dd>
            <dt>{tb.schedule}</dt>
            <dd>{fmt(tb.scheduleValue, { date: longDate(b.slotDate, locale), time: b.slotTime })}</dd>
            <dt>{tb.customer}</dt>
            <dd>
              {b.customerName} · {formatPhone(b.phone)}
            </dd>
            <dt>{tb.amount}</dt>
            <dd>
              {b.currency === "USD" && b.amountUsd ? usd(b.amountUsd) : money(b.amount, locale)}
              {b.paymentMethod && b.paymentMethod !== "BANK" && locale === "ko" ? ` · ${b.paymentMethod}` : ""}
            </dd>
            <dt>{tb.orderId}</dt>
            <dd className={styles.mono}>{b.orderId}</dd>
          </dl>
        </section>

        {b.status === "paid" && (
          <section className={styles.notice}>
            <p className="title">{tb.visitTitle}</p>
            <ul>
              {tb.visit.map((line) => (
                <li key={line}>{fmt(line, { address, phone: shopPhone })}</li>
              ))}
            </ul>
          </section>
        )}

        {canCancel && (
          <section className={styles.cancel}>
            <CancelForm
              action={`/api/booking/${b.manageToken}/cancel`}
              confirmText={tb.cancelConfirm}
              buttonText={tb.cancelButton}
              busyText={tb.cancelling}
              summary={
                b.status === "paid"
                  ? quote.amount > 0
                    ? fmt(tb.refundQuote, { amount: money(quote.amount, locale), percent: quote.percent })
                    : tb.refundNone
                  : tb.cancelUnpaid
              }
            />
            <Link href="/policy#refund" className={styles.policyLink}>
              {tb.policyLink}
            </Link>
          </section>
        )}

        <div className={btn.bottom} style={{ paddingTop: 28, paddingBottom: 60 }}>
          <Link href="/" className={btn.primary}>
            {t.common.home}
          </Link>
        </div>
      </main>
    </>
  );
}
