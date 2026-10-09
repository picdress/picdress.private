import Link from "next/link";
import { config } from "@/lib/config";
import styles from "./admin.module.css";

function modeLabel() {
  if (config.paymentMode === "manual") return { text: "결제: 계좌이체(무통장입금) 모드", tone: "info" };
  if (config.mockPayments) return { text: "결제: 모의결제(테스트) — 실제 서버에서는 끄세요!", tone: "warn" };
  if (!config.tossSecretKey) return { text: "결제: 토스페이먼츠 키가 없어서 예약을 받을 수 없어요", tone: "warn" };
  if (config.tossSecretKey.startsWith("test_")) return { text: "결제: 토스페이먼츠 테스트 키 (실제 돈 안 빠져요)", tone: "warn" };
  return { text: "결제: 토스페이먼츠 실결제", tone: "ok" };
}

export default function AdminNav({ active }: { active: "bookings" | "dresses" }) {
  const m = modeLabel();
  return (
    <>
      <nav className={styles.nav}>
        <Link href="/admin" aria-current={active === "bookings" ? "page" : undefined}>
          예약 현황
        </Link>
        <Link href="/admin/dresses" aria-current={active === "dresses" ? "page" : undefined}>
          드레스 관리
        </Link>
        <a href="/api/admin/export">엑셀(CSV)</a>
        <form action="/api/admin/logout" method="post">
          <button type="submit">로그아웃</button>
        </form>
      </nav>
      <p className={styles.mode} data-tone={m.tone}>
        {m.text}
      </p>
    </>
  );
}
