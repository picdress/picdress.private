"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import btn from "@/components/Button.module.css";
import { useReservation, won } from "../../useReservation";
import styles from "../../reserve.module.css";
import type { Dress } from "@/lib/dresses";

// 02_예약_드레스사이즈선택
export default function DressDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
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
      .catch(() => setError("드레스 정보를 불러오지 못했어요."));
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
          <p className={styles.loading}>{error || "불러오는 중…"}</p>
        ) : (
          <>
            <h1 className={`title ${styles.detailName}`}>{dress.name}</h1>
            <p className={styles.detailPrice}>{won(dress.price)}</p>
            <img className={styles.detailImg} src={dress.image} alt={dress.name} />

            <h2 className={`title ${styles.sizeTitle}`}>사이즈 선택</h2>
            {(dress.modelSize || dress.modelSpec) && (
              <p className={styles.model}>
                {dress.modelSize && <>모델 착용 사이즈: {dress.modelSize}</>}
                {dress.modelSize && dress.modelSpec && <br />}
                {dress.modelSpec && <>모델 스펙: {dress.modelSpec}</>}
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
                  aria-label={`${s.size}${(s.remaining ?? 0) <= 0 ? " 예약 마감" : ""}`}
                  onClick={() => setSize(s.size)}
                >
                  {s.size}
                </button>
              ))}
            </div>
            {allGone && <p className={styles.sizeNote}>이 시간엔 모든 사이즈가 예약됐어요. 다른 드레스를 골라주세요.</p>}
            {!allGone && dress.sizes.some((s) => (s.remaining ?? 0) <= 0) && (
              <p className={styles.sizeNote}>줄 그어진 사이즈는 선택한 시간에 이미 예약됐어요.</p>
            )}

            <div className={btn.bottom} style={{ paddingTop: 36, paddingBottom: 64 }}>
              {size && (
                <button type="button" className={btn.primary} onClick={next}>
                  다음으로
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
