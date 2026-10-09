"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useReservation, won } from "../useReservation";
import styles from "../reserve.module.css";
import type { Dress } from "@/lib/dresses";

// 02_예약_드레스선택
export default function DressListPage() {
  const router = useRouter();
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
      .catch(() => setError("드레스 정보를 불러오지 못했어요. 새로고침해 주세요."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <>
      <Header back />
      <main>
        <h1 className={`title ${styles.pageTitle}`}>드레스 선택</h1>
        {error && <p className={styles.loading}>{error}</p>}
        {!dresses && !error && <p className={styles.loading}>불러오는 중…</p>}
        <ul className={styles.dressList}>
          {dresses?.map((d) => {
            const anyLeft = d.sizes.some((s) => (s.remaining ?? 1) > 0);
            return (
              <li key={d.id}>
                <Link
                  href={`/reserve/dress/${d.id}`}
                  className={styles.dressCard}
                  aria-disabled={!anyLeft}
                  tabIndex={anyLeft ? undefined : -1}
                >
                  <img src={d.image} alt={d.name} loading="lazy" />
                  {!anyLeft && <span className={styles.soldOut}>이 시간엔 모두 예약됐어요</span>}
                  <div className={styles.dressInfo}>
                    <p className="title">{d.name}</p>
                    <div className={styles.dressMeta}>
                      <span>대여비 : {won(d.price)}</span>
                      <span>사이즈 : {d.sizes.map((s) => s.size).join(" / ")}</span>
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
