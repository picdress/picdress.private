"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import btn from "@/components/Button.module.css";
import { useI18n } from "@/i18n/client";
import { dressName, fmt, money } from "@/i18n/format";
import { useReservation } from "../../useReservation";
import styles from "../../reserve.module.css";
import type { Dress } from "@/lib/dresses";

// 02_예약_드레스사이즈선택
export default function DressDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { r, update, ready } = useReservation();
  const [dress, setDress] = useState<Dress | null>(null);
  const [size, setSize] = useState<string>();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!r.name) return router.replace("/reserve");
    if (!r.date || !r.time) return router.replace("/reserve/schedule");
    fetch(`/api/dresses?date=${r.date}&time=${encodeURIComponent(r.time)}`)
      .then((res) => res.json())
      .then((d) => {
        const found = (d.dresses as Dress[]).find((x) => x.id === id);
        if (!found) return router.replace("/reserve/dress");
        setDress(found);
        if (r.dressId === id && found.sizes.some((s) => s.size === r.size && (s.remaining ?? 0) > 0)) setSize(r.size);
      })
      .catch(() => setError(t.dress.loadError));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, id]);

  function next() {
    if (!dress || !size) return;
    update({ dressId: dress.id, size });
    router.push("/reserve/payment");
  }

  const allGone = dress?.sizes.every((s) => (s.remaining ?? 0) <= 0);

  return (
    <>
      <Header back />
      <div className={`${btn.page} ${styles.detail}`}>
        {!dress ? (
          <p className={styles.loading}>{error || t.common.loading}</p>
        ) : (
          <>
            <h1 className={`title ${styles.detailName}`}>{dressName(dress, locale)}</h1>
            <p className={styles.detailPrice}>{money(dress.price, locale)}</p>
            <img className={styles.detailImg} src={dress.image} alt={dressName(dress, locale)} />

            <h2 className={`title ${styles.sizeTitle}`}>{t.dress.sizeTitle}</h2>
            {(dress.modelSize || dress.modelSpec) && (
              <p className={styles.model}>
                {dress.modelSize && fmt(t.dress.modelSize, { v: dress.modelSize })}
                {dress.modelSize && dress.modelSpec && <br />}
                {dress.modelSpec && fmt(t.dress.modelSpec, { v: dress.modelSpec })}
              </p>
            )}
            <div className={styles.sizes}>
              {dress.sizes.map((s) => (
                <button
                  key={s.size}
                  type="button"
                  className={styles.size}
                  disabled={(s.remaining ?? 0) <= 0}
                  aria-pressed={size === s.size}
                  aria-label={`${s.size}${(s.remaining ?? 0) <= 0 ? ` (${t.dress.sizeTaken})` : ""}`}
                  onClick={() => setSize(s.size)}
                >
                  {s.size}
                </button>
              ))}
            </div>
            {allGone && <p className={styles.sizeNote}>{t.dress.allGone}</p>}
            {!allGone && dress.sizes.some((s) => (s.remaining ?? 0) <= 0) && (
              <p className={styles.sizeNote}>{t.dress.someGone}</p>
            )}

            <div className={btn.bottom} style={{ paddingTop: 36, paddingBottom: 64 }}>
              {size && (
                <button type="button" className={btn.primary} onClick={next}>
                  {t.common.next}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
