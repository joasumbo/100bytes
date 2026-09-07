import { NextResponse } from "next/server";
import { run } from "@/lib/system";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const VALID = ["backend", "frontend", "admin", "painel"];

export async function POST(req: Request) {
  const { apps } = await req.json().catch(() => ({}));
  const list: string[] = Array.isArray(apps) ? apps.filter((a) => VALID.includes(a)) : [];
  const target = list.length ? list.join(" ") : "";

  const log = await prisma.deployLog.create({
    data: { apps: target || "todos", status: "running" },
  });

  const out = await run(`/var/www/100bytes/deploy.sh ${target} 2>&1`);
  const success = /deploy concluido/.test(out);
  const commit = (await run("cd /var/www/100bytes/repo && git rev-parse --short HEAD")).trim();

  await prisma.deployLog.update({
    where: { id: log.id },
    data: { status: success ? "success" : "failed", output: out.slice(-8000), commit },
  });

  return NextResponse.json({ ok: success, commit, output: out.slice(-8000) });
}

export async function GET() {
  const logs = await prisma.deployLog.findMany({ orderBy: { createdAt: "desc" }, take: 15 });
  return NextResponse.json(logs);
}
