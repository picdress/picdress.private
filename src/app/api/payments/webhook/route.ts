import { NextResponse } from "next/server";
import { Webhook } from "@portone/server-sdk";
import { completeOnlinePayment, markCancelledExternally } from "@/lib/bookings";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

// 포트원 웹훅 (포트원 콘솔 → 결제 연동 → 웹훅 URL에 https://사이트주소/api/payments/webhook 등록)
// 고객이 결제 직후 창을 닫아서 돌아오지 못해도 여기서 예약을 확정해요.
// 웹훅 내용은 믿지 않고, paymentId로 포트원에 다시 조회해서 처리해요.
export async function POST(req: Request) {
  const body = await req.text();
  let type = "";
  let paymentId = "";
  try {
    if (config.portoneWebhookSecret) {
      const hook = await Webhook.verify(config.portoneWebhookSecret, body, Object.fromEntries(req.headers));
      type = hook.type as string;
      paymentId = "data" in hook && hook.data && "paymentId" in hook.data ? String(hook.data.paymentId) : "";
    } else {
      const json = JSON.parse(body);
      type = String(json.type ?? "");
      paymentId = String(json.data?.paymentId ?? "");
    }
  } catch (e) {
    console.error("웹훅 검증 실패", e);
    return new NextResponse("invalid", { status: 400 });
  }

  if (!paymentId) return NextResponse.json({ ok: true });
  try {
    if (type === "Transaction.Paid") await completeOnlinePayment(paymentId);
    else if (type === "Transaction.Cancelled") await markCancelledExternally(paymentId);
  } catch (e) {
    // 자리 마감·금액 불일치 등은 completeOnlinePayment 안에서 자동 취소까지 처리돼요
    console.error("웹훅 처리", type, paymentId, (e as Error).message);
  }
  return NextResponse.json({ ok: true });
}
