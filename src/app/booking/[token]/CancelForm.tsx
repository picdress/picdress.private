"use client";

import { useState } from "react";
import styles from "./booking.module.css";

export default function CancelForm({ action, summary }: { action: string; summary: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      action={action}
      method="post"
      onSubmit={(e) => {
        if (!confirm(`예약을 취소할까요?\n${summary}`)) {
          e.preventDefault();
          return;
        }
        setBusy(true);
      }}
    >
      <p className={styles.small}>{summary}</p>
      <button type="submit" className={styles.cancelBtn} disabled={busy}>
        {busy ? "취소하는 중…" : "예약 취소하기"}
      </button>
    </form>
  );
}
