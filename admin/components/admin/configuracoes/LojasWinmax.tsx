"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

type Loja = {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  active: boolean;
  winmaxTerminalCodes: number[];
  winmaxWarehouseCodes: number[];
};
type Item = { code: number; name: string };

const campo =
  "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

/**
 * Lojas físicas e a sua ligação ao Winmax (terminais e armazéns).
 * Nesta fase o site mostra o stock total de todas as lojas; esta associação
 * prepara a disponibilidade por loja e o levantamento em loja.
 */
export default function LojasWinmax() {
  const [lojas, setLojas] = useState<Loja[] | null>(null);
  const [terminais, setTerminais] = useState<Item[]>([]);
  const [armazens, setArmazens] = useState<Item[]>([]);
  const [nova, setNova] = useState(false);
  const [versao, setVersao] = useState(0);
  const carregar = () => setVersao((v) => v + 1);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      api.get<{ stores: Loja[] }>("/stores"),
      api.get<{ terminals: Item[] }>("/admin/winmax/terminals").catch(() => ({ terminals: [] as Item[] })),
      api.get<{ warehouses: Item[] }>("/admin/winmax/warehouses").catch(() => ({ warehouses: [] as Item[] })),
    ])
      .then(([l, t, a]) => {
        if (!ativo) return;
        setLojas(l.stores);
        setTerminais(t.terminals);
        setArmazens(a.warehouses);
      })
      .catch(() => toast.error("Não foi possível carregar as lojas."));
    return () => {
      ativo = false;
    };
  }, [versao]);

  const semLoja = armazens.filter((a) => !lojas?.some((l) => l.winmaxWarehouseCodes.includes(a.code)));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h2 className="font-semibold text-gray-800">Lojas</h2>
          <p className="text-xs text-gray-500">
            Associe cada loja aos seus terminais e armazéns no Winmax. Por agora o site mostra o stock
            total de todas as lojas.
          </p>
        </div>
        {!nova && (
          <button
            onClick={() => setNova(true)}
            className="border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap"
          >
            Nova loja
          </button>
        )}
      </div>

      {terminais.length === 0 && armazens.length === 0 && lojas && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mt-3">
          Ainda não há terminais nem armazéns do Winmax. Corra uma sincronização no cartão Winmax.
        </p>
      )}
      {semLoja.length > 0 && (
        <p className="text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-2 mt-3">
          Armazéns sem loja associada: {semLoja.map((a) => `${a.code} · ${a.name}`).join(", ")}
        </p>
      )}

      <div className="space-y-3 mt-4">
        {nova && (
          <CartaoLoja
            terminais={terminais}
            armazens={armazens}
            aoGuardar={() => {
              setNova(false);
              carregar();
            }}
            aoCancelar={() => setNova(false)}
          />
        )}
        {lojas?.map((l) => (
          <CartaoLoja key={l.id} loja={l} terminais={terminais} armazens={armazens} aoGuardar={carregar} />
        ))}
        {lojas?.length === 0 && !nova && <p className="text-sm text-gray-400">Sem lojas registadas.</p>}
        {!lojas && <p className="text-sm text-gray-400">A carregar...</p>}
      </div>
    </div>
  );
}

function CartaoLoja({
  loja,
  terminais,
  armazens,
  aoGuardar,
  aoCancelar,
}: {
  loja?: Loja;
  terminais: Item[];
  armazens: Item[];
  aoGuardar: () => void;
  aoCancelar?: () => void;
}) {
  const [nome, setNome] = useState(loja?.name ?? "");
  const [morada, setMorada] = useState(loja?.address ?? "");
  const [telefone, setTelefone] = useState(loja?.phone ?? "");
  const [ativa, setAtiva] = useState(loja?.active ?? true);
  const [term, setTerm] = useState<number[]>(loja?.winmaxTerminalCodes ?? []);
  const [arm, setArm] = useState<number[]>(loja?.winmaxWarehouseCodes ?? []);
  const [aGuardar, setAGuardar] = useState(false);

  const alterna = (lista: number[], set: (v: number[]) => void, c: number) =>
    set(lista.includes(c) ? lista.filter((x) => x !== c) : [...lista, c].sort((a, b) => a - b));

  async function guardar() {
    if (!nome.trim() || !morada.trim()) {
      toast.error("Indique o nome e a morada da loja.");
      return;
    }
    setAGuardar(true);
    const dados = {
      name: nome,
      address: morada,
      phone: telefone,
      active: ativa,
      winmaxTerminalCodes: term,
      winmaxWarehouseCodes: arm,
    };
    try {
      if (loja) await api.put(`/stores/${loja.id}`, dados);
      else await api.post("/stores", dados);
      toast.success(loja ? "Loja atualizada." : "Loja criada.");
      aoGuardar();
    } catch {
      toast.error("Falha ao guardar. Verifique a sessão.");
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <div className="border border-gray-100 rounded-2xl p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} className={campo} placeholder="Loja Samba" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Morada</label>
          <input value={morada} onChange={(e) => setMorada(e.target.value)} className={campo} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Telefone</label>
          <input value={telefone} onChange={(e) => setTelefone(e.target.value)} className={campo} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Escolha
          titulo="Terminais Winmax"
          itens={terminais}
          marcados={term}
          aoAlternar={(c) => alterna(term, setTerm, c)}
        />
        <Escolha
          titulo="Armazéns (stock desta loja)"
          itens={armazens}
          marcados={arm}
          aoAlternar={(c) => alterna(arm, setArm, c)}
        />
      </div>

      <div className="flex items-center justify-between mt-4">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} className="accent-orange-500" />
          Loja ativa
        </label>
        <div className="flex gap-2">
          {aoCancelar && (
            <button onClick={aoCancelar} className="px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
          )}
          <button
            onClick={guardar}
            disabled={aGuardar}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {aGuardar ? "A guardar..." : loja ? "Guardar" : "Criar loja"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Escolha({
  titulo,
  itens,
  marcados,
  aoAlternar,
}: {
  titulo: string;
  itens: Item[];
  marcados: number[];
  aoAlternar: (code: number) => void;
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{titulo}</div>
      <div className="space-y-1">
        {itens.map((i) => (
          <label key={i.code} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={marcados.includes(i.code)}
              onChange={() => aoAlternar(i.code)}
              className="accent-orange-500"
            />
            <span className="text-gray-400 w-5 text-right">{i.code}</span>
            <span>{i.name}</span>
          </label>
        ))}
        {itens.length === 0 && <p className="text-xs text-gray-400">Sem dados do Winmax.</p>}
      </div>
    </div>
  );
}
