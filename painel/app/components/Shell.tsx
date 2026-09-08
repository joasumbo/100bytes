"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Rocket,
  ScrollText,
  TriangleAlert,
  Database,
  Image as ImageIcon,
  Settings,
  ChartColumn,
  LogOut,
  Server,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Visão geral", icon: LayoutGrid },
  { href: "/analytics", label: "Analytics", icon: ChartColumn },
  { href: "/servicos", label: "Serviços & Deploys", icon: Rocket },
  { href: "/base-dados", label: "Base de dados", icon: Database },
  { href: "/media", label: "Média", icon: ImageIcon },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/erros", label: "Erros", icon: TriangleAlert },
  { href: "/definicoes", label: "Definições", icon: Settings },
];

export default function Shell({ children, user, title }: { children: React.ReactNode; user?: string; title?: string }) {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const current = NAV.find((n) => n.href === path)?.label || title || "";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 248,
          borderRight: "1px solid var(--border)",
          background: "#fff",
          padding: "16px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 10px 16px", fontWeight: 600, fontSize: 15 }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: "#171717", color: "#fff", display: "grid", placeItems: "center" }}>
            <Server size={15} />
          </span>
          Painel VPS
        </div>
        {NAV.map((n) => {
          const active = path === n.href;
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", borderRadius: 8, fontSize: 14,
                background: active ? "#f4f4f5" : "transparent",
                color: active ? "var(--text)" : "var(--muted)",
                fontWeight: active ? 500 : 400,
              }}
            >
              <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
              {n.label}
            </Link>
          );
        })}
        <div style={{ marginTop: "auto", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <div className="muted" style={{ fontSize: 12, padding: "0 10px 10px" }}>{user}</div>
          <button className="btn-ghost btn-sm" style={{ width: "100%", justifyContent: "center" }} onClick={logout}>
            <LogOut size={15} /> Sair
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header
          style={{
            height: 56, borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,.8)",
            backdropFilter: "blur(8px)", display: "flex", alignItems: "center", padding: "0 28px",
            position: "sticky", top: 0, zIndex: 10, fontSize: 14, fontWeight: 500,
          }}
        >
          <span className="muted">100bytes</span>
          <span className="muted" style={{ margin: "0 8px" }}>/</span>
          <span>{current}</span>
        </header>
        <main style={{ flex: 1, padding: "28px", maxWidth: 1180, width: "100%" }}>{children}</main>
      </div>
    </div>
  );
}
