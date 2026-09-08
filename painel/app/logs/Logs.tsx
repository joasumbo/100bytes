"use client";
import { useEffect, useState, useCallback } from "react";

const LABELS: Record<string, string> = {
  "backend-err": "Backend · erros",
  "backend-out": "Backend · saída",
  "frontend-err": "Frontend · erros",
  "frontend-out": "Frontend · saída",
  "admin-err": "Admin · erros",
  "admin-out": "Admin · saída",
  "nginx-error": "Nginx · erros",
  "nginx-access": "Nginx · acessos",
  backup: "Backup",
  autodeploy: "Auto-deploy",
};

export default function Logs() {
  const [src, setSrc] = useState("backend-err");
  const [content, setContent] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [auto, setAuto] = useState(true);

  const load = useCallback(async (s: string) => {
    const r = await fetch(`/api/logs?src=${s}`, { cache: "no-store" });
    if (r.ok) { const j = await r.json(); setContent(j.content); if (j.sources) setSources(j.sources); }
  }, []);

  useEffect(() => {
    load(src);
    if (!auto) return;
    const t = setInterval(() => load(src), 4000);
    return () => clearInterval(t);
  }, [src, auto, load]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <h1>Logs</h1>
        <label className="muted" style={{ fontSize: 13, display: "flex", gap: 7, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} style={{ width: "auto", accentColor: "#171717" }} />
          auto-refresh
        </label>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {(sources.length ? sources : Object.keys(LABELS)).map((s) => (
          <button key={s} className={s === src ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setSrc(s)}>
            {LABELS[s] || s}
          </button>
        ))}
      </div>
      <pre
        className="card mono"
        style={{ padding: 16, fontSize: 12.5, lineHeight: 1.6, maxHeight: "70vh", overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#333" }}
      >
        {content || "(vazio)"}
      </pre>
    </div>
  );
}
