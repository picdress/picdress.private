"use client";

import { useRef, useState } from "react";
import { fmt } from "@/i18n/format";
import styles from "../../reserve.module.css";

// 드레스 사진 여러 장: 옆으로 넘겨보는 갤러리 (다음 사진이 살짝 보여요)
export default function DressGallery({ photos, alt, photoLabel }: { photos: string[]; alt: string; photoLabel: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function onScroll() {
    const el = ref.current;
    if (!el) return;
    const item = el.firstElementChild as HTMLElement | null;
    if (!item) return;
    const step = item.offsetWidth + 10;
    setIndex(Math.min(photos.length - 1, Math.round(el.scrollLeft / step)));
  }

  function go(i: number) {
    const el = ref.current;
    const item = el?.children[i] as HTMLElement | undefined;
    if (el && item) el.scrollTo({ left: item.offsetLeft - el.offsetLeft - 25, behavior: "smooth" });
  }

  return (
    <div className={styles.galleryWrap}>
      <div ref={ref} className={styles.gallery} data-single={photos.length === 1} onScroll={onScroll}>
        {photos.map((src, i) => (
          <img key={src} src={src} alt={i === 0 ? alt : fmt(photoLabel, { n: i + 1 })} loading={i === 0 ? "eager" : "lazy"} />
        ))}
      </div>
      {photos.length > 1 && (
        <div className={styles.galleryDots}>
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={fmt(photoLabel, { n: i + 1 })}
              aria-current={i === index}
              onClick={() => go(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
