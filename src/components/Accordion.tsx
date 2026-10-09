"use client";

import { useId, useState } from "react";
import Chevron from "./Chevron";
import styles from "./Accordion.module.css";

export default function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section className={styles.section}>
      <button
        type="button"
        className={styles.head}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="title">{title}</span>
        <Chevron open={open} />
      </button>
      <div id={id} className={styles.panel} data-open={open} inert={!open}>
        <div className={styles.inner}>{children}</div>
      </div>
    </section>
  );
}
