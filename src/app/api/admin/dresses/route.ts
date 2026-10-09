import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { config } from "@/lib/config";
import { db } from "@/lib/db";

// 드레스 가격 / 수량 / 노출 여부 수정
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.redirect(`${config.siteUrl}/admin/login`, 303);
  const form = await req.formData();
  const id = String(form.get("id") ?? "");
  const sql = db();
  try {
    const price = Number.parseInt(String(form.get("price") ?? "").replace(/[^\d]/g, ""), 10);
    const usdRaw = String(form.get("priceUsd") ?? "").trim();
    const priceUsd = usdRaw === "" ? null : Number(usdRaw);
    if (!Number.isFinite(price) || price < 0) throw new Error("가격을 확인해 주세요.");
    if (priceUsd !== null && (!Number.isFinite(priceUsd) || priceUsd <= 0)) throw new Error("달러 가격을 확인해 주세요.");

    await sql.begin(async (tx) => {
      await tx`
        update dresses set
          name = coalesce(nullif(${String(form.get("name") ?? "").trim()}, ''), name),
          name_en = ${String(form.get("nameEn") ?? "").trim() || null},
          name_zh = ${String(form.get("nameZh") ?? "").trim() || null},
          price = ${price},
          price_usd = ${priceUsd},
          model_size = ${String(form.get("modelSize") ?? "").trim() || null},
          model_spec = ${String(form.get("modelSpec") ?? "").trim() || null},
          active = ${form.get("active") === "on"}
        where id = ${id}
      `;
      for (const [key, value] of form.entries()) {
        if (!key.startsWith("qty:")) continue;
        const size = key.slice(4);
        const q = Math.max(0, Math.min(99, Number.parseInt(String(value), 10) || 0));
        await tx`update dress_stock set quantity = ${q} where dress_id = ${id} and size = ${size}`;
      }
    });
    return NextResponse.redirect(`${config.siteUrl}/admin/dresses?msg=${encodeURIComponent("저장했어요.")}`, 303);
  } catch (e) {
    return NextResponse.redirect(`${config.siteUrl}/admin/dresses?err=${encodeURIComponent((e as Error).message)}`, 303);
  }
}
