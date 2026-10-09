import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "관리자 로그인 — pic.dress", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;
  return (
    <main className={styles.login}>
      <img src="/images/logo.png" alt="pic.dress" width={96} height={96} />
      <h1 className="title">관리자</h1>
      <form action="/api/admin/login" method="post" className={styles.loginForm}>
        <input type="password" name="password" placeholder="비밀번호" autoComplete="current-password" required autoFocus />
        <button type="submit">로그인</button>
      </form>
      {error === "1" && <p className={styles.err}>비밀번호가 맞지 않아요.</p>}
      {error === "wait" && <p className={styles.err}>너무 많이 시도했어요. 10분 뒤에 다시 해주세요.</p>}
    </main>
  );
}
