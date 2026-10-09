"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import btn from "@/components/Button.module.css";
import { formatPhone, useReservation } from "./useReservation";
import styles from "./reserve.module.css";

// 02_예약_예약자정보
export default function InfoPage() {
  const router = useRouter();
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
    const digits = phone.replace(/\D/g, "");
    if (!name.trim()) return setError("성함을 입력해 주세요.");
    if (!/^01\d{8,9}$/.test(digits)) return setError("연락처를 휴대폰 번호로 입력해 주세요.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("예약 확인 메일을 받을 이메일을 입력해 주세요.");
    if (!agreed) return setError("개인정보 수집·이용에 동의해 주세요.");
    update({ name: name.trim(), phone: digits, email: email.trim(), agreed: true });
    router.push("/reserve/schedule");
  }

  return (
    <>
      <Header back />
      <form className={btn.page} onSubmit={next} noValidate>
        <div className={styles.sectionTitle}>
          <h1 className="title">예약자 정보</h1>
        </div>

        <label className={styles.field}>
          <span className="title">성함</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="직접 입력"
            autoComplete="name"
            maxLength={30}
          />
        </label>
        <label className={styles.field}>
          <span className="title">연락처</span>
          <input
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="직접 입력"
            inputMode="numeric"
            autoComplete="tel"
          />
        </label>
        <label className={styles.field}>
          <span className="title">이메일</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="예약 확인 메일을 보내드려요"
            autoComplete="email"
            maxLength={100}
          />
        </label>

        <label className={styles.agree}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            예약 확인·안내를 위한 개인정보(성함, 연락처, 이메일) 수집·이용에 동의합니다.{" "}
            <Link href="/policy#privacy" target="_blank">
              자세히
            </Link>
          </span>
        </label>

        <div className={btn.bottom}>
          {error && <p className={btn.error}>{error}</p>}
          <button type="submit" className={btn.primary}>
            다음으로
          </button>
        </div>
      </form>
    </>
  );
}
