"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

type ShippingData = { freeShippingThreshold: number };
type ContentEntryResponse = { entry: { key: string; data: ShippingData } | null };

export default function ConfiguracoesPage() {
  const fields = [{label:"Nome da Loja",val:"100bytes"},{label:"Email de Suporte",val:"geral@100bytes.co.ao"},{label:"Telefone",val:"+244 928 499 325"},{label:"Moeda",val:"Kz (Kwanza)"},{label:"Idioma",val:"Português (Angola)"},{label:"IVA",val:"14%"}];

  // ── Portes grátis (editável, persistido em SiteContent key="shipping") ──
  const [threshold, setThreshold] = useState<number | "">("");
  const [loadingShip, setLoadingShip] = useState(true);
  const [savingShip, setSavingShip] = useState(false);

  useEffect(() => {
    api.get<ContentEntryResponse>("/content/shipping")
      .then((r) => setThreshold(r.entry?.data?.freeShippingThreshold ?? 200000))
      .catch(() => setThreshold(200000))
      .finally(() => setLoadingShip(false));
  }, []);

  async function saveShipping() {
    const value = Number(threshold);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Indique um valor válido em Kwanzas.");
      return;
    }
    setSavingShip(true);
    try {
      await api.put("/content/shipping", { data: { freeShippingThreshold: value } });
      toast.success("Valor de portes grátis guardado.");
    } catch {
      toast.error("Falha ao guardar. Verifique a sessão.");
    } finally {
      setSavingShip(false);
    }
  }

  const preview = threshold === "" ? "" : Number(threshold).toLocaleString("pt-PT", { maximumFractionDigits: 0 }) + " Kz";

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
            <h2 className="font-semibold text-gray-800 mb-1">Envio</h2>
            <p className="text-xs text-gray-500 mb-4">Encomendas de valor igual ou superior a este limiar têm portes grátis.</p>
            <label className="block text-xs text-gray-500 mb-1">Portes grátis a partir de (Kz)</label>
            <div className="flex gap-2">
              <input
                type="number" min={0} step={1000}
                value={threshold}
                disabled={loadingShip}
                onChange={(e) => setThreshold(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
              />
              <button
                onClick={saveShipping}
                disabled={savingShip || loadingShip}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap disabled:opacity-50"
              >
                {savingShip ? "A guardar..." : "Guardar"}
              </button>
            </div>
            {preview && <p className="text-xs text-gray-400 mt-2">No site: “Portes grátis em encomendas superiores a {preview}”.</p>}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-3">Métodos de Pagamento</h2>
            {["Multicaixa Express","Transferência Bancária","Referência Bancária","Cartão de Crédito"].map(m=>(
              <div key={m} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700">{m}</span>
                <div className="w-10 h-5 bg-orange-500 rounded-full relative cursor-pointer"><div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
