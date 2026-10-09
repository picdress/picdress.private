import { NextResponse } from "next/server";
import { submitDepositRequest } from "@/lib/bookings";
import { errorJson } from "@/lib/http";

// POST /api/bookings/deposit { orderId, method } → 송금·계좌이체·현장결제 신청 (결제 대기 상태로)
export async function POST(req: Request) {
  try {
    const { orderId, method } = await req.json();
    const b = await submitDepositRequest(String(orderId ?? ""), String(method ?? "BANK"));
    return NextResponse.json({ manageToken: b.manageToken });
  } catch (e) {
    return errorJson(e);
  }
}
