import { NextResponse } from "next/server";
import { tableDetail } from "@/lib/dbadmin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  const target = u.get("target") || "loja";
  const table = u.get("table") || "";
  const page = Math.max(0, parseInt(u.get("page") || "0", 10) || 0);
  try {
    const detail = await tableDetail(target, table, page);
    return NextResponse.json(detail);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
