import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Ingestão de erros das outras apps (backend/frontend/admin/pagamentos).
// Autenticado por token partilhado (INGEST_TOKEN), não por sessão.
export async function POST(req: Request) {
  const token = req.headers.get("x-ingest-token");
  if (!process.env.INGEST_TOKEN || token !== process.env.INGEST_TOKEN) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const b = await req.json().catch(() => ({}));
  const ev = await prisma.errorEvent.create({
    data: {
      source: String(b.source || "system"),
      level: String(b.level || "error"),
      message: String(b.message || "erro sem mensagem").slice(0, 2000),
      stack: b.stack ? String(b.stack).slice(0, 8000) : null,
      url: b.url ? String(b.url).slice(0, 500) : null,
      meta: b.meta ?? undefined,
    },
  });

  // Enviar email (Resend) — não bloqueia a resposta
  sendErrorEmail(ev).catch(() => {});
  return NextResponse.json({ ok: true, id: ev.id });
}

async function sendErrorEmail(ev: {
  id: string;
  source: string;
  level: string;
  message: string;
  stack: string | null;
  url: string | null;
  createdAt: Date;
}) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL || "joasumbo@gmail.com";
  const from = process.env.ALERT_FROM || "alertas@100bytes.co.ao";
  if (!key) return; // sem key configurada, guarda mas não envia

  const html = `
    <h2 style="margin:0 0 8px">🐞 Erro no VPS 100bytes</h2>
    <p><b>Origem:</b> ${ev.source} &nbsp; <b>Nível:</b> ${ev.level}</p>
    <p><b>Mensagem:</b> ${escapeHtml(ev.message)}</p>
    ${ev.url ? `<p><b>URL:</b> ${escapeHtml(ev.url)}</p>` : ""}
    ${ev.stack ? `<pre style="background:#111;color:#eee;padding:12px;border-radius:8px;overflow:auto">${escapeHtml(ev.stack)}</pre>` : ""}
    <p style="color:#888">${new Date(ev.createdAt).toLocaleString("pt-PT")} · id ${ev.id}</p>
    <p><a href="https://vercel.100bytes.co.ao/erros">Ver no painel →</a></p>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject: `[${ev.source}] ${ev.message.slice(0, 80)}`, html }),
  });
  if (res.ok) {
    await prisma.errorEvent.update({ where: { id: ev.id }, data: { emailed: true } });
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
