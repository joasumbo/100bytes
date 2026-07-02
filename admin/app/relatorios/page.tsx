"use client";
import { mockStats, mockTopProducts, formatKz } from "@/lib/mock";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Relatórios</h1><p className="text-gray-500 text-sm">Analytics e exportações</p></div>
        <div className="flex gap-2"><button className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-xl hover:bg-gray-50">Exportar Excel</button><button className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-xl hover:bg-gray-50">Exportar PDF</button></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{label:"Receita Anual",val:formatKz(mockStats.revenueYear)},{label:"Ticket Médio",val:formatKz(mockStats.avgTicket)},{label:"Total Pedidos",val:mockStats.ordersTotal.toLocaleString()},{label:"Conversão",val:mockStats.conversionRate+"%"}].map(s=>(
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"><p className="text-xl font-bold text-gray-900">{s.val}</p><p className="text-sm text-gray-500 mt-1">{s.label}</p></div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4">Top Produtos por Receita</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={mockTopProducts} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tick={{fontSize:11}} tickFormatter={v=>`${(v/1_000_000).toFixed(1)}M`} />
            <YAxis dataKey="name" type="category" tick={{fontSize:12}} width={130} />
            <Tooltip formatter={(v) => formatKz(Number(v))} />
            <Bar dataKey="receita" fill="#F57C00" radius={[0,6,6,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}