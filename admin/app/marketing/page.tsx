"use client";
export default function MarketingPage() {
  const coupons = [{code:"PROMO10",discount:"10%",uses:23,max:100,active:true},{code:"BLACKFRI50",discount:"50%",uses:5,max:50,active:false},{code:"BOAS100K",discount:"100.000 Kz",uses:0,max:10,active:true}];
  const campaigns = [{name:"Campanha HP Portáteis",channel:"Email",status:"active",sent:320,opens:98},{name:"Remarketing Meta Ads",channel:"Meta Ads",status:"paused",sent:0,opens:0},{name:"Carrinho Abandonado",channel:"WhatsApp",status:"active",sent:45,opens:38}];
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Marketing</h1><p className="text-gray-500 text-sm">Cupões, campanhas e remarketing</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-gray-800">Cupões de Desconto</h2><button className="text-sm text-orange-500 font-medium">+ Novo</button></div>
          <div className="space-y-3">{coupons.map(c=>(
            <div key={c.code} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
              <span className="font-mono text-sm font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded">{c.code}</span>
              <div className="flex-1"><p className="text-sm text-gray-700">{c.discount} · {c.uses}/{c.max} usos</p></div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.active?"bg-green-100 text-green-700":"bg-gray-100 text-gray-500"}`}>{c.active?"Activo":"Inactivo"}</span>
            </div>
          ))}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-gray-800">Campanhas</h2><button className="text-sm text-orange-500 font-medium">+ Nova</button></div>
          <div className="space-y-3">{campaigns.map(c=>(
            <div key={c.name} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
              <div className="flex-1"><p className="text-sm font-medium text-gray-800">{c.name}</p><p className="text-xs text-gray-400">{c.channel} · {c.sent} enviados · {c.opens} abertos</p></div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.status==="active"?"bg-green-100 text-green-700":"bg-yellow-100 text-yellow-700"}`}>{c.status==="active"?"Activa":"Pausada"}</span>
            </div>
          ))}</div>
        </div>
      </div>
    </div>
  );
}