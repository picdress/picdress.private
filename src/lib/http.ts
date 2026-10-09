import { NextResponse } from "next/server";
import { BookingError } from "./bookings";
import { PaymentApiError } from "./portone";

export function clientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}

export function errorJson(e: unknown) {
  if (e instanceof BookingError || e instanceof PaymentApiError) {
    return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: "SERVER_ERROR", message: "잠시 후 다시 시도해 주세요." }, { status: 500 });
}

export function errorMessage(e: unknown) {
  if (e instanceof BookingError || e instanceof PaymentApiError) return e.message;
  console.error(e);
  return "처리 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
}

/** 고객 화면용 오류 코드 */
export function errorCode(e: unknown) {
  if (e instanceof BookingError) return e.code;
  if (e instanceof PaymentApiError) return "SERVER_ERROR";
  console.error(e);
  return "SERVER_ERROR";
}
