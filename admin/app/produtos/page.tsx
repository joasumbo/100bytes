"use client";
import { fetchAPI } from "@/lib/api";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const CDN = "https://cdn.100bytes.co.ao";

interface Product {
  id: string;
  reference: string;
  name: string;
  slug: string;
  imageKeys: string[];
  basePrice: number;
  hasIva: boolean;
  ivaRate: number;
  hasIec: boolean;
  iecRate: number;
  salePrice: number | null;
  trackStock: boolean;
  stock: number;
  stockAlert: number;
  active: boolean;
  featured: boolean;
  category: { id: string; name: string; slug: string } | null;
  brand: { id: string; name: string; logoKey: string | null } | null;
  _count: { bundleItems: number };
  createdAt: string;
}

function fmtKz(v: number) { return v.toLocaleString("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 }); }

function finalPrice(p: Product) {
  const iec = p.hasIec ? p.basePrice * (p.iecRate / 100) : 0;
  const iva = p.hasIva ? (p.basePrice + iec) * (p.ivaRate / 100) : 0;
  return p.basePrice + iec + iva;
}

function StockBadge({ p }: { p: Product }) {
  if (!p.trackStock) return <span className="text-xs text-gray-400">Sem controlo</span>;
  if (p.stock === 0) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Esgotado</span>;
  if (p.stock <= p.stockAlert) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">⚠ {p.stock} un.</span>;
  return <span className="text-xs text-gray-600 font-medium">{p.stock} un.</span>;
}

// ─── Import CSV Modal ─────────────────────────────────────────────────────────
interface CsvRow { name: string; basePrice: string; stock: string; reference: string; brand: string; category: string; active: string; [k: string]: string; }
interface ImportResult { name: string; ok: boolean; error?: string; }

const CSV_TEMPLATE_HEADERS = ["nome", "preco_base", "stock", "referencia", "marca", "categoria", "activo"];
const CSV_TEMPLATE_EXAMPLE = "Samsung Galaxy S24,150000,10,REF-001,Samsung,Smartphones,sim";

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(";").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map(line => {
    const sep = line.includes(";") ? ";" : ",";
    const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ""));
    const row: CsvRow = { name: "", basePrice: "", stock: "", reference: "", brand: "", category: "", active: "" };
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    row.name = row.nome || row.name || row["nome_do_produto"] || "";
    row.basePrice = row.preco_base || row.preco || row.price || row.basePrice || "";
    row.stock = row.stock || row.quantidade || "0";
    row.reference = row.referencia || row.sku || row.reference || "";
    row.brand = row.marca || row.brand || "";
    row.category = row.categoria || row.category || "";
    row.active = row.activo || row.active || "sim";
    return row;
  }).filter(r => r.name);
}

