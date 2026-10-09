"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ANONYMOUS, loadTossPayments } from "@tosspayments/tosspayments-sdk";
import Header from "@/components/Header";
import btn from "@/components/Button.module.css";
import { shortDate, useReservation, won } from "../useReservation";
import styles from "./payment.module.css";

type Hold = {
  orderId: string;
  orderName: string;
  amount: number;
  amountUsd: string | null;
  holdExpiresAt: string;
  customer: { name: string; phone: string; email: string };
  payment: { mode: "toss" | "manual"; mock: boolean; clientKey: string; bankAccount: string; depositHours: number };
};

type Method = "TOSSPAY" | "KAKAOPAY" | "TRANSFER" | "PAYPAL";

const METHODS: { id: Method; label: string; img?: string; imgW?: number }[] = [
  { id: "TOSSPAY", label: "토스페이", img: "/images/pay/tosspay.png", imgW: 101 },
  { id: "KAKAOPAY", label: "카카오페이", img: "/images/pay/kakaopay.png", imgW: 56 },
  { id: "TRANSFER", label: "계좌이체" },
  { id: "PAYPAL", label: "PayPal", img: "/images/pay/paypal.png", imgW: 93 },
];

// 04_결제화면
export default function PaymentPage() {
  const router = useRouter();
  const { r, update, ready } = useReservation();
  const [hold, setHold] = useState<Hold | null>(null);
  const [dressName, setDressName] = useState("");
  const [method, setMethod] = useState<Method>();
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [fatal, setFatal] = useState<{ message: string; back: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState<number>(0);
  const started = useRef(false);

  const createHold = useCallback(async () => {
    setError("");
    setFatal(null);
    try {
      const res = await fetch("/api/bookings/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: r.name,
          phone: r.phone,
          email: r.email,
          date: r.date,
          time: r.time,
          dressId: r.dressId,
          size: r.size,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const back =
          data.error === "DRESS_UNAVAILABLE"
            ? `/reserve/dress/${r.dressId}`
            : data.error?.startsWith("SLOT")
              ? "/reserve/schedule"
              : data.error?.startsWith("INVALID_") && ["INVALID_NAME", "INVALID_PHONE", "INVALID_EMAIL"].includes(data.error)
                ? "/reserve"
                : "/reserve/schedule";
        setFatal({ message: data.message ?? "자리를 잡지 못했어요.", back });
        return;
      }
      setHold(data);
      update({ orderId: data.orderId });
      if (data.payment.mode === "manual") setMethod("TRANSFER");
    } catch {
      setFatal({ message: "네트워크 문제로 자리를 잡지 못했어요. 다시 시도해 주세요.", back: "/reserve/payment" });
    }
  }, [r, update]);

  useEffect(() => {
    if (!ready || started.current) return;
    if (!r.name) return router.replace("/reserve");
    if (!r.date || !r.time) return router.replace("/reserve/schedule");
    if (!r.dressId || !r.size) return router.replace("/reserve/dress");
    started.current = true;
    createHold();
    fetch(`/api/dresses`)
      .then((res) => res.json())
      .then((d) => setDressName(d.dresses.find((x: { id: string }) => x.id === r.dressId)?.name ?? ""))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // 자리 잡아둔 남은 시간
  useEffect(() => {
    if (!hold) return;
    const tick = () => setLeft(Math.max(0, Math.floor((Date.parse(hold.holdExpiresAt) - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [hold]);

  const expired = hold !== null && left <= 0;
  const manual = hold?.payment.mode === "manual";
  const methods = METHODS.filter((m) => m.id !== "PAYPAL" || hold?.amountUsd);

  async function pay() {
    if (!hold || !method) return;
    if (!agreed) return setError("예약 내용과 취소·환불 규정에 동의해 주세요.");
    setError("");
    setBusy(true);
    try {
      if (manual) {
        const res = await fetch("/api/bookings/deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: hold.orderId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        router.push(`/booking/${data.manageToken}?done=1`);
        return;
      }

      const usd = method === "PAYPAL";
      const amountValue = usd ? Number(hold.amountUsd) : hold.amount;

      if (hold.payment.mock) {
        // 로컬 테스트용 모의 결제
        const q = new URLSearchParams({
          paymentKey: `mock_${Date.now()}`,
          orderId: hold.orderId,
          amount: String(amountValue),
        });
        window.location.href = `/api/payments/success?${q}`;
        return;
      }

      const toss = await loadTossPayments(hold.payment.clientKey);
      const payment = toss.payment({ customerKey: ANONYMOUS });
      const common = {
        orderId: hold.orderId,
        orderName: hold.orderName,
        successUrl: `${window.location.origin}/api/payments/success`,
        failUrl: `${window.location.origin}/reserve/fail`,
        customerName: hold.customer.name,
        customerEmail: hold.customer.email,
        customerMobilePhone: hold.customer.phone,
      };
      if (method === "TOSSPAY" || method === "KAKAOPAY") {
        await payment.requestPayment({
          ...common,
          method: "CARD",
          amount: { currency: "KRW", value: hold.amount },
          card: { flowMode: "DIRECT", easyPay: method },
        });
      } else if (method === "TRANSFER") {
        await payment.requestPayment({
          ...common,
          method: "TRANSFER",
          amount: { currency: "KRW", value: hold.amount },
          transfer: { cashReceipt: { type: "소득공제" }, useEscrow: false },
        });
      } else {
        await payment.requestPayment({
          ...common,
          method: "FOREIGN_EASY_PAY",
          amount: { currency: "USD", value: amountValue },
          foreignEasyPay: { provider: "PAYPAL", country: "KR" },
        });
      }
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code === "USER_CANCEL") setError("결제를 취소했어요. 다시 시도할 수 있어요.");
      else setError(err.message || "결제를 시작하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (fatal) {
    return (
      <>
        <Header back />
        <div className={btn.page}>
          <div className={styles.fatal}>
            <p className="title">예약을 진행할 수 없어요</p>
            <p>{fatal.message}</p>
          </div>
          <div className={btn.bottom}>
            <Link href={fatal.back} className={btn.primary} onClick={() => fatal.back === "/reserve/payment" && location.reload()}>
              다시 고르기
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header back />
      <div className={btn.page}>
        <section className={styles.summary}>
          <div className={styles.rows}>
            <div className={styles.row}>
              <h2 className="title">예약 정보</h2>
              <div className={styles.chips}>
                <span className={styles.chip}>{r.date ? shortDate(r.date) : ""}</span>
                <span className={styles.chip}>{r.time}</span>
              </div>
            </div>
            <div className={styles.row}>
              <h2 className="title">드레스</h2>
              <div className={styles.chips}>
                <span className={styles.chip}>{dressName || "…"}</span>
                <span className={styles.chip}>{r.size}</span>
              </div>
            </div>
          </div>
          <hr className={styles.line} />
          <div className={`title ${styles.price}`}>
            <span>가격</span>
            <span>{hold ? won(hold.amount) : "…"}</span>
          </div>
        </section>

        <section className={styles.methods}>
          <h2 className={`title ${styles.methodsTitle}`}>결제 수단</h2>
          {manual ? (
            <>
              <div className={styles.grid}>
                <button type="button" className={styles.tile} aria-pressed>
                  <span className={styles.tileText}>계좌이체</span>
                </button>
              </div>
              <div className={styles.bank}>
                <p>
                  <b>입금 계좌</b> {hold?.payment.bankAccount || "준비 중"}
                </p>
                <p>
                  <b>입금자명</b> {hold?.customer.name}
                </p>
                <p>신청 후 {hold?.payment.depositHours}시간 안에 입금해 주시면 확인 후 예약이 확정돼요.</p>
              </div>
            </>
          ) : (
            <div className={styles.grid} role="radiogroup" aria-label="결제 수단">
              {methods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={method === m.id}
                  aria-label={m.label}
                  className={styles.tile}
                  onClick={() => setMethod(m.id)}
                >
                  {m.img ? (
                    <img src={m.img} alt="" style={{ width: m.imgW }} />
                  ) : (
                    <span className={styles.tileText}>{m.label}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {method === "PAYPAL" && hold?.amountUsd && (
            <p className={styles.usd}>PayPal은 달러로 결제돼요: ${hold.amountUsd}</p>
          )}
        </section>

        <label className={styles.agree}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            예약 내용을 확인했고,{" "}
            <Link href="/policy#refund" target="_blank">
              취소·환불 규정
            </Link>
            에 동의합니다.
          </span>
        </label>

        <div className={btn.bottom} style={{ paddingTop: 24 }}>
          {hold && !expired && (
            <p className={styles.timer}>
              {String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")} 동안 자리를 잡아두고 있어요
            </p>
          )}
          {expired && <p className={btn.error}>시간이 지나 잡아둔 자리가 풀렸어요.</p>}
          {error && <p className={btn.error}>{error}</p>}
          {expired ? (
            <button type="button" className={btn.primary} onClick={createHold}>
              다시 자리 잡기
            </button>
          ) : (
            <button
              type="button"
              className={btn.primary}
              disabled={!hold || !method || busy}
              onClick={pay}
            >
              {busy ? "잠시만요…" : manual ? "예약 신청하기" : "결제하기"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
