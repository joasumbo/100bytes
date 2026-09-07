"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
      <form onSubmit={submit} className="card" style={{ padding: 32, width: 380, maxWidth: "100%" }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>▲ Painel VPS</div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 24 }}>100bytes — gestão do servidor</div>
        <label className="muted" style={{ fontSize: 12 }}>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ margin: "6px 0 14px" }} autoFocus />
        <label className="muted" style={{ fontSize: 12 }}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ margin: "6px 0 18px" }} />
        {err && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <button className="btn" style={{ width: "100%" }} disabled={loading}>
          {loading ? "A entrar…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
