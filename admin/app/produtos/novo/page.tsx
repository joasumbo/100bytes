"use client";
import { fetchAPI } from "@/lib/api";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const CDN = "https://cdn100ka.sysvenus.com";
const IVA_RATE = 14;
const DRAFT_KEY = "produto_novo_draft";
const IEC_OPTIONS = [
  { label: "2% — Produtos de luxo (nível 1)", value: 2 },
  { label: "5% — Bebidas alcoólicas / Tabaco (nível 1)", value: 5 },
  { label: "10% — Veículos / Cosméticos", value: 10 },
  { label: "20% — Bebidas alcoólicas (nível 2)", value: 20 },
  { label: "30% — Tabaco (nível 2)", value: 30 },
  { label: "50% — Artigos de luxo especiais", value: 50 },
];

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Category { id: string; name: string; slug: string; parentId: string | null; }
interface Brand { id: string; name: string; logoKey: string | null; }
interface BundleLinked { id: string; name: string; basePrice: number; imageKeys: string[]; reference: string; }
interface ProductSearch { id: string; name: string; reference: string; basePrice: number; imageKeys: string[]; }

function fmtKz(v: number) {
  return v.toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function parseMoneyInput(s: string): string {
  // Remove espaços e sufixo " Kz"
  let c = s.trim().replace(/\s*kz\s*/i, "").trim();
  // Mantém só dígitos, vírgulas e pontos
  c = c.replace(/[^\d.,]/g, "");
  if (!c) return "";

  const lastDot   = c.lastIndexOf(".");
  const lastComma = c.lastIndexOf(",");

  if (lastDot > -1 && lastComma > -1) {
    // Ambos presentes → o que aparecer POR ÚLTIMO é o separador decimal
    if (lastDot > lastComma) {
      // ex: "782,667.00" → inglês → remove vírgulas (milhar)
      c = c.replace(/,/g, "");
    } else {
      // ex: "782.667,00" → europeu → remove pontos, converte vírgula
      c = c.replace(/\./g, "").replace(",", ".");
    }
  } else if (lastComma > -1) {
    // Só vírgula → separador decimal (pt-AO)
    c = c.replace(",", ".");
  }
  // Só ponto → já correcto

  const n = parseFloat(c);
  return isNaN(n) ? "" : n.toFixed(2);
}
function calcFinal(basePrice: string, hasIva: boolean, hasIec: boolean, iecRate: number) {
  const base = parseFloat(basePrice) || 0;
  const iec = hasIec ? base * (iecRate / 100) : 0;
  const iva = hasIva ? (base + iec) * (IVA_RATE / 100) : 0;
  return { base, iec, iva, final: base + iec + iva };
}

// ─── Base components ───────────────────────────────────────────────────────────
const inputCls = "w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white";
const labelCls = "text-xs font-semibold text-gray-500 mb-1.5 block";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 rounded-t-3xl">
        <h2 className="font-bold text-gray-800 text-sm">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? "bg-orange-500" : "bg-gray-300"}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

