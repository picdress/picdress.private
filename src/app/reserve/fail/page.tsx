"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import Header from "@/components/Header";
import btn from "@/components/Button.module.css";
import styles from "../payment/payment.module.css";

function FailInner() {
  const sp = useSearchParams();
  const code = sp.get("code");
  const message = sp.get("message");
  const orderId = sp.get("orderId");

  // 결제를 안 했으니 잡아둔 자리는 바로 풀어줌
  useEffect(() => {
    if (!orderId) return;
    navigator.sendBeacon?.("/api/bookings/release", JSON.stringify({ orderId }));
  }, [orderId]);

  const userCancel = code === "PAY_PROCESS_CANCELED" || code === "USER_CANCEL";

  return (
    <div className={btn.page}>
      <div className={styles.fatal}>
        <p className="title">{userCancel ? "결제를 취소했어요" : "결제가 완료되지 않았어요"}</p>
        <p>{userCancel ? "결제는 진행되지 않았어요. 다시 시도할 수 있어요." : message || "잠시 후 다시 시도해 주세요."}</p>
        {code && !userCancel && <p style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>오류 코드: {code}</p>}
      </div>
      <div className={btn.bottom}>
        <Link href="/reserve/payment" className={btn.primary}>
          다시 결제하기
        </Link>
        <Link href="/reserve/schedule" style={{ fontSize: 13 }}>
          일정 다시 고르기
        </Link>
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
