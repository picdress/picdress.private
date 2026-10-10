"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import btn from "@/components/Button.module.css";
import { useI18n } from "@/i18n/client";
import { formatPhone, phoneForServer, useReservation } from "./useReservation";
import styles from "./reserve.module.css";

// 02_예약_예약자정보
export default function InfoPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { r, update, ready } = useReservation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    setName(r.name ?? "");
    setPhone(r.phone ? formatPhone(r.phone) : "");
    setEmail(r.email ?? "");
    setAgreed(Boolean(r.agreed));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // 입력을 고치면 안내 문구 지우기
  useEffect(() => setError(""), [name, phone, email, agreed]);

  function next(e: React.FormEvent) {
    e.preventDefault();
    const p = phoneForServer(phone);
    if (!name.trim()) return setError(t.info.errName);
    if (!/^\+?\d{7,15}$/.test(p)) return setError(t.info.errPhone);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError(t.info.errEmail);
    if (!agreed) return setError(t.info.errAgree);
    update({ name: name.trim(), phone: p, email: email.trim(), agreed: true });
    router.push("/reserve/schedule");
  }

  return (
    <>
      <Header back="/" />
      <form className={btn.page} onSubmit={next} noValidate>
        <div className={styles.sectionTitle}>
          <h1 className="title">{t.info.title}</h1>
        </div>

        <label className={styles.field}>
          <span className="title">{t.info.name}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.info.namePlaceholder}
            autoComplete="name"
            maxLength={50}
          />
        </label>
        <label className={styles.field}>
          <span className="title">{t.info.phone}</span>
          <input
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder={t.info.phonePlaceholder}
            inputMode="tel"
            autoComplete="tel"
          />
          {locale !== "ko" && <small className={styles.help}>{t.info.phoneHelp}</small>}
        </label>
        <label className={styles.field}>
          <span className="title">{t.info.email}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.info.emailPlaceholder}
            autoComplete="email"
            maxLength={100}
          />
        </label>

        <label className={styles.agree}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            {t.info.agree}{" "}
            <Link href="/policy#privacy" target="_blank">
              {t.info.more}
            </Link>
          </span>
        </label>

        <div className={btn.bottom}>
          {error && <p className={btn.error}>{error}</p>}
          <button type="submit" className={btn.primary}>
            {t.common.next}
          </button>
        </div>
      </form>
    </>
  );
}
