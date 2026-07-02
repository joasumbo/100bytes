"use client";
import { useState } from "react";
import { mockOrders, formatKz } from "@/lib/mock";

const statusMap: Record<string, {label:string;cls:string}> = {
  pending:{label:"Pendente",cls:"bg-yellow-100 text-yellow-700"},
  paid:{label:"Pago",cls:"bg-green-100 text-green-700"},
  shipped:{label:"Enviado",cls:"bg-blue-100 text-blue-700"},
  delivered:{label:"Entregue",cls:"bg-emerald-100 text-emerald-700"},
  cancelled:{label:"Cancelado",cls:"bg-red-100 text-red-700"},
};

const payMap: Record<string,string> = {multicaixa:"Multicaixa",transferencia:"Transferência",referencia:"Referência",cartao:"Cartão"};

export default function PedidosPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const filtered = mockOrders.filter(o => {
    const ms = o.customer.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase());
    const mf = filter === "all" || o.status === filter;
    return ms && mf;
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Pedidos</h1><p className="text-gray-500 text-sm">{mockOrders.length} pedidos no total</p></div>
        <div className="flex gap-2 flex-wrap">
          {["all","pending","paid","shipped","delivered","cancelled"].map(s => (
            <button key={s} onClick={()=>setFilter(s)} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${filter===s?"bg-orange-500 text-white":"bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              {s==="all"?"Todos":statusMap[s]?.label}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar por ID ou cliente..." className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-orange-400" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wider">
              <th className="pb-3 pr-4">ID</th><th className="pb-3 pr-4">Cliente</th><th className="pb-3 pr-4">Total</th>
              <th className="pb-3 pr-4">Pagamento</th><th className="pb-3 pr-4">Data</th><th className="pb-3">Estado</th><th className="pb-3">Acções</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(o => {
                const st = statusMap[o.status];
                return (
                  <tr key={o.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 pr-4 font-mono text-xs text-gray-600">{o.id}</td>
                    <td className="py-3 pr-4"><p className="font-medium text-gray-800">{o.customer}</p><p className="text-xs text-gray-400">{o.phone}</p></td>
                    <td className="py-3 pr-4 font-semibold text-gray-800">{formatKz(o.total)}</td>
                    <td className="py-3 pr-4 text-gray-600">{payMap[o.payment]}</td>
                    <td className="py-3 pr-4 text-gray-500 text-xs">{new Date(o.date).toLocaleString("pt-AO")}</td>
                    <td className="py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span></td>
                    <td className="py-3"><div className="flex gap-2">
                      <button className="text-blue-500 hover:text-blue-700 text-xs font-medium">Detalhe</button>
                      <button className="text-orange-500 hover:text-orange-700 text-xs font-medium">Factura</button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}