import { NextResponse } from "next/server";
import { completeOnlinePayment } from "@/lib/bookings";
import { config } from "@/lib/config";
import { errorCode } from "@/lib/http";

export const dynamic = "force-dynamic";

// 포트원 결제창이 끝나면 이 주소로 돌아와요.
//   성공: ?paymentId=...&txId=...
//   실패/취소: ?paymentId=...&code=...&message=...
// 여기서 포트원 서버에 실제 결제 내역을 조회해 금액·자리를 확인한 뒤 예약을 확정해요.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const paymentId = sp.get("paymentId") ?? "";
  const code = sp.get("code");
  const base = config.siteUrl;
  const fail = (c: string, message?: string | null) =>
    NextResponse.redirect(
      `${base}/reserve/fail?code=${encodeURIComponent(c)}&orderId=${encodeURIComponent(paymentId)}${message ? `&message=${encodeURIComponent(message)}` : ""}`,
      303,
    );

  if (!paymentId) return fail("PAYMENT_NOT_DONE");
  if (code) return fail(code, sp.get("message"));

  try {
    const mockMethod = sp.get("mock") === "1" ? (sp.get("m") ?? "") : undefined;
    const b = await completeOnlinePayment(paymentId, { mockMethod });
    return NextResponse.redirect(`${base}/booking/${b.manageToken}?done=1`, 303);
  } catch (e) {
    return fail(errorCode(e));
  }
}
