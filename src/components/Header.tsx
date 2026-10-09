import Link from "next/link";
import styles from "./Header.module.css";
import BackButton from "./BackButton";

export default function Header({ back = false }: { back?: boolean }) {
  return (
    <header className={styles.header}>
      {back && <BackButton className={styles.back} />}
      <Link href="/" className={styles.logo} aria-label="pic.dress 홈">
        <img src="/images/logo.png" alt="pic.dress" width={88} height={88} />
      </Link>
    </header>
  );
}
