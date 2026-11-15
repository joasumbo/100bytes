"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

type Foto = { id: string; url: string; source: "icecat" | "winmax" | "upload"; position: number };
type Info = {
  status: "found" | "not_found" | "error";
  matchedBy: "ean" | "model" | null;
  title: string | null;
  mpn: string | null;
  error: string | null;
  lookedUpAt: string;
};
type Artigo = {
  code: string;
  designation: string;
  barcode: string | null;
  priceWithTax: number | null;
  stockTotal: number;
  images: Foto[];
  info: Info | null;
};

const ORIGEM = { icecat: "Icecat", winmax: "Winmax", upload: "Carregada" } as const;

/** Janela de gestão das fotos de um artigo do Winmax. */
export default function ArtigoFotos({ code, aoFechar, aoMudar }: { code: string; aoFechar: () => void; aoMudar: () => void }) {
  const [art, setArt] = useState<Artigo | null>(null);
  const [versao, setVersao] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const ficheiro = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let ativo = true;
    api
      .get<{ article: Artigo }>(`/admin/winmax/articles/${encodeURIComponent(code)}`)
      .then((r) => ativo && setArt(r.article))
      .catch(() => toast.error("Não foi possível carregar o artigo."));
    return () => {
      ativo = false;
    };
  }, [code, versao]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aoFechar]);

  const recarregar = () => {
    setVersao((v) => v + 1);
    aoMudar();
  };

  async function acao(fn: () => Promise<unknown>, ok: string) {
    setOcupado(true);
    try {
      await fn();
      toast.success(ok);
      recarregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falhou.");
    } finally {
      setOcupado(false);
    }
  }

  const base = `/admin/winmax/articles/${encodeURIComponent(code)}`;

  async function carregar(files: FileList | null) {
    if (!files?.length) return;
    setOcupado(true);
    try {
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", f);
        await api.upload(`${base}/images`, fd);
      }
      toast.success(files.length > 1 ? "Fotos carregadas." : "Foto carregada.");
      recarregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar.");
    } finally {
      setOcupado(false);
      if (ficheiro.current) ficheiro.current.value = "";
    }
  }

  async function procurar() {
    setOcupado(true);
    try {
      const r = await api.post<{ added: number }>(`${base}/lookup`, {});
      if (r.added) toast.success(`${r.added} foto(s) adicionada(s).`);
      else toast.info("Nenhuma foto encontrada automaticamente.");
      recarregar();
    } catch {
      toast.error("A procura falhou.");
    } finally {
      setOcupado(false);
    }
  }

  const info = art?.info;
  const resultado = !info
    ? "Ainda não procurado automaticamente."
    : info.status === "found"
      ? `Encontrado no Icecat pelo ${info.matchedBy === "ean" ? "código de barras" : "modelo"}${info.mpn ? ` (${info.mpn})` : ""}.`
      : info.status === "error"
        ? `Erro na procura: ${info.error}`
        : "Não encontrado no Icecat.";

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={aoFechar}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100">
          <div className="min-w-0">
            <div className="text-xs text-gray-400 font-mono">{code}</div>
            <h2 className="font-semibold text-gray-900">{art?.designation ?? "A carregar..."}</h2>
            {info?.title && <p className="text-xs text-gray-500 mt-0.5">Icecat: {info.title}</p>}
          </div>
          <button onClick={aoFechar} className="text-gray-400 hover:text-gray-700 text-sm px-2 py-1">
            Fechar
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => ficheiro.current?.click()}
              disabled={ocupado || (art?.images.length ?? 0) >= 5}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              Carregar fotos
            </button>
            <button
              onClick={procurar}
              disabled={ocupado}
              className="border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              Procurar automaticamente
            </button>
            <input
              ref={ficheiro}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => carregar(e.target.files)}
            />
            <span className="text-xs text-gray-500">Até 5 fotos, 5 MB cada. A primeira é a principal.</span>
          </div>

          <p className="text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
            {resultado}
            {art?.barcode && <span className="text-gray-400"> · Código de barras: {art.barcode}</span>}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {art?.images.map((f, i) => (
              <div key={f.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="aspect-square bg-white flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt="" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="flex items-center justify-between gap-1 px-2 py-1.5 border-t border-gray-100 text-xs">
                  <span className={i === 0 ? "text-orange-600 font-medium" : "text-gray-400"}>
                    {i === 0 ? "Principal" : ORIGEM[f.source]}
                  </span>
                  <div className="flex gap-2">
                    {i > 0 && (
                      <button
                        disabled={ocupado}
                        onClick={() => acao(() => api.post(`${base}/images/${f.id}/main`, {}), "Foto principal alterada.")}
                        className="text-gray-600 hover:text-orange-600"
                      >
                        Principal
                      </button>
                    )}
                    <button
                      disabled={ocupado}
                      onClick={() => acao(() => api.delete(`${base}/images/${f.id}`), "Foto apagada.")}
                      className="text-gray-600 hover:text-red-600"
                    >
                      Apagar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {art && art.images.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8 border border-dashed border-gray-200 rounded-xl">
              Este artigo ainda não tem fotos.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
