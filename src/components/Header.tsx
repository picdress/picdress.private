"use client";

import Link from "next/link";
import { LangSwitcher, useI18n } from "@/i18n/client";
import BackButton, { NavTracker } from "./BackButton";
import styles from "./Header.module.css";

/** back: 뒤로가기 버튼 표시. 문자열이면 링크로 바로 들어왔을 때 갈 이전 단계 주소 */
export default function Header({ back = false }: { back?: boolean | string }) {
  const { t } = useI18n();
  return (
    <header className={styles.header}>
      <NavTracker />
      {back && <BackButton className={styles.back} label={t.common.back} fallback={typeof back === "string" ? back : "/"} />}
      <Link href="/" className={styles.logo} aria-label="pic.dress">
        <img src="/images/logo.png" alt="pic.dress" width={88} height={88} />
      </Link>
      <LangSwitcher className={styles.lang} />
    </header>
  );
}
