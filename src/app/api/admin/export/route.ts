import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { listBookings } from "@/lib/bookings";
import { formatKst } from "@/lib/time";

const STATUS: Record<string, string> = {
  holding: "결제중",
  awaiting_deposit: "입금대기",
  paid: "확정",
  cancelled: "취소",
  expired: "만료",
};

// 전체 예약 CSV 다운로드 (엑셀에서 열림)
export async function GET() {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });
  const rows = await listBookings();
  const header = ["날짜", "시간", "상태", "성함", "연락처", "이메일", "드레스", "사이즈", "금액", "결제수단", "환불액", "예약번호", "결제시각", "메모"];
  const lines = rows.map((b) =>
    [
      b.slotDate,
      b.slotTime,
      STATUS[b.status] ?? b.status,
      b.customerName,
      b.phone,
      b.email,
      b.dressName,
      b.dressSize,
      b.amount,
      b.paymentMethod ?? "",
      b.refundAmount,
      b.orderId,
      formatKst(b.paidAt),
      b.adminMemo ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = "﻿" + [header.join(","), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="picdress-bookings.csv"`,
    },
  });
}
