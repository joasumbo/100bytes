"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

/* ── Tipos devolvidos pelo Backend (/push/admin/*) ── */
type Resumo = {
  dias: number;
  ativo: boolean;
  aparelhos: { ativas: number; total: number; revogadas: number; novas: number; comConta: number };
  envios: { enviadas: number; entregues: number; cliques: number; taxaClique: number };
  pedidos: { mostrado: number; aceite: number; recusado: number; dispensado: number };
  origens: { origem: string; n: number }[];
  porDia: { dia: string; adesoes: number; enviadas: number; cliques: number }[];
  porTipo: { tipo: string; enviadas: number; cliques: number }[];
  ultimos: { id: string; kind: string; title: string; body: string; url: string; status: string; sentAt: string; clickedAt: string | null }[];
};
type Automacoes = {
  encomendas: boolean; favoritos: boolean; carrinho: boolean; interesse: boolean; diario: boolean; feriados: boolean;
  horaDiario: number; diasDiario: number[]; carrinhoHoras: number; interesseHoras: number; limiteHoras: number; inicio: number; fim: number;
};
type Campanha = {
  id: string; title: string; body: string; url: string; image: string | null; segment: string; status: string;
  scheduledAt: string | null; sentAt: string | null; createdAt: string; enviadas: number; cliques: number;
};

const TIPOS: Record<string, string> = {
  encomenda: "Estado da encomenda",
  favorito_preco: "Favorito baixou de preço",
  favorito_stock: "Favorito voltou ao stock",
  carrinho: "Carrinho abandonado",
  interesse: "Interesse por categoria",
  diario: "Produto do dia",
  feriado: "Feriado",
  campanha: "Campanha",
  teste: "Teste",
};
const ORIGENS: Record<string, string> = { banner: "Convite no site", encomenda: "Página da encomenda", favorito: "Ao guardar favorito", conta: "A minha conta", sync: "Registo automático", renovacao: "Renovação", teste: "Teste" };
const ESTADO_CAMPANHA: Record<string, string> = { rascunho: "Rascunho", agendada: "Agendada", a_enviar: "A enviar", enviada: "Enviada" };
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const pct = (v: number) => (v * 100).toLocaleString("pt-PT", { maximumFractionDigits: 1 }) + "%";
const num = (v: number) => v.toLocaleString("pt-PT");
const quando = (d: string) => new Date(d).toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function Cartao({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-[13px] text-gray-500">{titulo}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1 tracking-tight">{valor}</p>
      {nota && <p className="text-xs text-gray-400 mt-1">{nota}</p>}
    </div>
  );
}

