"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/", label: "Visão geral", icon: "▲" },
  { href: "/servicos", label: "Serviços & Deploys", icon: "🚀" },
  { href: "/logs", label: "Logs", icon: "📜" },
  { href: "/erros", label: "Erros", icon: "🐞" },
];

export default function Shell({ children, user }: { children: React.ReactNode; user?: string }) {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 230,
          borderRight: "1px solid var(--border)",
          padding: "18px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, padding: "4px 10px 18px" }}>▲ Painel VPS</div>
        {NAV.map((n) => {
          const active = path === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              style={{
                padding: "9px 12px",
                borderRadius: 8,
                fontSize: 14,
                background: active ? "#1a1a1e" : "transparent",
                color: active ? "#fff" : "var(--muted)",
                fontWeight: active ? 600 : 400,
              }}
            >
              <span style={{ marginRight: 8 }}>{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
        <div style={{ marginTop: "auto", fontSize: 12 }} className="muted">
          <div style={{ padding: "0 10px 8px" }}>{user}</div>
          <button className="btn-ghost" style={{ width: "100%" }} onClick={logout}>
            Sair
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: "28px 32px", maxWidth: 1200 }}>{children}</main>
    </div>
  );
}
