"use client";
import { fetchAPI } from "@/lib/api";
import { useEffect, useState, useCallback, Fragment } from "react";
import { toast } from "sonner";

interface OrderItem {
  name: string;
  unitPrice: number;
  qty: number;
  image?: string | null;
  reference?: string | null;
  lineTotal?: number;
}
interface Order {
  code: string;
  status: string;
  total: number;
  subtotal: number;
  shipping: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  notes?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  createdAt: string;
  items: OrderItem[];
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Confirmada", cls: "bg-blue-100 text-blue-700" },
  preparing: { label: "Em preparação", cls: "bg-indigo-100 text-indigo-700" },
  shipped: { label: "Enviada", cls: "bg-purple-100 text-purple-700" },
  delivered: { label: "Entregue", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelada", cls: "bg-red-100 text-red-700" },
};
const STATUS_ORDER = ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"];

function fmtKz(v: number) {
  return (Number(v) || 0).toLocaleString("pt-AO", { style: "currency", currency: "AOA", maximumFractionDigits: 0 });
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetchAPI(`/admin/orders?${params.toString()}`);
      if (res.status === 401) { setError("Sessão expirada. Faça login novamente."); setOrders([]); return; }
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar encomendas.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  // Recarrega ao mudar filtro; pesquisa com debounce
  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  async function changeStatus(code: string, status: string) {
    setSaving(code);
    try {
      const res = await fetchAPI(`/admin/orders/${code}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setOrders((prev) => prev.map((o) => (o.code === code ? { ...o, status } : o)));
      toast.success(`Encomenda ${code} → ${STATUS[status]?.label ?? status}`);
    } catch {
      toast.error("Não foi possível atualizar o estado.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500 text-sm">{loading ? "A carregar…" : `${orders.length} encomenda(s)`}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", ...STATUS_ORDER].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${filter === s ? "bg-orange-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              {s === "all" ? "Todas" : STATUS[s]?.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por código, cliente ou email…"
          className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />

        {error && (
          <div className="text-center py-8 text-red-600 text-sm">
            {error}
            <button onClick={load} className="ml-3 underline">Tentar de novo</button>
          </div>
        )}

        {!error && loading && (
          <div className="text-center py-12 text-gray-400 text-sm">A carregar encomendas…</div>
        )}

        {!error && !loading && orders.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">Nenhuma encomenda encontrada.</div>
        )}

        {!error && !loading && orders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wider">
                  <th className="pb-3 pr-4">Código</th>
                  <th className="pb-3 pr-4">Cliente</th>
                  <th className="pb-3 pr-4">Total</th>
                  <th className="pb-3 pr-4">Pagamento</th>
                  <th className="pb-3 pr-4">Data</th>
                  <th className="pb-3 pr-4">Estado</th>
                  <th className="pb-3">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((o) => (
                  <Fragment key={o.code}>
                    <tr className="hover:bg-gray-50 transition align-top">
                      <td className="py-3 pr-4 font-mono text-xs text-gray-700 font-semibold">{o.code}</td>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-800">{o.customerName}</p>
                        <p className="text-xs text-gray-400">{o.customerPhone || o.customerEmail}</p>
                      </td>
                      <td className="py-3 pr-4 font-semibold text-gray-800">{fmtKz(o.total)}</td>
                      <td className="py-3 pr-4 text-gray-600">{o.paymentMethod || "—"}</td>
                      <td className="py-3 pr-4 text-gray-500 text-xs">{new Date(o.createdAt).toLocaleString("pt-AO")}</td>
                      <td className="py-3 pr-4">
                        <select
                          value={o.status}
                          disabled={saving === o.code}
                          onChange={(e) => changeStatus(o.code, e.target.value)}
                          className={`text-xs font-medium rounded-full px-2 py-1 border-0 cursor-pointer focus:ring-2 focus:ring-orange-400 ${STATUS[o.status]?.cls ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {STATUS_ORDER.map((s) => (
                            <option key={s} value={s}>{STATUS[s].label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => setExpanded(expanded === o.code ? null : o.code)}
                          className="text-blue-500 hover:text-blue-700 text-xs font-medium"
                        >
                          {expanded === o.code ? "Fechar" : "Detalhe"}
                        </button>
                      </td>
                    </tr>
                    {expanded === o.code && (
                      <tr key={o.code + "-d"} className="bg-gray-50/60">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Produtos</p>
                              <div className="space-y-2">
                                {o.items.map((it, i) => (
                                  <div key={i} className="flex items-center gap-3">
                                    {it.image ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={it.image} alt={it.name} className="w-10 h-10 object-contain border border-gray-200 rounded bg-white" />
                                    ) : (
                                      <div className="w-10 h-10 rounded bg-gray-100" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-gray-800 truncate">{it.name}</p>
                                      <p className="text-xs text-gray-400">Qtd: {it.qty}</p>
                                    </div>
                                    <p className="font-medium text-gray-700 whitespace-nowrap">{fmtKz(it.lineTotal ?? it.unitPrice * it.qty)}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between text-sm">
                                <span className="text-gray-500">Total</span>
                                <span className="font-bold text-gray-900">{fmtKz(o.total)}</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Entrega</p>
                              <dl className="text-sm space-y-1 text-gray-700">
                                <div><span className="text-gray-400">Nome: </span>{o.customerName}</div>
                                <div><span className="text-gray-400">Email: </span>{o.customerEmail}</div>
                                <div><span className="text-gray-400">Telefone: </span>{o.customerPhone || "—"}</div>
                                <div><span className="text-gray-400">Província: </span>{o.province || "—"}</div>
                                <div><span className="text-gray-400">Cidade: </span>{o.city || "—"}</div>
                                <div><span className="text-gray-400">Morada: </span>{o.address || "—"}</div>
                                {o.notes && <div><span className="text-gray-400">Notas: </span>{o.notes}</div>}
                              </dl>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
