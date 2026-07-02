"use client";
import { mockDeliveryZones, formatKz } from "@/lib/mock";
export default function EntregasPage() {
  const tracking = [{id:"TRK001",order:"ORD-003",status:"Em trânsito",updated:"2026-05-10T10:00:00"},{id:"TRK002",order:"ORD-004",status:"Entregue",updated:"2026-05-09T16:00:00"}];
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Entregas</h1><p className="text-gray-500 text-sm">Zonas de entrega e tracking</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-gray-800">Zonas de Entrega</h2><button className="text-sm text-orange-500 font-medium">+ Nova Zona</button></div>
          <table className="w-full text-sm"><thead><tr className="text-left text-gray-500 text-xs uppercase border-b border-gray-100"><th className="pb-3 pr-4">Zona</th><th className="pb-3 pr-4">Custo</th><th className="pb-3 pr-4">Prazo</th><th className="pb-3">Activa</th></tr></thead>
          <tbody className="divide-y divide-gray-50">{mockDeliveryZones.map(z=>(
            <tr key={z.id} className="hover:bg-gray-50"><td className="py-2 pr-4 font-medium text-gray-800">{z.name}</td><td className="py-2 pr-4 text-gray-600">{z.cost===0?"Grátis":formatKz(z.cost)}</td><td className="py-2 pr-4 text-gray-500">{z.days} dias</td><td className="py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${z.active?"bg-green-100 text-green-700":"bg-gray-100 text-gray-500"}`}>{z.active?"Sim":"Não"}</span></td></tr>
          ))}</tbody></table>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Tracking de Encomendas</h2>
          <div className="space-y-3">{tracking.map(t=>(
            <div key={t.id} className="p-3 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between mb-1"><span className="font-medium text-gray-800 text-sm">{t.order}</span><span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{t.status}</span></div>
              <p className="text-xs text-gray-400">Actualizado: {new Date(t.updated).toLocaleString("pt-AO")}</p>
            </div>
          ))}</div>
        </div>
      </div>
    </div>
  );
}