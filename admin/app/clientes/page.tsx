"use client";
import { useState } from "react";
import { mockCustomers, formatKz } from "@/lib/mock";

export default function ClientesPage() {
  const [search, setSearch] = useState("");
  const filtered = mockCustomers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Clientes</h1><p className="text-gray-500 text-sm">{mockCustomers.length} clientes registados</p></div>
        <button className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-medium text-sm transition">+ Novo Cliente</button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar por nome ou email..." className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-orange-400" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wider">
              <th className="pb-3 pr-4">Cliente</th><th className="pb-3 pr-4">Telefone</th><th className="pb-3 pr-4">Pedidos</th>
              <th className="pb-3 pr-4">Total Gasto</th><th className="pb-3 pr-4">Registado</th><th className="pb-3">Estado</th><th className="pb-3">Acções</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="py-3 pr-4"><div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 font-bold text-sm flex items-center justify-center flex-shrink-0">{c.name[0]}</div>
                    <div><p className="font-medium text-gray-800">{c.name}{c.vip&&<span className="ml-1 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">VIP</span>}</p><p className="text-xs text-gray-400">{c.email}</p></div>
                  </div></td>
                  <td className="py-3 pr-4 text-gray-600">{c.phone}</td>
                  <td className="py-3 pr-4 font-medium text-gray-700">{c.orders}</td>
                  <td className="py-3 pr-4 font-semibold text-gray-800">{formatKz(c.totalSpent)}</td>
                  <td className="py-3 pr-4 text-gray-500 text-xs">{new Date(c.joined).toLocaleDateString("pt-AO")}</td>
                  <td className="py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${c.status==="active"?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>{c.status==="active"?"Activo":"Bloqueado"}</span></td>
                  <td className="py-3"><div className="flex gap-2">
                    <button className="text-blue-500 hover:text-blue-700 text-xs font-medium">Ver</button>
                    <button className="text-red-400 hover:text-red-600 text-xs font-medium">{c.status==="active"?"Bloquear":"Desbloquear"}</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}