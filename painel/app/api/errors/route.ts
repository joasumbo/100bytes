import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [rows, counts] = await Promise.all([
    prisma.errorEvent.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.errorEvent.groupBy({ by: ["source"], _count: true, where: { resolved: false } }),
  ]);
  return NextResponse.json({ rows, counts });
}

export async function PATCH(req: Request) {
  const { id, resolved } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id em falta" }, { status: 400 });
  await prisma.errorEvent.update({ where: { id }, data: { resolved: !!resolved } });
  return NextResponse.json({ ok: true });
}
