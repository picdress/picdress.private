"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useI18n } from "@/i18n/client";
import { dressName } from "@/i18n/format";
import { useReservation } from "../useReservation";
import styles from "../reserve.module.css";
import type { Dress } from "@/lib/dresses";
import { DRESS_MEDIA } from "@/lib/dressMedia";
import EwhaToggle, { EwhaPrice } from "../EwhaToggle";

// 02_예약_드레스선택
export default function DressListPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { r, update, ready } = useReservation();
  const [dresses, setDresses] = useState<Dress[] | null>(null);
  const [error, setError] = useState("");
  const [ewhaPrice, setEwhaPrice] = useState(0);

  useEffect(() => {
    if (!ready) return;
    if (!r.name) return router.replace("/reserve");
    if (!r.date || !r.time) return router.replace("/reserve/schedule");
    fetch(`/api/dresses?date=${r.date}&time=${encodeURIComponent(r.time)}`)
      .then((res) => res.json())
      .then((d) => {
        setDresses(d.dresses);
        setEwhaPrice(Number(d.ewhaPrice) || 0);
      })
      .catch(() => setError(t.dress.loadError));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <>
      <Header back="/reserve/schedule" />
      <main>
        <h1 className={`title ${styles.pageTitle}`}>{t.dress.title}</h1>
        {dresses && <EwhaToggle inList price={ewhaPrice} checked={Boolean(r.ewha)} onChange={(v) => update({ ewha: v })} />}
        {error && <p className={styles.loading}>{error}</p>}
        {!dresses && !error && <p className={styles.loading}>{t.common.loading}</p>}
        <ul className={styles.dressList}>
          {dresses?.map((d) => {
            const name = dressName(d, locale);
            const anyLeft = d.sizes.some((s) => (s.remaining ?? 1) > 0);
            return (
              <li key={d.id}>
                <Link
                  href={`/reserve/dress/${d.id}`}
                  className={styles.dressCard}
                  aria-disabled={!anyLeft}
                  tabIndex={anyLeft ? undefined : -1}
                >
                  <img src={DRESS_MEDIA[d.id]?.gallery[0] ?? d.image} alt={name} loading="lazy" />
                  {!anyLeft && <span className={styles.soldOut}>{t.dress.soldOut}</span>}
                  <div className={styles.dressInfo}>
                    <p className="title">{name}</p>
                    <div className={styles.dressMeta}>
                      <span>
                        {t.dress.fee.split("{price}")[0]}
                        <EwhaPrice price={d.price} ewhaPrice={ewhaPrice} on={Boolean(r.ewha)} />
                        {t.dress.fee.split("{price}")[1]}
                      </span>
                    </div>
                    {DRESS_MEDIA[d.id]?.tagline && <p className={styles.tagline}>{DRESS_MEDIA[d.id]!.tagline![locale]}</p>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
