"use client";
import { useEffect, useRef, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Cpu, MemoryStick, HardDrive, Activity } from "lucide-react";

type Snap = {
  cpu: number; memUsed: number; memTotal: number; memPct: number;
  diskUsed: number; diskTotal: number; diskPct: number;
  netRx: number; netTx: number; load1: number; load5: number; load15: number;
  cores: number; uptime: number; ts: number;
};
type Point = { t: string; cpu: number; mem: number; rx: number; tx: number };

function fmtUptime(s: number) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function Tile({ icon: Icon, label, value, sub, pct, color }: { icon: React.ElementType; label: string; value: string; sub?: string; pct?: number; color: string }) {
  return (
    <div className="card" style={{ padding: 18, flex: 1, minWidth: 190 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Icon size={15} className="muted" />
        <span className="muted" style={{ fontSize: 13 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{sub}</div>}
      {pct !== undefined && (
        <div style={{ height: 6, background: "#f0f0f0", borderRadius: 999, marginTop: 14, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: color, borderRadius: 999, transition: "width .5s ease" }} />
        </div>
      )}
    </div>
  );
}

function Chart({ title, data, keyName, color, unit }: { title: string; data: Point[]; keyName: keyof Point; color: string; unit: string }) {
  const id = `g-${String(keyName)}`;
  return (
    <div className="card" style={{ padding: 18, flex: 1, minWidth: 340 }}>
      <div className="muted" style={{ fontSize: 13, marginBottom: 14, fontWeight: 500 }}>{title}</div>
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart data={data} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="0" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="t" tick={{ fill: "#8f8f8f", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveEnd" minTickGap={48} />
          <YAxis tick={{ fill: "#8f8f8f", fontSize: 11 }} tickLine={false} axisLine={false} width={42} unit={unit} />
          <Tooltip
            contentStyle={{ background: "#fff", border: "1px solid #ebebeb", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,.06)" }}
            labelStyle={{ color: "#8f8f8f", marginBottom: 2 }}
            cursor={{ stroke: "#d4d4d4", strokeDasharray: 4 }}
          />
          <Area type="monotone" dataKey={keyName as string} stroke={color} strokeWidth={2} fill={`url(#${id})`} isAnimationActive={false} unit={unit} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Overview() {
  const [snap, setSnap] = useState<Snap | null>(null);
  const [series, setSeries] = useState<Point[]>([]);
  const [err, setErr] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const r = await fetch("/api/metrics", { cache: "no-store" });
        if (!r.ok) throw new Error();
        const s: Snap = await r.json();
        if (!alive) return;
        setErr(false);
        setSnap(s);
        setSeries((prev) => {
          const t = new Date(s.ts).toLocaleTimeString("pt-PT", { hour12: false });
          return [...prev, { t, cpu: s.cpu, mem: s.memPct, rx: s.netRx, tx: s.netTx }].slice(-60);
        });
      } catch {
        if (alive) setErr(true);
      }
    }
    tick();
    timer.current = setInterval(tick, 2500);
    return () => { alive = false; if (timer.current) clearInterval(timer.current); };
  }, []);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <h1>Visão geral</h1>
        <span className="badge" style={{ color: err ? "var(--danger)" : "var(--success)" }}>
          <span className="dot" style={{ background: err ? "var(--danger)" : "var(--success)" }} />
          {err ? "sem ligação" : "ao vivo"}
          {snap && !err && <span className="muted" style={{ marginLeft: 6 }}>· {fmtUptime(snap.uptime)}</span>}
        </span>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <Tile icon={Cpu} label="CPU" value={snap ? `${snap.cpu}%` : "—"} sub={snap ? `${snap.cores} vCPU · load ${snap.load1}` : ""} pct={snap?.cpu} color="#0070f3" />
        <Tile icon={MemoryStick} label="Memória" value={snap ? `${snap.memPct}%` : "—"} sub={snap ? `${(snap.memUsed / 1024).toFixed(1)} / ${(snap.memTotal / 1024).toFixed(1)} GB` : ""} pct={snap?.memPct} color="#16a34a" />
        <Tile icon={HardDrive} label="Disco" value={snap ? `${snap.diskPct}%` : "—"} sub={snap ? `${snap.diskUsed.toFixed(0)} / ${snap.diskTotal.toFixed(0)} GB` : ""} pct={snap?.diskPct} color="#f5a623" />
        <Tile icon={Activity} label="Rede" value={snap ? `↓ ${snap.netRx.toFixed(0)}` : "—"} sub={snap ? `↑ ${snap.netTx.toFixed(0)} KB/s` : ""} color="#8b5cf6" />
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <Chart title="CPU (%)" data={series} keyName="cpu" color="#0070f3" unit="%" />
        <Chart title="Memória (%)" data={series} keyName="mem" color="#16a34a" unit="%" />
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Chart title="Rede recebida (KB/s)" data={series} keyName="rx" color="#8b5cf6" unit="" />
        <Chart title="Rede enviada (KB/s)" data={series} keyName="tx" color="#e5484d" unit="" />
      </div>
    </div>
  );
}
