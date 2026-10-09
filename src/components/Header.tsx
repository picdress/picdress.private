"use client";

import Link from "next/link";
import { LangSwitcher, useI18n } from "@/i18n/client";
import BackButton from "./BackButton";
import styles from "./Header.module.css";

export default function Header({ back = false }: { back?: boolean }) {
  const { t } = useI18n();
  return (
    <header className={styles.header}>
      {back && <BackButton className={styles.back} label={t.common.back} />}
      <Link href="/" className={styles.logo} aria-label="pic.dress">
        <img src="/images/logo.png" alt="pic.dress" width={88} height={88} />
      </Link>
      <LangSwitcher className={styles.lang} />
    </header>
  );
}