// ─── SelectInput (fixes native select arrow bug) ───────────────────────────────
function SelectInput({ value, onChange, children, className = "" }: {
  value: string | number; onChange: (v: string) => void; children: React.ReactNode; className?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} appearance-none pr-9 ${className}`}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
      </span>
    </div>
  );
}

// ─── MoneyInput ───────────────────────────────────────────────────────────────
function MoneyInput({ value, onChange, placeholder, required }: {
  value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState("");

  const formatted = (() => {
    const n = parseFloat(value);
    return isNaN(n) ? "" : fmtKz(n);
  })();

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={editing ? editVal : formatted}
        placeholder={placeholder}
        required={required}
        className={inputCls + " pr-10"}
        onFocus={() => { setEditing(true); setEditVal(value ? String(parseFloat(value)) : ""); }}
        onChange={(e) => setEditing(true) === undefined && setEditVal(e.target.value)}
        onBlur={() => { setEditing(false); onChange(parseMoneyInput(editVal)); }}
      />
      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none select-none font-medium">Kz</span>
    </div>
  );
}

// ─── BrandSelect (searchable com criação inline) ──────────────────────────────
function BrandSelect({ brands, value, onChange, onRefresh, onCreated }: {
  brands: Brand[]; value: string; onChange: (id: string) => void; onRefresh: () => void; onCreated?: (b: Brand) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const newNameRef = useRef<HTMLInputElement>(null);
  const selected = brands.find(b => b.id === value);
  const filtered = brands.filter(b => b.name.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    if (!open) { setCreating(false); setNewName(""); }
  }, [open]);

  useEffect(() => {
    if (creating) setTimeout(() => newNameRef.current?.focus(), 50);
  }, [creating]);

  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  async function handleCreate() {
    if (!newName.trim()) return;
    const duplicate = brands.find(b => b.name.toLowerCase() === newName.trim().toLowerCase());
    if (duplicate) {
      toast.info(`A marca "${duplicate.name}" já existe. A seleccioná-la...`);
      onChange(duplicate.id); setOpen(false); return;
    }
    setSaving(true);
    try {
      const res = await fetchAPI("/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erro ao criar marca."); return; }
      const b: Brand = data.brand;
      toast.success(`Marca "${b.name}" criada!`);
      try { new BroadcastChannel("100bytes_admin").postMessage({ type: "brand_created", brand: b }); } catch {}
      onCreated?.(b);
      onChange(b.id);
      setOpen(false);
    } catch { toast.error("Erro de ligação."); }
    finally { setSaving(false); }
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex gap-1.5">
        <button type="button" onClick={() => { setOpen(!open); setQ(""); setCreating(false); }} className={`${inputCls} flex items-center gap-2.5 text-left cursor-pointer flex-1 min-w-0`}>
          {selected ? (
            <>
              {selected.logoKey
                ? <img src={`${CDN}/${selected.logoKey}`} alt="" className="w-6 h-6 object-contain rounded-lg flex-shrink-0 bg-gray-50" />
                : <div className="w-6 h-6 rounded-lg bg-gray-100 flex-shrink-0" />}
              <span className="flex-1 truncate text-gray-800">{selected.name}</span>
            </>
          ) : <span className="text-gray-400 flex-1">Sem marca</span>}
          <svg className="flex-shrink-0 text-gray-400" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
        </button>
        <button type="button" onClick={onRefresh} title="Actualizar" className="w-10 flex-shrink-0 border border-gray-200 rounded-2xl flex items-center justify-center text-gray-400 hover:text-orange-500 hover:border-orange-300 transition bg-white">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
          {!creating ? (
            <>
              <div className="px-3 py-2 border-b border-gray-50">
                <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Pesquisar marca..." className="w-full text-sm outline-none placeholder:text-gray-300" />
              </div>
              <div className="max-h-52 overflow-y-auto">
                <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="w-full px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 text-left">Sem marca</button>
                {filtered.map(b => (
                  <button key={b.id} type="button" onClick={() => { onChange(b.id); setOpen(false); setQ(""); }} className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition ${value === b.id ? "bg-orange-50" : "hover:bg-gray-50"}`}>
                    {b.logoKey
                      ? <img src={`${CDN}/${b.logoKey}`} alt="" className="w-7 h-7 object-contain rounded-lg bg-gray-50 border border-gray-100" />
                      : <div className="w-7 h-7 rounded-lg bg-gray-100 flex-shrink-0" />}
                    <span className="text-sm font-medium text-gray-800">{b.name}</span>
                    {value === b.id && <svg className="ml-auto text-orange-500" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </button>
                ))}
                {filtered.length === 0 && <p className="text-xs text-gray-400 text-center py-3">Sem resultados.</p>}
              </div>
              <div className="border-t border-gray-100 p-2">
                <button type="button" onClick={() => { setNewName(q); setCreating(true); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-orange-600 hover:bg-orange-50 transition font-medium">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  {q.trim() ? `Criar "${q.trim()}"` : "Nova marca"}
                </button>
              </div>
            </>
          ) : (
            <div className="p-3 space-y-2.5">
              <p className="text-xs font-semibold text-gray-500 px-1">Nova marca</p>
              <input
                ref={newNameRef}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleCreate(); } }}
                placeholder="Nome da marca"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <div className="flex gap-2 pt-0.5">
                <button type="button" onClick={() => setCreating(false)} className="flex-1 py-2 rounded-xl text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition">Cancelar</button>
                <button type="button" disabled={saving || !newName.trim()} onClick={handleCreate} className="flex-1 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50 transition" style={{ background: "linear-gradient(135deg,#F57C00,#FF9800)" }}>
                  {saving ? "A criar..." : "Criar"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CategorySelect (searchable com criação inline) ───────────────────────────
function CategorySelect({ categories, value, onChange, onRefresh, onCreated }: {
  categories: Category[]; value: string; onChange: (id: string) => void; onRefresh: () => void; onCreated?: (cat: Category) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const newNameRef = useRef<HTMLInputElement>(null);
  const selected = categories.find(c => c.id === value);
  const roots = categories.filter(c => !c.parentId);
  const subs = (pid: string) => categories.filter(c => c.parentId === pid);
  const qLow = q.toLowerCase();
  const filtered = q ? categories.filter(c => c.name.toLowerCase().includes(qLow)) : null;

  useEffect(() => {
    if (!open) { setCreating(false); setNewName(""); setNewParentId(""); }
  }, [open]);

  useEffect(() => {
    if (creating) setTimeout(() => newNameRef.current?.focus(), 50);
  }, [creating]);

  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  async function handleCreate() {
    if (!newName.trim()) return;
    // Verificar se já existe categoria com o mesmo nome (case-insensitive)
    const duplicate = categories.find(c => c.name.toLowerCase() === newName.trim().toLowerCase());
    if (duplicate) {
      toast.info(`A categoria "${duplicate.name}" já existe. A seleccioná-la...`);
      onChange(duplicate.id);
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetchAPI("/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), parentId: newParentId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erro ao criar categoria."); return; }
      const newCat: Category = data.category;
      toast.success(`Categoria "${newCat.name}" criada!`);
      // Notificar outras tabs
      try { new BroadcastChannel("100bytes_admin").postMessage({ type: "category_created", category: newCat }); } catch {}
      onCreated?.(newCat);
      onChange(newCat.id);
      setOpen(false);
    } catch { toast.error("Erro de ligação."); }
    finally { setSaving(false); }
  }

  function CatOption({ cat, indent = false }: { cat: Category; indent?: boolean }) {
    return (
      <button type="button" onClick={() => { onChange(cat.id); setOpen(false); setQ(""); }} className={`w-full flex items-center gap-2 px-3 py-2 text-left transition text-sm ${value === cat.id ? "bg-orange-50 text-orange-700 font-semibold" : "text-gray-700 hover:bg-gray-50"} ${indent ? "pl-7" : ""}`}>
        {indent && <span className="text-gray-300 text-xs">↳</span>}
        {cat.name}
        {value === cat.id && <svg className="ml-auto text-orange-500" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex gap-1.5">
        <button type="button" onClick={() => { setOpen(!open); setQ(""); setCreating(false); }} className={`${inputCls} flex items-center gap-2 text-left cursor-pointer flex-1 min-w-0`}>
          <span className={`flex-1 truncate ${selected ? "text-gray-800" : "text-gray-400"}`}>{selected ? selected.name : "Sem categoria"}</span>
          <svg className="flex-shrink-0 text-gray-400" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
        </button>
        <button type="button" onClick={onRefresh} title="Actualizar" className="w-10 flex-shrink-0 border border-gray-200 rounded-2xl flex items-center justify-center text-gray-400 hover:text-orange-500 hover:border-orange-300 transition bg-white">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
          {!creating ? (
            <>
              <div className="px-3 py-2 border-b border-gray-50">
                <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Pesquisar categoria..." className="w-full text-sm outline-none placeholder:text-gray-300" />
              </div>
              <div className="max-h-52 overflow-y-auto">
                <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="w-full px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 text-left">Sem categoria</button>
                {filtered
                  ? filtered.map(c => <CatOption key={c.id} cat={c} indent={!!c.parentId} />)
                  : roots.flatMap(root => [
                      <CatOption key={root.id} cat={root} />,
                      ...subs(root.id).map(s => <CatOption key={s.id} cat={s} indent />),
                    ])}
                {filtered?.length === 0 && <p className="text-xs text-gray-400 text-center py-3">Sem resultados.</p>}
              </div>
              {/* Criar nova categoria */}
              <div className="border-t border-gray-100 p-2">
                <button
                  type="button"
                  onClick={() => { setNewName(q); setCreating(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-orange-600 hover:bg-orange-50 transition font-medium"
                >
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  {q.trim() ? `Criar "${q.trim()}"` : "Nova categoria"}
                </button>
              </div>
            </>
          ) : (
            /* ─── Inline create form ─── */
            <div className="p-3 space-y-2.5">
              <p className="text-xs font-semibold text-gray-500 px-1">Nova categoria</p>
              <input
                ref={newNameRef}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleCreate(); } }}
                placeholder="Nome da categoria"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <div>
                <p className="text-[11px] text-gray-400 mb-1">Sub-categoria de (opcional)</p>
                <div className="relative">
                  <select
                    value={newParentId}
                    onChange={e => setNewParentId(e.target.value)}
                    className="w-full appearance-none border border-gray-200 rounded-xl pl-3 pr-7 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                  >
                    <option value="">Nenhuma (categoria principal)</option>
                    {roots.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"><svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg></span>
                </div>
              </div>
              <div className="flex gap-2 pt-0.5">
                <button type="button" onClick={() => setCreating(false)} className="flex-1 py-2 rounded-xl text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition">
                  Cancelar
                </button>
                <button type="button" disabled={saving || !newName.trim()} onClick={handleCreate} className="flex-1 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50 transition" style={{ background: "linear-gradient(135deg,#F57C00,#FF9800)" }}>
                  {saving ? "A criar..." : "Criar"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ImageSlot ────────────────────────────────────────────────────────────────
function ImageSlot({ preview, slot, onSelect, onRemove, isPrimary, onHover }: {
  preview: string | null; slot: number; onSelect: (f: File, slot: number) => void; onRemove: (slot: number) => void; isPrimary?: boolean; onHover: (slot: number | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) { onSelect(file, slot); break; }
      }
    }
  }

  return (
    <div
      tabIndex={0}
      onPaste={handlePaste}
      onMouseEnter={() => onHover(slot)}
      onMouseLeave={() => onHover(null)}
      className="outline-none focus-within:ring-2 focus-within:ring-orange-300 rounded-2xl"
    >
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { onSelect(f, slot); e.target.value = ""; } }} />
      {preview ? (
        <div className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-gray-100 bg-gray-50 cursor-pointer" onClick={() => ref.current?.click()}>
          <img src={preview} alt="" className="w-full h-full object-cover" />
          {isPrimary && <span className="absolute top-1.5 left-1.5 text-[10px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full">Principal</span>}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
            <button type="button" onClick={(e) => { e.stopPropagation(); ref.current?.click(); }} className="bg-white text-gray-700 text-xs px-2 py-1 rounded-xl font-medium">Alterar</button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(slot); }} className="bg-red-500 text-white text-xs px-2 py-1 rounded-xl font-medium">Remover</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} className="w-full aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-orange-300 hover:bg-orange-50/30 focus:outline-none transition group/btn">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          <span className="text-[11px]">{isPrimary ? "Principal" : `Imagem ${slot + 1}`}</span>
          <span className="text-[10px] text-gray-300 opacity-0 group-hover/btn:opacity-100 transition">Ctrl+V para colar</span>
        </button>
      )}
    </div>
  );
}

// ─── ProductPicker (seleccionar produto existente para bundle) ─────────────────
function ProductPicker({ onSelect, onClose }: { onSelect: (p: ProductSearch) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ProductSearch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await fetchAPI(`/products?mode=search&search=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.products ?? []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-gray-400"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" /></svg>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar produto existente..." className="flex-1 text-sm outline-none" />
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
          {!q.trim() && <p className="text-xs text-gray-400 text-center py-8">Escreva para pesquisar...</p>}
          {loading && <p className="text-xs text-gray-400 text-center py-6">A pesquisar...</p>}
          {!loading && results.length === 0 && q.trim() && <p className="text-xs text-gray-400 text-center py-6">Sem resultados.</p>}
          {results.map((p) => (
            <button key={p.id} type="button" onClick={() => onSelect(p)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50/50 text-left transition">
              {p.imageKeys[0] ? <img src={`${CDN}/${p.imageKeys[0]}`} className="w-9 h-9 rounded-xl object-cover bg-gray-100 flex-shrink-0" alt="" /> : <div className="w-9 h-9 rounded-xl bg-gray-100 flex-shrink-0" />}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                <p className="text-xs text-gray-400">{p.reference} — {fmtKz(p.basePrice)} Kz</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CreateProductModal (criar novo produto para bundle) ──────────────────────
function CreateProductModal({ brands: brandsProp, categories: categoriesProp, onCreated, onClose }: {
  brands: Brand[]; categories: Category[]; onCreated: (p: BundleLinked) => void; onClose: () => void;
}) {
  const [localBrands, setLocalBrands] = useState<Brand[]>(brandsProp);
  const [localCategories, setLocalCategories] = useState<Category[]>(categoriesProp);
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [hasIva, setHasIva] = useState(true);
  const [hasIec, setHasIec] = useState(false);
  const [iecRate, setIecRate] = useState(2);
  const [stock, setStock] = useState("0");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const prices = calcFinal(basePrice, hasIva, hasIec, iecRate);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Apenas imagens."); return; }
    if (f.size > 5 * 1024 * 1024) { toast.error("Máx 5 MB."); return; }
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nome é obrigatório."); return; }
    if (!basePrice) { toast.error("Preço é obrigatório."); return; }
    setSaving(true);
    try {
      const res = await fetchAPI("/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, basePrice: parseFloat(basePrice),
          hasIva, ivaRate: IVA_RATE, hasIec, iecRate,
          categoryId: categoryId || undefined,
          brandId: brandId || undefined,
          stock: parseInt(stock) || 0, stockAlert: 5, trackStock: true, active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erro ao criar."); setSaving(false); return; }
      const pid = data.product.id;
      if (imageFile) {
        const form = new FormData();
        form.append("file", imageFile);
        form.append("slot", "0");
        await fetchAPI(`/products/${pid}/images`, { method: "POST", body: form });
      }
      toast.success("Produto criado!");
      onCreated({ id: pid, name, basePrice: parseFloat(basePrice), imageKeys: [], reference: data.product.reference });
    } catch { toast.error("Erro de ligação."); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="font-bold text-gray-900">Criar produto acessório</h3>
            <p className="text-xs text-gray-400 mt-0.5">Será criado como produto independente e adicionado ao conjunto</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Imagem */}
          <div>
            <label className={labelCls}>Imagem</label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
            {imagePreview ? (
              <div className="relative group w-24 h-24 rounded-2xl overflow-hidden border-2 border-gray-100 bg-gray-50 cursor-pointer" onClick={() => fileRef.current?.click()}>
                <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <span className="text-white text-xs font-medium">Alterar</span>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-orange-300 hover:bg-orange-50/30 transition">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                <span className="text-[10px]">Imagem</span>
              </button>
            )}
          </div>
          {/* Nome */}
          <div>
            <label className={labelCls}>Nome *</label>
            <input value={name} onChange={e => setName(e.target.value)} required className={inputCls} placeholder="Nome do produto" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Marca</label>
              <BrandSelect brands={localBrands} value={brandId} onChange={setBrandId} onRefresh={() => {}} onCreated={b => setLocalBrands(prev => [...prev, b])} />
            </div>
            <div>
              <label className={labelCls}>Categoria</label>
              <CategorySelect categories={localCategories} value={categoryId} onChange={setCategoryId} onRefresh={() => {}} onCreated={cat => setLocalCategories(prev => [...prev, cat])} />
            </div>
          </div>
          {/* Preço */}
          <div>
            <label className={labelCls}>Preço base (Kz) *</label>
            <MoneyInput value={basePrice} onChange={setBasePrice} placeholder="0,00" required />
          </div>
          <div className="bg-gray-50 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">IVA 14%</p>
              <Toggle checked={hasIva} onChange={setHasIva} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">IEC</p>
              <Toggle checked={hasIec} onChange={setHasIec} />
            </div>
            {hasIec && (
              <SelectInput value={iecRate} onChange={(v) => setIecRate(Number(v))}>
                {IEC_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </SelectInput>
            )}
            {prices.base > 0 && (
              <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-sm">
                <span className="text-gray-700">Preço final</span>
                <span className="text-orange-600">{fmtKz(prices.final)} Kz</span>
              </div>
            )}
          </div>
          {/* Stock */}
          <div>
            <label className={labelCls}>Quantidade em stock</label>
            <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} className={inputCls} />
          </div>
        </form>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-2xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition font-medium">Cancelar</button>
          <button type="button" disabled={saving} onClick={(e) => { const form = (e.target as HTMLButtonElement).closest(".fixed")?.querySelector("form"); form?.requestSubmit(); }} className="px-6 py-2.5 rounded-2xl text-sm text-white font-semibold disabled:opacity-50" style={{ background: "linear-gradient(135deg,#F57C00,#FF9800)" }}>
            {saving ? "A criar..." : "Criar produto"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NovoProdutoPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const loadCategories = useCallback(() => {
    fetchAPI("/categories").then(r => r.json()).then(d => setCategories(d.categories ?? []));
  }, []);
  const loadBrands = useCallback(() => {
    fetchAPI("/brands").then(r => r.json()).then(d => setBrands(d.brands ?? []));
  }, []);

  useEffect(() => {
    loadCategories(); loadBrands();
    // Notificar se rascunho foi restaurado
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.name || d.basePrice) toast.info("Rascunho restaurado automaticamente.", { duration: 3000 });
      }
    } catch {}
  }, [loadCategories, loadBrands]);

  // BroadcastChannel: sincronizar categorias e marcas criadas noutras tabs
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const ch = new BroadcastChannel("100bytes_admin");
    ch.onmessage = (e) => {
      if (e.data?.type === "category_created") {
        const cat: Category = e.data.category;
        setCategories(prev => prev.some(c => c.id === cat.id) ? prev : [...prev, cat]);
      }
      if (e.data?.type === "brand_created") {
        const brand: Brand = e.data.brand;
        setBrands(prev => prev.some(b => b.id === brand.id) ? prev : [...prev, brand]);
      }
    };
    return () => ch.close();
  }, []);

  // Form — inicializado a partir do rascunho guardado (se existir)
  const [draft] = useState<Record<string, unknown>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}"); } catch { return {}; }
  });

  const [name, setName] = useState((draft.name as string) ?? "");
  const [reference, setReference] = useState((draft.reference as string) ?? "");
  const [description, setDescription] = useState((draft.description as string) ?? "");
  const [categoryId, setCategoryId] = useState((draft.categoryId as string) ?? "");
  const [brandId, setBrandId] = useState((draft.brandId as string) ?? "");
  const [active, setActive] = useState((draft.active as boolean) ?? true);
  const [featured, setFeatured] = useState((draft.featured as boolean) ?? false);

  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null, null, null]);
  const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null, null, null]);
  const [sheetFile, setSheetFile] = useState<File | null>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);

  const [costPrice, setCostPrice] = useState((draft.costPrice as string) ?? "");
  const [basePrice, setBasePrice] = useState((draft.basePrice as string) ?? "");
  const [hasIva, setHasIva] = useState((draft.hasIva as boolean) ?? true);
  const [hasIec, setHasIec] = useState((draft.hasIec as boolean) ?? false);
  const [iecRate, setIecRate] = useState((draft.iecRate as number) ?? 2);
  const [salePrice, setSalePrice] = useState((draft.salePrice as string) ?? "");

  const prices = calcFinal(basePrice, hasIva, hasIec, iecRate);

  const [trackStock, setTrackStock] = useState((draft.trackStock as boolean) ?? true);
  const [stock, setStock] = useState((draft.stock as string) ?? "0");
  const [stockAlert, setStockAlert] = useState((draft.stockAlert as string) ?? "5");

  // Bundle: cada row tem linkedId + name + price + discountPct
  type BundleRow = { tempId: string; linkedId?: string; name: string; price: string; discountPct: string };
  const [bundleRows, setBundleRows] = useState<BundleRow[]>((draft.bundleRows as BundleRow[]) ?? []);
  const [showPicker, setShowPicker] = useState(false);
  const [showCreateAccessory, setShowCreateAccessory] = useState(false);

  const [saving, setSaving] = useState(false);

  // Guardar rascunho no localStorage sempre que o formulário muda
  const skipFirstSave = useRef(true);
  useEffect(() => {
    if (skipFirstSave.current) { skipFirstSave.current = false; return; }
    const d = { name, reference, description, categoryId, brandId, active, featured, costPrice, basePrice, hasIva, hasIec, iecRate, salePrice, trackStock, stock, stockAlert, bundleRows };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  }, [name, reference, description, categoryId, brandId, active, featured, costPrice, basePrice, hasIva, hasIec, iecRate, salePrice, trackStock, stock, stockAlert, bundleRows]);

  // Rastrear slot sob o rato (para paste global)
  const hoveredSlotRef = useRef<number | null>(null);
  const imageFilesRef = useRef(imageFiles);
  useEffect(() => { imageFilesRef.current = imageFiles; }, [imageFiles]);

  const handleImageSelect = useCallback((file: File, slot: number) => {
    setImagePreviews(prev => { const n = [...prev]; n[slot] = URL.createObjectURL(file); return n; });
    setImageFiles(prev => { const n = [...prev]; n[slot] = file; return n; });
  }, []);

  const handleImageRemove = useCallback((slot: number) => {
    setImagePreviews(prev => { const n = [...prev]; n[slot] = null; return n; });
    setImageFiles(prev => { const n = [...prev]; n[slot] = null; return n; });
  }, []);

  const handleSlotHover = useCallback((slot: number | null) => {
    hoveredSlotRef.current = slot;
  }, []);

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || target.isContentEditable) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            // Cola no slot sob o rato; se não houver, no primeiro vazio
            const target = hoveredSlotRef.current ?? imageFilesRef.current.findIndex(f => f === null);
            if (target >= 0) {
              handleImageSelect(file, target);
              toast.success(target === 0 ? "Imagem colada como principal" : `Imagem colada no slot ${target + 1}`);
            } else {
              toast.error("Todos os slots de imagem estão preenchidos.");
            }
          }
          break;
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleImageSelect]);

  function addBundleFromExisting(p: ProductSearch) {
    setBundleRows(prev => [...prev, { tempId: crypto.randomUUID(), linkedId: p.id, name: p.name, price: p.basePrice.toFixed(2), discountPct: "0" }]);
    setShowPicker(false);
  }
  function addBundleFromCreated(p: BundleLinked) {
    setBundleRows(prev => [...prev, { tempId: crypto.randomUUID(), linkedId: p.id, name: p.name, price: p.basePrice.toFixed(2), discountPct: "0" }]);
    setShowCreateAccessory(false);
  }
  function updateRow(tempId: string, field: string, value: string) {
    setBundleRows(prev => prev.map(r => r.tempId === tempId ? { ...r, [field]: value } : r));
  }
  function removeRow(tempId: string) { setBundleRows(prev => prev.filter(r => r.tempId !== tempId)); }

  const bundleTotal = bundleRows.reduce((s, r) => s + (parseFloat(r.price) || 0) * (1 - (parseFloat(r.discountPct) || 0) / 100), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nome é obrigatório."); return; }
    if (!basePrice) { toast.error("Preço de venda é obrigatório."); return; }
    setSaving(true);
    try {
      const body = {
        name, reference: reference.trim() || undefined, description,
        costPrice: costPrice || undefined,
        basePrice: parseFloat(basePrice), hasIva, ivaRate: IVA_RATE, hasIec, iecRate,
        salePrice: salePrice ? parseFloat(salePrice) : undefined,
        trackStock, stock: parseInt(stock) || 0, stockAlert: parseInt(stockAlert) || 5,
        categoryId: categoryId || undefined, brandId: brandId || undefined,
        active, featured,
        bundleItems: bundleRows.filter(r => r.name).map((r, i) => ({
          name: r.name, price: parseFloat(r.price) || 0, discountPct: parseFloat(r.discountPct) || 0,
          linkedId: r.linkedId, sortOrder: i,
        })),
      };
      const res = await fetchAPI("/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erro."); setSaving(false); return; }
      const pid = data.product.id;
      // Upload sequencial para evitar race condition no array imageKeys
      for (let slot = 0; slot < imageFiles.length; slot++) {
        const file = imageFiles[slot];
        if (!file) continue;
        const form = new FormData(); form.append("file", file); form.append("slot", String(slot));
        await fetchAPI(`/products/${pid}/images`, { method: "POST", body: form });
      }
      if (sheetFile) {
        const form = new FormData(); form.append("file", sheetFile);
        await fetchAPI(`/products/${pid}/sheet`, { method: "POST", body: form });
      }
      toast.success("Produto criado!"); localStorage.removeItem(DRAFT_KEY); router.push("/produtos");
    } catch { toast.error("Erro de ligação."); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push("/produtos")} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Novo produto</h1>
            <p className="text-xs text-gray-400 mt-0.5">Preencha todos os campos necessários</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => router.push("/produtos")} className="px-4 py-2.5 rounded-2xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition font-medium">Cancelar</button>
          <button form="product-form" type="submit" disabled={saving} className="px-6 py-2.5 rounded-2xl text-sm text-white font-semibold disabled:opacity-50" style={{ background: "linear-gradient(135deg,#F57C00,#FF9800)", boxShadow: "0 4px 14px rgba(245,124,0,0.3)" }}>
            {saving ? "A criar..." : "Criar produto"}
          </button>
        </div>
      </div>

      <form id="product-form" onSubmit={handleSubmit} className="space-y-5">

        {/* 1. Informações básicas */}
        <Section title="Informações básicas">
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Nome do produto *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} placeholder="Ex: Samsung Galaxy S24 Ultra 256GB" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Referência (SKU)</label>
                <input value={reference} onChange={(e) => setReference(e.target.value)} className={inputCls} placeholder="Auto-gerada se vazio" />
              </div>
              <div>
                <label className={labelCls}>Marca</label>
                <BrandSelect brands={brands} value={brandId} onChange={setBrandId} onRefresh={loadBrands} onCreated={b => setBrands(prev => [...prev, b])} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Categoria</label>
              <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} onRefresh={loadCategories} onCreated={cat => setCategories(prev => [...prev, cat])} />
            </div>
            <div className="flex gap-4">
              <div className="flex items-center justify-between flex-1 bg-gray-50 rounded-2xl px-4 py-3">
                <div><p className="text-sm font-medium text-gray-700">Activo</p><p className="text-xs text-gray-400">Visível na loja</p></div>
                <Toggle checked={active} onChange={setActive} />
              </div>
              <div className="flex items-center justify-between flex-1 bg-gray-50 rounded-2xl px-4 py-3">
                <div><p className="text-sm font-medium text-gray-700">Destaque</p><p className="text-xs text-gray-400">Aparecer em destaque</p></div>
                <Toggle checked={featured} onChange={setFeatured} />
              </div>
            </div>
          </div>
        </Section>

        {/* 2. Imagens */}
        <Section title="Imagens do produto">
          <div>
            <p className="text-xs text-gray-400 mb-4">Máximo 4 imagens · PNG, JPG, WEBP · até 5 MB cada · A primeira é a imagem principal</p>
            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map(slot => (
                <ImageSlot key={slot} slot={slot} preview={imagePreviews[slot]} onSelect={handleImageSelect} onRemove={handleImageRemove} isPrimary={slot === 0} onHover={handleSlotHover} />
              ))}
            </div>
            <div className="mt-5 pt-5 border-t border-gray-100">
              <label className={labelCls}>Ficha informativa (PDF ou Word)</label>
              <input ref={sheetInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setSheetFile(e.target.files?.[0] ?? null)} />
              {sheetFile ? (
                <div className="flex items-center gap-3 bg-blue-50 rounded-2xl px-4 py-3">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#3B82F6" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  <span className="text-sm text-blue-700 flex-1 truncate">{sheetFile.name}</span>
                  <button type="button" onClick={() => setSheetFile(null)} className="text-blue-400 hover:text-red-500 text-xl leading-none">&times;</button>
                </div>
              ) : (
                <button type="button" onClick={() => sheetInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-4 flex items-center justify-center gap-2 text-gray-400 text-sm hover:border-blue-300 hover:bg-blue-50/30 transition">
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Seleccionar ficha (máx. 10 MB)
                </button>
              )}
            </div>
          </div>
        </Section>

        {/* 3. Descrição */}
        <Section title="Descrição">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} className={inputCls + " resize-y min-h-[120px]"} placeholder="Descrição detalhada do produto, características técnicas, etc." />
        </Section>

        {/* 4. Precificação */}
        <Section title="Precificação">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Preço de custo (interno, Kz)</label>
                <MoneyInput value={costPrice} onChange={setCostPrice} placeholder="0,00" />
              </div>
              <div>
                <label className={labelCls}>Preço de venda base (Kz) *</label>
                <MoneyInput value={basePrice} onChange={setBasePrice} placeholder="0,00" required />
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Impostos (Angola)</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">IVA — Imposto sobre o Valor Acrescentado</p>
                  <p className="text-xs text-gray-400">Taxa standard em Angola: 14%</p>
                </div>
                <Toggle checked={hasIva} onChange={setHasIva} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">IEC — Imposto de Consumo Especial</p>
                  <p className="text-xs text-gray-400">Para bens de consumo especial</p>
                </div>
                <Toggle checked={hasIec} onChange={setHasIec} />
              </div>
              {hasIec && (
                <div>
                  <label className={labelCls}>Taxa de IEC</label>
                  <SelectInput value={iecRate} onChange={(v) => setIecRate(Number(v))}>
                    {IEC_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </SelectInput>
                </div>
              )}
            </div>
            {prices.base > 0 && (
              <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4 space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Resumo de preços</p>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Preço base</span><span className="font-medium">{fmtKz(prices.base)} Kz</span></div>
                {hasIec && <div className="flex justify-between text-sm"><span className="text-gray-500">IEC ({iecRate}%)</span><span className="font-medium text-amber-600">+ {fmtKz(prices.iec)} Kz</span></div>}
                {hasIva && <div className="flex justify-between text-sm"><span className="text-gray-500">IVA (14%)</span><span className="font-medium text-amber-600">+ {fmtKz(prices.iva)} Kz</span></div>}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-orange-100">
                  <span className="text-gray-800">Preço final ao cliente</span>
                  <span className="text-orange-600">{fmtKz(prices.final)} Kz</span>
                </div>
              </div>
            )}
            <div>
              <label className={labelCls}>Preço promocional (Kz) — opcional</label>
              <MoneyInput value={salePrice} onChange={setSalePrice} placeholder="0,00" />
              {salePrice && parseFloat(salePrice) > 0 && parseFloat(salePrice) < prices.final && (
                <p className="text-xs text-green-600 mt-1.5">Desconto: {(((prices.final - parseFloat(salePrice)) / prices.final) * 100).toFixed(1)}% ({fmtKz(prices.final - parseFloat(salePrice))} Kz)</p>
              )}
            </div>
          </div>
        </Section>

        {/* 5. Compre Junto */}
        <Section title="Compre Junto">
          <div className="space-y-3">
            {bundleRows.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Nenhum acessório adicionado.</p>
            )}
            {bundleRows.map((row, i) => {
              const rowTotal = (parseFloat(row.price) || 0) * (1 - (parseFloat(row.discountPct) || 0) / 100);
              return (
                <div key={row.tempId} className="bg-gray-50 rounded-2xl p-3 flex gap-3 items-start">
                  <span className="w-6 h-6 mt-1 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 space-y-2">
                    <input value={row.name} onChange={e => updateRow(row.tempId, "name", e.target.value)} className={inputCls} placeholder="Nome do acessório" />
                    {row.linkedId && <p className="text-[11px] text-green-600">↳ Produto existente</p>}
                    <div className="grid grid-cols-3 gap-2 items-end">
                      <div>
                        <label className={labelCls}>Preço (Kz)</label>
                        <MoneyInput value={row.price} onChange={v => updateRow(row.tempId, "price", v)} placeholder="0,00" />
                      </div>
                      <div>
                        <label className={labelCls}>Desconto %</label>
                        <input type="number" min="0" max="100" step="0.1" value={row.discountPct} onChange={e => updateRow(row.tempId, "discountPct", e.target.value)} className={inputCls} placeholder="0" />
                      </div>
                      <p className="text-sm text-gray-500 font-medium pb-2.5">= {fmtKz(rowTotal)} Kz</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeRow(row.tempId)} className="p-1.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition mt-0.5 flex-shrink-0">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              );
            })}
            {bundleRows.length > 0 && (
              <div className="flex justify-between items-center bg-orange-50 rounded-2xl px-4 py-3 border border-orange-100">
                <span className="text-sm font-semibold text-gray-700">Total do conjunto</span>
                <span className="text-orange-600 font-bold">{fmtKz(bundleTotal)} Kz</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button type="button" onClick={() => setShowCreateAccessory(true)} className="py-2.5 rounded-2xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-orange-300 hover:text-orange-600 transition font-medium">
                + Criar novo produto
              </button>
              <button type="button" onClick={() => setShowPicker(true)} className="py-2.5 rounded-2xl border-2 border-dashed border-blue-200 text-sm text-blue-500 hover:border-blue-400 hover:bg-blue-50/30 transition font-medium">
                + Seleccionar existente
              </button>
            </div>
          </div>
        </Section>

        {/* 7. Stock */}
        <Section title="Stock">
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
              <div><p className="text-sm font-medium text-gray-700">Controlar stock</p><p className="text-xs text-gray-400">Gerir quantidade disponível</p></div>
              <Toggle checked={trackStock} onChange={setTrackStock} />
            </div>
            {trackStock && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Quantidade em stock</label>
                  <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Alerta de stock baixo</label>
                  <input type="number" min="0" value={stockAlert} onChange={e => setStockAlert(e.target.value)} className={inputCls} />
                  <p className="text-[11px] text-gray-400 mt-1">Alerta abaixo deste valor</p>
                </div>
              </div>
            )}
            {trackStock && parseInt(stock) <= parseInt(stockAlert) && (
              <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-100 rounded-2xl px-4 py-3">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#D97706" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <p className="text-xs text-yellow-700 font-medium">{parseInt(stock) === 0 ? "Produto esgotado — será marcado como indisponível" : "Stock baixo — alerta activo"}</p>
              </div>
            )}
          </div>
        </Section>

      </form>

      {showPicker && <ProductPicker onSelect={addBundleFromExisting} onClose={() => setShowPicker(false)} />}
      {showCreateAccessory && (
        <CreateProductModal
          brands={brands}
          categories={categories}
          onCreated={addBundleFromCreated}
          onClose={() => setShowCreateAccessory(false)}
        />
      )}
    </div>
  );
}