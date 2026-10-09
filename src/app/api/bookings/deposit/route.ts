import { NextResponse } from "next/server";
import { submitDepositRequest } from "@/lib/bookings";
import { errorJson } from "@/lib/http";

// POST /api/bookings/deposit { orderId } → 무통장입금 신청 (입금 대기 상태로)
export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();
    const b = await submitDepositRequest(String(orderId ?? ""));
    return NextResponse.json({ manageToken: b.manageToken });
  } catch (e) {
    return errorJson(e);
  }
}
