import { NextResponse } from "next/server";
import { run } from "@/lib/system";

export const dynamic = "force-dynamic";

const SOURCES: Record<string, string> = {
  "backend-out": "tail -n 200 ~/.pm2/logs/100bytes-backend-out.log 2>/dev/null",
  "backend-err": "tail -n 200 ~/.pm2/logs/100bytes-backend-error.log 2>/dev/null",
  "frontend-out": "tail -n 200 ~/.pm2/logs/100bytes-frontend-out.log 2>/dev/null",
  "frontend-err": "tail -n 200 ~/.pm2/logs/100bytes-frontend-error.log 2>/dev/null",
  "admin-out": "tail -n 200 ~/.pm2/logs/100bytes-admin-out.log 2>/dev/null",
  "admin-err": "tail -n 200 ~/.pm2/logs/100bytes-admin-error.log 2>/dev/null",
  "nginx-access": "sudo tail -n 200 /var/log/nginx/access.log 2>/dev/null",
  "nginx-error": "sudo tail -n 200 /var/log/nginx/error.log 2>/dev/null",
  backup: "tail -n 200 /var/backups/100bytes/backup.log 2>/dev/null",
  autodeploy: "journalctl -u 100bytes-autodeploy.service -n 200 --no-pager 2>/dev/null",
};

export async function GET(req: Request) {
  const src = new URL(req.url).searchParams.get("src") || "backend-err";
  const cmd = SOURCES[src];
  if (!cmd) return NextResponse.json({ error: "fonte inválida", sources: Object.keys(SOURCES) }, { status: 400 });
  const out = await run(cmd);
  return NextResponse.json({ src, sources: Object.keys(SOURCES), content: out || "(vazio)" });
}