function parseSql(text: string): CsvRow[] {
  const rows: CsvRow[] = [];
  // Encontra todos os blocos INSERT INTO `table` (cols) VALUES (...)
  const insertRe = /INSERT\s+INTO\s+[`"']?\w+[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+?)(?=;\s*INSERT|;\s*$|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = insertRe.exec(text)) !== null) {
    const rawCols = match[1].split(",").map(c => c.trim().replace(/[`"']/g, "").toLowerCase());
    const valuesBlock = match[2];
    // Cada grupo de valores: (...)
    const valueRe = /\(([^)]+)\)/g;
    let vm: RegExpExecArray | null;
    while ((vm = valueRe.exec(valuesBlock)) !== null) {
      // Divide respeitando strings com vírgulas
      const vals: string[] = [];
      let cur = "", inStr = false, strChar = "";
      for (const ch of vm[1]) {
        if (!inStr && (ch === "'" || ch === '"')) { inStr = true; strChar = ch; }
        else if (inStr && ch === strChar) { inStr = false; }
        else if (!inStr && ch === ",") { vals.push(cur.trim().replace(/^'|'$/g, "").replace(/^NULL$/i, "")); cur = ""; continue; }
        else { cur += ch; }
      }
      vals.push(cur.trim().replace(/^'|'$/g, "").replace(/^NULL$/i, ""));
      const row: CsvRow = { name: "", basePrice: "", stock: "", reference: "", brand: "", category: "", active: "sim" };
      rawCols.forEach((col, i) => { row[col] = vals[i] ?? ""; });
      row.name = row.nome || row.name || row["nome_do_produto"] || row.nome_produto || row.product_name || row.title || "";
      row.basePrice = row.preco_base || row.preco || row.price || row.base_price || row.basePrice || "";
      row.stock = row.stock || row.quantidade || row.qty || row.quantity || "0";
      row.reference = row.referencia || row.sku || row.reference || row.ref || row.codigo || "";
      row.brand = row.marca || row.brand || "";
      row.category = row.categoria || row.category || "";
      row.active = row.activo || row.active || row.ativo || "sim";
      if (row.name) rows.push(row);
    }
  }
  return rows;
}

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [done, setDone] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setResults([]);
    setDone(false);
    const isSql = f.name.toLowerCase().endsWith(".sql");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = isSql ? parseSql(text) : parseCsv(text);
      setRows(parsed);
      if (parsed.length === 0) toast.error(isSql ? "Nenhum INSERT encontrado ou formato SQL inválido." : "Ficheiro vazio ou formato inválido.");
      else toast.success(`${parsed.length} produto(s) detectado(s) no ficheiro ${isSql ? "SQL" : "CSV"}.`);
    };
    reader.readAsText(f, "utf-8");
    e.target.value = "";
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    const res: ImportResult[] = [];
    for (const row of rows) {
      try {
        const r = await fetchAPI("/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: row.name,
            reference: row.reference || undefined,
            basePrice: parseFloat(row.basePrice.replace(/\./g, "").replace(",", ".")) || 0,
            hasIva: true, ivaRate: 14, hasIec: false, iecRate: 0,
            stock: parseInt(row.stock) || 0,
            stockAlert: 5, trackStock: true,
            active: !["nao", "não", "no", "false", "0"].includes((row.active ?? "").toLowerCase()),
          }),
        });
        const d = await r.json();
        if (r.ok) res.push({ name: row.name, ok: true });
        else res.push({ name: row.name, ok: false, error: d.error ?? "Erro desconhecido" });
      } catch {
        res.push({ name: row.name, ok: false, error: "Erro de ligação" });
      }
    }
    setResults(res);
    setImporting(false);
    setDone(true);
    const ok = res.filter(r => r.ok).length;
    if (ok > 0) { toast.success(`${ok} produto(s) importado(s) com sucesso!`); onDone(); }
  }

  function downloadTemplate() {
    const content = CSV_TEMPLATE_HEADERS.join(";") + "\n" + CSV_TEMPLATE_EXAMPLE;
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "template_produtos.csv";
    a.click();
  }

  const okCount = results.filter(r => r.ok).length;
  const errCount = results.filter(r => !r.ok).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="font-bold text-gray-900">Importar produtos</h3>
            <p className="text-xs text-gray-400 mt-0.5">CSV (separador ; ou ,) ou SQL com instruções INSERT INTO</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Template download */}
          <div className="flex items-center justify-between bg-blue-50 rounded-2xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-blue-800">Não tem template?</p>
              <p className="text-xs text-blue-600 mt-0.5">Colunas: {CSV_TEMPLATE_HEADERS.join(", ")}</p>
            </div>
            <button type="button" onClick={downloadTemplate} className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-xl transition">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 12l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download template
            </button>
          </div>

          {/* Upload */}
          <input ref={fileRef} type="file" accept=".csv,.txt,.sql" className="hidden" onChange={handleFile} />
          {!fileName ? (
            <button type="button" onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-8 flex flex-col items-center gap-2 text-gray-400 hover:border-orange-300 hover:bg-orange-50/30 transition">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 8l-4-4m0 0L8 8m4-4v12" /></svg>
              <p className="text-sm font-medium">Clique para seleccionar ficheiro CSV ou SQL</p>
              <p className="text-xs">Formatos: .csv · .sql — Máx. 5 MB</p>
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-green-50 rounded-2xl px-4 py-3">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-800 truncate">{fileName}</p>
                <p className="text-xs text-green-600">{rows.length} linha(s) encontrada(s)</p>
              </div>
              <button type="button" onClick={() => { setFileName(""); setRows([]); setResults([]); setDone(false); }} className="text-green-400 hover:text-red-500 text-xl leading-none">&times;</button>
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && !done && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pré-visualização ({rows.length} produtos)</p>
              <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-52 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">Nome</th>
                      <th className="px-3 py-2 text-right text-gray-500 font-semibold">Preço base</th>
                      <th className="px-3 py-2 text-right text-gray-500 font-semibold">Stock</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold hidden sm:table-cell">Ref.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-800 max-w-[160px] truncate">{r.name || <span className="text-red-400">— vazio —</span>}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{r.basePrice || "—"}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{r.stock || "0"}</td>
                        <td className="px-3 py-2 text-gray-400 hidden sm:table-cell">{r.reference || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Results */}
          {done && results.length > 0 && (
            <div>
              <div className="flex gap-3 mb-3">
                {okCount > 0 && <span className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">✓ {okCount} importado(s)</span>}
                {errCount > 0 && <span className="text-xs font-semibold text-red-700 bg-red-50 px-3 py-1 rounded-full">✗ {errCount} erro(s)</span>}
              </div>
              {errCount > 0 && (
                <div className="border border-red-100 rounded-2xl overflow-hidden max-h-40 overflow-y-auto">
                  {results.filter(r => !r.ok).map((r, i) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-2 border-b border-red-50 last:border-0">
                      <svg width="13" height="13" className="text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-red-800 truncate">{r.name}</p>
                        <p className="text-[11px] text-red-500">{r.error}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-2xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition font-medium">
            {done ? "Fechar" : "Cancelar"}
          </button>
          {!done && (
            <button type="button" disabled={rows.length === 0 || importing} onClick={handleImport} className="px-6 py-2.5 rounded-2xl text-sm text-white font-semibold disabled:opacity-40 flex items-center gap-2" style={{ background: "linear-gradient(135deg,#F57C00,#FF9800)" }}>
              {importing ? (
                <><svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>A importar...</>
              ) : (
                <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 8l-4-4m0 0L8 8m4-4v12" /></svg>Importar {rows.length} produto(s)</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── StatsModal ───────────────────────────────────────────────────────────────
const CDN_STATS = "https://cdn.100bytes.co.ao";

function StatCard({ label, value, sub, color = "gray" }: { label: string; value: string | number; sub?: string; color?: "gray" | "green" | "orange" | "blue" | "purple" }) {
  const colors = {
    gray:   "bg-gray-50 text-gray-800",
    green:  "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
    blue:   "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
  };
  return (
    <div className={`rounded-2xl p-4 ${colors[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs mt-0.5 opacity-60">{sub}</p>}
    </div>
  );
}

function fmtKzStats(v: number) { return v.toLocaleString("pt-AO", { maximumFractionDigits: 0 }); }

function StatsModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const fp = (() => {
    const iec = product.hasIec ? product.basePrice * (product.iecRate / 100) : 0;
    const iva = product.hasIva ? (product.basePrice + iec) * (product.ivaRate / 100) : 0;
    return product.basePrice + iec + iva;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
              {product.imageKeys[0]
                ? <img src={`${CDN_STATS}/${product.imageKeys[0]}`} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-gray-300"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01" /></svg></div>
              }
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm leading-tight">{product.name}</h3>
              <p className="text-xs text-gray-400">{product.reference}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition flex-shrink-0">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Resumo do produto */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Resumo do produto</p>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Preço final" value={`${fmtKzStats(fp)} Kz`} sub={[product.hasIva && "IVA 14%", product.hasIec && `IEC ${product.iecRate}%`].filter(Boolean).join(" + ") || "Sem impostos"} color="orange" />
              <StatCard label="Preço base" value={`${fmtKzStats(product.basePrice)} Kz`} color="gray" />
              {product.salePrice && <StatCard label="Preço promo" value={`${fmtKzStats(product.salePrice)} Kz`} color="green" />}
              <StatCard label="Estado" value={product.active ? "Activo" : "Inactivo"} color={product.active ? "green" : "gray"} />
            </div>
          </div>

          {/* Stock */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Stock</p>
            <div className="grid grid-cols-2 gap-3">
              {product.trackStock
                ? <>
                    <StatCard label="Disponível" value={`${product.stock} un.`} color={product.stock === 0 ? "gray" : product.stock <= product.stockAlert ? "orange" : "green"} sub={product.stock === 0 ? "Esgotado" : product.stock <= product.stockAlert ? "Stock baixo" : "Disponível"} />
                    <StatCard label="Alerta" value={`≤ ${product.stockAlert} un.`} color="gray" sub="Nível de alerta configurado" />
                  </>
                : <div className="col-span-2 text-center py-4 text-sm text-gray-400 bg-gray-50 rounded-2xl">Sem controlo de stock activado</div>
              }
            </div>
          </div>

          {/* Vendas & Visualizações — placeholder até integração analytics */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vendas & Visualizações</p>
              <span className="text-[10px] font-semibold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">Em breve</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Vendas totais" value="—" sub="Integração de pedidos pendente" color="purple" />
              <StatCard label="Visualizações" value="—" sub="Integração analytics pendente" color="blue" />
              <StatCard label="Receita gerada" value="—" color="purple" />
              <StatCard label="Taxa de conversão" value="—" color="blue" />
            </div>
            <p className="text-xs text-gray-400 text-center mt-3">
              As estatísticas de vendas estarão disponíveis quando o módulo de encomendas for activado.
            </p>
          </div>

          {/* Info extra */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Informações</p>
            {product.brand && <div className="flex justify-between text-sm"><span className="text-gray-500">Marca</span><span className="font-medium text-gray-700">{product.brand.name}</span></div>}
            {product.category && <div className="flex justify-between text-sm"><span className="text-gray-500">Categoria</span><span className="font-medium text-gray-700">{product.category.name}</span></div>}
            <div className="flex justify-between text-sm"><span className="text-gray-500">Destaque</span><span className={`font-medium ${product.featured ? "text-orange-600" : "text-gray-400"}`}>{product.featured ? "★ Sim" : "Não"}</span></div>
            {product._count.bundleItems > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Itens no conjunto</span><span className="font-medium text-gray-700">{product._count.bundleItems}</span></div>}
            <div className="flex justify-between text-sm"><span className="text-gray-500">Criado em</span><span className="font-medium text-gray-700">{new Date(product.createdAt).toLocaleDateString("pt-AO", { day: "2-digit", month: "short", year: "numeric" })}</span></div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-2xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition font-medium">Fechar</button>
          <a href={`/produtos/${product.id}/editar`} className="flex-1 py-2.5 rounded-2xl text-sm text-white font-semibold text-center transition" style={{ background: "linear-gradient(135deg,#F57C00,#FF9800)" }}>
            Editar produto
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ProdutosPage() {
  const router = useRouter();

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterStock, setFilterStock] = useState("");
  const [filterFeatured, setFilterFeatured] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  // Modals
  const [showImport, setShowImport] = useState(false);
  const [statsProduct, setStatsProduct] = useState<Product | null>(null);

  // Load filter options once
  useEffect(() => {
    fetchAPI("/categories").then(r => r.json()).then(d => setCategories(d.categories ?? []));
    fetchAPI("/brands").then(r => r.json()).then(d => setBrands(d.brands ?? []));
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ perPage: String(PER_PAGE), page: String(page) });
    if (search) params.set("search", search);
    if (filterActive !== "all") params.set("active", filterActive === "active" ? "true" : "false");
    if (filterCategory) params.set("categoryId", filterCategory);
    if (filterBrand) params.set("brandId", filterBrand);
    if (filterStock) params.set("stockStatus", filterStock);
    if (filterFeatured) params.set("featured", "true");
    const res = await fetchAPI(`/products?${params}`);
    const data = await res.json();
    setProducts(data.products ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
    setLoading(false);
  }, [search, filterActive, filterCategory, filterBrand, filterStock, filterFeatured, page]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, filterActive, filterCategory, filterBrand, filterStock, filterFeatured]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  async function handleDelete(p: Product) {
    if (!confirm(`Eliminar "${p.name}"?`)) return;
    const res = await fetchAPI(`/products/${p.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Produto eliminado."); fetchProducts(); }
    else toast.error("Erro ao eliminar.");
  }

  const hasFilters = filterActive !== "all" || filterCategory || filterBrand || filterStock || filterFeatured || search;

  function clearFilters() {
    setSearch(""); setFilterActive("all"); setFilterCategory("");
    setFilterBrand(""); setFilterStock(""); setFilterFeatured(false); setPage(1);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900">Produtos</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading ? "A carregar..." : `${total} ${total === 1 ? "produto" : "produtos"}${hasFilters ? " encontrados" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 8l-4-4m0 0L8 8m4-4v12" /></svg>
            Importar CSV
          </button>
          <button onClick={() => router.push("/produtos/novo")} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm text-white font-semibold" style={{ background: "linear-gradient(135deg,#F57C00,#FF9800)", boxShadow: "0 4px 14px rgba(245,124,0,0.3)" }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Novo produto
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-5 py-4 space-y-3">
        {/* Row 1: search + estado + destaque */}
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar nome ou referência..." className="w-full border border-gray-200 rounded-2xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
          </div>
          {/* Estado */}
          <div className="relative">
            <select value={filterActive} onChange={e => setFilterActive(e.target.value)} className="appearance-none border border-gray-200 rounded-2xl pl-3 pr-8 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="all">Todos os estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg></span>
          </div>
          {/* Destaque toggle */}
          <button type="button" onClick={() => setFilterFeatured(!filterFeatured)} className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-medium border transition ${filterFeatured ? "bg-orange-50 border-orange-300 text-orange-700" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"}`}>
            <span>★</span> Destaque
          </button>
          {/* Clear */}
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm text-gray-400 hover:text-red-500 border border-transparent hover:border-red-100 hover:bg-red-50 transition">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              Limpar
            </button>
          )}
        </div>
        {/* Row 2: categoria + marca + stock */}
        <div className="flex flex-wrap gap-2">
          {/* Categoria */}
          <div className="relative">
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="appearance-none border border-gray-200 rounded-2xl pl-3 pr-8 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 min-w-[150px]">
              <option value="">Todas as categorias</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg></span>
          </div>
          {/* Marca */}
          <div className="relative">
            <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className="appearance-none border border-gray-200 rounded-2xl pl-3 pr-8 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 min-w-[140px]">
              <option value="">Todas as marcas</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg></span>
          </div>
          {/* Stock */}
          <div className="relative">
            <select value={filterStock} onChange={e => setFilterStock(e.target.value)} className="appearance-none border border-gray-200 rounded-2xl pl-3 pr-8 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 min-w-[150px]">
              <option value="">Qualquer stock</option>
              <option value="ok">Com stock</option>
              <option value="low">Stock baixo</option>
              <option value="out">Esgotado</option>
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg></span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase tracking-wider">
              <th className="px-5 py-3.5 text-left">Produto</th>
              <th className="px-4 py-3.5 text-left hidden md:table-cell">Referência</th>
              <th className="px-4 py-3.5 text-left hidden lg:table-cell">Categoria</th>
              <th className="px-4 py-3.5 text-right">Preço final</th>
              <th className="px-4 py-3.5 text-center hidden sm:table-cell">Stock</th>
              <th className="px-4 py-3.5 text-center">Estado</th>
              <th className="px-4 py-3.5 text-right">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              // ─── Skeleton rows ─────────────────────────────────────────────
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3 bg-gray-100 rounded-full w-40" />
                        <div className="h-2.5 bg-gray-100 rounded-full w-20" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell"><div className="h-3 bg-gray-100 rounded-full w-24" /></td>
                  <td className="px-4 py-3.5 hidden lg:table-cell"><div className="h-3 bg-gray-100 rounded-full w-32" /></td>
                  <td className="px-4 py-3.5 text-right"><div className="h-3 bg-gray-100 rounded-full w-20 ml-auto" /></td>
                  <td className="px-4 py-3.5 text-center hidden sm:table-cell"><div className="h-5 bg-gray-100 rounded-full w-16 mx-auto" /></td>
                  <td className="px-4 py-3.5 text-center"><div className="h-5 bg-gray-100 rounded-full w-16 mx-auto" /></td>
                  <td className="px-4 py-3.5 text-right"><div className="h-6 bg-gray-100 rounded-xl w-24 ml-auto" /></td>
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p className="text-sm">{hasFilters ? "Nenhum produto encontrado com esses filtros." : "Sem produtos. Crie o primeiro!"}</p>
                    {hasFilters && <button type="button" onClick={clearFilters} className="text-xs text-orange-500 hover:underline">Limpar filtros</button>}
                  </div>
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const fp = finalPrice(p);
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition">
                    {/* Produto */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                          {p.imageKeys[0]
                            ? <img src={`${CDN}/${p.imageKeys[0]}`} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-gray-300"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01" /></svg></div>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate max-w-[200px]">{p.name}</p>
                          {p.brand && <p className="text-xs text-gray-400 truncate">{p.brand.name}</p>}
                          {p.featured && <span className="text-[10px] font-bold text-orange-500">★ DESTAQUE</span>}
                        </div>
                      </div>
                    </td>
                    {/* Referência */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg">{p.reference}</span>
                    </td>
                    {/* Categoria */}
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-xs text-gray-500">{p.category?.name ?? <span className="text-gray-300">—</span>}</span>
                    </td>
                    {/* Preço */}
                    <td className="px-4 py-3.5 text-right">
                      <div>
                        <p className="font-bold text-gray-800">{fmtKz(fp)}</p>
                        {p.salePrice && <p className="text-xs text-green-600 font-semibold">{fmtKz(p.salePrice)} promo</p>}
                        <p className="text-[10px] text-gray-400">{[p.hasIva && "IVA 14%", p.hasIec && `IEC ${p.iecRate}%`].filter(Boolean).join(" + ") || "Sem impostos"}</p>
                      </div>
                    </td>
                    {/* Stock */}
                    <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                      <StockBadge p={p} />
                    </td>
                    {/* Estado */}
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${p.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.active ? "bg-green-500" : "bg-gray-400"}`} />
                        {p.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    {/* Acções */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setStatsProduct(p)} className="p-1.5 rounded-xl text-gray-400 hover:text-purple-500 hover:bg-purple-50 transition" title="Estatísticas">
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </button>
                        <button onClick={() => router.push(`/produtos/${p.id}`)} className="p-1.5 rounded-xl text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition" title="Visualizar">
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => router.push(`/produtos/${p.id}/editar`)} className="p-1.5 rounded-xl text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition" title="Editar">
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(p)} className="p-1.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition" title="Eliminar">
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Paginação */}
        {!loading && pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Página {page} de {pages} · {total} produtos
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Primeira"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M18 19l-7-7 7-7" /></svg>
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Anterior"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>

              {/* Page numbers */}
              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === pages || Math.abs(n - page) <= 1)
                .reduce<(number | "...")[]>((acc, n, i, arr) => {
                  if (i > 0 && typeof arr[i - 1] === "number" && (n as number) - (arr[i - 1] as number) > 1) acc.push("...");
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, i) =>
                  n === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-gray-300 text-xs">•••</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n as number)}
                      className={`min-w-[30px] h-[30px] rounded-xl text-xs font-semibold transition ${page === n ? "text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"}`}
                      style={page === n ? { background: "linear-gradient(135deg,#F57C00,#FF9800)" } : undefined}
                    >
                      {n}
                    </button>
                  )
                )
              }

              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Seguinte"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
              <button
                onClick={() => setPage(pages)}
                disabled={page === pages}
                className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Última"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M6 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); fetchProducts(); }} />
      )}
      {statsProduct && (
        <StatsModal product={statsProduct} onClose={() => setStatsProduct(null)} />
      )}
    </div>
  );
}