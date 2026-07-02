"use client";
import { mockNotifications } from "@/lib/mock";

const typeMap: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {} as any;

function OrderIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#3B82F6" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 3H8l-2 4h12l-2-4z" />
    </svg>
  );
}

function StockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#F59E0B" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth="2">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 10h22" />
    </svg>
  );
}

const iconMap: Record<string, React.ReactNode> = {
  order: <OrderIcon />,
  stock: <StockIcon />,
  payment: <PaymentIcon />,
};

const labelMap: Record<string, string> = {
  order: "Pedido",
  stock: "Stock",
  payment: "Pagamento",
};

const clsMap: Record<string, string> = {
  order: "bg-blue-50 border-blue-200",
  stock: "bg-yellow-50 border-yellow-200",
  payment: "bg-green-50 border-green-200",
};

export default function NotificacoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notificacoes</h1>
        <p className="text-gray-500 text-sm">{mockNotifications.filter(n => !n.read).length} nao lidas</p>
      </div>
      <div className="space-y-3">
        {mockNotifications.map(n => (
          <div key={n.id} className={`flex items-start gap-4 p-4 rounded-2xl border ${clsMap[n.type]} ${!n.read ? "shadow-sm" : ""}`}>
            <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-gray-100 shadow-sm">
              {iconMap[n.type]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{labelMap[n.type]}</span>
                {!n.read && <span className="w-2 h-2 bg-orange-500 rounded-full" />}
              </div>
              <p className="text-sm text-gray-800">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(n.date).toLocaleString("pt-AO")}</p>
            </div>
            {!n.read && (
              <button className="text-xs text-gray-400 hover:text-gray-600 font-medium flex-shrink-0 mt-0.5">
                Marcar lida
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}