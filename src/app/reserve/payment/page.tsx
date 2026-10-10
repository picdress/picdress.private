"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import * as PortOne from "@portone/browser-sdk/v2";
import Header from "@/components/Header";
import btn from "@/components/Button.module.css";
import { useI18n } from "@/i18n/client";
import { dressName, errorText, fmt, money, shortDate, usd } from "@/i18n/format";
import { PORTONE_LOCALE, type Locale } from "@/i18n/locales";
import { useReservation } from "../useReservation";
import styles from "./payment.module.css";

type Hold = {
  orderId: string;
  orderName: string;
  dressId: string;
  amount: number;
  amountUsd: string | null;
  holdExpiresAt: string;
  customer: { name: string; phone: string; email: string };
  payment: {
    mode: "toss" | "manual";
    mock: boolean;
    storeId: string;
    channelKr: string;
    channelGlobal: string;
    globalCurrency: "KRW" | "USD";
    manualMethods: string[];
    paypalUsd: string;
    depositHours: number;
    siteUrl: string;
  };
};

type Method =
  | "TOSSPAY"
  | "KAKAOPAY"
  | "TRANSFER"
  | "CARD"
  | "ALIPAY"
  | "WECHAT"
  | "UNIONPAY"
  | "INTL_CARD"
  | "PAYPAL"
  // 사업자 없이 받는 방식 (송금 링크·계좌·현장)
  | "TOSS_SEND"
  | "KAKAOPAY_SEND"
  | "BANK"
  | "ONSITE";

const MANUAL_KO: Method[] = ["TOSS_SEND", "KAKAOPAY_SEND", "BANK", "PAYPAL", "ONSITE"];
const MANUAL_GLOBAL: Method[] = ["PAYPAL", "ONSITE"];
const MANUAL_KR: Method[] = ["TOSS_SEND", "KAKAOPAY_SEND", "BANK"];

const KR_METHODS: Method[] = ["TOSSPAY", "KAKAOPAY", "TRANSFER", "CARD"];
const GLOBAL_METHODS: Record<Locale, Method[]> = {
  ko: ["ALIPAY", "WECHAT", "UNIONPAY", "INTL_CARD", "PAYPAL"],
  zh: ["ALIPAY", "WECHAT", "UNIONPAY", "INTL_CARD", "PAYPAL"],
  en: ["INTL_CARD", "PAYPAL", "ALIPAY", "WECHAT", "UNIONPAY"],
};
const IS_GLOBAL = new Set<Method>(["ALIPAY", "WECHAT", "UNIONPAY", "INTL_CARD", "PAYPAL"]);

/** 엑심베이 결제수단 코드 (developer.eximbay.com 결제수단 코드표) */
function eximbayCode(m: Method) {
  const mobile = typeof navigator !== "undefined" && /Mobi|Android|iPhone/i.test(navigator.userAgent);
  switch (m) {
    case "ALIPAY":
      return "P003"; // 알리페이 / 알리페이플러스
    case "WECHAT":
      return mobile ? "P142" : "P141"; // 위챗 모바일 / PC(QR)
    case "UNIONPAY":
      return "P002"; // 유니온페이(UPOP)
    case "PAYPAL":
      return "P001";
    default:
      return "P000"; // 해외 신용카드 (Visa·Master·JCB·Amex)
  }
}

const TILE_LOOK: Partial<Record<Method, { img?: string; imgW?: number; color?: string }>> = {
  TOSSPAY: { img: "/images/pay/tosspay.png", imgW: 101 },
  KAKAOPAY: { img: "/images/pay/kakaopay.png", imgW: 56 },
  TOSS_SEND: { img: "/images/pay/tosspay.png", imgW: 101 },
  KAKAOPAY_SEND: { img: "/images/pay/kakaopay.png", imgW: 56 },
  PAYPAL: { img: "/images/pay/paypal.png", imgW: 93 },
  ALIPAY: { color: "#1677ff" },
  WECHAT: { color: "#07a35a" },
  UNIONPAY: { color: "#d7172f" },
  INTL_CARD: { color: "#1a1f71" },
};

