import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import btn from "@/components/Button.module.css";
import { formatPhone, getBookingByToken, refundQuote } from "@/lib/bookings";
import { config, sendLink, usesAccount, type ManualMethod } from "@/lib/config";
import { formatKst, isSlotClosedByTime } from "@/lib/time";
import { dressName, errorText, fmt, longDate, money, shortDate, usd, withRo } from "@/i18n";
import { getI18n } from "@/i18n/server";
import CancelForm from "./CancelForm";
import ClearReservation from "./ClearReservation";
import CopyButton from "./CopyButton";
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
  const pm = (b.paymentMethod ?? "") as ManualMethod;
  const methodLabel = (t.payment.method as Record<string, string>)[pm] ?? pm;
  const payAmount = pm === "PAYPAL" && b.amountUsd ? usd(b.amountUsd) : money(b.amount, locale);
  const link = b.status === "awaiting_deposit" ? sendLink(pm, b.amount, b.amountUsd ?? "0") : "";
  // 계좌로 받는 방식(계좌이체, 계좌 기반 토스 송금)은 계좌번호도 보여줘요
  const showsAccount = usesAccount(pm);

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
              <p className={styles.small}>{tb.spamHint}</p>
            </>
          )}
          {b.status === "awaiting_deposit" && b.paymentMethod === "ONSITE" && (
            <>
              <p className={`title ${styles.big}`}>{tb.onsiteTitle}</p>
              <p>{fmt(tb.onsiteBody, { amount: money(b.amount, locale) })}</p>
            </>
          )}
          {b.status === "awaiting_deposit" && b.paymentMethod !== "ONSITE" && (
            <>
              <p className={`title ${styles.big}`}>{tb.payTitle}</p>
              <p>{fmt(tb.payWith, { method: methodLabel, methodRo: withRo(methodLabel), amount: payAmount })}</p>
              {link && (
                <p className={styles.payLink}>
                  <a
                    href={link}
                    {...(/^https?:/.test(link) ? { target: "_blank", rel: "noreferrer" } : {})}
                    className={`${btn.primary} ${btn.wide}`}
                  >
                    {fmt(tb.openLink, { method: methodLabel, methodRo: withRo(methodLabel) })}
                  </a>
                </p>
              )}
              {showsAccount && link.startsWith("supertoss:") && <p className={styles.small}>{tb.tossHint}</p>}
              {showsAccount && link.startsWith("kakaopay:") && <p className={styles.small}>{tb.kakaoHint}</p>}
              {showsAccount && (
                <div className={styles.bank}>
                  <p className={styles.bankLine}>
                    <b>{t.payment.bankAccount}</b>
                    <span>{config.bankAccount}</span>
                    <CopyButton text={config.bankAccount} label={tb.copy} done={tb.copied} />
                  </p>
                  <p>
                    <b>{t.payment.depositor}</b> {b.customerName}
                  </p>
                </div>
              )}
              <div className={styles.bank}>
                <p>
                  <b>{tb.deadline}</b> {fmt(tb.deadlineValue, { time: formatKst(b.holdExpiresAt) })}
                </p>
              </div>
              <p className={styles.small}>{fmt(showsAccount ? tb.bankNote : tb.memoNote, { name: b.customerName })}</p>
              <p className={styles.small}>{tb.checkNote}</p>
              <p className={styles.small}>{tb.spamHint}</p>
            </>
          )}
          {b.status === "cancelled" && (
            <>
              <p className={`title ${styles.big}`}>{tb.cancelledTitle}</p>
              {b.refundAmount > 0 && (
                <p>
                  {fmt(tb.refundAmount, { amount: b.refundUsd ? usd(b.refundUsd) : money(b.refundAmount, locale) })}
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
            <dd>{b.status === "awaiting_deposit" && pm === "ONSITE" ? tb.statusOnsite : (tb.statusLabel[b.status] ?? b.status)}</dd>
            <dt>{tb.schedule}</dt>
            <dd>{fmt(tb.scheduleValue, { date: longDate(b.slotDate, locale), time: b.slotTime })}</dd>
            <dt>{tb.customer}</dt>
            <dd>
              {b.customerName} · {formatPhone(b.phone)}
            </dd>
            <dt>{tb.amount}</dt>
            <dd>
              {b.currency === "USD" && b.amountUsd ? usd(b.amountUsd) : money(b.amount, locale)}
              {methodLabel ? ` · ${methodLabel}` : ""}
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
                    ? fmt(tb.refundQuote, {
                        amount:
                          b.currency === "USD" && b.amountUsd
                            ? usd(((Number(b.amountUsd) * quote.amount) / b.amount).toFixed(2))
                            : money(quote.amount, locale),
                        percent: quote.percent,
                      })
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
