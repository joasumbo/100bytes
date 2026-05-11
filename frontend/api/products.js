const { apiFetch } = require("./client");

const CDN_URL = process.env.CDN_URL || "https://cdn100ka.sysvenus.com";

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
    ? (Date.now() - new Date(p.createdAt).getTime()) < 30 * 60 * 1000
    : false;
  const lowStock = p.trackStock && Number(p.stock) > 0 && Number(p.stock) <= 10;
  return {
    id: p.id,
    slug: p.slug,
    urlKey: p.slug + '--' + p.id,
    name: p.name,
    category: p.category ? p.category.name : null,
    categorySlug: p.category ? p.category.slug : null,
    image: imageUrl(p.imageKeys, 0),
    image2: imageUrl(p.imageKeys, 1),
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
  const data = await apiFetch(`/products/${encodeURIComponent(id)}`);
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
    basePrice: formatPrice(p.basePrice),
    salePrice: p.salePrice ? formatPrice(p.salePrice) : null,
    stock: p.stock ?? null,
    trackStock: p.trackStock ?? false,
  };
}

async function getByCategory(categoryId, limit = 8) {
  const data = await apiFetch(`/products?active=true&categoryId=${encodeURIComponent(categoryId)}&perPage=${limit}`);
  return (data.products || []).map(mapProduct);
}

async function getProductsPaged({ page = 1, perPage = 24, categoryId, brandId, sortBy, sortOrder = 'asc', minPrice, maxPrice } = {}) {
  let url = `/products?active=true&page=${page}&perPage=${perPage}`;
  if (categoryId) url += `&categoryId=${encodeURIComponent(categoryId)}`;
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

module.exports = { getFeatured, getOnSale, getNewest, getProductById, getRelated, getByCategory, getProductsPaged };
