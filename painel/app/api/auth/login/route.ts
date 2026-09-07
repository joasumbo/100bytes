import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ error: "Dados em falta" }, { status: 400 });

  const user = await prisma.panelUser.findUnique({ where: { email: String(email).toLowerCase() } });
  if (!user || !user.active) return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });

  await setSession({ uid: user.id, email: user.email, name: user.name });
  return NextResponse.json({ ok: true });
}
