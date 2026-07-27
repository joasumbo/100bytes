"use client";
import { useAuth } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import UserAvatar from "@/components/admin/UserAvatar";
import { Toaster } from "sonner";

const mainNav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/produtos", label: "Produtos" },
  { href: "/pedidos", label: "Encomendas" },
  { href: "/clientes", label: "Clientes" },
  { href: "/pagamentos", label: "Financas" },
];

const drawerNav = [
  { href: "/categorias", label: "Categorias", d: "M4 6h16M4 10h16M4 14h16M4 18h16" },
  { href: "/marcas", label: "Marcas", d: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" },
  { href: "/marketing", label: "Marketing", d: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" },
  { href: "/conteudo", label: "Conteudo", d: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/entregas", label: "Entregas", d: "M8 17.929H6c-1.105 0-2-.895-2-2V6c0-1.105.895-2 2-2h2m0 0h8m-8 0v13m8-13h2c1.105 0 2 .895 2 2v9.929c0 1.105-.895 2-2 2h-2m0 0H8m8 0v-4" },
  { href: "/devolucoes", label: "Devolucoes", d: "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" },
  { href: "/relatorios", label: "Relatorios", d: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { href: "/notificacoes", label: "Notificacoes", d: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
  { href: "/utilizadores", label: "Utilizadores", d: "M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0M19 21a7 7 0 10-14 0" },
  { href: "/configuracoes", label: "Configuracoes", d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!mounted || loading || !user) return null;

  return (
    <div className="min-h-screen" style={{ background: "#f5f5f7" }}>
      {/* Top bar */}
      <header className="sticky top-0 z-30 px-4 lg:px-8 py-4" style={{ background: "#f5f5f7" }}>
        <div className="flex items-center gap-3">
          {/* Logo */}
          <Link href="/dashboard" className="flex-shrink-0 mr-2">
            <img src="https://cdn.100bytes.co.ao/logo/logo_100bytes.png" alt="100bytes" className="h-12 w-auto object-contain" />
          </Link>

          {/* Hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
            className="w-11 h-11 rounded-full bg-white flex items-center justify-center transition hover:shadow-sm"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#1f2937" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Pill nav */}
          <nav className="hidden md:flex items-center gap-1 bg-white rounded-full px-2 py-1.5 ml-2" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            {mainNav.map(item => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${active ? "text-white" : "text-gray-600 hover:bg-gray-50"}`}
                  style={active ? { background: "#F57C00", boxShadow: "0 2px 6px rgba(245,124,0,0.25)" } : {}}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1" />

          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen(!notifOpen); setUserMenu(false); }}
              className="w-11 h-11 rounded-full bg-white flex items-center justify-center transition hover:shadow-sm relative"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              aria-label="Notificacoes"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#1f2937" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-2.5 right-3 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            {notifOpen && (
              <div
                className="absolute right-0 mt-2 w-72 bg-white rounded-2xl p-5 z-40"
                style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)", animation: "fadeIn .15s ease-out" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-gray-900">Notificacoes</h3>
                  <Link href="/notificacoes" onClick={() => setNotifOpen(false)} className="text-xs text-orange-500 hover:text-orange-600">Ver todas</Link>
                </div>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">Sem notificacoes</p>
                  <p className="text-xs text-gray-400 mt-1">Vai aparecer aqui quando houver novidades</p>
                </div>
              </div>
            )}
          </div>

          {/* User */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => { setUserMenu(!userMenu); setNotifOpen(false); }}
              className="flex items-center gap-2.5 bg-white rounded-full pl-1 pr-3 py-1 transition hover:shadow-sm"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <UserAvatar name={user.name} photoKey={user.photoKey} size={36} textSizeClass="text-sm" />
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-sm font-semibold text-gray-900">{user.name}</span>
                <span className="text-[11px] text-gray-400">Super Admin</span>
              </div>
              <svg className="hidden sm:block ml-1" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#6b7280" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {userMenu && (
              <div
                className="absolute right-0 mt-2 w-60 bg-white rounded-2xl p-2 z-40"
                style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)", animation: "fadeIn .15s ease-out" }}
              >
                <div className="px-3 py-3 border-b border-gray-50 mb-1">
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
                <Link href="/conta" onClick={() => setUserMenu(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition text-sm text-gray-700">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0M19 21a7 7 0 10-14 0" />
                  </svg>
                  Minha conta
                </Link>
                <button
                  onClick={() => { logout(); router.push("/"); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition text-sm text-red-600"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Terminar sessao
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-40"
          style={{ background: "rgba(15,23,42,0.35)", backdropFilter: "blur(4px)", animation: "fadeIn .2s ease-out" }}
        />
      )}

      {/* Drawer */}
      <aside
        className="fixed top-0 left-0 h-full w-80 z-50 flex flex-col"
        style={{
          background: "#fff",
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform .35s cubic-bezier(.16,1,.3,1)",
          boxShadow: drawerOpen ? "0 20px 60px rgba(0,0,0,0.15)" : "none",
        }}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <img src="https://cdn.100bytes.co.ao/logo/logo_100bytes.png" alt="100bytes" className="h-12" />
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition"
            aria-label="Fechar"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#374151" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Navegacao principal</p>
          {mainNav.map((it, i) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${pathname === it.href ? "bg-orange-50 text-orange-600" : "text-gray-700 hover:bg-gray-50"}`}
              style={{ animation: drawerOpen ? `slideIn .4s cubic-bezier(.16,1,.3,1) ${i * 30}ms both` : undefined }}
            >
              {it.label}
            </Link>
          ))}
          <p className="px-3 mt-5 mb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Mais opcoes</p>
          {drawerNav.map((it, i) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${pathname === it.href ? "bg-orange-50 text-orange-600 font-medium" : "text-gray-600 hover:bg-gray-50"}`}
              style={{ animation: drawerOpen ? `slideIn .4s cubic-bezier(.16,1,.3,1) ${(mainNav.length + i) * 30}ms both` : undefined }}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d={it.d} />
              </svg>
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-gray-100">
          <p className="text-[11px] text-gray-400">100bytes Admin v1.0.0</p>
        </div>
      </aside>

      {/* Content */}
      <main className="px-4 lg:px-8 pb-10">{children}</main>

      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{ style: { fontFamily: "inherit" } }}
      />

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}