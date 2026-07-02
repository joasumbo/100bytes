"use client";
import { mockReturns } from "@/lib/mock";
export default function DevolucoesPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Devoluções</h1><p className="text-gray-500 text-sm">Gestão de RMAs e devoluções</p></div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wider">
            <th className="pb-3 pr-4">ID</th><th className="pb-3 pr-4">Pedido</th><th className="pb-3 pr-4">Cliente</th><th className="pb-3 pr-4">Produto</th><th className="pb-3 pr-4">Motivo</th><th className="pb-3 pr-4">Data</th><th className="pb-3">Estado</th><th className="pb-3">Acções</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {mockReturns.map(r=>(
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="py-3 pr-4 font-mono text-xs text-gray-500">{r.id}</td>
                <td className="py-3 pr-4 text-orange-500 font-medium">{r.order}</td>
                <td className="py-3 pr-4 text-gray-700">{r.customer}</td>
                <td className="py-3 pr-4 text-gray-600 max-w-xs truncate">{r.product}</td>
                <td className="py-3 pr-4 text-gray-500 text-xs max-w-xs truncate">{r.reason}</td>
                <td className="py-3 pr-4 text-xs text-gray-400">{new Date(r.date).toLocaleDateString("pt-AO")}</td>
                <td className="py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status==="approved"?"bg-green-100 text-green-700":"bg-yellow-100 text-yellow-700"}`}>{r.status==="approved"?"Aprovada":"Pendente"}</span></td>
                <td className="py-3"><div className="flex gap-2"><button className="text-green-600 text-xs font-medium">Aprovar</button><button className="text-red-400 text-xs font-medium">Rejeitar</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}