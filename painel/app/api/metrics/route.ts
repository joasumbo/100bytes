import { NextResponse } from "next/server";
import { snapshot } from "@/lib/system";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

let lastPersist = 0;

export async function GET() {
  const snap = await snapshot();

  // Persistir no máximo a cada 45s (histórico p/ gráficos de tendência)
  const now = Date.now();
  if (now - lastPersist > 45_000) {
    lastPersist = now;
    prisma.metric
      .create({
        data: {
          cpu: snap.cpu,
          memUsed: snap.memUsed,
          memTotal: snap.memTotal,
          diskUsed: snap.diskUsed,
          diskTotal: snap.diskTotal,
          netRx: snap.netRx,
          netTx: snap.netTx,
          load1: snap.load1,
          uptime: snap.uptime,
        },
      })
      .catch(() => {});
  }

  return NextResponse.json(snap);
}
