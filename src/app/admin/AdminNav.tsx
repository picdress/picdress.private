import Link from "next/link";
import { MANUAL_LABEL } from "@/lib/bookings";
import { config, manualMethods } from "@/lib/config";
import styles from "./admin.module.css";

function modeLabel() {
  if (config.paymentMode === "manual") {
    const m = manualMethods().map((x) => MANUAL_LABEL[x]).join(" · ");
    return m
      ? { text: `결제: 송금 확인 방식 (${m}) — 송금이 들어오면 '결제 확인'을 눌러주세요`, tone: "info" }
      : { text: "결제: 결제수단이 하나도 설정되지 않아서 예약을 받을 수 없어요 (BANK_ACCOUNT, PAYPAL_LINK 등)", tone: "warn" };
  }
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
  const mail =
    config.gmailUser && config.gmailAppPassword
      ? { text: `메일: ${config.gmailUser}에서 보내요 · 관리자 알림 → ${config.adminNotifyEmail || "(받을 주소 없음)"}`, tone: "info" }
      : { text: "메일: GMAIL_USER / GMAIL_APP_PASSWORD가 없어서 손님에게 메일이 안 나가요", tone: "warn" };
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
      <div className={styles.mode} data-tone={mail.tone}>
        <span>{mail.text}</span>
        <form action="/api/admin/test-mail" method="post" className={styles.inlineForm}>
          <input type="hidden" name="back" value={active === "dresses" ? "/admin/dresses" : "/admin"} />
          <button type="submit" className={styles.btn}>
            테스트 메일 보내기
          </button>
        </form>
      </div>
    </>
  );
}
