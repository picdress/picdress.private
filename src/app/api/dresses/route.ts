import { NextResponse } from "next/server";
import { listDresses } from "@/lib/dresses";
import { errorJson } from "@/lib/http";
import { isValidDate, isValidTime } from "@/lib/time";

export const dynamic = "force-dynamic";

// GET /api/dresses?date=2026-11-02&time=11:00 → 드레스 + 그 시간 사이즈별 남은 수량
export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const date = sp.get("date") ?? undefined;
    const time = sp.get("time") ?? undefined;
    const ok = date && time && isValidDate(date) && isValidTime(time);
    const dresses = await listDresses(ok ? { date, time } : {});
    return NextResponse.json({ dresses }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorJson(e);
  }
}
