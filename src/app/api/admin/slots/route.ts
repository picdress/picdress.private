import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { isValidDate, isValidTime, slotTimes } from "@/lib/time";

// 타임 정원 변경 / 마감 / 다시 열기
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.redirect(`${config.siteUrl}/admin/login`, 303);
  const form = await req.formData();
  const date = String(form.get("date") ?? "");
  const time = String(form.get("time") ?? "");
  const capRaw = String(form.get("capacity") ?? "");
  const back = `/admin?date=${date}`;
  if (!isValidDate(date)) return NextResponse.redirect(`${config.siteUrl}/admin?err=${encodeURIComponent("날짜가 올바르지 않아요.")}`, 303);

  const sql = db();
  const times = time === "ALL" ? null : [time];
  if (times && !isValidTime(time)) return NextResponse.redirect(`${config.siteUrl}${back}`, 303);
  if (capRaw === "") return NextResponse.redirect(`${config.siteUrl}${back}`, 303);

  if (capRaw === "default") {
    if (times) await sql`delete from slot_overrides where slot_date = ${date} and slot_time = ${time}`;
    else await sql`delete from slot_overrides where slot_date = ${date}`;
  } else {
    const capacity = Math.max(0, Math.min(50, Number.parseInt(capRaw, 10) || 0));
    for (const t of times ?? slotTimes()) {
      await sql`
        insert into slot_overrides (slot_date, slot_time, capacity) values (${date}, ${t}, ${capacity})
        on conflict (slot_date, slot_time) do update set capacity = excluded.capacity
      `;
    }
  }
  return NextResponse.redirect(`${config.siteUrl}${back}&msg=${encodeURIComponent("타임 설정을 바꿨어요.")}`, 303);
}
