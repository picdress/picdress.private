import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE } from "./i18n/locales";

// 링크에 ?lang=zh / ?lang=en / ?lang=ko 를 붙이면 그 언어로 열어요.
// (예: 샤오홍슈·인스타 홍보 링크에 https://사이트주소/?lang=zh)
export function proxy(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get("lang");
  if (!isLocale(lang)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.searchParams.delete("lang");
  const res = NextResponse.redirect(url);
  res.cookies.set(LOCALE_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}

export const config = {
  matcher: ["/((?!api|_next|images|fonts|favicon).*)"],
};
