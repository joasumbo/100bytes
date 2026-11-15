"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";

type Run = {
  id: string;
  mode: "full" | "incremental";
  status: "running" | "ok" | "error";
  trigger: "schedule" | "manual";
  articles: number;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
};

type Status = {
  configured: boolean;
  running: boolean;
  counts: { articles: number; inStock: number };
  lastOk: Run | null;
  lastFull: Run | null;
  runs: Run[];
};

const fmtData = (iso: string) =>
  new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const duracao = (r: Run) =>
  r.finishedAt ? `${Math.max(1, Math.round((+new Date(r.finishedAt) - +new Date(r.startedAt)) / 1000))} s` : "…";

/** Estado do conector Winmax: última sincronização, contagens e histórico. */
export default function WinmaxConector() {
  const [st, setSt] = useState<Status | null>(null);
  const [erro, setErro] = useState(false);
  const [aIniciar, setAIniciar] = useState(false);

  const carregar = useCallback(() => {
    api
      .get<Status>("/admin/winmax/status")
      .then((r) => {
        setSt(r);
        setErro(false);
      })
      .catch(() => setErro(true));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Enquanto corre, atualiza a cada 3 s
  useEffect(() => {
    if (!st?.running) return;
    const t = setInterval(carregar, 3000);
    return () => clearInterval(t);
  }, [st?.running, carregar]);

  async function sincronizar() {
    setAIniciar(true);
    try {
      await api.post("/admin/winmax/sync", { mode: "full" });
      toast.success("Sincronização iniciada.");
      setTimeout(carregar, 500);
    } catch (e) {
      toast.error(e instanceof ApiError && e.status === 409 ? "Já está a decorrer uma sincronização." : "Não foi possível iniciar.");
    } finally {
      setAIniciar(false);
    }
  }

  const ultima = st?.runs[0];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-semibold text-gray-800">Winmax</h2>
          <p className="text-xs text-gray-500">
            Artigos, preços e stock sincronizados automaticamente a partir do Winmax 4.
          </p>
        </div>
        <button
          onClick={sincronizar}
          disabled={aIniciar || !st?.configured || st?.running}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap disabled:opacity-50"
        >
          {st?.running ? "A sincronizar..." : "Sincronizar agora"}
        </button>
      </div>

      {erro && <p className="text-sm text-red-600">Não foi possível obter o estado do conector.</p>}
      {st && !st.configured && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
          Credenciais do Winmax em falta no servidor (variáveis WINMAX_*).
        </p>
      )}

      {st && st.configured && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Indicador rotulo="Artigos" valor={st.counts.articles.toLocaleString("pt-PT")} />
            <Indicador rotulo="Com stock" valor={st.counts.inStock.toLocaleString("pt-PT")} />
            <Indicador
              rotulo="Última sincronização"
              valor={st.lastOk ? fmtData(st.lastOk.finishedAt ?? st.lastOk.startedAt) : "Nunca"}
            />
          </div>

          {ultima?.status === "error" && (
            <p className="text-xs text-red-700 bg-red-50 rounded-xl px-3 py-2 mb-4 break-words">
              Última execução falhou: {ultima.error}
            </p>
          )}

          <h3 className="text-xs font-medium text-gray-500 mb-2">Histórico</h3>
          <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 sticky top-0">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Início</th>
                  <th className="text-left font-medium px-3 py-2">Tipo</th>
                  <th className="text-right font-medium px-3 py-2">Artigos</th>
                  <th className="text-right font-medium px-3 py-2">Duração</th>
                  <th className="text-right font-medium px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {st.runs.map((r) => (
                  <tr key={r.id} title={r.error ?? undefined}>
                    <td className="px-3 py-2 text-gray-700">{fmtData(r.startedAt)}</td>
                    <td className="px-3 py-2 text-gray-500">
                      {r.mode === "full" ? "Completa" : "Alterações"}
                      {r.trigger === "manual" && " · manual"}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">{r.articles}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{duracao(r)}</td>
                    <td className="px-3 py-2 text-right">
                      <EstadoRun status={r.status} />
                    </td>
                  </tr>
                ))}
                {st.runs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-gray-400">
                      Ainda sem sincronizações.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Automático: alterações a cada 5 min e sincronização completa a cada 30 min.
          </p>
        </>
      )}
    </div>
  );
}

function Indicador({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="bg-gray-50 rounded-xl px-3 py-2">
      <div className="text-[11px] text-gray-500">{rotulo}</div>
      <div className="text-sm font-semibold text-gray-900 truncate">{valor}</div>
    </div>
  );
}

function EstadoRun({ status }: { status: Run["status"] }) {
  const mapa = {
    ok: "bg-green-50 text-green-700",
    error: "bg-red-50 text-red-700",
    running: "bg-amber-50 text-amber-700",
  } as const;
  const texto = { ok: "OK", error: "Erro", running: "A correr" } as const;
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${mapa[status]}`}>{texto[status]}</span>;
}
