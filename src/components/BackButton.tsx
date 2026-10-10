"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const NAV_KEY = "pd_nav";

function readStack(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(NAV_KEY) || "[]");
  } catch {
    return [];
  }
}

/** 이 탭에서 사이트 안에서 지나온 화면 목록을 기록해요 (뒤로 가면 하나 빼요) */
export function NavTracker() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      const stack = readStack();
      if (stack[stack.length - 1] === pathname) return; // 새로고침
      if (stack[stack.length - 2] === pathname) stack.pop(); // 뒤로 가기
      else stack.push(pathname);
      sessionStorage.setItem(NAV_KEY, JSON.stringify(stack.slice(-30)));
    } catch {}
  }, [pathname]);
  return null;
}

// 사이트 안에서 이동해 왔으면 이전 화면으로, 링크로 바로 들어왔으면 이전 단계 화면으로 가요
export default function BackButton({ className, label, fallback }: { className?: string; label: string; fallback: string }) {
  const router = useRouter();
  function goBack() {
    // 이 사이트 안에서 지나온 화면이 있으면 브라우저 뒤로가기와 똑같이, 없으면 이전 단계 화면으로
    const stack = readStack();
    if (stack.length >= 2) return router.back();
    try {
      sessionStorage.setItem(NAV_KEY, JSON.stringify(stack.slice(0, -1))); // 지금 화면을 이전 단계로 바꿔치기
    } catch {}
    router.replace(fallback);
  }
  return (
    <button type="button" className={className} onClick={goBack} aria-label={label}>
      <svg width="11" height="20" viewBox="0 0 11 20" fill="none" aria-hidden>
        <path d="M10 1 1 10l9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
