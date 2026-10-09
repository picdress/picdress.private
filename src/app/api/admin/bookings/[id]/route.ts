import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { cancelBooking, confirmDeposit, markRefundDone, setMemo } from "@/lib/bookings";
import { config } from "@/lib/config";
import { errorMessage } from "@/lib/http";

// 관리자 예약 처리: 입금 확인 / 취소·환불 / 환불 송금 완료 / 메모
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.redirect(`${config.siteUrl}/admin/login`, 303);
  const { id } = await ctx.params;
  const form = await req.formData();
  const action = String(form.get("action") ?? "");
  const back = safeBack(String(form.get("back") ?? "/admin"));

  try {
    let msg = "";
    if (action === "confirm-deposit") {
      await confirmDeposit(id);
      msg = "입금 확인 → 예약 확정했어요. 고객에게 메일이 나갔어요.";
    } else if (action === "cancel") {
      const raw = String(form.get("refundAmount") ?? "").replace(/[^\d]/g, "");
      const refundAmount = raw === "" ? undefined : Number(raw);
      const reason = String(form.get("reason") ?? "").slice(0, 200) || "관리자 취소";
      const b = await cancelBooking(id, { by: "admin", refundAmount: refundAmount ?? 0, reason });
      msg =
        b.refundAmount > 0
          ? b.paymentMode === "manual"
            ? `취소했어요. ${b.refundAmount.toLocaleString()}원을 고객 계좌로 직접 송금한 뒤 '환불 송금 완료'를 눌러주세요.`
            : `취소하고 ${b.refundAmount.toLocaleString()}원 환불했어요.`
          : "취소했어요.";
    } else if (action === "refund-done") {
      await markRefundDone(id);
      msg = "환불 송금 완료로 표시했어요.";
    } else if (action === "memo") {
      await setMemo(id, String(form.get("memo") ?? ""));
      msg = "메모를 저장했어요.";
    } else {
      throw new Error("unknown action");
    }
    return NextResponse.redirect(`${config.siteUrl}${withParam(back, "msg", msg)}`, 303);
  } catch (e) {
    return NextResponse.redirect(`${config.siteUrl}${withParam(back, "err", errorMessage(e))}`, 303);
  }
}

function safeBack(p: string) {
  return p.startsWith("/admin") ? p : "/admin";
}

function withParam(path: string, key: string, value: string) {
  const u = new URL(path, "http://x");
  u.searchParams.delete("msg");
  u.searchParams.delete("err");
  u.searchParams.set(key, value);
  return `${u.pathname}${u.search}`;
}