function Seccao({ titulo, sub, children, acao }: { titulo: string; sub?: string; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div>
          <h2 className="text-[15px] font-semibold text-gray-900">{titulo}</h2>
          {sub && <p className="text-[13px] text-gray-500 mt-0.5">{sub}</p>}
        </div>
        {acao}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Interruptor({ ligado, onChange, rotulo, descricao }: { ligado: boolean; onChange: (v: boolean) => void; rotulo: string; descricao: string }) {
  return (
    <label className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0 cursor-pointer">
      <span>
        <span className="block text-sm font-medium text-gray-900">{rotulo}</span>
        <span className="block text-[13px] text-gray-500">{descricao}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={ligado}
        onClick={() => onChange(!ligado)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${ligado ? "bg-gray-900" : "bg-gray-200"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${ligado ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

function CampoNumero({ rotulo, valor, onChange, min = 0, max = 23, sufixo }: { rotulo: string; valor: number; onChange: (v: number) => void; min?: number; max?: number; sufixo?: string }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-gray-700 mb-1">{rotulo}</span>
      <span className="flex items-center gap-2">
        <input type="number" min={min} max={max} value={valor} onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:border-gray-900" />
        {sufixo && <span className="text-[13px] text-gray-500">{sufixo}</span>}
      </span>
    </label>
  );
}

export default function NotificacoesPage() {
  const [dias, setDias] = useState(30);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [auto, setAuto] = useState<Automacoes | null>(null);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [categorias, setCategorias] = useState<{ slug: string; name: string }[]>([]);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    try {
      setErro("");
      const [r, a, c] = await Promise.all([
        apiFetch<Resumo>(`/push/admin/resumo?dias=${dias}`),
        apiFetch<Automacoes>("/push/admin/automacoes"),
        apiFetch<Campanha[]>("/push/admin/campanhas"),
      ]);
      setResumo(r); setAuto(a); setCampanhas(c);
    } catch (e: any) {
      setErro(e?.message || "Não foi possível carregar os dados.");
    }
  }, [dias]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    apiFetch<{ categories: { slug: string; name: string; _count?: { products: number } }[] }>("/categories")
      .then((d) => setCategorias((d.categories || []).filter((c) => (c._count?.products || 0) > 0).sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => undefined);
  }, []);

  const aceitacao = resumo && resumo.pedidos.mostrado ? resumo.pedidos.aceite / resumo.pedidos.mostrado : 0;

  // ── Automações ──
  const [aGuardar, setAGuardar] = useState(false);
  const mudar = <K extends keyof Automacoes>(k: K, v: Automacoes[K]) => setAuto((a) => (a ? { ...a, [k]: v } : a));
  async function guardarAutomacoes() {
    if (!auto) return;
    setAGuardar(true);
    try {
      setAuto(await apiFetch<Automacoes>("/push/admin/automacoes", { method: "PUT", json: auto }));
      toast.success("Automações guardadas.");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível guardar.");
    } finally { setAGuardar(false); }
  }

  // ── Campanha nova ──
  const vazia = { title: "", body: "", url: "/novidades", image: "", segment: "todos", categoria: "", scheduledAt: "" };
  const [nova, setNova] = useState(vazia);
  const [destinatarios, setDestinatarios] = useState<number | null>(null);
  const [aEnviar, setAEnviar] = useState(false);
  const segmento = nova.segment === "categoria" ? (nova.categoria ? "categoria:" + nova.categoria : "") : nova.segment;
  useEffect(() => {
    if (!segmento) { setDestinatarios(null); return; }
    apiFetch<{ total: number }>(`/push/admin/destinatarios?segmento=${encodeURIComponent(segmento)}`).then((d) => setDestinatarios(d.total)).catch(() => setDestinatarios(null));
  }, [segmento]);

  async function criarCampanha(modo: "agora" | "agendar" | "rascunho") {
    if (!nova.title.trim() || !nova.body.trim()) { toast.error("Indique o título e o texto."); return; }
    if (!segmento) { toast.error("Escolha a categoria."); return; }
    if (modo === "agendar" && !nova.scheduledAt) { toast.error("Indique a data e a hora."); return; }
    if (modo === "agora" && !confirm(`Enviar já para ${destinatarios ?? "?"} aparelhos?`)) return;
    setAEnviar(true);
    try {
      const r = await apiFetch<{ enviadas?: number }>("/push/admin/campanhas", {
        method: "POST",
        json: {
          title: nova.title, body: nova.body, url: nova.url, image: nova.image || undefined, segment: segmento,
          scheduledAt: modo === "agendar" ? new Date(nova.scheduledAt).toISOString() : undefined,
          enviarAgora: modo === "agora",
        },
      });
      toast.success(modo === "agora" ? `Campanha enviada a ${r.enviadas ?? 0} aparelhos.` : modo === "agendar" ? "Campanha agendada." : "Rascunho guardado.");
      setNova(vazia);
      carregar();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível criar a campanha.");
    } finally { setAEnviar(false); }
  }

  async function enviarRascunho(c: Campanha) {
    if (!confirm(`Enviar "${c.title}" agora?`)) return;
    try {
      const r = await apiFetch<{ enviadas: number }>(`/push/admin/campanhas/${c.id}/enviar`, { method: "POST" });
      toast.success(`Enviada a ${r.enviadas} aparelhos.`);
      carregar();
    } catch (e: any) { toast.error(e?.message || "Falhou o envio."); }
  }
  async function apagar(c: Campanha) {
    if (!confirm(`Apagar "${c.title}"?`)) return;
    await apiFetch(`/push/admin/campanhas/${c.id}`, { method: "DELETE" }).catch(() => undefined);
    carregar();
  }

  // ── Teste ──
  const [emailTeste, setEmailTeste] = useState("");
  async function teste() {
    try {
      const r = await apiFetch<{ enviadas: number }>("/push/admin/teste", { method: "POST", json: { email: emailTeste } });
      toast.success(`Teste enviado a ${r.enviadas} aparelho(s).`);
      carregar();
    } catch (e: any) { toast.error(e?.message || "Não foi possível enviar."); }
  }

  const grafico = useMemo(() => (resumo?.porDia || []).map((d) => ({ ...d, rotulo: d.dia.slice(8, 10) + "/" + d.dia.slice(5, 7) })), [resumo]);

  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Notificações push</h1>
          <p className="text-sm text-gray-500 mt-1">
            Aparelhos com notificações ativas, envios, cliques e automações.
            {resumo && !resumo.ativo && <span className="text-red-600"> As chaves VAPID não estão configuradas no servidor.</span>}
          </p>
        </div>
        <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDias(d)}
              className={`h-8 px-3 rounded-md text-sm ${dias === d ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"}`}>
              {d} dias
            </button>
          ))}
        </div>
      </div>

      {erro && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {/* Indicadores */}
      {resumo && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <Cartao titulo="Aparelhos ativos" valor={num(resumo.aparelhos.ativas)} nota={`${num(resumo.aparelhos.comConta)} com conta de cliente`} />
          <Cartao titulo="Novas adesões" valor={num(resumo.aparelhos.novas)} nota={`nos últimos ${resumo.dias} dias`} />
          <Cartao titulo="Taxa de aceitação" valor={resumo.pedidos.mostrado ? pct(aceitacao) : "—"} nota={`${num(resumo.pedidos.aceite)} de ${num(resumo.pedidos.mostrado)} convites`} />
          <Cartao titulo="Enviadas" valor={num(resumo.envios.enviadas)} nota={`${num(resumo.envios.entregues)} entregues`} />
          <Cartao titulo="Entradas no site" valor={num(resumo.envios.cliques)} nota="cliques nas notificações (utm_source=push)" />
          <Cartao titulo="Taxa de cliques" valor={resumo.envios.entregues ? pct(resumo.envios.taxaClique) : "—"} nota="cliques / entregues" />
        </div>
      )}

      {/* Gráfico */}
      {resumo && (
        <Seccao titulo="Evolução diária" sub="Adesões, notificações enviadas e cliques por dia (hora de Luanda).">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={grafico} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="#f1f1f3" vertical={false} />
                <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="adesoes" name="Adesões" stroke="#F57C00" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="enviadas" name="Enviadas" stroke="#18181b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cliques" name="Cliques" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Seccao>
      )}

      {resumo && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Seccao titulo="Por tipo de notificação" sub={`Últimos ${resumo.dias} dias`}>
              {resumo.porTipo.length ? (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-[12px] text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium">Tipo</th><th className="pb-2 font-medium text-right">Enviadas</th><th className="pb-2 font-medium text-right">Cliques</th><th className="pb-2 font-medium text-right">Taxa</th>
                  </tr></thead>
                  <tbody>
                    {resumo.porTipo.map((t) => (
                      <tr key={t.tipo} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 text-gray-900">{TIPOS[t.tipo] || t.tipo}</td>
                        <td className="py-2.5 text-right tabular-nums">{num(t.enviadas)}</td>
                        <td className="py-2.5 text-right tabular-nums">{num(t.cliques)}</td>
                        <td className="py-2.5 text-right tabular-nums text-gray-600">{t.enviadas ? pct(t.cliques / t.enviadas) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-sm text-gray-500">Ainda não foram enviadas notificações neste período.</p>}
            </Seccao>
          </div>
          <Seccao titulo="Adesão" sub="Convites mostrados no site e de onde vêm os aparelhos.">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {([["Convites mostrados", resumo.pedidos.mostrado], ["Aceites", resumo.pedidos.aceite], ["Recusados no navegador", resumo.pedidos.recusado], ["\"Agora não\"", resumo.pedidos.dispensado]] as [string, number][]).map(([r, v]) => (
                <div key={r} className="rounded-lg bg-gray-50 px-3 py-2"><dt className="text-[12px] text-gray-500">{r}</dt><dd className="text-lg font-semibold tabular-nums">{num(v)}</dd></div>
              ))}
            </dl>
            <p className="text-[12px] font-medium text-gray-500 mt-4 mb-2">Origem dos aparelhos ativos</p>
            {resumo.origens.length ? resumo.origens.map((o) => (
              <div key={o.origem} className="flex justify-between text-sm py-1"><span className="text-gray-700">{ORIGENS[o.origem] || o.origem}</span><span className="tabular-nums text-gray-900">{num(o.n)}</span></div>
            )) : <p className="text-sm text-gray-500">Sem aparelhos ainda.</p>}
          </Seccao>
        </div>
      )}

      {/* Automações */}
      {auto && (
        <Seccao titulo="Automações" sub="O que o sistema envia sozinho. As de marketing respeitam o limite por aparelho e o horário."
          acao={<button onClick={guardarAutomacoes} disabled={aGuardar} className="h-9 px-4 rounded-lg bg-gray-900 text-white text-sm font-medium disabled:opacity-50">{aGuardar ? "A guardar…" : "Guardar"}</button>}>
          <div className="grid lg:grid-cols-2 gap-x-10">
            <div>
              <Interruptor ligado={auto.encomendas} onChange={(v) => mudar("encomendas", v)} rotulo="Estado da encomenda" descricao="Recebida, confirmada, em preparação, a caminho, entregue e cancelada." />
              <Interruptor ligado={auto.favoritos} onChange={(v) => mudar("favoritos", v)} rotulo="Favoritos" descricao="Quando um produto guardado baixa de preço ou volta ao stock (dados do Winmax)." />
              <Interruptor ligado={auto.carrinho} onChange={(v) => mudar("carrinho", v)} rotulo="Carrinho abandonado" descricao={`Pôs no carrinho e não finalizou em ${auto.carrinhoHoras} h.`} />
              <Interruptor ligado={auto.interesse} onChange={(v) => mudar("interesse", v)} rotulo="Interesse por categoria" descricao={`Viu vários produtos da mesma categoria: sugestão ${auto.interesseHoras} h depois.`} />
              <Interruptor ligado={auto.diario} onChange={(v) => mudar("diario", v)} rotulo="Produto do dia" descricao={`Às ${auto.horaDiario}h, nos dias escolhidos. Ex.: "Terça-feira chegou e o … está ao melhor preço".`} />
              <Interruptor ligado={auto.feriados} onChange={(v) => mudar("feriados", v)} rotulo="Feriados de Angola" descricao="Mensagem nos feriados nacionais (substitui o produto do dia)." />
            </div>
            <div className="space-y-5 pt-3">
              <div>
                <span className="block text-[13px] font-medium text-gray-700 mb-2">Dias do produto do dia</span>
                <div className="flex flex-wrap gap-1.5">
                  {DIAS.map((d, i) => {
                    const on = auto.diasDiario.includes(i);
                    return (
                      <button key={d} type="button" onClick={() => mudar("diasDiario", on ? auto.diasDiario.filter((x) => x !== i) : [...auto.diasDiario, i].sort())}
                        className={`h-8 w-12 rounded-md text-sm border ${on ? "bg-gray-900 border-gray-900 text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}>{d}</button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <CampoNumero rotulo="Hora do produto do dia" valor={auto.horaDiario} onChange={(v) => mudar("horaDiario", v)} sufixo="h" />
                <CampoNumero rotulo="Carrinho: esperar" valor={auto.carrinhoHoras} onChange={(v) => mudar("carrinhoHoras", v)} sufixo="horas" />
                <CampoNumero rotulo="Interesse: esperar" valor={auto.interesseHoras} onChange={(v) => mudar("interesseHoras", v)} sufixo="horas" />
                <CampoNumero rotulo="Marketing: no máximo 1 a cada" valor={auto.limiteHoras} onChange={(v) => mudar("limiteHoras", v)} max={168} sufixo="horas" />
                <CampoNumero rotulo="Enviar a partir das" valor={auto.inicio} onChange={(v) => mudar("inicio", v)} sufixo="h" />
                <CampoNumero rotulo="Até às" valor={auto.fim} onChange={(v) => mudar("fim", v)} sufixo="h" />
              </div>
            </div>
          </div>
        </Seccao>
      )}

      {/* Campanhas */}
      <Seccao titulo="Campanhas" sub="Mensagens escritas por si, enviadas já ou agendadas.">
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-3">
            <label className="block">
              <span className="flex justify-between text-[13px] font-medium text-gray-700 mb-1">Título <span className="text-gray-400 font-normal">{nova.title.length}/80</span></span>
              <input maxLength={80} value={nova.title} onChange={(e) => setNova({ ...nova, title: e.target.value })} placeholder="Ex.: Semana dos portáteis"
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:border-gray-900" />
            </label>
            <label className="block">
              <span className="flex justify-between text-[13px] font-medium text-gray-700 mb-1">Texto <span className="text-gray-400 font-normal">{nova.body.length}/200</span></span>
              <textarea maxLength={200} rows={3} value={nova.body} onChange={(e) => setNova({ ...nova, body: e.target.value })} placeholder="Ex.: Portáteis HP e Lenovo com entrega em todo o país."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-900" />
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-[13px] font-medium text-gray-700 mb-1">Link (página do site)</span>
                <input value={nova.url} onChange={(e) => setNova({ ...nova, url: e.target.value })} placeholder="/rede-e-internet"
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:border-gray-900" />
              </label>
              <label className="block">
                <span className="block text-[13px] font-medium text-gray-700 mb-1">Imagem (opcional, URL)</span>
                <input value={nova.image} onChange={(e) => setNova({ ...nova, image: e.target.value })} placeholder="https://cdn.100bytes.co.ao/…"
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:border-gray-900" />
              </label>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-[13px] font-medium text-gray-700 mb-1">Para quem</span>
                <select value={nova.segment} onChange={(e) => setNova({ ...nova, segment: e.target.value })}
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:border-gray-900">
                  <option value="todos">Todos os aparelhos</option>
                  <option value="clientes">Só clientes com conta</option>
                  <option value="categoria">Quem se interessou por uma categoria (30 dias)</option>
                </select>
              </label>
              {nova.segment === "categoria" ? (
                <label className="block">
                  <span className="block text-[13px] font-medium text-gray-700 mb-1">Categoria</span>
                  <select value={nova.categoria} onChange={(e) => setNova({ ...nova, categoria: e.target.value })}
                    className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:border-gray-900">
                    <option value="">Escolher…</option>
                    {categorias.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                  </select>
                </label>
              ) : (
                <label className="block">
                  <span className="block text-[13px] font-medium text-gray-700 mb-1">Agendar (opcional)</span>
                  <input type="datetime-local" value={nova.scheduledAt} onChange={(e) => setNova({ ...nova, scheduledAt: e.target.value })}
                    className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:border-gray-900" />
                </label>
              )}
            </div>
            {nova.segment === "categoria" && (
              <label className="block sm:w-1/2">
                <span className="block text-[13px] font-medium text-gray-700 mb-1">Agendar (opcional)</span>
                <input type="datetime-local" value={nova.scheduledAt} onChange={(e) => setNova({ ...nova, scheduledAt: e.target.value })}
                  className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:border-gray-900" />
              </label>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button disabled={aEnviar} onClick={() => criarCampanha("agora")} className="h-9 px-4 rounded-lg bg-gray-900 text-white text-sm font-medium disabled:opacity-50">Enviar agora</button>
              <button disabled={aEnviar} onClick={() => criarCampanha("agendar")} className="h-9 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-800 hover:border-gray-400 disabled:opacity-50">Agendar</button>
              <button disabled={aEnviar} onClick={() => criarCampanha("rascunho")} className="h-9 px-4 rounded-lg text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50">Guardar rascunho</button>
              <span className="text-[13px] text-gray-500 ml-auto">{destinatarios === null ? "" : `${num(destinatarios)} aparelho(s) vão receber`}</span>
            </div>
          </div>
          {/* Pré-visualização */}
          <div className="lg:col-span-2">
            <p className="text-[12px] font-medium text-gray-500 mb-2">Pré-visualização</p>
            <div className="rounded-2xl bg-gray-100 p-4">
              <div className="rounded-xl bg-white shadow-sm p-3 flex gap-3">
                <img src="https://100bytes.co.ao/img/push-icone.png" alt="" className="w-10 h-10 rounded-lg flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[12px] text-gray-500">100 bytes · agora</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{nova.title || "Título da notificação"}</p>
                  <p className="text-[13px] text-gray-600 line-clamp-3">{nova.body || "O texto aparece aqui."}</p>
                </div>
              </div>
              {nova.image && <img src={nova.image} alt="" className="mt-2 w-full rounded-xl object-cover max-h-40" />}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-[12px] font-medium text-gray-500 mb-2">Campanhas recentes</p>
          {campanhas.length ? (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[12px] text-gray-500 border-b border-gray-100">
                <th className="pb-2 font-medium">Campanha</th><th className="pb-2 font-medium">Estado</th><th className="pb-2 font-medium text-right">Enviadas</th><th className="pb-2 font-medium text-right">Cliques</th><th className="pb-2" />
              </tr></thead>
              <tbody>
                {campanhas.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 align-top">
                    <td className="py-2.5 pr-3"><span className="block text-gray-900 font-medium">{c.title}</span><span className="block text-[12px] text-gray-500 line-clamp-1">{c.body}</span></td>
                    <td className="py-2.5 text-gray-600 whitespace-nowrap">
                      {ESTADO_CAMPANHA[c.status] || c.status}
                      <span className="block text-[12px] text-gray-400">{c.sentAt ? quando(c.sentAt) : c.scheduledAt ? "para " + quando(c.scheduledAt) : quando(c.createdAt)}</span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{num(c.enviadas)}</td>
                    <td className="py-2.5 text-right tabular-nums">{num(c.cliques)}{c.enviadas ? <span className="text-gray-400"> · {pct(c.cliques / c.enviadas)}</span> : null}</td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      {(c.status === "rascunho" || c.status === "agendada") && (
                        <>
                          <button onClick={() => enviarRascunho(c)} className="text-[13px] text-gray-900 font-medium hover:underline mr-3">Enviar</button>
                          <button onClick={() => apagar(c)} className="text-[13px] text-gray-500 hover:text-red-600">Apagar</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-gray-500">Ainda não há campanhas.</p>}
        </div>
      </Seccao>

      {/* Últimos envios + teste */}
      {resumo && (
        <Seccao titulo="Últimos envios" sub="As 30 notificações mais recentes."
          acao={
            <div className="flex gap-2">
              <input value={emailTeste} onChange={(e) => setEmailTeste(e.target.value)} placeholder="Email de um cliente"
                className="h-9 w-56 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:border-gray-900" />
              <button onClick={teste} className="h-9 px-3 rounded-lg border border-gray-200 text-sm font-medium hover:border-gray-400">Enviar teste</button>
            </div>
          }>
          {resumo.ultimos.length ? (
            <div className="divide-y divide-gray-100">
              {resumo.ultimos.map((u) => (
                <div key={u.id} className="py-2.5 flex items-start gap-4">
                  <span className="text-[12px] text-gray-400 w-28 flex-shrink-0 pt-0.5">{quando(u.sentAt)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900"><span className="font-medium">{u.title}</span> <span className="text-gray-400">· {TIPOS[u.kind] || u.kind}</span></p>
                    <p className="text-[13px] text-gray-500 truncate">{u.body}</p>
                  </div>
                  <span className={`text-[12px] flex-shrink-0 ${u.clickedAt ? "text-green-700" : u.status === "enviada" ? "text-gray-500" : "text-red-600"}`}>
                    {u.clickedAt ? "Clicada" : u.status === "enviada" ? "Entregue" : u.status === "expirada" ? "Aparelho saiu" : "Falhou"}
                  </span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-500">Sem envios.</p>}
        </Seccao>
      )}
    </div>
  );
}
