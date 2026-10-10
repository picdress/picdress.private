import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { config } from "@/lib/config";
import { sendTestMail } from "@/lib/mail";

// 관리자 화면 '테스트 메일 보내기': 메일 설정이 제대로 됐는지 바로 확인
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.redirect(`${config.siteUrl}/admin/login`, 303);
  const form = await req.formData();
  const back = String(form.get("back") ?? "/admin");
  const safeBack = back.startsWith("/admin") ? back : "/admin";
  const to = config.adminNotifyEmail || config.gmailUser;
  const u = new URL(safeBack, "http://x");
  u.searchParams.delete("msg");
  u.searchParams.delete("err");
  if (!to) {
    u.searchParams.set("err", "받을 주소가 없어요 — ADMIN_NOTIFY_EMAIL 또는 GMAIL_USER를 넣어주세요.");
  } else {
    const error = await sendTestMail(to);
    if (error) u.searchParams.set("err", `테스트 메일 실패: ${error}`);
    else u.searchParams.set("msg", `${to}로 테스트 메일을 보냈어요. 받은편지함(없으면 스팸함)을 확인해 보세요.`);
  }
  return NextResponse.redirect(`${config.siteUrl}${u.pathname}${u.search}`, 303);
}
