import Link from "next/link";
import { config } from "@/lib/config";
import styles from "./admin.module.css";

function modeLabel() {
  if (config.paymentMode === "manual") return { text: "결제: 계좌이체(무통장입금) 모드 — 해외 손님은 결제할 수 없어요", tone: "info" };
  if (config.mockPayments) return { text: "결제: 모의결제(테스트) — 실제 서버에서는 끄세요!", tone: "warn" };
  if (!config.portoneStoreId || !config.portoneApiSecret) return { text: "결제: 포트원 설정이 없어서 예약을 받을 수 없어요", tone: "warn" };
  const kr = config.portoneChannelKr ? "국내 ✓" : "국내 ✗";
  const global = config.portoneChannelGlobal ? "해외 ✓" : "해외 ✗";
  return {
    text: `결제: 포트원 (${kr} · ${global}) — 테스트/실결제 여부는 포트원 콘솔의 채널 설정을 따라요`,
    tone: config.portoneChannelKr && config.portoneChannelGlobal ? "ok" : "warn",
  };
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
