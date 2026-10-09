import type { Metadata, Viewport } from "next";
import "./fonts-arita.css";
import "./fonts-eulyoo.css";
import "./globals.css";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: "pic.dress — 이화 드레스 투어",
  description: "드레스를 입고 캠퍼스를 거닐며 사진을 남기고, 이대 앞 맛집과 카페를 방문하는 드레스 투어 pic.dress",
  icons: { icon: "/images/logo.png" },
  openGraph: {
    title: "pic.dress — 이화 드레스 투어",
    description: "드레스 대여 2시간 + 제휴 음식점·카페 쿠폰 3장",
    images: ["/images/hero.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6faf4",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
