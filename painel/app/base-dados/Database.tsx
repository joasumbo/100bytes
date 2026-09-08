"use client";
import { useEffect, useState, useCallback } from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { Table2, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

type TableInfo = { table: string; rows: number; bytes: number; columns: number };
type Target = { key: string; label: string };
type Column = { name: string; type: string; nullable: boolean; default: string | null };

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

const BAR = "#0070f3";

export default function Database() {
  const [target, setTarget] = useState("loja");
  const [targets, setTargets] = useState<Target[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  const load = useCallback(async (t: string) => {
    setErr("");
    const r = await fetch(`/api/db?target=${t}`, { cache: "no-store" });
    const j = await r.json();
    if (j.targets) setTargets(j.targets);
    if (r.ok) setTables(j.tables);
    else { setErr(j.error || "erro"); setTables([]); }
  }, []);

  useEffect(() => { load(target); }, [target, load]);

  if (sel) return <TableView target={target} table={sel} onBack={() => setSel(null)} />;

  const totalRows = tables.reduce((a, b) => a + b.rows, 0);
  const totalBytes = tables.reduce((a, b) => a + b.bytes, 0);
  const chartData = [...tables].sort((a, b) => b.rows - a.rows).slice(0, 12);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1>Base de dados</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {targets.map((t) => (
            <button key={t.key} className={t.key === target ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => { setTarget(t.key); setSel(null); }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {err && <div className="card" style={{ padding: 16, color: "var(--danger)" }}>{err}</div>}

      {!err && (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            <div className="card" style={{ padding: 18, flex: 1, minWidth: 150 }}>
              <div className="muted" style={{ fontSize: 13 }}>Tabelas</div>
              <div style={{ fontSize: 28, fontWeight: 600 }}>{tables.length}</div>
            </div>
            <div className="card" style={{ padding: 18, flex: 1, minWidth: 150 }}>
              <div className="muted" style={{ fontSize: 13 }}>Registos</div>
              <div style={{ fontSize: 28, fontWeight: 600 }}>{totalRows.toLocaleString("pt-PT")}</div>
            </div>
            <div className="card" style={{ padding: 18, flex: 1, minWidth: 150 }}>
              <div className="muted" style={{ fontSize: 13 }}>Tamanho</div>
              <div style={{ fontSize: 28, fontWeight: 600 }}>{fmtBytes(totalBytes)}</div>
            </div>
          </div>

          <div className="card" style={{ padding: 18, marginBottom: 16 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 14, fontWeight: 500 }}>Registos por tabela</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="table" tick={{ fill: "#8f8f8f", fontSize: 11 }} tickLine={false} axisLine={false} angle={-25} textAnchor="end" height={60} interval={0} />
                <YAxis tick={{ fill: "#8f8f8f", fontSize: 11 }} tickLine={false} axisLine={false} width={42} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #ebebeb", borderRadius: 10, fontSize: 12 }} cursor={{ fill: "#f5f5f5" }} />
                <Bar dataKey="rows" radius={[5, 5, 0, 0]} maxBarSize={44}>
                  {chartData.map((_, i) => <Cell key={i} fill={BAR} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ overflow: "hidden" }}>
            <table>
              <thead><tr><th>Tabela</th><th>Registos</th><th>Colunas</th><th>Tamanho</th><th></th></tr></thead>
              <tbody>
                {tables.map((t) => (
                  <tr key={t.table} style={{ cursor: "pointer" }} onClick={() => setSel(t.table)}>
                    <td style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}><Table2 size={15} className="muted" /> {t.table}</td>
                    <td className="muted">{t.rows.toLocaleString("pt-PT")}</td>
                    <td className="muted">{t.columns}</td>
                    <td className="muted">{fmtBytes(t.bytes)}</td>
                    <td style={{ textAlign: "right" }}><ChevronRight size={15} className="muted" /></td>
                  </tr>
                ))}
                {!tables.length && <tr><td colSpan={5} className="muted" style={{ padding: 20 }}>A carregar…</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function TableView({ target, table, onBack }: { target: string; table: string; onBack: () => void }) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState<"dados" | "colunas">("dados");
  const pageSize = 50;

  const load = useCallback(async () => {
    const r = await fetch(`/api/db/table?target=${target}&table=${table}&page=${page}`, { cache: "no-store" });
    const j = await r.json();
    if (r.ok) { setColumns(j.columns); setRows(j.rows); setTotal(j.total); }
  }, [target, table, page]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.ceil(total / pageSize) || 1;

  return (
    <div>
      <button className="btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 16 }}><ArrowLeft size={14} /> Tabelas</button>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}><Table2 size={20} /> {table}</h1>
        <span className="muted" style={{ fontSize: 13 }}>{total.toLocaleString("pt-PT")} registos · {columns.length} colunas</span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className={tab === "dados" ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setTab("dados")}>Dados</button>
        <button className={tab === "colunas" ? "btn btn-sm" : "btn-ghost btn-sm"} onClick={() => setTab("colunas")}>Estrutura</button>
      </div>

      {tab === "colunas" ? (
        <div className="card" style={{ overflow: "hidden" }}>
          <table>
            <thead><tr><th>Coluna</th><th>Tipo</th><th>Nulo?</th><th>Default</th></tr></thead>
            <tbody>
              {columns.map((c) => (
                <tr key={c.name}>
                  <td style={{ fontWeight: 500 }} className="mono">{c.name}</td>
                  <td className="muted mono">{c.type}</td>
                  <td className="muted">{c.nullable ? "sim" : "não"}</td>
                  <td className="muted mono" style={{ fontSize: 12 }}>{c.default || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="card" style={{ overflow: "auto", maxHeight: "62vh" }}>
            <table style={{ minWidth: "max-content" }}>
              <thead>
                <tr>{columns.map((c) => <th key={c.name} style={{ whiteSpace: "nowrap" }}>{c.name}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {columns.map((c) => {
                      const v = row[c.name];
                      const s = v === null || v === undefined ? "" : String(v);
                      return <td key={c.name} className="mono" style={{ fontSize: 12, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: s === "" ? "#bbb" : undefined }} title={s}>{s === "" ? "null" : s}</td>;
                    })}
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={columns.length || 1} className="muted" style={{ padding: 20 }}>Sem registos.</td></tr>}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
            <span className="muted" style={{ fontSize: 13 }}>Página {page + 1} de {pages}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /> Anterior</button>
              <button className="btn-ghost btn-sm" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Seguinte <ChevronRight size={14} /></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
