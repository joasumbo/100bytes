import { NextResponse } from "next/server";
import { listTables, targets } from "@/lib/dbadmin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const target = new URL(req.url).searchParams.get("target") || "loja";
  try {
    const tables = await listTables(target);
    return NextResponse.json({ target, targets: targets(), tables });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, targets: targets() }, { status: 400 });
  }
}
