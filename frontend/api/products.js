const { apiFetch } = require("./client");

const CDN_URL = process.env.CDN_URL || "https://cdn.100bytes.co.ao";

// Janela durante a qual um artigo conta como "novidade". Acordado com o cliente
// em 12/07/2026: 7 dias. Usada tanto no selo "Novo" do cartão de produto como
// na listagem /novidades.
const NOVIDADE_MS = 7 * 24 * 60 * 60 * 1000;

function imageUrl(imageKeys, idx = 0) {
  if (!imageKeys || imageKeys.length <= idx) return null;
  return `${CDN_URL}/${imageKeys[idx]}`;
}

function formatPrice(value) {
  if (value == null) return null;
  return value.toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " Kz";
}

function mapProduct(p) {
  const baseNum = Number(p.basePrice) || 0;
  const saleNum = Number(p.salePrice) || 0;
  const discountPct = (saleNum > 0 && baseNum > 0 && saleNum < baseNum)
    ? Math.round((1 - saleNum / baseNum) * 100)
    : null;
  const isNew = p.createdAt
    ? (Date.now() - new Date(p.createdAt).getTime()) < NOVIDADE_MS
    : false;
  const lowStock = p.trackStock && Number(p.stock) > 0 && Number(p.stock) <= 10;
  return {
    id: p.id,
    slug: p.slug,
    urlKey: p.slug + '--' + p.id,
    name: p.name,
    category: p.category ? p.category.name : null,
    categorySlug: p.category ? p.category.slug : null,
    brand: p.brand ? { id: p.brand.id, name: p.brand.name } : null,
    image: imageUrl(p.imageKeys, 0),
    image2: imageUrl(p.imageKeys, 1),
    basePriceValue: baseNum,
    salePriceValue: saleNum > 0 ? saleNum : null,
    createdAt: p.createdAt || null,
    basePrice: formatPrice(baseNum),
    salePrice: saleNum > 0 ? formatPrice(saleNum) : null,
    saving: (saleNum > 0 && baseNum > 0) ? formatPrice(baseNum - saleNum) : null,
    discountPct,
    isNew,
    lowStock,
  };
}

async function getFeatured(limit = 8) {
  const data = await apiFetch("/products?featured=true&active=true&perPage=" + limit);
  const featured = (data.products || []).map(mapProduct);
  if (featured.length > 0) return featured;
  // fallback: mais recentes
  return getNewest(limit);
}

async function getOnSale(limit = 8) {
  const data = await apiFetch("/products?active=true&perPage=50");
  return (data.products || [])
    .filter((p) => p.salePrice != null)
    .slice(0, limit)
    .map(mapProduct);
}

async function getNewest(limit = 8) {
  const data = await apiFetch("/products?active=true&perPage=" + limit);
  return (data.products || []).map(mapProduct);
}

async function getRelated(categoryId, excludeId, limit = 5) {
  if (!categoryId) return getNewest(limit);
  const data = await apiFetch(`/products?active=true&categoryId=${encodeURIComponent(categoryId)}&perPage=${limit + 1}`);
  return (data.products || [])
    .filter((p) => p.id !== excludeId)
    .slice(0, limit)
    .map(mapProduct);
}

async function getProductById(id) {
  let data;
  try {
    data = await apiFetch(`/products/${encodeURIComponent(id)}`);
  } catch (e) {
    // Produto apagado ou inexistente: não é avaria, é "não encontrado"
    if (/\[API\] 404 /.test(e.message)) return null;
    throw e;
  }
  const p = data.product;
  if (!p) return null;
  return {
    id: p.id,
    slug: p.slug,
    urlKey: p.slug + '--' + p.id,
    name: p.name,
    reference: p.reference || null,
    description: p.description || null,
    category: p.category ? p.category.name : null,
    categorySlug: p.category ? p.category.slug : null,
    categoryId: p.category ? p.category.id : null,
    brand: p.brand ? p.brand.name : null,
    brandLogo: p.brand && p.brand.logoKey ? `${CDN_URL}/${p.brand.logoKey}` : null,
    image: p.imageKeys && p.imageKeys[0] ? `${CDN_URL}/${p.imageKeys[0]}` : null,
    images: (p.imageKeys || []).map((k) => `${CDN_URL}/${k}`),
    sheetUrl: p.sheetKey ? `${CDN_URL}/${p.sheetKey}` : null,
    basePriceValue: Number(p.basePrice) || 0,
    salePriceValue: p.salePrice ? Number(p.salePrice) : null,
    basePrice: formatPrice(p.basePrice),
    salePrice: p.salePrice ? formatPrice(p.salePrice) : null,
    stock: p.stock ?? null,
    trackStock: p.trackStock ?? false,
    // Produtos do Winmax: código do fabricante e especificações (Icecat), por grupo
    mpn: p.mpn || null,
    specs: p.specs && typeof p.specs === "object" ? p.specs : null,
  };
}

