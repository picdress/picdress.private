import Link from "next/link";
import Header from "@/components/Header";
import btn from "@/components/Button.module.css";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <>
      <Header />
      <main className={btn.page} style={{ textAlign: "center" }}>
        <p className="title" style={{ fontSize: 18, marginTop: 60 }}>
          {t.notFound.title}
        </p>
        <p>{t.notFound.body}</p>
        <div className={btn.bottom}>
          <Link href="/" className={btn.primary}>
            {t.common.home}
          </Link>
        </div>
      </main>
    </>
  );
}
