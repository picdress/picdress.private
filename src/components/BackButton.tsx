"use client";

import { useRouter } from "next/navigation";

export default function BackButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button type="button" className={className} onClick={() => router.back()} aria-label="뒤로 가기">
      <svg width="11" height="20" viewBox="0 0 11 20" fill="none" aria-hidden>
        <path d="M10 1 1 10l9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