async function getBestSellers(limit = 24) {
  const data = await apiFetch(`/products/bestsellers?limit=${limit}`);
  return (data.products || []).map(mapProduct);
}

async function getByCategory(categoryId, limit = 8) {
  const data = await apiFetch(`/products?active=true&categoryId=${encodeURIComponent(categoryId)}&perPage=${limit}`);
  return (data.products || []).map(mapProduct);
}

async function getProductsPaged({ page = 1, perPage = 24, categoryId, categorySlug, brandId, sortBy, sortOrder = 'asc', minPrice, maxPrice, search } = {}) {
  let url = `/products?active=true&page=${page}&perPage=${perPage}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (categoryId) url += `&categoryId=${encodeURIComponent(categoryId)}`;
  if (categorySlug) url += `&categorySlug=${encodeURIComponent(categorySlug)}`;
  if (brandId) url += `&brandId=${encodeURIComponent(brandId)}`;
  if (sortBy) url += `&sortBy=${encodeURIComponent(sortBy)}&sortOrder=${encodeURIComponent(sortOrder)}`;
  if (minPrice != null && minPrice !== '') url += `&minPrice=${Number(minPrice)}`;
  if (maxPrice != null && maxPrice !== '') url += `&maxPrice=${Number(maxPrice)}`;
  const data = await apiFetch(url);
  return {
    products: (data.products || []).map(mapProduct),
    total: data.total || 0,
    page: data.page || 1,
    pages: data.pages || 1,
    perPage: data.perPage || perPage,
  };
}

/** Acessórios sugeridos ("Completa a tua compra"). Falha em silêncio: a secção só não aparece. */
async function getComplementos(id) {
  try {
    const data = await apiFetch(`/products/${encodeURIComponent(id)}/complementos`);
    return (data.items || []).map(mapProduct);
  } catch (e) {
    return [];
  }
}

/** Destaques do topo da página inicial (novidade e mais procurado), em cache 60 s. */
let destaquesCache = { em: 0, dados: { novidade: null, procurado: null } };
async function getDestaques() {
  if (Date.now() - destaquesCache.em < 60000) return destaquesCache.dados;
  try {
    const d = await apiFetch('/products/destaques');
    destaquesCache = {
      em: Date.now(),
      dados: { novidade: d.novidade ? mapProduct(d.novidade) : null, procurado: d.procurado ? mapProduct(d.procurado) : null },
    };
  } catch (e) {
    /* mantém o anterior */
  }
  return destaquesCache.dados;
}

/**
 * Semelhantes e substitutos calculados pela camada Python (recs/).
 * Falha em silêncio: devolve listas vazias e a página usa o plano B.
 */
async function getSemelhantes(id) {
  try {
    const data = await apiFetch(`/products/${encodeURIComponent(id)}/semelhantes`);
    return { similar: (data.similar || []).map(mapProduct), substitute: (data.substitute || []).map(mapProduct) };
  } catch (e) {
    return { similar: [], substitute: [] };
  }
}

/**
 * Pesquisa inteligente (Meilisearch no Backend, com Postgres de reserva).
 * Devolve o mesmo formato que getProductsPaged, para usar o mesmo template.
 */
async function searchProducts({ q, page = 1, perPage = 24, categorySlug, brand, sort, minPrice, maxPrice } = {}) {
  const p = new URLSearchParams({ q: q || '', page: String(page), perPage: String(perPage) });
  if (categorySlug) p.set('categorySlug', categorySlug);
  if (brand) p.set('brand', brand);
  if (sort) p.set('sort', sort);
  if (minPrice != null && minPrice !== '') p.set('minPrice', String(Number(minPrice)));
  if (maxPrice != null && maxPrice !== '') p.set('maxPrice', String(Number(maxPrice)));
  const data = await apiFetch(`/search?${p}`);
  const total = data.total || 0;
  return {
    products: (data.products || []).map(mapProduct),
    total,
    page: data.page || page,
    pages: Math.max(1, Math.ceil(total / perPage)),
    perPage,
    engine: data.engine,
  };
}

module.exports = { getDestaques, getSemelhantes, searchProducts, getComplementos, getFeatured, getOnSale, getNewest, getProductById, getRelated, getByCategory, getProductsPaged, getBestSellers, NOVIDADE_MS };
