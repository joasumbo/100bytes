"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { mockOrders, mockProducts, formatKz } from "@/lib/mock";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 19) return "Boa tarde";
  return "Boa noite";
}

const profitData = [
  { day: "Dom", value: 32_000_000, hatched: true },
  { day: "Seg", value: 120_900_000, hatched: false },
  { day: "Ter", value: 28_000_000, hatched: true },
  { day: "Qua", value: 70_000_000, hatched: true },
  { day: "Qui", value: 45_000_000, hatched: true },
  { day: "Sex", value: 38_000_000, hatched: true },
  { day: "Sab", value: 35_000_000, hatched: true },
];

const successPercent = 78.6;
const totalBars = 26;
const filledBars = Math.round((successPercent / 100) * totalBars);

function SemiCircleGauge() {
  const [hovered, setHovered] = useState<number | null>(null);
  const cx = 150, cy = 140, rOuter = 130, rInner = 70;
  const totalAngle = 180;
  const startAngle = 180;
  const gap = 1.5;
  const barAngle = (totalAngle - gap * (totalBars - 1)) / totalBars;
  return (
    <svg viewBox="0 0 300 165" className="w-full max-w-[300px]" style={{ cursor: "pointer" }}>
      {Array.from({ length: totalBars }).map((_, i) => {
        const a1 = ((startAngle - i * (barAngle + gap)) * Math.PI) / 180;
        const a2 = ((startAngle - i * (barAngle + gap) - barAngle) * Math.PI) / 180;
        const x1o = cx + rOuter * Math.cos(a1), y1o = cy - rOuter * Math.sin(a1);
        const x2o = cx + rOuter * Math.cos(a2), y2o = cy - rOuter * Math.sin(a2);
        const x1i = cx + rInner * Math.cos(a1), y1i = cy - rInner * Math.sin(a1);
        const x2i = cx + rInner * Math.cos(a2), y2i = cy - rInner * Math.sin(a2);
        const filled = i < filledBars;
        const isHov = hovered === i;
        const fill = filled
          ? (isHov ? "#4F54D8" : "#7C82F9")
          : (isHov ? "#C8CAEE" : "#E0E2FB");
        const scale = isHov ? 1.12 : 1;
        const midA = ((a1 + a2) / 2);
        const midX = cx + ((rOuter + rInner) / 2) * Math.cos(midA);
        const midY = cy - ((rOuter + rInner) / 2) * Math.sin(midA);
        return (
          <path
            key={i}
            d={`M ${x1i} ${y1i} L ${x1o} ${y1o} A ${rOuter} ${rOuter} 0 0 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${rInner} ${rInner} 0 0 0 ${x1i} ${y1i} Z`}
            fill={fill}
            style={{
              transform: isHov ? `scale(${scale})` : "scale(1)",
              transformOrigin: `${midX}px ${midY}px`,
              transition: "fill .15s ease, transform .15s ease",
              filter: isHov ? "drop-shadow(0 2px 6px rgba(92,99,229,0.45))" : "none",
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        );
      })}
    </svg>
  );
}

function OrderBars({ color, count = 40 }: { color: string; count?: number }) {
  return (
    <div className="flex items-end gap-[2px] h-10 mt-2">
      {Array.from({ length: count }).map((_, i) => {
        const h = 30 + Math.random() * 70;
        return <div key={i} className="rounded-sm flex-1" style={{ height: `${h}%`, background: color, opacity: 0.85 + Math.random() * 0.15 }} />;
      })}
    </div>
  );
}

function CustomBar(props: any) {
  const { x, y, width, height, payload } = props;
  if (payload.hatched) {
    return (
      <g>
        <defs>
          <pattern id={`hatch-${payload.day}`} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(-45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#cbd5e1" strokeWidth="2" />
          </pattern>
        </defs>
        <rect x={x} y={y} width={width} height={height} fill={`url(#hatch-${payload.day})`} rx="6" />
      </g>
    );
  }
  return <rect x={x} y={y} width={width} height={height} fill="#5C63E5" rx="6" />;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="bg-white rounded-xl px-3 py-2 text-xs" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.12)", border: "1px solid #f3f4f6" }}>
      <p className="text-gray-400 mb-1">10 Mai 2026</p>
      <p className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-300" /> 2.290</p>
      <p className="flex items-center gap-1.5 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> {formatKz(v)}</p>
    </div>
  );
}

const orderStatusMap: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-orange-50 text-orange-600 border border-orange-100" },
  paid: { label: "Em Curso", cls: "bg-blue-50 text-blue-600 border border-blue-100" },
  shipped: { label: "Em Curso", cls: "bg-blue-50 text-blue-600 border border-blue-100" },
  delivered: { label: "Concluido", cls: "bg-green-50 text-green-600 border border-green-100" },
  cancelled: { label: "Cancelado", cls: "bg-red-50 text-red-600 border border-red-100" },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [hello, setHello] = useState("Bom dia");
  useEffect(() => { setHello(greeting()); }, []);

  return (
    <div className="space-y-5">
      {/* Greeting + filters */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pt-2">
        <div>
          <h1 className="text-[26px] lg:text-[28px] font-bold text-gray-900 flex items-center gap-2">
            {hello}, {user?.name ?? "Admin"}
            <span className="inline-block" style={{ animation: "wave 2.5s ease-in-out infinite", transformOrigin: "70% 70%" }}>👋</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Acompanhe vendas, encomendas, clientes e desempenho num so lugar.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="flex items-center gap-2 bg-white rounded-full px-4 h-10 text-sm text-gray-700 hover:shadow-sm transition" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            04 Mai - 10 Mai
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </button>
          <button className="flex items-center gap-2 bg-white rounded-full px-4 h-10 text-sm text-gray-700 hover:shadow-sm transition" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Exportar relatorio
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        {/* Left KPI grid */}
        <div className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-4">
          <KpiCard label="Total de Vendas" value="12.485" trend="+3,1%" trendUp icon={<IconTrend />} />
          <KpiCard label="Receita Total" value={formatKz(68_760_000)} trend="+2,4%" trendUp icon={<IconDollar />} />
          <KpiCard label="Clientes Activos" value="4.220" trend="+2,4%" trendUp icon={<IconUser />} />
          <KpiCard label="Pedidos Reembolso" value="250" trend="-0,6%" icon={<IconRefund />} />
        </div>

        {/* Total Profit */}
        <div className="col-span-12 lg:col-span-5 bg-white rounded-3xl p-6 h-full flex flex-col" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-base font-semibold text-gray-900">Lucro Total</h3>
            <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
              Ultimos 7 dias
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <p className="text-[34px] font-bold text-gray-900 leading-none">{formatKz(230_760_000)}</p>
            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              +8,4%
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" /></svg>
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-2 justify-end">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-300" />Total de Vendas</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" />Receita Total</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={profitData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`} />
              <Tooltip cursor={{ fill: "transparent" }} content={<CustomTooltip />} />
              <Bar dataKey="value" shape={(props: any) => <CustomBar {...props} />} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Success Rate */}
        <div className="col-span-12 lg:col-span-3 bg-white rounded-3xl p-6 h-full flex flex-col" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-base font-semibold text-gray-900">Taxa de Sucesso</h3>
            <button className="flex items-center gap-1 text-xs text-gray-500"><span>7 dias</span>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>
          <div className="flex flex-col items-center relative">
            <span className="absolute top-2 left-0 bg-white border border-gray-100 rounded-full px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1" style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.06)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> 78,6%
            </span>
            <SemiCircleGauge />
            <div className="-mt-12 text-center">
              <p className="text-3xl font-bold text-gray-900">78,6%</p>
              <p className="text-xs text-gray-500 mt-1">Crescimento de vendas</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="bg-gray-50/50 rounded-2xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center"><IconTrend small /></div>
              </div>
              <p className="text-[11px] text-gray-500">N Vendas</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-sm font-bold text-gray-900">2.550</p>
                <span className="bg-green-100 text-green-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">+6,4%</span>
              </div>
            </div>
            <div className="bg-gray-50/50 rounded-2xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center"><IconDollar small /></div>
              </div>
              <p className="text-[11px] text-gray-500">Receita</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-sm font-bold text-gray-900">{formatKz(68_760_000).replace(/\s/g, "")}</p>
                <span className="bg-orange-100 text-orange-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">+4,4%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent orders */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex flex-wrap items-center justify-between mb-5 gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Encomendas Recentes</h3>
              <p className="text-xs text-gray-500 mt-0.5">Acompanhe as ultimas encomendas dos clientes</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-full px-4 h-9 text-sm">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" /></svg>
                <input className="outline-none w-32 text-gray-700 placeholder-gray-300 text-sm bg-transparent" placeholder="Procurar" />
              </div>
              <button className="flex items-center gap-2 bg-white border border-gray-100 rounded-full px-4 h-9 text-sm text-gray-700">
                Estado
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs">
                  <th className="font-medium px-2 py-3 bg-gray-50/60 first:rounded-l-xl">ID</th>
                  <th className="font-medium px-2 py-3 bg-gray-50/60">Produtos</th>
                  <th className="font-medium px-2 py-3 bg-gray-50/60">Cliente</th>
                  <th className="font-medium px-2 py-3 bg-gray-50/60">Data</th>
                  <th className="font-medium px-2 py-3 bg-gray-50/60">Total</th>
                  <th className="font-medium px-2 py-3 bg-gray-50/60">Estado</th>
                  <th className="font-medium px-2 py-3 bg-gray-50/60 last:rounded-r-xl">Accao</th>
                </tr>
              </thead>
              <tbody>
                {mockOrders.slice(0, 5).map(o => {
                  const st = orderStatusMap[o.status];
                  const prod = mockProducts[Math.floor(Math.random() * mockProducts.length)];
                  return (
                    <tr key={o.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-2 py-4 text-gray-700 font-medium">#{o.id.replace("ORD-", "")}</td>
                      <td className="px-2 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {prod.images?.[0] && <img src={prod.images[0]} className="w-full h-full object-cover" alt="" />}
                          </div>
                          <div>
                            <p className="text-gray-800 font-medium leading-tight">{prod.name.split(" ").slice(0, 3).join(" ")}</p>
                            <p className="text-[11px] text-gray-400">+{o.items - 1} outros produtos</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-4 text-gray-700">{o.customer}</td>
                      <td className="px-2 py-4 text-gray-500 text-xs">{new Date(o.date).toLocaleDateString("pt-AO", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="px-2 py-4 text-gray-800 font-semibold">{formatKz(o.total)}</td>
                      <td className="px-2 py-4"><span className={`text-xs font-medium px-3 py-1 rounded-full ${st.cls}`}>{st.label}</span></td>
                      <td className="px-2 py-4">
                        <button className="text-gray-400 hover:text-gray-700">
                          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sales Overview */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-3xl p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Visao de Vendas</h3>
            <button className="flex items-center gap-1 text-xs text-gray-500">7 dias <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg></button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <SalesStat color="#10B981" label="Vendas" value="47,05%" />
            <SalesStat color="#F59E0B" label="Pendentes" value="32,48%" />
            <SalesStat color="#EF4444" label="Canceladas" value="20,47%" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <OrderBars color="#10B981" />
            <OrderBars color="#F59E0B" />
            <OrderBars color="#EF4444" />
          </div>
          <div className="mt-5">
            <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-400 mb-2 px-1">
              <span>Produto</span><span className="text-center">%</span><span className="text-right">Receita</span>
            </div>
            {mockProducts.slice(0, 3).map(p => (
              <div key={p.id} className="grid grid-cols-3 gap-2 items-center py-2 border-t border-gray-50">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {p.images?.[0] && <img src={p.images[0]} className="w-full h-full object-cover" alt="" />}
                  </div>
                  <span className="text-xs text-gray-700 truncate">{p.name.split(" ").slice(0, 2).join(" ")}</span>
                </div>
                <span className="text-xs text-gray-600 text-center">{Math.floor(20 + Math.random() * 30)}%</span>
                <span className="text-xs font-semibold text-gray-800 text-right">{formatKz(p.price)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes wave {
          0%,60%,100% { transform: rotate(0deg); }
          10%,30% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
        }
      `}</style>
    </div>
  );
}

function KpiCard({ label, value, trend, trendUp = false, icon }: { label: string; value: string; trend: string; trendUp?: boolean; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl p-4 hover:shadow-md transition" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-gray-500 font-medium leading-snug">{label}</p>
        <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">{icon}</div>
      </div>
      <p className="text-[22px] font-bold text-gray-900 mb-2 leading-none truncate">{value}</p>
      <div className="flex items-center gap-1 text-[11px]">
        {trendUp ? (
          <svg width="9" height="9" viewBox="0 0 10 10" fill="#10B981"><path d="M5 0L10 8H0L5 0Z" /></svg>
        ) : (
          <svg width="9" height="9" viewBox="0 0 10 10" fill="#EF4444"><path d="M5 10L0 2H10L5 10Z" /></svg>
        )}
        <span className={`font-semibold ${trendUp ? "text-green-600" : "text-red-500"}`}>{trend}</span>
        <span className="text-gray-400">vs semana passada</span>
      </div>
    </div>
  );
}

function SalesStat({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
        <span className="text-[11px] text-gray-500">{label}</span>
      </div>
      <p className="text-base font-bold text-gray-900">{value}</p>
    </div>
  );
}

function IconTrend({ small = false }: { small?: boolean }) {
  const s = small ? 12 : 14;
  return <svg width={s} height={s} fill="none" viewBox="0 0 24 24" stroke="#374151" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" /></svg>;
}
function IconDollar({ small = false }: { small?: boolean }) {
  const s = small ? 12 : 14;
  return <svg width={s} height={s} fill="none" viewBox="0 0 24 24" stroke="#374151" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12M9 9.5c0-1 1.343-1.5 3-1.5s3 .5 3 1.5-1.5 1.5-3 2-3 1-3 2 1.343 1.5 3 1.5 3-.5 3-1.5" /></svg>;
}
function IconUser() {
  return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#374151" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>;
}
function IconRefund() {
  return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#374151" strokeWidth="2"><rect x="2" y="6" width="20" height="13" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 11h20M6 15h4" /></svg>;
}