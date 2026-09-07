import { NextResponse } from "next/server";
import { run } from "@/lib/system";

export const dynamic = "force-dynamic";

type Proc = { name: string; status: string; cpu: number; memMB: number; uptime: number; restarts: number; pid: number };

export async function GET() {
  // pm2 jlist em JSON
  const raw = await run("pm2 jlist 2>/dev/null");
  let procs: Proc[] = [];
  try {
    const list = JSON.parse(raw);
    procs = list.map((p: Record<string, unknown>) => {
      const pm2env = (p.pm2_env || {}) as Record<string, unknown>;
      const monit = (p.monit || {}) as Record<string, number>;
      return {
        name: p.name as string,
        status: (pm2env.status as string) || "?",
        cpu: monit.cpu || 0,
        memMB: Math.round((monit.memory || 0) / 1048576),
        uptime: (pm2env.pm_uptime as number) || 0,
        restarts: (pm2env.restart_time as number) || 0,
        pid: (p.pid as number) || 0,
      };
    });
  } catch {
    procs = [];
  }

  // commit atual do repo
  const commit = (await run("cd /var/www/100bytes/repo && git log -1 --format='%h %s (%cr)' 2>/dev/null")).trim();
  const branch = (await run("cd /var/www/100bytes/repo && git rev-parse --abbrev-ref HEAD 2>/dev/null")).trim();

  // estado dos serviços de sistema
  const nginx = (await run("systemctl is-active nginx")).trim();
  const postgres = (await run("systemctl is-active postgresql")).trim();
  const autodeploy = (await run("systemctl is-active 100bytes-autodeploy.timer")).trim();
  const backup = (await run("systemctl is-active 100bytes-backup.timer")).trim();

  return NextResponse.json({ procs, commit, branch, system: { nginx, postgres, autodeploy, backup } });
}
