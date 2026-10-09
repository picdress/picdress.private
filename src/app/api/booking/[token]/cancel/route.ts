import { NextResponse } from "next/server";
import { cancelBooking, getBookingByToken } from "@/lib/bookings";
import { config } from "@/lib/config";
import { errorMessage } from "@/lib/http";

// POST /api/booking/{token}/cancel → 고객이 예약 확인 페이지에서 직접 취소
export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const back = `${config.siteUrl}/booking/${token}`;
  try {
    const b = await getBookingByToken(token);
    if (!b) return NextResponse.redirect(`${config.siteUrl}/`, 303);
    await cancelBooking(b.id, { by: "customer", reason: "고객 직접 취소" });
    return NextResponse.redirect(`${back}?cancelled=1`, 303);
  } catch (e) {
    return NextResponse.redirect(`${back}?error=${encodeURIComponent(errorMessage(e))}`, 303);
  }
}
