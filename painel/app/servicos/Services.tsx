"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { GitCommitHorizontal, RotateCw, Rocket } from "lucide-react";

type Proc = { name: string; status: string; cpu: number; memMB: number; uptime: number; restarts: number };
type Data = { procs: Proc[]; commit: string; branch: string; system: Record<string, string> };

function since(ms: number) {
  if (!ms) return "—";
  const s = Math.floor((Date.now() - ms) / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

const APPS = ["backend", "frontend", "admin", "painel"];
const ok = (v: string) => v === "active" || v === "online";

function Badge({ v }: { v: string }) {
  const good = ok(v);
  return (
    <span className="badge" style={{ color: good ? "var(--success)" : "var(--danger)", borderColor: good ? "#c7ecd4" : "#f4c7c9", background: good ? "#f2fbf5" : "#fef2f2" }}>
      <span className="dot" style={{ background: good ? "var(--success)" : "var(--danger)" }} />
      {v}
    </span>
  );
}

export default function Services() {
  const [data, setData] = useState<Data | null>(null);
  const [deploying, setDeploying] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/services", { cache: "no-store" });
    if (r.ok) setData(await r.json());
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  async function deploy(app: string) {
    setDeploying(app);
    toast.loading(`A fazer deploy: ${app}…`, { id: "dep" });
    try {
      const r = await fetch("/api/deploy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apps: app === "todos" ? [] : [app] }) });
      const j = await r.json();
      toast[j.ok ? "success" : "error"](j.ok ? `Deploy concluído · ${j.commit}` : "Deploy falhou", { id: "dep" });
      load();
    } catch { toast.error("Erro no deploy", { id: "dep" }); }
    finally { setDeploying(null); }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1>Serviços & Deploys</h1>
        <button className="btn" onClick={() => deploy("todos")} disabled={!!deploying}>
          <Rocket size={15} /> {deploying ? "A fazer deploy…" : "Deploy total"}
        </button>
      </div>
      {data && (
        <p className="muted" style={{ fontSize: 13, marginBottom: 22, display: "flex", alignItems: "center", gap: 6 }}>
          <GitCommitHorizontal size={15} /> <b style={{ color: "var(--text)", fontWeight: 500 }}>{data.branch}</b>
          <span className="mono">{data.commit}</span>
        </p>
      )}

      <div className="card" style={{ overflow: "hidden", marginBottom: 24 }}>
        <table>
          <thead><tr><th>Serviço</th><th>Estado</th><th>CPU</th><th>Memória</th><th>Uptime</th><th>Restarts</th><th></th></tr></thead>
          <tbody>
            {(data?.procs || []).map((p) => {
              const short = p.name.replace("100bytes-", "");
              return (
                <tr key={p.name}>
                  <td style={{ fontWeight: 500 }}>{short}</td>
                  <td><Badge v={p.status} /></td>
                  <td className="muted">{p.cpu}%</td>
                  <td className="muted">{p.memMB} MB</td>
                  <td className="muted">{since(p.uptime)}</td>
                  <td className="muted">{p.restarts}</td>
                  <td style={{ textAlign: "right" }}>
                    {APPS.includes(short) && (
                      <button className="btn-ghost btn-sm" onClick={() => deploy(short)} disabled={!!deploying}>
                        <RotateCw size={13} /> Deploy
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!data?.procs?.length && <tr><td colSpan={7} className="muted" style={{ padding: 20 }}>A carregar serviços…</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginBottom: 12 }}>Serviços de sistema</h2>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {data && Object.entries(data.system).map(([k, v]) => (
          <div key={k} className="card" style={{ padding: 16, minWidth: 160 }}>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>{k}</div>
            <Badge v={v} />
          </div>
        ))}
      </div>
    </div>
  );
}
