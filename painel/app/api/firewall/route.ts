import { NextResponse } from "next/server";
import { run } from "@/lib/system";

export const dynamic = "force-dynamic";

type Rule = { num: number; text: string };

// IPv4 ou IPv6 (só caracteres válidos; nada que possa ir parar ao shell)
const IP_RE = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9a-fA-F:]{2,39})$/;

/** IP de quem está a usar o painel (atrás do nginx). */
function ipDoPedido(req: Request) {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = fwd || req.headers.get("x-real-ip")?.trim() || "";
  return IP_RE.test(ip) ? ip : null;
}

export async function GET(req: Request) {
  const raw = await run("sudo ufw status numbered 2>/dev/null");
  const active = /Status:\s*active/i.test(raw);
  const rules: Rule[] = [];
  for (const line of raw.split("\n")) {
    const m = line.match(/^\[\s*(\d+)\]\s+(.*)$/);
    if (m) rules.push({ num: Number(m[1]), text: m[2].replace(/\s+/g, " ").trim() });
  }
  const fail2ban = (await run("systemctl is-active fail2ban")).trim();
  // Todas as jails (sshd, recidive, …): um IP pode estar banido em qualquer uma
  const listaJails = (await run("sudo fail2ban-client status 2>/dev/null")).match(/Jail list:\s*(.*)/i)?.[1] ?? "sshd";
  const nomes = listaJails.split(/[,\s]+/).filter((j) => /^[A-Za-z0-9_.-]+$/.test(j));
  const jails: { name: string; banned: string[] }[] = [];
  for (const nome of nomes) {
    const estado = await run(`sudo fail2ban-client status ${nome} 2>/dev/null`);
    const ips = (estado.match(/Banned IP list:\s*(.*)/i)?.[1] ?? "").split(/\s+/).filter((ip) => IP_RE.test(ip));
    jails.push({ name: nome, banned: ips });
  }
  const bannedIps = [...new Set(jails.flatMap((j) => j.banned))];
  const banned = String(bannedIps.length);
  return NextResponse.json({ active, rules, fail2ban, banned, bannedIps, jails, myIp: ipDoPedido(req) });
}

export async function POST(req: Request) {
  const { action, port, proto, ip } = await req.json().catch(() => ({}));

  // Desbloquear um IP no fail2ban (SSH) e marcá-lo como de confiança
  if (action === "unban") {
    const alvo = String(ip ?? "").trim();
    if (!IP_RE.test(alvo)) return NextResponse.json({ error: "IP inválido" }, { status: 400 });
    // Desbanir em todas as jails (sshd, recidive, …) e não voltar a banir
    const geral = await run(`sudo fail2ban-client unban ${alvo} 2>&1`);
    const listaJails = (await run("sudo fail2ban-client status 2>/dev/null")).match(/Jail list:\s*(.*)/i)?.[1] ?? "sshd";
    const saidas: string[] = [`unban: ${geral.trim()}`];
    for (const nome of listaJails.split(/[,\s]+/).filter((j) => /^[A-Za-z0-9_.-]+$/.test(j))) {
      const out = await run(`sudo fail2ban-client set ${nome} unbanip ${alvo} 2>&1`);
      await run(`sudo fail2ban-client set ${nome} addignoreip ${alvo} 2>&1`);
      saidas.push(`${nome}: ${out.trim()}`);
    }
    // Regras "deny" do ufw para este IP, se existirem
    await run(`sudo ufw delete deny from ${alvo} 2>&1`);
    return NextResponse.json({ ok: true, output: saidas.join(" | ") });
  }

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
