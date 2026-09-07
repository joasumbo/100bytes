"use client";
import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

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

function Tile({ label, value, sub, pct, color }: { label: string; value: string; sub?: string; pct?: number; color: string }) {
  return (
    <div className="card" style={{ padding: 18, flex: 1, minWidth: 180 }}>
      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>}
      {pct !== undefined && (
        <div style={{ height: 6, background: "#000", borderRadius: 4, marginTop: 10, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: color, transition: "width .4s" }} />
        </div>
      )}
    </div>
  );
}

function Chart({ title, data, keyName, color, unit }: { title: string; data: Point[]; keyName: keyof Point; color: string; unit: string }) {
  return (
    <div className="card" style={{ padding: 18, flex: 1, minWidth: 320 }}>
      <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>{title}</div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`g-${keyName}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#26262b" vertical={false} />
          <XAxis dataKey="t" tick={{ fill: "#8b8b93", fontSize: 10 }} interval="preserveEnd" minTickGap={40} />
          <YAxis tick={{ fill: "#8b8b93", fontSize: 10 }} width={40} unit={unit} />
          <Tooltip contentStyle={{ background: "#111113", border: "1px solid #26262b", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#8b8b93" }} />
          <Area type="monotone" dataKey={keyName as string} stroke={color} strokeWidth={2} fill={`url(#g-${keyName})`} isAnimationActive={false} unit={unit} />
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
          const next = [...prev, { t, cpu: s.cpu, mem: s.memPct, rx: s.netRx, tx: s.netTx }];
          return next.slice(-60);
        });
      } catch {
        if (alive) setErr(true);
      }
    }
    tick();
    timer.current = setInterval(tick, 2500);
    return () => {
      alive = false;
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Visão geral</h1>
        <span className="muted" style={{ fontSize: 12 }}>
          {err ? "⚠️ sem ligação" : `● ao vivo · ${snap ? fmtUptime(snap.uptime) + " uptime" : "…"}`}
        </span>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
        <Tile label="CPU" value={snap ? `${snap.cpu}%` : "—"} sub={snap ? `${snap.cores} vCPU · load ${snap.load1}` : ""} pct={snap?.cpu} color="#3b82f6" />
        <Tile label="Memória" value={snap ? `${snap.memPct}%` : "—"} sub={snap ? `${(snap.memUsed / 1024).toFixed(1)} / ${(snap.memTotal / 1024).toFixed(1)} GB` : ""} pct={snap?.memPct} color="#22c55e" />
        <Tile label="Disco" value={snap ? `${snap.diskPct}%` : "—"} sub={snap ? `${snap.diskUsed.toFixed(0)} / ${snap.diskTotal.toFixed(0)} GB` : ""} pct={snap?.diskPct} color="#f59e0b" />
        <Tile label="Rede" value={snap ? `↓ ${snap.netRx.toFixed(0)} KB/s` : "—"} sub={snap ? `↑ ${snap.netTx.toFixed(0)} KB/s` : ""} color="#a855f7" />
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
        <Chart title="CPU (%)" data={series} keyName="cpu" color="#3b82f6" unit="%" />
        <Chart title="Memória (%)" data={series} keyName="mem" color="#22c55e" unit="%" />
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Chart title="Rede recebida (KB/s)" data={series} keyName="rx" color="#a855f7" unit="" />
        <Chart title="Rede enviada (KB/s)" data={series} keyName="tx" color="#ec4899" unit="" />
      </div>
    </div>
  );
}
