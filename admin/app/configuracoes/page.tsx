"use client";
export default function ConfiguracoesPage() {
  const fields = [{label:"Nome da Loja",val:"100bytes"},{label:"Email Comercial",val:"comercial@100bytes.co.ao"},{label:"Telefone",val:"+244 946 920 849"},{label:"Moeda",val:"Kz (Kwanza)"},{label:"Idioma",val:"Português (Angola)"},{label:"IVA",val:"14%"}];
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Configurações</h1><p className="text-gray-500 text-sm">Configurações globais da loja</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">Dados da Loja</h2>
          <div className="space-y-4">{fields.map(f=>(
            <div key={f.label}><label className="block text-xs text-gray-500 mb-1">{f.label}</label>
              <input defaultValue={f.val} className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" /></div>
          ))}</div>
          <button className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium">Guardar Alterações</button>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-3">Métodos de Pagamento</h2>
            {["Multicaixa Express","Transferência Bancária","Referência Bancária","Cartão de Crédito"].map(m=>(
              <div key={m} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700">{m}</span>
                <div className="w-10 h-5 bg-orange-500 rounded-full relative cursor-pointer"><div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" /></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-3">Checkout</h2>
            {["Exigir login para comprar","Permitir compra como convidado","Confirmar encomenda por email"].map(o=>(
              <div key={o} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700">{o}</span>
                <div className="w-10 h-5 bg-orange-500 rounded-full relative cursor-pointer"><div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}