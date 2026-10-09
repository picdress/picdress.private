import { NextResponse } from "next/server";
import { releaseHold } from "@/lib/bookings";

// POST /api/bookings/release { orderId } → 결제 화면에서 나갈 때 잡아둔 자리 풀기
export async function POST(req: Request) {
  try {
    const text = await req.text();
    const { orderId } = JSON.parse(text || "{}");
    if (typeof orderId === "string" && orderId) await releaseHold(orderId);
  } catch {
    // 실패해도 홀드는 시간이 지나면 자동으로 풀려요
  }
  return NextResponse.json({ ok: true });
}
