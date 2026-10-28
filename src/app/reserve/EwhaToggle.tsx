"use client";

import { useI18n } from "@/i18n/client";
import { fmt, money } from "@/i18n/format";
import styles from "./reserve.module.css";

/** 이화여대 학생 할인 체크 칸 (예약자 정보·드레스 선택 화면) */
export default function EwhaToggle({
  price,
  checked,
  onChange,
  inList = false,
}: {
  price: number;
  checked: boolean;
  onChange: (v: boolean) => void;
  /** 드레스 목록 위: 카드 폭에 맞춤 */
  inList?: boolean;
}) {
  const { t, locale } = useI18n();
  if (!price) return null;
  return (
    <label className={`${styles.ewha} ${inList ? styles.ewhaInList : ""}`} data-on={checked}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className={`title ${styles.ewhaLabel}`}>{t.ewha.label}</span>
        <span className={styles.ewhaPrice}>{fmt(t.ewha.desc, { price: money(price, locale) })}</span>
        <small className={styles.ewhaNote}>{t.ewha.idNote}</small>
      </span>
    </label>
  );
}

/** 할인 중이면 정가에 취소선 + 할인가 */
export function EwhaPrice({ price, ewhaPrice, on }: { price: number; ewhaPrice: number; on: boolean }) {
  const { locale } = useI18n();
  if (!on || !ewhaPrice || price <= ewhaPrice) return <>{money(price, locale)}</>;
  return (
    <>
      <s className={styles.listPrice}>{money(price, locale)}</s>
      <b>{money(ewhaPrice, locale)}</b>
    </>
  );
}
