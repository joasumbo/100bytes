"use client";
import { fetchAPI } from "@/lib/api";
import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";

const CDN = "https://cdn100ka.sysvenus.com";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Brand {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  logoKey: string | null;
  active: boolean;
  createdAt: string;
}

// ─── Brand Modal (create / edit) ──────────────────────────────────────────────
function BrandModal({ brand, onClose, onSave }: { brand: Brand | null; onClose: () => void; onSave: (b: Brand) => void }) {
  const isEdit = !!brand;
  const [name, setName] = useState(brand?.name ?? "");
  const [country, setCountry] = useState(brand?.country ?? "");
  const [active, setActive] = useState(brand?.active ?? true);
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(brand?.logoKey ? `${CDN}/${brand.logoKey}` : null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Apenas imagens sao permitidas."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Maximo 5 MB."); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setRemoveLogo(false);
  }

  function handleRemoveLogo() {
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nome e obrigatorio."); return; }
    if (!isEdit && !logoFile) { toast.error("Logo e obrigatorio."); return; }
    setLoading(true);
    try {
      const body = { name, country, active };
      const res = isEdit
        ? await fetchAPI(`/brands/${brand!.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetchAPI("/brands", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erro desconhecido."); return; }
      let finalBrand: Brand = data.brand;

      if (logoFile) {
        const form = new FormData();
        form.append("file", logoFile);
        if (brand?.logoKey) form.append("oldKey", brand.logoKey);
        const logoRes = await fetchAPI(`/brands/${finalBrand.id}/logo`, { method: "POST", body: form });
        const logoData = await logoRes.json();
        if (!logoRes.ok) toast.error(logoData.error ?? "Erro ao fazer upload do logo.");
        else finalBrand = { ...finalBrand, logoKey: logoData.logoKey };
      }

      if (removeLogo && isEdit && brand!.logoKey && !logoFile) {
        await fetchAPI(`/brands/${brand!.id}/logo`, { method: "DELETE" });
        finalBrand = { ...finalBrand, logoKey: null };
      }

      toast.success(isEdit ? "Marca actualizada." : "Marca criada.");
      onSave(finalBrand);
    } catch { toast.error("Erro de ligacao."); } finally { setLoading(false); }
  }

  const inputCls = "w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">{isEdit ? "Editar marca" : "Nova marca"}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{isEdit ? `/${brand!.slug}` : "Preencha os dados abaixo"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Logo */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              Logo {!isEdit && <span className="text-orange-500">*</span>}
            </label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            {logoPreview ? (
              <div className="relative group">
                <div className="w-full h-32 rounded-2xl border-2 border-gray-100 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <img src={logoPreview} alt="preview" className="max-h-28 max-w-full object-contain p-2" />
                </div>
                <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="bg-white rounded-xl shadow px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 font-medium">Alterar</button>
                  {isEdit && <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveLogo(); }} className="bg-white rounded-xl shadow px-2 py-1 text-xs text-red-500 hover:bg-red-50 font-medium">Remover</button>}
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-32 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-orange-300 hover:bg-orange-50/30 transition-colors">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-xs font-medium">Clique para seleccionar</span>
                <span className="text-[11px]">PNG, JPG, SVG — max 5 MB</span>
              </button>
            )}
          </div>
          {/* Nome */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Nome *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} placeholder="Ex: Samsung" />
          </div>
          {/* Pais */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Pais de origem</label>
            <input value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} placeholder="Ex: Coreia do Sul" />
          </div>
          {/* Activa */}
          <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Activa</p>
              <p className="text-xs text-gray-400">Visivel na loja</p>
            </div>
            <button type="button" onClick={() => setActive(!active)} className={`relative w-11 h-6 rounded-full transition-colors ${active ? "bg-orange-500" : "bg-gray-300"}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${active ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-2xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition font-medium">Cancelar</button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-2xl text-sm text-white font-semibold transition disabled:opacity-50" style={{ background: "linear-gradient(135deg,#F57C00,#FF9800)", boxShadow: "0 4px 14px rgba(245,124,0,0.3)" }}>
              {loading ? "A guardar..." : isEdit ? "Guardar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ brand, onConfirm, onClose, loading }: { brand: Brand; onConfirm: () => void; onClose: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#EF4444" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </div>
        <h3 className="font-bold text-gray-900 text-lg mb-1">Eliminar marca</h3>
        <p className="text-sm text-gray-500 mb-6">Tem a certeza que quer eliminar <strong>{brand.name}</strong>? Esta accao e irreversivel.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-2xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition font-medium">Cancelar</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 rounded-2xl text-sm text-white bg-red-500 hover:bg-red-600 transition font-semibold disabled:opacity-50">{loading ? "A eliminar..." : "Eliminar"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Logo Image com fallback ──────────────────────────────────────────────────
const brandColors = ["#F57C00","#1976D2","#388E3C","#7B1FA2","#C62828","#00838F","#558B2F","#AD1457","#0277BD","#4527A0"];
function BrandLogo({ brand, className = "" }: { brand: Brand; className?: string }) {
  const [imgError, setImgError] = useState(false);
  const color = brandColors[brand.name.toUpperCase().charCodeAt(0) % brandColors.length];
  if (brand.logoKey && !imgError) {
    return <img src={`${CDN}/${brand.logoKey}`} alt={brand.name} className={`object-contain ${className}`} onError={() => setImgError(true)} />;
  }
  return (
    <div className={`flex items-center justify-center text-white font-bold text-2xl rounded-2xl ${className}`} style={{ background: color }}>
      {brand.name[0].toUpperCase()}
    </div>
  );
}

// ─── Brand Drawer ─────────────────────────────────────────────────────────────
function BrandDrawer({
  brand,
  onClose,
  onEdit,
  onDelete,
}: {
  brand: Brand;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-xs bg-white shadow-2xl flex flex-col">
        {/* Close */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Detalhes da marca</span>
          <button onClick={onClose} className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 transition">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Logo */}
        <div className="flex-shrink-0 flex items-center justify-center bg-gray-50 border-b border-gray-100" style={{ height: 180 }}>
          <BrandLogo brand={brand} className="max-h-36 max-w-[200px] p-4" />
        </div>

        {/* Info */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div>
            <p className="text-xl font-bold text-gray-900">{brand.name}</p>
            {brand.country && <p className="text-sm text-gray-400 mt-0.5">{brand.country}</p>}
            <p className="text-xs text-gray-300 mt-1">/{brand.slug}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${brand.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${brand.active ? "bg-green-500" : "bg-gray-400"}`} />
              {brand.active ? "Activa" : "Inactiva"}
            </span>
          </div>

          <div className="bg-gray-50 rounded-2xl px-4 py-3">
            <p className="text-xs text-gray-400">Criada em</p>
            <p className="text-sm font-medium text-gray-700 mt-0.5">{new Date(brand.createdAt).toLocaleDateString("pt-AO", { day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 p-4 border-t border-gray-100 space-y-2">
          <button
            onClick={onEdit}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white transition"
            style={{ background: "linear-gradient(135deg,#F57C00,#FF9800)", boxShadow: "0 4px 14px rgba(245,124,0,0.25)" }}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Editar marca
          </button>
          <button
            onClick={onDelete}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition"
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Eliminar marca
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MarcasPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  // Drawer
  const [drawerBrand, setDrawerBrand] = useState<Brand | null>(null);

  // Modals
  const [modal, setModal] = useState<"create" | "edit" | "delete" | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    const res = await fetchAPI("/brands");
    const data = await res.json();
    setBrands(data.brands ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  // Keep drawerBrand in sync after edits (não abre drawer em criações novas)
  function upsertBrand(saved: Brand, openDrawer = false) {
    setBrands((prev) => {
      const idx = prev.findIndex((b) => b.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name));
    });
    if (openDrawer) setDrawerBrand(saved);
  }

  async function handleDelete() {
    if (!drawerBrand) return;
    setDeleteLoading(true);
    const res = await fetchAPI(`/brands/${drawerBrand.id}`, { method: "DELETE" });
    const data = await res.json();
    setDeleteLoading(false);
    if (res.ok) {
      toast.success("Marca eliminada.");
      setBrands((prev) => prev.filter((b) => b.id !== drawerBrand.id));
      setModal(null);
      setDrawerBrand(null);
    } else {
      toast.error(data.error ?? "Erro ao eliminar.");
    }
  }

  const filtered = brands.filter((b) => {
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase()) || (b.country ?? "").toLowerCase().includes(search.toLowerCase());
    const matchActive = filterActive === "all" || (filterActive === "active" ? b.active : !b.active);
    return matchSearch && matchActive;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900">Marcas</h1>
          <p className="text-sm text-gray-400 mt-0.5">{brands.length} {brands.length === 1 ? "marca" : "marcas"} registadas</p>
        </div>
        <button
          onClick={() => { setDrawerBrand(null); setModal("create"); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm text-white font-semibold transition self-start sm:self-auto"
          style={{ background: "linear-gradient(135deg,#F57C00,#FF9800)", boxShadow: "0 4px 14px rgba(245,124,0,0.3)" }}
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Nova marca
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar marca ou pais..." className="w-full border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" />
        </div>
        <select value={filterActive} onChange={(e) => setFilterActive(e.target.value as "all" | "active" | "inactive")} className="border border-gray-200 rounded-2xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
          <option value="all">Todas</option>
          <option value="active">Activas</option>
          <option value="inactive">Inactivas</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin" width="28" height="28" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#F57C00" strokeWidth="4" />
            <path className="opacity-75" fill="#F57C00" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2" className="mb-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <p className="text-sm">{search ? "Nenhuma marca encontrada" : "Sem marcas. Crie a primeira!"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((brand) => (
            <button
              key={brand.id}
              onClick={() => setDrawerBrand(brand)}
              className={`group text-left bg-white rounded-3xl overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 ${drawerBrand?.id === brand.id ? "ring-2 ring-orange-400 shadow-lg" : "shadow-sm hover:shadow-md"}`}
            >
              {/* Logo area */}
              <div className="relative flex items-center justify-center bg-gray-50 border-b border-gray-100" style={{ height: 120 }}>
                <BrandLogo brand={brand} className="max-h-20 max-w-[80%] p-3" />
                {!brand.active && (
                  <div className="absolute top-2 right-2">
                    <span className="text-[10px] font-semibold bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">Inactiva</span>
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="px-3 py-3">
                <div className="flex items-center justify-between gap-1">
                  <p className="font-bold text-gray-800 text-sm truncate">{brand.name}</p>
                  <span className="flex-shrink-0 text-[11px] text-gray-400">0 prod.</span>
                </div>
                {brand.country
                  ? <p className="text-xs text-gray-400 truncate mt-0.5">{brand.country}</p>
                  : <p className="text-xs text-gray-300 truncate mt-0.5">/{brand.slug}</p>
                }
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Drawer ─────────────────────────────────────────────────────────── */}
      {drawerBrand && modal === null && (
        <BrandDrawer
          brand={drawerBrand}
          onClose={() => setDrawerBrand(null)}
          onEdit={() => setModal("edit")}
          onDelete={() => setModal("delete")}
        />
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {modal === "create" && (
        <BrandModal
          brand={null}
          onClose={() => setModal(null)}
          onSave={(saved) => { upsertBrand(saved); setModal(null); }}
        />
      )}
      {modal === "edit" && drawerBrand && (
        <BrandModal
          brand={drawerBrand}
          onClose={() => setModal(null)}
          onSave={(saved) => { upsertBrand(saved, true); setModal(null); }}
        />
      )}
      {modal === "delete" && drawerBrand && (
        <DeleteModal
          brand={drawerBrand}
          loading={deleteLoading}
          onClose={() => setModal(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}