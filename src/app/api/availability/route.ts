import { NextResponse } from "next/server";
import { dateSummary, daySlots } from "@/lib/availability";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { errorJson } from "@/lib/http";
import { isValidDate, openDates } from "@/lib/time";

export const dynamic = "force-dynamic";

// GET /api/availability            → 날짜별 남은 자리 합계 (달력)
// GET /api/availability?date=...   → 그 날 타임별 남은 자리
export async function GET(req: Request) {
  try {
    const date = new URL(req.url).searchParams.get("date");
    if (date) {
      if (!isValidDate(date)) return NextResponse.json({ slots: [] });
      const slots = await daySlots(db(), date);
      return NextResponse.json(
        { slots: slots.map((s) => ({ time: s.time, remaining: s.remaining, closed: s.closed })) },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { openStart: config.openStart, openEnd: config.openEnd, openDates: openDates(), dates: await dateSummary() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorJson(e);
  }
}
