import Link from "next/link";
import Header from "@/components/Header";
import btn from "@/components/Button.module.css";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className={btn.page} style={{ textAlign: "center" }}>
        <p className="title" style={{ fontSize: 18, marginTop: 60 }}>
          페이지를 찾을 수 없어요
        </p>
        <p>주소를 다시 확인해 주세요.</p>
        <div className={btn.bottom}>
          <Link href="/" className={btn.primary}>
            홈으로
          </Link>
        </div>
      </main>
    </>
  );
}
