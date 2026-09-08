import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { run } from "@/lib/system";

export const dynamic = "force-dynamic";

const APPS: Record<string, { path: string; pm2: string }> = {
  backend: { path: "/var/www/100bytes/repo/Backend/.env", pm2: "100bytes-backend" },
  frontend: { path: "/var/www/100bytes/repo/frontend/.env", pm2: "100bytes-frontend" },
  admin: { path: "/var/www/100bytes/repo/admin/.env", pm2: "100bytes-admin" },
  painel: { path: "/var/www/100bytes/repo/painel/.env", pm2: "100bytes-painel" },
};

const SECRET = /(SECRET|TOKEN|PASSWORD|KEY|DATABASE_URL|R2_)/i;

export async function GET(req: Request) {
  const app = new URL(req.url).searchParams.get("app") || "backend";
  const cfg = APPS[app];
  if (!cfg) return NextResponse.json({ error: "app inválida", apps: Object.keys(APPS) }, { status: 400 });
  let content = "";
  try { content = await readFile(cfg.path, "utf8"); } catch { content = ""; }
  const vars = content
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      const key = l.slice(0, i).trim();
      let val = l.slice(i + 1).trim().replace(/^"|"$/g, "");
      const secret = SECRET.test(key);
      return { key, value: val, secret };
    });
  return NextResponse.json({ app, apps: Object.keys(APPS), vars });
}

export async function PUT(req: Request) {
  const { app, vars } = await req.json().catch(() => ({}));
  const cfg = APPS[app];
  if (!cfg || !Array.isArray(vars)) return NextResponse.json({ error: "pedido inválido" }, { status: 400 });
  const body = vars
    .filter((v: { key?: string }) => v.key && /^[A-Za-z_][A-Za-z0-9_]*$/.test(v.key))
    .map((v: { key: string; value: string }) => `${v.key}="${String(v.value).replace(/"/g, '\\"')}"`)
    .join("\n");
  await writeFile(cfg.path, body + "\n", { mode: 0o600 });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  // Reiniciar a app após editar env
  const { app } = await req.json().catch(() => ({}));
  const cfg = APPS[app];
  if (!cfg) return NextResponse.json({ error: "app inválida" }, { status: 400 });
  await run(`pm2 restart ${cfg.pm2} --update-env 2>&1`);
  return NextResponse.json({ ok: true });
}
