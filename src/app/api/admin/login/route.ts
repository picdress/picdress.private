import { NextResponse } from "next/server";
import { checkPassword, startSession } from "@/lib/auth";
import { config } from "@/lib/config";

// 비밀번호 무차별 대입을 늦추기 위한 아주 단순한 제한 (서버 인스턴스별)
const attempts = new Map<string, { n: number; until: number }>();

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const a = attempts.get(ip);
  if (a && a.until > Date.now() && a.n >= 5) {
    return NextResponse.redirect(`${config.siteUrl}/admin/login?error=wait`, 303);
  }
  const form = await req.formData();
  const pw = String(form.get("password") ?? "");
  if (!checkPassword(pw)) {
    const cur = a && a.until > Date.now() ? a : { n: 0, until: Date.now() + 10 * 60_000 };
    attempts.set(ip, { n: cur.n + 1, until: cur.until });
    return NextResponse.redirect(`${config.siteUrl}/admin/login?error=1`, 303);
  }
  attempts.delete(ip);
  await startSession();
  return NextResponse.redirect(`${config.siteUrl}/admin`, 303);
}
