"use client";
import { useEffect, useState, useCallback } from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type Data = {
  total: number;
  status: Record<string, number>;
  errRate: number;
  avgMs: number;
  p95Ms: number;
  timeline: { t: string; requests: number }[];
  topPaths: { path: string; n: number }[];
  domains: { domain: string; n: number }[];
  slowest: { path: string; avg: number; n: number }[];
};

const STATUS_COLOR: Record<string, string> = { "2xx": "#16a34a", "3xx": "#0070f3", "4xx": "#f5a623", "5xx": "#e5484d" };

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card" style={{ padding: 18, flex: 1, minWidth: 160 }}>
      <div className="muted" style={{ fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, marginTop: 2 }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function Analytics() {
  const [d, setD] = useState<Data | null>(null);
  const load = useCallback(async () => {
    const r = await fetch("/api/analytics", { cache: "no-store" });
    if (r.ok) setD(await r.json());
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const maxDomain = Math.max(1, ...(d?.domains || []).map((x) => x.n));
  const statusTotal = d ? Object.values(d.status).reduce((a, b) => a + b, 0) || 1 : 1;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1>Analytics</h1>
        <span className="muted" style={{ fontSize: 12.5 }}>tráfego real (nginx) · últimas amostras</span>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <Tile label="Pedidos" value={d ? d.total.toLocaleString("pt-PT") : "—"} />
        <Tile label="Taxa de erro" value={d ? `${d.errRate}%` : "—"} sub="4xx + 5xx" />
        <Tile label="Resposta média" value={d ? `${d.avgMs} ms` : "—"} />
        <Tile label="Resposta p95" value={d ? `${d.p95Ms} ms` : "—"} sub="speed insights" />
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <div className="muted" style={{ fontSize: 13, marginBottom: 14, fontWeight: 500 }}>Pedidos ao longo do tempo</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={d?.timeline || []} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0070f3" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#0070f3" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="t" tick={{ fill: "#8f8f8f", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={40} />
            <YAxis tick={{ fill: "#8f8f8f", fontSize: 11 }} tickLine={false} axisLine={false} width={42} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #ebebeb", borderRadius: 10, fontSize: 12 }} />
            <Area type="monotone" dataKey="requests" stroke="#0070f3" strokeWidth={2} fill="url(#ga)" isAnimationActive={false} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <div className="card" style={{ padding: 18, flex: 1, minWidth: 300 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 14, fontWeight: 500 }}>Estados HTTP</div>
          {d && Object.entries(d.status).map(([k, v]) => (
            <div key={k} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                <span style={{ color: STATUS_COLOR[k], fontWeight: 500 }}>{k}</span>
                <span className="muted">{v.toLocaleString("pt-PT")}</span>
              </div>
              <div style={{ height: 6, background: "#f0f0f0", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${(v / statusTotal) * 100}%`, height: "100%", background: STATUS_COLOR[k], borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: 18, flex: 1, minWidth: 300 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 14, fontWeight: 500 }}>Por domínio</div>
          {(d?.domains || []).map((x) => (
            <div key={x.domain} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                <span style={{ fontWeight: 500 }}>{x.domain}</span>
                <span className="muted">{x.n.toLocaleString("pt-PT")}</span>
              </div>
              <div style={{ height: 6, background: "#f0f0f0", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${(x.n / maxDomain) * 100}%`, height: "100%", background: "#171717", borderRadius: 999 }} />
              </div>
            </div>
          ))}
          {!d?.domains?.length && <div className="muted" style={{ fontSize: 13 }}>Sem dados ainda.</div>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div className="card" style={{ flex: 1, minWidth: 320, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 500 }} className="muted">Páginas mais pedidas</div>
          <table>
            <tbody>
              {(d?.topPaths || []).map((p) => (
                <tr key={p.path}><td className="mono" style={{ fontSize: 12, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.path}</td><td className="muted" style={{ textAlign: "right", width: 70 }}>{p.n}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 320, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 500 }} className="muted">Mais lentas (speed)</div>
          <table>
            <tbody>
              {(d?.slowest || []).map((p) => (
                <tr key={p.path}><td className="mono" style={{ fontSize: 12, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.path}</td><td style={{ textAlign: "right", width: 90, color: p.avg > 800 ? "var(--danger)" : p.avg > 300 ? "var(--warn)" : "var(--success)" }}>{p.avg} ms</td></tr>
              ))}
              {!d?.slowest?.length && <tr><td className="muted" style={{ padding: 16 }}>Sem dados suficientes.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
