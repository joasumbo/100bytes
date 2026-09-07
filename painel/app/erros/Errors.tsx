"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

type Ev = {
  id: string; source: string; level: string; message: string; stack: string | null;
  url: string | null; emailed: boolean; resolved: boolean; createdAt: string;
};

const COLORS: Record<string, string> = {
  backend: "#3b82f6", frontend: "#22c55e", admin: "#a855f7",
  payment: "#f59e0b", system: "#8b8b93", panel: "#ec4899",
};

export default function Errors() {
  const [rows, setRows] = useState<Ev[]>([]);
  const [counts, setCounts] = useState<{ source: string; _count: number }[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/errors", { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      setRows(j.rows);
      setCounts(j.counts);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  async function resolve(id: string, resolved: boolean) {
    await fetch("/api/errors", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, resolved }) });
    toast.success(resolved ? "Marcado como resolvido" : "Reaberto");
    load();
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Erros</h1>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {counts.length === 0 && <div className="muted" style={{ fontSize: 13 }}>Sem erros por resolver 🎉</div>}
        {counts.map((c) => (
          <div key={c.source} className="card" style={{ padding: "12px 16px", minWidth: 120 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: COLORS[c.source] || "#fff" }}>{c._count}</div>
            <div className="muted" style={{ fontSize: 12 }}>{c.source}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {rows.length === 0 && <div style={{ padding: 18 }} className="muted">Nenhum erro registado.</div>}
        {rows.map((e) => (
          <div key={e.id} style={{ borderBottom: "1px solid var(--border)", opacity: e.resolved ? 0.5 : 1 }}>
            <div style={{ display: "flex", gap: 12, padding: "12px 16px", alignItems: "center", cursor: "pointer" }} onClick={() => setOpen(open === e.id ? null : e.id)}>
              <span style={{ color: COLORS[e.source] || "#fff", fontSize: 12, fontWeight: 700, width: 80 }}>{e.source}</span>
              <span style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.message}</span>
              {e.emailed && <span className="muted" style={{ fontSize: 11 }}>✉️</span>}
              <span className="muted" style={{ fontSize: 12 }}>{new Date(e.createdAt).toLocaleString("pt-PT")}</span>
            </div>
            {open === e.id && (
              <div style={{ padding: "0 16px 16px" }}>
                {e.url && <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>URL: {e.url}</div>}
                {e.stack && <pre style={{ background: "#000", padding: 12, borderRadius: 8, fontSize: 11, overflow: "auto", maxHeight: 300 }}>{e.stack}</pre>}
                <button className="btn-ghost" style={{ marginTop: 10 }} onClick={() => resolve(e.id, !e.resolved)}>
                  {e.resolved ? "Reabrir" : "Marcar resolvido"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
