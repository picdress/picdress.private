import { NextResponse } from "next/server";
import { createHold, orderName } from "@/lib/bookings";
import { config, paymentsReady } from "@/lib/config";
import { clientIp, errorJson } from "@/lib/http";

export const dynamic = "force-dynamic";

// POST /api/bookings/hold  → 결제 화면 들어올 때 자리를 잠깐 잡아둠
export async function POST(req: Request) {
  try {
    if (!paymentsReady()) {
      return NextResponse.json(
        { error: "PAYMENT_NOT_READY", message: "지금은 결제 준비 중이에요. 잠시 후 다시 시도해 주세요." },
        { status: 503 },
      );
    }
    const body = await req.json();
    const b = await createHold(
      {
        name: String(body.name ?? ""),
        phone: String(body.phone ?? ""),
        email: String(body.email ?? ""),
        date: String(body.date ?? ""),
        time: String(body.time ?? ""),
        dressId: String(body.dressId ?? ""),
        size: String(body.size ?? ""),
      },
      clientIp(req),
    );
    return NextResponse.json({
      orderId: b.orderId,
      orderName: orderName(b.dressName, b.slotDate, b.slotTime),
      amount: b.amount,
      amountUsd: b.amountUsd,
      holdExpiresAt: b.holdExpiresAt,
      customer: { name: b.customerName, phone: b.phone, email: b.email },
      payment: {
        mode: config.paymentMode,
        mock: config.mockPayments,
        clientKey: config.tossClientKey,
        bankAccount: config.bankAccount,
        depositHours: config.depositHours,
      },
    });
  } catch (e) {
    return errorJson(e);
  }
}
