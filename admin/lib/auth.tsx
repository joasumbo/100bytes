"use client";
import { fetchAPI } from "@/lib/api";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthUser { id: string; name: string; email: string; role: string; photoKey?: string | null; }
interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Ao montar, verifica sessão activa no servidor (via cookie HTTP-only)
  useEffect(() => {
    fetchAPI("/auth/me")
      .then(r => r.json())
      .then(d => setUser(d.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, pass: string) {
    try {
      const res = await fetchAPI("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error ?? "Credenciais inválidas." };
      setUser(data.user);
      return { ok: true };
    } catch {
      return { ok: false, error: "Erro de ligação ao servidor." };
    }
  }

  async function logout() {
    await fetchAPI("/auth/logout", { method: "POST" });
    setUser(null);
  }

  function updateUser(updates: Partial<AuthUser>) {
    if (!user) return;
    setUser({ ...user, ...updates });
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
