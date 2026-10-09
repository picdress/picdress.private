"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import Header from "@/components/Header";
import btn from "@/components/Button.module.css";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import styles from "../payment/payment.module.css";

const USER_CANCEL = /USER_CANCEL|PAY_PROCESS_CANCELED|취소/i;

function FailInner() {
  const { t } = useI18n();
  const sp = useSearchParams();
  const code = sp.get("code") ?? "";
  const message = sp.get("message") ?? "";
  const orderId = sp.get("orderId");

  const ours = t.errors[code]; // 우리 서버가 정한 오류(자리 마감 자동취소 등)
  const userCancel = !ours && (USER_CANCEL.test(code) || USER_CANCEL.test(message));
  const soldOut = code === "SOLD_OUT_REFUNDED";

  // 결제를 안 했으면 잡아둔 자리는 바로 풀어줌 (결제 확인 중일 때는 그대로 둠)
  useEffect(() => {
    if (!orderId || code === "PAYMENT_PENDING" || code === "ALREADY_PAID") return;
    navigator.sendBeacon?.("/api/bookings/release", JSON.stringify({ orderId }));
  }, [orderId, code]);

  return (
    <div className={btn.page}>
      <div className={styles.fatal}>
        <p className="title">{userCancel ? t.fail.cancelledTitle : t.fail.failTitle}</p>
        <p>{userCancel ? t.fail.cancelledBody : ours || message || t.fail.failBody}</p>
        {code && !ours && !userCancel && <p style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>{fmt(t.fail.code, { code })}</p>}
      </div>
      <div className={btn.bottom}>
        {soldOut ? (
          <Link href="/reserve/schedule" className={btn.primary}>
            {t.fail.reschedule}
          </Link>
        ) : (
          <>
            <Link href="/reserve/payment" className={btn.primary}>
              {t.fail.retry}
            </Link>
            <Link href="/reserve/schedule" style={{ fontSize: 13 }}>
              {t.fail.reschedule}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function FailPage() {
  return (
    <>
      <Header />
      <Suspense>
        <FailInner />
      </Suspense>
    </>
  );
}
