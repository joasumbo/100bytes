import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const SECRET = process.env.PANEL_JWT_SECRET || "change-me";
const COOKIE = "panel_token";

export type Session = { uid: string; email: string; name: string };

export function signToken(s: Session): string {
  return jwt.sign(s, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): Session | null {
  try {
    return jwt.verify(token, SECRET) as Session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const c = await cookies();
  const t = c.get(COOKIE)?.value;
  return t ? verifyToken(t) : null;
}

export async function setSession(s: Session) {
  const c = await cookies();
  c.set(COOKIE, signToken(s), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const c = await cookies();
  c.delete(COOKIE);
}

export const COOKIE_NAME = COOKIE;
