"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext } from "react";
import { LOCALE_COOKIE, LOCALE_LABELS, LOCALES, type Locale } from "./locales";
import type { Messages } from "./messages/ko";

const Ctx = createContext<{ locale: Locale; t: Messages } | null>(null);

export function I18nProvider({ locale, t, children }: { locale: Locale; t: Messages; children: React.ReactNode }) {
  return <Ctx.Provider value={{ locale, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("I18nProvider가 없어요");
  return v;
}

export function LangSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  function pick(l: Locale) {
    if (l === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.refresh();
  }
  return (
    <div className={className} role="group" aria-label={t.common.language}>
      {LOCALES.map((l) => (
        <button key={l} type="button" aria-pressed={l === locale} lang={l === "zh" ? "zh-CN" : l} onClick={() => pick(l)}>
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
