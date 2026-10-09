import type { Metadata, Viewport } from "next";
import "./fonts-arita.css";
import "./fonts-eulyoo.css";
import "./globals.css";
import { config } from "@/lib/config";
import { HTML_LANG } from "@/i18n";
import { I18nProvider } from "@/i18n/client";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    metadataBase: new URL(config.siteUrl),
    title: t.meta.title,
    description: t.meta.description,
    icons: { icon: "/images/logo.png" },
    openGraph: { title: t.meta.title, description: t.meta.description, images: ["/images/hero.jpg"] },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6faf4",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getI18n();
  return (
    <html lang={HTML_LANG[locale]}>
      <body>
        <I18nProvider locale={locale} t={t}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
