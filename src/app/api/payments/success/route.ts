import { NextResponse } from "next/server";
import { confirmOnlinePayment } from "@/lib/bookings";
import { config } from "@/lib/config";
import { errorMessage } from "@/lib/http";

export const dynamic = "force-dynamic";

// 토스페이먼츠 결제창에서 결제 인증이 끝나면 이 주소로 돌아와요.
// ?paymentKey=...&orderId=...&amount=...
// 여기서 금액을 검증하고 "결제 승인 API"를 호출해야 실제로 결제가 완료돼요.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const paymentKey = sp.get("paymentKey") ?? "";
  const orderId = sp.get("orderId") ?? "";
  const amount = sp.get("amount") ?? "";
  const base = config.siteUrl;

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.redirect(`${base}/reserve/fail?message=${encodeURIComponent("결제 정보가 올바르지 않아요.")}`);
  }
  try {
    const b = await confirmOnlinePayment({ paymentKey, orderId, amount });
    return NextResponse.redirect(`${base}/booking/${b.manageToken}?done=1`, 303);
  } catch (e) {
    return NextResponse.redirect(
      `${base}/reserve/fail?orderId=${encodeURIComponent(orderId)}&message=${encodeURIComponent(errorMessage(e))}`,
      303,
    );
  }
}
