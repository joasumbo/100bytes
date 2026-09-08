import { NextResponse } from "next/server";
import { run } from "@/lib/system";

export const dynamic = "force-dynamic";

type Rule = { num: number; text: string };

export async function GET() {
  const raw = await run("sudo ufw status numbered 2>/dev/null");
  const active = /Status:\s*active/i.test(raw);
  const rules: Rule[] = [];
  for (const line of raw.split("\n")) {
    const m = line.match(/^\[\s*(\d+)\]\s+(.*)$/);
    if (m) rules.push({ num: Number(m[1]), text: m[2].replace(/\s+/g, " ").trim() });
  }
  const fail2ban = (await run("systemctl is-active fail2ban")).trim();
  const banned = (await run("sudo fail2ban-client status sshd 2>/dev/null | grep -i 'Currently banned' | grep -oE '[0-9]+' | head -1")).trim() || "0";
  return NextResponse.json({ active, rules, fail2ban, banned });
}

export async function POST(req: Request) {
  const { action, port, proto } = await req.json().catch(() => ({}));
  const p = String(port || "").replace(/[^0-9]/g, "");
  const pr = proto === "udp" ? "udp" : "tcp";
  // Proteção: nunca mexer no SSH (22) por aqui
  if (p === "22") return NextResponse.json({ error: "Porta 22 (SSH) protegida" }, { status: 400 });
  if (!["allow", "deny"].includes(action) || !p) return NextResponse.json({ error: "pedido inválido" }, { status: 400 });
  const out = await run(`sudo ufw ${action} ${p}/${pr} 2>&1`);
  return NextResponse.json({ ok: /added|updated|inserted|skipped/i.test(out), output: out.trim() });
}

export async function DELETE(req: Request) {
  const num = new URL(req.url).searchParams.get("num");
  if (!num) return NextResponse.json({ error: "num em falta" }, { status: 400 });
  // Descobrir a regra pelo número e impedir remover SSH
  const status = await run("sudo ufw status numbered 2>/dev/null");
  const line = status.split("\n").find((l) => l.trim().startsWith(`[${String(num).padStart(2, " ").trim()}]`) || l.includes(`[ ${num}]`) || l.includes(`[${num}]`));
  if (line && /\b22\b/.test(line)) return NextResponse.json({ error: "Porta 22 (SSH) protegida" }, { status: 400 });
  const out = await run(`echo y | sudo ufw delete ${Number(num)} 2>&1`);
  return NextResponse.json({ ok: /Deleting|deleted/i.test(out), output: out.trim() });
}