// 04_결제화면
export default function PaymentPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { r, update, ready } = useReservation();
  const [hold, setHold] = useState<Hold | null>(null);
  const [dressLabel, setDressLabel] = useState("");
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
        const code: string = data.error ?? "";
        const back =
          code === "DRESS_UNAVAILABLE"
            ? `/reserve/dress/${r.dressId}`
            : ["INVALID_NAME", "INVALID_PHONE", "INVALID_EMAIL"].includes(code)
              ? "/reserve"
              : "/reserve/schedule";
        setFatal({ message: errorText(t, code, data.message), back });
        return;
      }
      setHold(data);
      update({ orderId: data.orderId });
    } catch {
      setFatal({ message: t.errors.NETWORK, back: "/reserve/payment" });
    }
  }, [r, update, t]);

  useEffect(() => {
    if (!ready || started.current) return;
    if (!r.name) return router.replace("/reserve");
    if (!r.date || !r.time) return router.replace("/reserve/schedule");
    if (!r.dressId || !r.size) return router.replace("/reserve/dress");
    started.current = true;
    createHold();
    fetch(`/api/dresses`)
      .then((res) => res.json())
      .then((d) => {
        const found = d.dresses.find((x: { id: string }) => x.id === r.dressId);
        if (found) setDressLabel(dressName(found, locale));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // 자리 잡아둔 남은 시간
  useEffect(() => {
    if (!hold) return;
    const tick = () => setLeft(Math.max(0, Math.floor((Date.parse(hold.holdExpiresAt) - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [hold]);

  const expired = hold !== null && left <= 0;
  const manual = hold?.payment.mode === "manual";
  const usdGlobal = hold?.payment.globalCurrency === "USD";

  const krGroup = hold?.payment.channelKr ? KR_METHODS : [];
  const globalGroup = hold?.payment.channelGlobal
    ? GLOBAL_METHODS[locale].filter(() => !usdGlobal || Boolean(hold?.amountUsd))
    : [];
  const mm = (hold?.payment.manualMethods ?? []) as Method[];
  const manualGroups: { title: string; methods: Method[] }[] = (
    locale === "ko"
      ? [{ title: t.payment.methods, methods: MANUAL_KO.filter((m) => mm.includes(m)) }]
      : [
          { title: t.payment.groupGlobal, methods: MANUAL_GLOBAL.filter((m) => mm.includes(m)) },
          { title: t.payment.groupKrAccounts, methods: MANUAL_KR.filter((m) => mm.includes(m)) },
        ]
  ).filter((g) => g.methods.length > 0);

  const onlineGroups: { title: string; methods: Method[] }[] = (
    locale === "ko"
      ? [
          { title: t.payment.groupKr, methods: krGroup },
          { title: t.payment.groupGlobal, methods: globalGroup },
        ]
      : [
          { title: t.payment.groupGlobal, methods: globalGroup },
          { title: t.payment.groupKr, methods: krGroup },
        ]
  ).filter((g) => g.methods.length > 0);
  const groups = manual ? manualGroups : onlineGroups;

  async function pay() {
    if (!hold) return;
    if (!method) return setError(t.payment.errChoose);
    if (!agreed) return setError(t.payment.errAgree);
    setError("");
    setBusy(true);
    try {
      if (manual) {
        const res = await fetch("/api/bookings/deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: hold.orderId, method }),
        });
        const data = await res.json();
        if (!res.ok) throw Object.assign(new Error(data.message), { code: data.error });
        router.push(`/booking/${data.manageToken}?done=1`);
        return;
      }

      if (hold.payment.mock) {
        // 로컬 테스트용 모의 결제
        const q = new URLSearchParams({ paymentId: hold.orderId, mock: "1", m: method });
        window.location.href = `/api/payments/complete?${q}`;
        return;
      }

      const global = IS_GLOBAL.has(method);
      const useUsd = global && usdGlobal;
      const totalAmount = useUsd ? Math.round(Number(hold.amountUsd) * 100) : hold.amount;
      const base = {
        storeId: hold.payment.storeId,
        channelKey: global ? hold.payment.channelGlobal : hold.payment.channelKr,
        paymentId: hold.orderId,
        orderName: hold.orderName,
        totalAmount,
        currency: (useUsd ? "USD" : "KRW") as "USD" | "KRW",
        redirectUrl: `${window.location.origin}/api/payments/complete`,
        locale: PORTONE_LOCALE[locale],
        customData: { method },
        customer: {
          fullName: hold.customer.name,
          email: hold.customer.email,
          phoneNumber: hold.customer.phone,
        },
        products: [
          {
            id: hold.dressId,
            name: hold.orderName,
            amount: totalAmount,
            quantity: 1,
            link: hold.payment.siteUrl,
          },
        ],
      };

      let req: PortOne.PaymentRequest;
      if (method === "TOSSPAY" || method === "KAKAOPAY") {
        req = { ...base, payMethod: "EASY_PAY", easyPay: { easyPayProvider: method } };
      } else if (method === "TRANSFER") {
        req = { ...base, payMethod: "TRANSFER" };
      } else if (method === "CARD") {
        req = { ...base, payMethod: "CARD" };
      } else {
        // 해외 결제(엑심베이): 결제창에 고른 결제수단만 보이게
        req = {
          ...base,
          payMethod: "CARD",
          bypass: { eximbay_v2: { payment: { payment_method: eximbayCode(method) } } },
        } as PortOne.PaymentRequest;
      }

      const res = await PortOne.requestPayment(req);
      // PC처럼 리디렉트 없이 끝나는 경우: 결과를 들고 완료 처리 주소로 이동
      if (res) {
        const q = new URLSearchParams({ paymentId: res.paymentId });
        if (res.code) {
          q.set("code", res.code);
          if (res.message) q.set("message", res.message);
        }
        window.location.href = `/api/payments/complete?${q}`;
      }
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setError(err.code === "USER_CANCEL" ? t.payment.userCancel : errorText(t, err.code, err.message || t.payment.startFail));
    } finally {
      setBusy(false);
    }
  }

  if (fatal) {
    return (
      <>
        <Header back="/reserve/dress" />
        <div className={btn.page}>
          <div className={styles.fatal}>
            <p className="title">{t.payment.fatalTitle}</p>
            <p>{fatal.message}</p>
          </div>
          <div className={btn.bottom}>
            <Link href={fatal.back} className={btn.primary}>
              {t.payment.chooseAgain}
            </Link>
          </div>
        </div>
      </>
    );
  }

  const priceText = hold ? money(hold.amount, locale) : "…";

  return (
    <>
      <Header back="/reserve/dress" />
      <div className={btn.page}>
        <section className={styles.summary}>
          <div className={styles.rows}>
            <div className={styles.row}>
              <h2 className="title">{t.payment.booking}</h2>
              <div className={styles.chips}>
                <span className={styles.chip}>{r.date ? shortDate(r.date) : ""}</span>
                <span className={styles.chip}>{r.time}</span>
              </div>
            </div>
            <div className={styles.row}>
              <h2 className="title">{t.payment.dress}</h2>
              <div className={styles.chips}>
                <span className={styles.chip}>{dressLabel || "…"}</span>
                <span className={styles.chip}>{r.size}</span>
              </div>
            </div>
          </div>
          <hr className={styles.line} />
          <div className={`title ${styles.price}`}>
            <span>{t.payment.price}</span>
            <span>{priceText}</span>
          </div>
        </section>

        <section className={styles.methods}>
          <h2 className={`title ${styles.methodsTitle}`}>{t.payment.methods}</h2>
          {groups.map((g) => (
              <div key={g.title} className={styles.group}>
                {groups.length > 1 && <p className={styles.groupTitle}>{g.title}</p>}
                <div className={styles.grid} role="radiogroup" aria-label={g.title}>
                  {g.methods.map((m) => {
                    const look = TILE_LOOK[m] ?? {};
                    const label = t.payment.method[m];
                    return (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={method === m}
                        aria-label={label}
                        className={styles.tile}
                        onClick={() => {
                          setMethod(m);
                          setError("");
                        }}
                      >
                        {look.img ? (
                          <img src={look.img} alt="" style={{ width: look.imgW }} />
                        ) : (
                          <span className={styles.tileText} style={look.color ? { color: look.color, fontWeight: 700 } : undefined}>
                            {label}
                            {m === "INTL_CARD" && <small className={styles.tileSub}>{t.payment.intlCardSub}</small>}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          {manual && (
            <p className={styles.usd}>
              {method === "PAYPAL" && hold
                ? fmt(t.payment.paypalAmount, { amount: usd(hold.payment.paypalUsd) })
                : method === "ONSITE"
                  ? t.payment.onsiteNote
                  : t.payment.manualNote}
            </p>
          )}
          {!manual && method && IS_GLOBAL.has(method) && (
            <p className={styles.usd}>
              {usdGlobal && hold?.amountUsd
                ? fmt(t.payment.globalNoteUsd, { amount: usd(hold.amountUsd) })
                : t.payment.globalNote}
            </p>
          )}
        </section>

        <label className={styles.agree}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            {t.payment.agree.split("{refund}")[0]}
            <Link href="/policy#refund" target="_blank">
              {t.payment.refundLink}
            </Link>
            {t.payment.agree.split("{refund}")[1]}
          </span>
        </label>

        <div className={btn.bottom} style={{ paddingTop: 24 }}>
          {hold && !expired && (
            <p className={styles.timer}>
              {fmt(t.payment.hold, {
                time: `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`,
              })}
            </p>
          )}
          {expired && <p className={btn.error}>{t.payment.expired}</p>}
          {error && <p className={btn.error}>{error}</p>}
          {expired ? (
            <button type="button" className={btn.primary} onClick={createHold}>
              {t.payment.regrab}
            </button>
          ) : (
            <button type="button" className={btn.primary} disabled={!hold || busy} onClick={pay}>
              {busy ? t.common.wait : manual ? t.payment.submitDeposit : t.payment.pay}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
