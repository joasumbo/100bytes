"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

type Proc = { name: string; status: string; cpu: number; memMB: number; uptime: number; restarts: number };
type Data = { procs: Proc[]; commit: string; branch: string; system: Record<string, string> };

function since(ms: number) {
  if (!ms) return "—";
  const s = Math.floor((Date.now() - ms) / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

const APPS = ["backend", "frontend", "admin", "painel"];

export default function Services() {
  const [data, setData] = useState<Data | null>(null);
  const [deploying, setDeploying] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/services", { cache: "no-store" });
    if (r.ok) setData(await r.json());
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function deploy(app: string) {
    setDeploying(app);
    toast.loading(`A fazer deploy: ${app}…`, { id: "dep" });
    try {
      const r = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apps: app === "todos" ? [] : [app] }),
      });
      const j = await r.json();
      toast[j.ok ? "success" : "error"](j.ok ? `Deploy OK (${j.commit})` : "Deploy falhou", { id: "dep" });
      load();
    } catch {
      toast.error("Erro no deploy", { id: "dep" });
    } finally {
      setDeploying(null);
    }
  }

  const dot = (v: string) => (
    <span style={{ color: v === "active" || v === "online" ? "#22c55e" : "#f87171" }}>●</span>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Serviços & Deploys</h1>
        <button className="btn" onClick={() => deploy("todos")} disabled={!!deploying}>
          {deploying ? "A fazer deploy…" : "Deploy total"}
        </button>
      </div>
      {data && (
        <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
          Repo <b>{data.branch}</b> · {data.commit}
        </p>
      )}

      <div className="card" style={{ padding: 0, marginBottom: 20, overflow: "hidden" }}>
        {(data?.procs || []).map((p) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ width: 150, fontWeight: 600 }}>{dot(p.status)} {p.name.replace("100bytes-", "")}</span>
            <span className="muted" style={{ fontSize: 13, width: 90 }}>{p.status}</span>
            <span className="muted" style={{ fontSize: 13, width: 80 }}>CPU {p.cpu}%</span>
            <span className="muted" style={{ fontSize: 13, width: 100 }}>{p.memMB} MB</span>
            <span className="muted" style={{ fontSize: 13, width: 90 }}>up {since(p.uptime)}</span>
            <span className="muted" style={{ fontSize: 13, flex: 1 }}>↺ {p.restarts}</span>
            {APPS.includes(p.name.replace("100bytes-", "")) && (
              <button className="btn-ghost" onClick={() => deploy(p.name.replace("100bytes-", ""))} disabled={!!deploying}>
                Deploy
              </button>
            )}
          </div>
        ))}
        {!data?.procs?.length && <div style={{ padding: 18 }} className="muted">A carregar serviços…</div>}
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Serviços de sistema</h2>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {data && Object.entries(data.system).map(([k, v]) => (
          <div key={k} className="card" style={{ padding: 16, minWidth: 150 }}>
            <div className="muted" style={{ fontSize: 12 }}>{k}</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{dot(v)} {v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
