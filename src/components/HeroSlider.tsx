"use client";

import { useEffect, useState } from "react";
import styles from "./HeroSlider.module.css";

// 홈 메인 사진: 몇 초마다 부드럽게 넘어가요 (움직임 줄이기 설정이면 자동으로 넘기지 않아요)
export default function HeroSlider({ images, alt, label }: { images: string[]; alt: string; label: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % images.length), 4500);
    return () => clearInterval(timer);
  }, [images.length, index]);

  return (
    <div className={styles.slider}>
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={i === index ? alt : ""}
          aria-hidden={i !== index}
          className={styles.slide}
          data-active={i === index}
          fetchPriority={i === 0 ? "high" : "low"}
          loading={i === 0 ? "eager" : "lazy"}
        />
      ))}
      {images.length > 1 && (
        <div className={styles.dots} role="group" aria-label={label}>
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`${i + 1} / ${images.length}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
