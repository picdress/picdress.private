"use client";

import { useState } from "react";
import styles from "./booking.module.css";

export default function CancelForm({
  action,
  summary,
  confirmText,
  buttonText,
  busyText,
}: {
  action: string;
  summary: string;
  confirmText: string;
  buttonText: string;
  busyText: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      action={action}
      method="post"
      onSubmit={(e) => {
        if (!confirm(`${confirmText}\n${summary}`)) {
          e.preventDefault();
          return;
        }
        setBusy(true);
      }}
    >
      <p className={styles.small}>{summary}</p>
      <button type="submit" className={styles.cancelBtn} disabled={busy}>
        {busy ? busyText : buttonText}
      </button>
    </form>
  );
}
