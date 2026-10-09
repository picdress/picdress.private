import { NextResponse } from "next/server";
import { endSession } from "@/lib/auth";
import { config } from "@/lib/config";

export async function POST() {
  await endSession();
  return NextResponse.redirect(`${config.siteUrl}/admin/login`, 303);
}
