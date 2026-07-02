"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { fetchAPI } from "@/lib/api";

const CDN = "https://cdn100ka.sysvenus.com";
const IVA_RATE = 14;

interface Product {
  id: string;
  reference: string;
  name: string;
  slug: string;
  description: string | null;
  imageKeys: string[];
  basePrice: number;
  costPrice: number | null;
  hasIva: boolean;
  ivaRate: number;
  hasIec: boolean;
  iecRate: number;
  salePrice: number | null;
  trackStock: boolean;
  stock: number;
  stockAlert: number;
  active: boolean;
  featured: boolean;
  createdAt: string;
  category: { id: string; name: string; slug: string } | null;
  brand: { id: string; name: string; logoKey: string | null } | null;
  bundleItems: Array<{ id: string; name: string; price: number; discountPct: number; linked: { id: string; name: string; imageKeys: string[] } | null }>;
}

function fmtKz(v: number) {
  return v.toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function VisualizarProdutoPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    if (!productId) return;
    fetchAPI(`/products/${productId}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        setProduct(data.product);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin text-orange-400" width="28" height="28" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">Produto não encontrado.</p>
        <button onClick={() => router.push("/produtos")} className="px-5 py-2.5 rounded-2xl text-sm text-white font-semibold" style={{ background: "linear-gradient(135deg,#F57C00,#FF9800)" }}>
          Voltar à listagem
        </button>
      </div>
    );
  }

  const iec = product.hasIec ? product.basePrice * (product.iecRate / 100) : 0;
  const iva = product.hasIva ? (product.basePrice + iec) * (IVA_RATE / 100) : 0;
  const finalPrice = product.basePrice + iec + iva;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push("/produtos")} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Detalhe do produto</h1>
            <p className="text-xs text-gray-400 mt-0.5">Visualização somente de leitura</p>
          </div>
        </div>
        <button onClick={() => router.push(`/produtos/${product.id}/editar`)} className="px-5 py-2.5 rounded-2xl text-sm text-white font-semibold flex items-center gap-2" style={{ background: "linear-gradient(135deg,#F57C00,#FF9800)", boxShadow: "0 4px 14px rgba(245,124,0,0.25)" }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          Editar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna esquerda — imagens */}
        <div className="space-y-3">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-4">
            {product.imageKeys.length > 0 ? (
              <div className="flex gap-3">
                {/* Miniaturas verticais à esquerda */}
                {product.imageKeys.length > 1 && (
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {product.imageKeys.map((k, i) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setActiveImg(i)}
                        className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition ${activeImg === i ? "border-orange-400 shadow-sm" : "border-gray-100 hover:border-gray-300"}`}
                      >
                        <img src={`${CDN}/${k}`} alt="" className="w-full h-full object-contain bg-gray-50" />
                      </button>
                    ))}
                  </div>
                )}
                {/* Imagem principal */}
                <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-2xl min-h-[280px]">
                  <img
                    src={`${CDN}/${product.imageKeys[activeImg]}`}
                    alt={product.name}
                    className="max-w-full max-h-80 object-contain"
                  />
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-200 bg-gray-50 rounded-2xl">
                <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01" /></svg>
              </div>
            )}
          </div>
          {/* Contador de fotos */}
          {product.imageKeys.length > 0 && (
            <p className="text-xs text-gray-400 text-center">
              {activeImg + 1} / {product.imageKeys.length} {product.imageKeys.length === 1 ? "foto" : "fotos"}
            </p>
          )}
        </div>

        {/* Coluna direita — dados */}
        <div className="space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${product.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${product.active ? "bg-green-500" : "bg-gray-400"}`} />
              {product.active ? "Activo" : "Inactivo"}
            </span>
            {product.featured && <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-600">★ Destaque</span>}
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono bg-gray-100 text-gray-500">{product.reference}</span>
          </div>

          {/* Nome */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
            {product.brand && (
              <div className="flex items-center gap-2 mt-1">
                {product.brand.logoKey && <img src={`${CDN}/${product.brand.logoKey}`} alt="" className="w-5 h-5 object-contain" />}
                <span className="text-sm text-gray-500">{product.brand.name}</span>
              </div>
            )}
          </div>

          {/* Preços */}
          <div className="bg-orange-50/60 rounded-2xl p-4 border border-orange-100 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Preço base</span><span className="font-medium">{fmtKz(product.basePrice)} Kz</span></div>
            {product.hasIec && <div className="flex justify-between text-sm"><span className="text-gray-500">IEC ({product.iecRate}%)</span><span className="font-medium text-amber-600">+ {fmtKz(iec)} Kz</span></div>}
            {product.hasIva && <div className="flex justify-between text-sm"><span className="text-gray-500">IVA ({product.ivaRate}%)</span><span className="font-medium text-amber-600">+ {fmtKz(iva)} Kz</span></div>}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-orange-100">
              <span className="text-gray-800">Preço final</span>
              <span className="text-orange-600">{fmtKz(finalPrice)} Kz</span>
            </div>
            {product.salePrice && (
              <div className="flex justify-between text-sm font-semibold text-green-700 bg-green-50 rounded-xl px-3 py-2">
                <span>Preço promocional</span>
                <span>{fmtKz(product.salePrice)} Kz</span>
              </div>
            )}
            {product.costPrice != null && (
              <div className="flex justify-between text-xs text-gray-400 pt-1">
                <span>Preço de custo (interno)</span>
                <span>{fmtKz(product.costPrice)} Kz</span>
              </div>
            )}
          </div>

          {/* Categoria */}
          {product.category && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Categoria:</span>
              <span className="font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full text-xs">{product.category.name}</span>
            </div>
          )}

          {/* Stock */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Stock</p>
            {product.trackStock ? (
              <div className="flex items-center gap-3">
                <div className={`text-3xl font-bold ${product.stock === 0 ? "text-red-500" : product.stock <= product.stockAlert ? "text-yellow-500" : "text-green-600"}`}>
                  {product.stock}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">unidades disponíveis</p>
                  <p className={`text-xs ${product.stock === 0 ? "text-red-500" : product.stock <= product.stockAlert ? "text-yellow-600" : "text-gray-400"}`}>
                    {product.stock === 0 ? "Esgotado" : product.stock <= product.stockAlert ? `Alerta: abaixo de ${product.stockAlert} un.` : `Alerta configurado: ≤ ${product.stockAlert} un.`}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sem controlo de stock</p>
            )}
          </div>
        </div>
      </div>

      {/* Descrição */}
      {product.description && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-6 py-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Descrição</p>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{product.description}</p>
        </div>
      )}

      {/* Bundle */}
      {product.bundleItems.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-6 py-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Compre Junto ({product.bundleItems.length} itens)</p>
          <div className="space-y-3">
            {product.bundleItems.map((item, i) => {
              const itemTotal = item.price * (1 - (item.discountPct || 0) / 100);
              return (
                <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                  <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  {item.linked?.imageKeys[0] ? (
                    <img src={`${CDN}/${item.linked.imageKeys[0]}`} alt="" className="w-10 h-10 rounded-xl object-cover bg-gray-100 flex-shrink-0" />
                  ) : <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">
                      {fmtKz(item.price)} Kz
                      {item.discountPct > 0 && ` · Desconto ${item.discountPct}% → ${fmtKz(itemTotal)} Kz`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Meta info */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-6 py-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Informações do sistema</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span className="text-gray-400">ID</span><span className="font-mono text-xs text-gray-500">{product.id}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-400">Slug</span><span className="font-mono text-xs text-gray-500">{product.slug}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-400">Criado em</span><span className="text-gray-600">{new Date(product.createdAt).toLocaleDateString("pt-AO", { day: "2-digit", month: "long", year: "numeric" })}</span></div>
        </div>
      </div>
    </div>
  );
}
