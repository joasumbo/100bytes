import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await prisma.metric.findMany({
    orderBy: { ts: "desc" },
    take: 120,
  });
  // BigInt id -> serializável; devolver por ordem cronológica
  const data = rows.reverse().map((r) => ({
    ts: r.ts,
    cpu: r.cpu,
    memPct: Math.round((r.memUsed / r.memTotal) * 1000) / 10,
    netRx: r.netRx,
    netTx: r.netTx,
    load1: r.load1,
  }));
  return NextResponse.json(data);
}
