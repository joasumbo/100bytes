"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Mail, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";

type Ev = {
  id: string; source: string; level: string; message: string; stack: string | null;
  url: string | null; emailed: boolean; resolved: boolean; createdAt: string;
};

const COLORS: Record<string, string> = {
  backend: "#0070f3", frontend: "#16a34a", admin: "#8b5cf6",
  payment: "#f5a623", system: "#666", panel: "#e5484d",
};

export default function Errors() {
  const [rows, setRows] = useState<Ev[]>([]);
  const [counts, setCounts] = useState<{ source: string; _count: number }[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/errors", { cache: "no-store" });
    if (r.ok) { const j = await r.json(); setRows(j.rows); setCounts(j.counts); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  async function resolve(id: string, resolved: boolean) {
    await fetch("/api/errors", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, resolved }) });
    toast.success(resolved ? "Marcado como resolvido" : "Reaberto");
    load();
  }

  return (
    <div>
      <h1 style={{ marginBottom: 20 }}>Erros</h1>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
        {counts.length === 0 && (
          <div className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 10, color: "var(--success)" }}>
            <CheckCircle2 size={18} /> <span style={{ fontSize: 14 }}>Sem erros por resolver</span>
          </div>
        )}
        {counts.map((c) => (
          <div key={c.source} className="card" style={{ padding: "14px 18px", minWidth: 130 }}>
            <div style={{ fontSize: 26, fontWeight: 600, color: COLORS[c.source] || "#171717" }}>{c._count}</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{c.source}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {rows.length === 0 && <div style={{ padding: 20 }} className="muted">Nenhum erro registado.</div>}
        {rows.map((e) => {
          const isOpen = open === e.id;
          return (
            <div key={e.id} style={{ borderBottom: "1px solid var(--border)", opacity: e.resolved ? 0.5 : 1 }}>
              <div style={{ display: "flex", gap: 12, padding: "12px 16px", alignItems: "center", cursor: "pointer" }} onClick={() => setOpen(isOpen ? null : e.id)}>
                {isOpen ? <ChevronDown size={15} className="muted" /> : <ChevronRight size={15} className="muted" />}
                <span style={{ color: COLORS[e.source] || "#171717", fontSize: 12, fontWeight: 600, width: 74 }}>{e.source}</span>
                <span style={{ flex: 1, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.message}</span>
                {e.emailed && <Mail size={14} className="muted" />}
                <span className="muted" style={{ fontSize: 12.5 }}>{new Date(e.createdAt).toLocaleString("pt-PT")}</span>
              </div>
              {isOpen && (
                <div style={{ padding: "0 16px 16px 43px" }}>
                  {e.url && <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>URL: {e.url}</div>}
                  {e.stack && <pre className="mono" style={{ background: "#fafafa", border: "1px solid var(--border)", padding: 12, borderRadius: 8, fontSize: 11.5, overflow: "auto", maxHeight: 300 }}>{e.stack}</pre>}
                  <button className="btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => resolve(e.id, !e.resolved)}>
                    {e.resolved ? "Reabrir" : "Marcar resolvido"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
