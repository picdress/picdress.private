import { NextResponse } from "next/server";
import { BookingError } from "./bookings";
import { TossError } from "./toss";

export function clientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}

export function errorJson(e: unknown) {
  if (e instanceof BookingError || e instanceof TossError) {
    return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: "SERVER_ERROR", message: "잠시 후 다시 시도해 주세요." }, { status: 500 });
}

export function errorMessage(e: unknown) {
  if (e instanceof BookingError || e instanceof TossError) return e.message;
  console.error(e);
  return "처리 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
}
