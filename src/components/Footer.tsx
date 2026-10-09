import Link from "next/link";
import { config } from "@/lib/config";
import styles from "./Footer.module.css";

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}
function InstaIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.6" cy="6.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function Footer() {
  const b = config.business;
  return (
    <footer className={styles.footer}>
      <div className={styles.info}>
        <p>주소: 서울 서대문구 대현동 60-11 2층 000호</p>
        <p>영업일: 2026/11/02(월) - 2026/11/13(금)</p>
        <p>영업 시간: 10:00 - 18:00</p>
      </div>
      <div className={styles.contacts}>
        <a href={`tel:${b.phone.replace(/-/g, "")}`}>
          <PhoneIcon />
          {b.phone}
        </a>
        <a href={`mailto:${b.email}`}>
          <MailIcon />
          {b.email}
        </a>
        <a href="https://instagram.com/pic.dress" target="_blank" rel="noreferrer">
          <InstaIcon />
          pic.dress
        </a>
      </div>

      <nav className={styles.links}>
        <Link href="/policy#terms">이용약관</Link>
        <Link href="/policy#refund">취소·환불 규정</Link>
        <Link href="/policy#privacy">
          <b>개인정보처리방침</b>
        </Link>
      </nav>
      {(b.name || b.regNo) && (
        <p className={styles.biz}>
          {[
            b.name && `상호 ${b.name}`,
            b.owner && `대표 ${b.owner}`,
            b.regNo && `사업자등록번호 ${b.regNo}`,
            b.mailOrderNo && `통신판매업 ${b.mailOrderNo}`,
            b.address,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      <img className={styles.logo} src="/images/logo.png" alt="" width={97} height={97} />
    </footer>
  );
}
