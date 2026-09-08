"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Server } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) router.push("/");
    else setErr((await res.json().catch(() => ({}))).error || "Falha no login");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form onSubmit={submit} className="card" style={{ padding: 34, width: 380, maxWidth: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: "#171717", color: "#fff", display: "grid", placeItems: "center" }}>
            <Server size={17} />
          </span>
          <span style={{ fontSize: 19, fontWeight: 600 }}>Painel VPS</span>
        </div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 26 }}>100bytes — gestão do servidor</div>
        <label className="muted" style={{ fontSize: 12.5 }}>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ margin: "6px 0 16px" }} autoFocus />
        <label className="muted" style={{ fontSize: 12.5 }}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ margin: "6px 0 20px" }} />
        {err && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 14 }}>{err}</div>}
        <button className="btn" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
          {loading ? "A entrar…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
