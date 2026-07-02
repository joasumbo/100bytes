"use client";
import { mockPayments, formatKz } from "@/lib/mock";
const stMap: Record<string,{label:string;cls:string}> = {confirmed:{label:"Confirmado",cls:"bg-green-100 text-green-700"},pending:{label:"Pendente",cls:"bg-yellow-100 text-yellow-700"},failed:{label:"Falhado",cls:"bg-red-100 text-red-700"}};
export default function PagamentosPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Pagamentos</h1><p className="text-gray-500 text-sm">Registo e conciliação de pagamentos</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
        {[{label:"Confirmados",val:mockPayments.filter(p=>p.status==="confirmed").length,cls:"text-green-600"},{label:"Pendentes",val:mockPayments.filter(p=>p.status==="pending").length,cls:"text-yellow-600"},{label:"Falhados",val:mockPayments.filter(p=>p.status==="failed").length,cls:"text-red-600"}].map(s=>(
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"><p className={`text-3xl font-bold ${s.cls}`}>{s.val}</p><p className="text-gray-500 text-sm mt-1">{s.label}</p></div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wider">
            <th className="pb-3 pr-4">ID</th><th className="pb-3 pr-4">Pedido</th><th className="pb-3 pr-4">Cliente</th><th className="pb-3 pr-4">Método</th><th className="pb-3 pr-4">Valor</th><th className="pb-3 pr-4">TX ID</th><th className="pb-3 pr-4">Data</th><th className="pb-3">Estado</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {mockPayments.map(p=>{const st=stMap[p.status];return(
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="py-3 pr-4 font-mono text-xs text-gray-500">{p.id}</td>
                <td className="py-3 pr-4 text-orange-500 font-medium">{p.order}</td>
                <td className="py-3 pr-4 text-gray-700">{p.customer}</td>
                <td className="py-3 pr-4 text-gray-600">{p.method}</td>
                <td className="py-3 pr-4 font-semibold text-gray-800">{formatKz(p.amount)}</td>
                <td className="py-3 pr-4 font-mono text-xs text-gray-400">{p.txId}</td>
                <td className="py-3 pr-4 text-xs text-gray-400">{new Date(p.date).toLocaleString("pt-AO")}</td>
                <td className="py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span></td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </div>
  );
}