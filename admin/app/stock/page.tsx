"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Stock = { warehouseCode: number; quantity: number };
type Artigo = {
  code: string;
  designation: string;
  priceWithTax: number | null;
  stockTotal: number;
  stocks: Stock[];
};
type Pagina = { total: number; page: number; perPage: number; items: Artigo[] };
type Armazem = { code: number; name: string };

const kz = (v: number | null) =>
  v === null ? "—" : v.toLocaleString("pt-PT", { maximumFractionDigits: 0 }) + " Kz";
const qt = (v: number) => v.toLocaleString("pt-PT", { maximumFractionDigits: 2 });

/** Stock: todos os artigos sincronizados do Winmax, com quantidades por armazém. */
export default function StockPage() {
  const [q, setQ] = useState("");
  const [busca, setBusca] = useState("");
  const [soComStock, setSoComStock] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<Pagina | null>(null);
  const [armazens, setArmazens] = useState<Armazem[]>([]);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    api
      .get<{ warehouses: Armazem[] }>("/admin/winmax/warehouses")
      .then((r) => setArmazens(r.warehouses))
      .catch(() => undefined);
  }, []);

  // Pesquisa com atraso para não pedir a cada tecla
  useEffect(() => {
    const t = setTimeout(() => {
      setBusca(q.trim());
      setPagina(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const p = new URLSearchParams({ page: String(pagina), perPage: "50" });
    if (busca) p.set("q", busca);
    if (soComStock) p.set("inStock", "1");
    api
      .get<Pagina>(`/admin/winmax/articles?${p}`)
      .then((r) => {
        setDados(r);
        setErro(false);
      })
      .catch(() => setErro(true));
  }, [busca, soComStock, pagina]);

  const paginas = dados ? Math.max(1, Math.ceil(dados.total / dados.perPage)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
        <p className="text-gray-500 text-sm">
          Artigos e stock do Winmax, atualizados automaticamente. O site mostra o total de todas as lojas.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-gray-100">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar por nome ou código"
            className="w-full sm:max-w-sm border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={soComStock}
              onChange={(e) => {
                setSoComStock(e.target.checked);
                setPagina(1);
              }}
              className="accent-orange-500"
            />
            Só com stock
          </label>
          <span className="sm:ml-auto text-sm text-gray-500">
            {dados ? `${dados.total.toLocaleString("pt-PT")} artigos` : ""}
          </span>
        </div>

        {erro && <p className="p-4 text-sm text-red-600">Não foi possível carregar o stock.</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left font-medium px-4 py-3">Código</th>
                <th className="text-left font-medium px-4 py-3">Artigo</th>
                <th className="text-right font-medium px-4 py-3">Preço</th>
                {armazens.map((a) => (
                  <th key={a.code} className="text-right font-medium px-4 py-3 whitespace-nowrap" title={a.name}>
                    {a.name}
                  </th>
                ))}
                <th className="text-right font-medium px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {dados?.items.map((a) => (
                <tr key={a.code} className="hover:bg-gray-50/60">
                  <td className="px-4 py-2.5 text-gray-500 font-mono text-xs whitespace-nowrap">{a.code}</td>
                  <td className="px-4 py-2.5 text-gray-800">{a.designation}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700 whitespace-nowrap">{kz(a.priceWithTax)}</td>
                  {armazens.map((w) => {
                    const v = a.stocks.find((s) => s.warehouseCode === w.code)?.quantity ?? 0;
                    return (
                      <td
                        key={w.code}
                        className={`px-4 py-2.5 text-right ${v < 0 ? "text-red-600" : v > 0 ? "text-gray-800" : "text-gray-300"}`}
                      >
                        {qt(v)}
                      </td>
                    );
                  })}
                  <td
                    className={`px-4 py-2.5 text-right font-semibold ${a.stockTotal < 0 ? "text-red-600" : a.stockTotal > 0 ? "text-gray-900" : "text-gray-300"}`}
                  >
                    {qt(a.stockTotal)}
                  </td>
                </tr>
              ))}
              {dados?.items.length === 0 && (
                <tr>
                  <td colSpan={4 + armazens.length} className="px-4 py-8 text-center text-gray-400">
                    Nenhum artigo encontrado.
                  </td>
                </tr>
              )}
              {!dados && !erro && (
                <tr>
                  <td colSpan={4 + armazens.length} className="px-4 py-8 text-center text-gray-400">
                    A carregar...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-gray-100 text-sm">
          <span className="text-gray-500">
            Página {pagina} de {paginas}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina <= 1}
              className="border border-gray-200 px-3 py-1.5 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setPagina((p) => Math.min(paginas, p + 1))}
              disabled={pagina >= paginas}
              className="border border-gray-200 px-3 py-1.5 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Seguinte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
