"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useI18n } from "@/i18n/client";
import { dressName, fmt, money } from "@/i18n/format";
import { useReservation } from "../useReservation";
import styles from "../reserve.module.css";
import type { Dress } from "@/lib/dresses";

// 02_예약_드레스선택
export default function DressListPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { r, ready } = useReservation();
  const [dresses, setDresses] = useState<Dress[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!r.name) return router.replace("/reserve");
    if (!r.date || !r.time) return router.replace("/reserve/schedule");
    fetch(`/api/dresses?date=${r.date}&time=${encodeURIComponent(r.time)}`)
      .then((res) => res.json())
      .then((d) => setDresses(d.dresses))
      .catch(() => setError(t.dress.loadError));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <>
      <Header back />
      <main>
        <h1 className={`title ${styles.pageTitle}`}>{t.dress.title}</h1>
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
                  <img src={d.image} alt={name} loading="lazy" />
                  {!anyLeft && <span className={styles.soldOut}>{t.dress.soldOut}</span>}
                  <div className={styles.dressInfo}>
                    <p className="title">{name}</p>
                    <div className={styles.dressMeta}>
                      <span>{fmt(t.dress.fee, { price: money(d.price, locale) })}</span>
                      <span>{fmt(t.dress.sizes, { sizes: d.sizes.map((s) => s.size).join(" / ") })}</span>
                    </div>
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
