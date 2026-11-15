"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";

type Job = { status: "running" | "ok" | "error"; total: number; processed: number; found: number; error: string | null };
type Estado = {
  running: boolean;
  inStock: { total: number; withPhoto: number; withoutPhoto: number; searched: number };
  lastJob: Job | null;
};

/** Contagem de fotos dos artigos com stock e procura automática (Icecat / Winmax). */
export default function FotosResumo({ aoMudar }: { aoMudar: () => void }) {
  const [st, setSt] = useState<Estado | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    api
      .get<Estado>("/admin/winmax/images/status")
      .then((r) => ativo && setSt(r))
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [versao]);

  // Enquanto a procura corre, atualiza a cada 3 s e refresca a tabela
  useEffect(() => {
    if (!st?.running) return;
    const t = setInterval(() => {
      setVersao((v) => v + 1);
      aoMudar();
    }, 3000);
    return () => clearInterval(t);
  }, [st?.running, aoMudar]);

  async function procurar() {
    try {
      const r = await api.post<{ total: number }>("/admin/winmax/images/auto", {});
      toast.success(r.total ? `A procurar fotos para ${r.total} artigos.` : "Não há artigos por procurar.");
      setVersao((v) => v + 1);
    } catch (e) {
      toast.error(e instanceof ApiError && e.status === 409 ? "Já está a decorrer uma procura." : "Não foi possível iniciar.");
    }
  }

  if (!st) return null;
  const { total, withPhoto, withoutPhoto, searched } = st.inStock;
  const pct = total ? Math.round((withPhoto / total) * 100) : 0;
  const job = st.lastJob;
  const porProcurar = total - searched;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="font-semibold text-gray-800">Fotos dos artigos com stock</h2>
            <span className="text-sm text-gray-500">
              {withPhoto} de {total} ({pct}%)
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {withoutPhoto} sem foto
            {porProcurar > 0 ? ` · ${porProcurar} ainda não procurados automaticamente` : " · todos já procurados"}
            {st.running && job && ` · a procurar ${job.processed}/${job.total} (${job.found} com foto)`}
          </p>
        </div>
        <button
          onClick={procurar}
          disabled={st.running || porProcurar === 0}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap disabled:opacity-50"
          title="Procura no Winmax e no catálogo Icecat (EAN e marca + modelo)"
        >
          {st.running ? "A procurar fotos..." : "Procurar fotos automaticamente"}
        </button>
      </div>
      {job?.status === "error" && !st.running && (
        <p className="text-xs text-red-700 bg-red-50 rounded-xl px-3 py-2 mt-3">Última procura falhou: {job.error}</p>
      )}
    </div>
  );
}
