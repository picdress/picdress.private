import styles from "./admin.module.css";

export default function Flash({ msg, err }: { msg?: string; err?: string }) {
  if (!msg && !err) return null;
  return (
    <p className={err ? styles.flashErr : styles.flash} role="status">
      {err ?? msg}
    </p>
  );
}
