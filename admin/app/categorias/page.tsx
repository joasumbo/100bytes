"use client";
import { fetchAPI } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  _count: { children: number };
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconEdit = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const IconTrash = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const IconEye = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

// ─── CategoryModal ─────────────────────────────────────────────────────────────
// Used for both root and subcategory create/edit.
// When fixedParentId is set (creating sub from drawer), parent dropdown is hidden.
function CategoryModal({
  category,
  fixedParentId,
  rootCategories,
  onClose,
  onSave,
}: {
  category: Category | null;
  fixedParentId?: string | null;
  rootCategories: Category[];
  onClose: () => void;
  onSave: (c: Category) => void;
}) {
  const isEdit = !!category;
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [parentId, setParentId] = useState(
    fixedParentId !== undefined ? fixedParentId ?? "" : (category?.parentId ?? "")
  );
  const [active, setActive] = useState(category?.active ?? true);
  const [loading, setLoading] = useState(false);
  const inputCls = "w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white";

  // parent dropdown is hidden when fixedParentId is explicitly set (even if null string means root)
  const showParentDropdown = fixedParentId === undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nome e obrigatorio."); return; }
    setLoading(true);
    try {
      const body = { name, description, parentId: parentId || null, active };
      const res = isEdit
        ? await fetchAPI(`/categories/${category!.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetchAPI("/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erro desconhecido."); return; }
      toast.success(isEdit ? "Categoria actualizada." : "Categoria criada.");
      onSave(data.category);
    } catch { toast.error("Erro de ligacao."); } finally { setLoading(false); }
  }

  const availableParents = rootCategories.filter((p) => p.parentId === null && p.id !== category?.id);

  // Label contextual
  const title = isEdit
    ? "Editar categoria"
    : fixedParentId
    ? "Nova subcategoria"
    : "Nova categoria";

  const parentCat = fixedParentId ? rootCategories.find(p => p.id === fixedParentId) : null;
  const subtitle = isEdit
    ? category!.parentId
      ? `/${rootCategories.find(p => p.id === category!.parentId)?.slug ?? category!.parentId}/${category!.slug}/`
      : `/${category!.slug}/`
    : fixedParentId
    ? `/${parentCat?.slug ?? ""}/<novo-slug>/`
    : "Preencha os dados abaixo";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Nome *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} placeholder="Ex: Informatica" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Descricao</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Descricao opcional..." />
          </div>
          {showParentDropdown && (
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Categoria pai</label>
              <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputCls}>
                <option value="">— Nenhuma (categoria raiz) —</option>
                {availableParents.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
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

// ─── DeleteModal ───────────────────────────────────────────────────────────────
function DeleteModal({
  category,
  onConfirm,
  onClose,
  loading,
}: {
  category: Category;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  const hasSubs = category._count.children > 0;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#EF4444" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="font-bold text-gray-900 text-lg mb-1">Eliminar categoria</h3>
        <p className="text-sm text-gray-500 mb-2">
          Tem a certeza que quer eliminar <strong>{category.name}</strong>?
        </p>
        {hasSubs && (
          <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-4">
            Esta categoria tem {category._count.children} subcategoria(s). Elimine-as primeiro.
          </p>
        )}
        {!hasSubs && <p className="text-xs text-gray-400 mb-4">Esta accao e irreversivel.</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-2xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition font-medium">Cancelar</button>
          <button onClick={onConfirm} disabled={loading || hasSubs} className="flex-1 py-2.5 rounded-2xl text-sm text-white bg-red-500 hover:bg-red-600 transition font-semibold disabled:opacity-40">
            {loading ? "A eliminar..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CategoryDrawer ────────────────────────────────────────────────────────────
function CategoryDrawer({
  category,
  subcategories,
  onClose,
  onEditCategory,
  onAddSub,
  onEditSub,
  onDeleteSub,
}: {
  category: Category;
  subcategories: Category[];
  onClose: () => void;
  onEditCategory: () => void;
  onAddSub: () => void;
  onEditSub: (c: Category) => void;
  onDeleteSub: (c: Category) => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${category.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${category.active ? "bg-green-500" : "bg-gray-400"}`} />
                {category.active ? "Activa" : "Inactiva"}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 truncate">{category.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">/{category.slug}/</p>
            {category.description && (
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">{category.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={onEditCategory} title="Editar categoria" className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition">
              <IconEdit />
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="bg-orange-50 rounded-2xl px-4 py-3">
            <p className="text-2xl font-bold text-orange-600">{subcategories.length}</p>
            <p className="text-xs text-orange-400 font-medium mt-0.5">Subcategorias</p>
          </div>
          <div className="bg-gray-50 rounded-2xl px-4 py-3">
            <p className="text-2xl font-bold text-gray-600">0</p>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Produtos</p>
          </div>
        </div>

        {/* Subcategories list */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4">
            <h3 className="text-sm font-bold text-gray-700">Subcategorias</h3>
            <button
              onClick={onAddSub}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-white font-semibold transition"
              style={{ background: "linear-gradient(135deg,#F57C00,#FF9800)", boxShadow: "0 2px 8px rgba(245,124,0,0.3)" }}
            >
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Nova subcategoria
            </button>
          </div>

          {subcategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2" className="mb-3 opacity-50">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-sm">Nenhuma subcategoria ainda.</p>
              <button onClick={onAddSub} className="mt-3 text-xs text-orange-500 font-medium hover:underline">Criar a primeira</button>
            </div>
          ) : (
            <div className="px-4 pb-6 space-y-2">
              {subcategories.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between bg-gray-50 hover:bg-orange-50/40 rounded-2xl px-4 py-3 transition-colors group">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800 truncate">{sub.name}</p>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${sub.active ? "bg-green-50 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                        <span className={`w-1 h-1 rounded-full ${sub.active ? "bg-green-500" : "bg-gray-400"}`} />
                        {sub.active ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">/{category.slug}/{sub.slug}/</p>
                  </div>
                  <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEditSub(sub)} title="Editar" className="p-1.5 rounded-lg text-gray-500 hover:bg-white hover:shadow-sm transition">
                      <IconEdit />
                    </button>
                    <button onClick={() => onDeleteSub(sub)} title="Eliminar" className="p-1.5 rounded-lg text-red-400 hover:bg-white hover:shadow-sm transition">
                      <IconTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Drawer
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Modal state
  type ModalMode = "create-root" | "edit-root" | "create-sub" | "edit-sub" | "delete-root" | "delete-sub" | null;
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null); // target of edit/delete
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const res = await fetchAPI("/categories");
    const data = await res.json();
    setCategories(data.categories ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const roots = categories.filter((c) => c.parentId === null);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);
  const searchLower = search.toLowerCase();
  const filteredRoots = search
    ? roots.filter((r) =>
        r.name.toLowerCase().includes(searchLower) ||
        r.slug.toLowerCase().includes(searchLower) ||
        childrenOf(r.id).some((ch) => ch.name.toLowerCase().includes(searchLower))
      )
    : roots;

  // Keep viewing synced
  const viewingCategory = viewingId ? categories.find((c) => c.id === viewingId) ?? null : null;
  const viewingSubs = viewingCategory ? childrenOf(viewingCategory.id) : [];

  function upsertCategory(saved: Category) {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  }

  async function handleDelete() {
    if (!selectedCat) return;
    setDeleteLoading(true);
    const res = await fetchAPI(`/categories/${selectedCat.id}`, { method: "DELETE" });
    const data = await res.json();
    setDeleteLoading(false);
    if (res.ok) {
      toast.success("Categoria eliminada.");
      setCategories((prev) => prev.filter((c) => c.id !== selectedCat.id));
      // if deleted category was the one being viewed, close drawer
      if (selectedCat.id === viewingId) setViewingId(null);
      setModalMode(null);
      setSelectedCat(null);
    } else {
      toast.error(data.error ?? "Erro ao eliminar.");
    }
  }

  const subCount = categories.filter((c) => c.parentId !== null).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900">Categorias</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {roots.length} {roots.length === 1 ? "categoria" : "categorias"} · {subCount} subcategorias
          </p>
        </div>
        <button
          onClick={() => { setSelectedCat(null); setModalMode("create-root"); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm text-white font-semibold transition self-start sm:self-auto"
          style={{ background: "linear-gradient(135deg,#F57C00,#FF9800)", boxShadow: "0 4px 14px rgba(245,124,0,0.3)" }}
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Nova categoria
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar categorias..."
          className="w-full border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin" width="28" height="28" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#F57C00" strokeWidth="4" />
              <path className="opacity-75" fill="#F57C00" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : filteredRoots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2" className="mb-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-sm">{search ? "Nenhuma categoria encontrada" : "Sem categorias. Crie a primeira!"}</p>
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_80px_100px_100px_110px] gap-4 px-6 py-3 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Categoria</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Subs</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Estado</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:block">Criada em</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Accoes</span>
            </div>
            {/* Rows */}
            <div className="divide-y divide-gray-50">
              {filteredRoots.map((cat) => (
                <div
                  key={cat.id}
                  className={`grid grid-cols-[1fr_80px_100px_100px_110px] gap-4 px-6 py-4 items-center transition-colors ${viewingId === cat.id ? "bg-orange-50/50" : "hover:bg-gray-50/60"}`}
                >
                  {/* Name */}
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{cat.name}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">/{cat.slug}/</p>
                  </div>
                  {/* Subs count */}
                  <div className="flex justify-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-bold bg-orange-50 text-orange-600">
                      {cat._count.children}
                    </span>
                  </div>
                  {/* Status */}
                  <div className="flex justify-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cat.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cat.active ? "bg-green-500" : "bg-gray-400"}`} />
                      {cat.active ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                  {/* Date */}
                  <span className="text-xs text-gray-400 hidden sm:block">
                    {new Date(cat.createdAt).toLocaleDateString("pt-AO")}
                  </span>
                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setViewingId(viewingId === cat.id ? null : cat.id)}
                      title="Ver detalhes"
                      className={`p-1.5 rounded-xl transition ${viewingId === cat.id ? "bg-orange-100 text-orange-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"}`}
                    >
                      <IconEye />
                    </button>
                    <button
                      onClick={() => { setSelectedCat(cat); setModalMode("edit-root"); }}
                      title="Editar"
                      className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                    >
                      <IconEdit />
                    </button>
                    <button
                      onClick={() => { setSelectedCat(cat); setModalMode("delete-root"); }}
                      title="Eliminar"
                      className="p-1.5 rounded-xl text-red-300 hover:bg-red-50 hover:text-red-500 transition"
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Drawer ─────────────────────────────────────────────────────────── */}
      {viewingCategory && (
        <CategoryDrawer
          category={viewingCategory}
          subcategories={viewingSubs}
          onClose={() => setViewingId(null)}
          onEditCategory={() => { setSelectedCat(viewingCategory); setModalMode("edit-root"); }}
          onAddSub={() => { setSelectedCat(null); setModalMode("create-sub"); }}
          onEditSub={(sub) => { setSelectedCat(sub); setModalMode("edit-sub"); }}
          onDeleteSub={(sub) => { setSelectedCat(sub); setModalMode("delete-sub"); }}
        />
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {/* Create root category */}
      {modalMode === "create-root" && (
        <CategoryModal
          category={null}
          rootCategories={roots}
          onClose={() => setModalMode(null)}
          onSave={(saved) => { upsertCategory(saved); setModalMode(null); }}
        />
      )}

      {/* Edit root category */}
      {modalMode === "edit-root" && selectedCat && (
        <CategoryModal
          category={selectedCat}
          rootCategories={roots}
          onClose={() => { setModalMode(null); setSelectedCat(null); }}
          onSave={(saved) => { upsertCategory(saved); setModalMode(null); setSelectedCat(null); }}
        />
      )}

      {/* Create subcategory (from drawer, fixedParentId = viewingCategory.id) */}
      {modalMode === "create-sub" && viewingCategory && (
        <CategoryModal
          category={null}
          fixedParentId={viewingCategory.id}
          rootCategories={roots}
          onClose={() => setModalMode(null)}
          onSave={(saved) => {
            upsertCategory(saved);
            // also increment parent _count.children in local state
            setCategories((prev) =>
              prev.map((c) =>
                c.id === viewingCategory.id
                  ? { ...c, _count: { children: c._count.children + 1 } }
                  : c
              )
            );
            setModalMode(null);
          }}
        />
      )}

      {/* Edit subcategory */}
      {modalMode === "edit-sub" && selectedCat && (
        <CategoryModal
          category={selectedCat}
          fixedParentId={selectedCat.parentId}
          rootCategories={roots}
          onClose={() => { setModalMode(null); setSelectedCat(null); }}
          onSave={(saved) => { upsertCategory(saved); setModalMode(null); setSelectedCat(null); }}
        />
      )}

      {/* Delete root */}
      {modalMode === "delete-root" && selectedCat && (
        <DeleteModal
          category={selectedCat}
          loading={deleteLoading}
          onClose={() => { setModalMode(null); setSelectedCat(null); }}
          onConfirm={handleDelete}
        />
      )}

      {/* Delete sub */}
      {modalMode === "delete-sub" && selectedCat && (
        <DeleteModal
          category={selectedCat}
          loading={deleteLoading}
          onClose={() => { setModalMode(null); setSelectedCat(null); }}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}