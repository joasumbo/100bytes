const { apiFetch } = require("./client");

/**
 * Retorna categorias raiz activas com as suas subcategorias aninhadas.
 */
async function getRootCategories(limit = 12) {
  const data = await apiFetch("/categories");
  const all = (data.categories || []).filter((c) => c.active);
  const roots = all
    .filter((c) => c.parentId === null)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
    .slice(0, limit);
  // Anexar subcategorias a cada raiz
  roots.forEach((root) => {
    root.children = all
      .filter((c) => c.parentId === root.id)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  });
  return roots;
}

/**
 * Todas as categorias activas (raiz + sub), para lookup por slug.
 */
async function getAllCategories() {
  const data = await apiFetch("/categories");
  return (data.categories || []).filter((c) => c.active);
}

/**
 * Retorna categoria por slug (inclui subcategorias se for raiz).
 */
async function getCategoryBySlug(slug, allCats) {
  const list = (allCats && allCats.length > 0) ? allCats : await getAllCategories();
  const cat = list.find((c) => c.slug === slug);
  if (!cat) return null;
  const found = Object.assign({}, cat);
  found.children = list.filter((c) => c.parentId === found.id).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  if (found.parentId) {
    found.parent = list.find((c) => c.id === found.parentId) || null;
  }
  return found;
}

/**
 * Busca síncrona de categoria por slug usando cache já carregado.
 */
function findCategoryBySlug(slug, allCats) {
  return getCategoryBySlug(slug, allCats || []);
}

/**
 * Top N categorias (qualquer nível) ordenadas por número de produtos (descendente).
 */
async function getTopCategories(limit = 5) {
  const data = await apiFetch("/categories");
  return (data.categories || [])
    .filter((c) => c.active && (c._count?.products || 0) > 0)
    .sort((a, b) => (b._count?.products || 0) - (a._count?.products || 0))
    .slice(0, limit)
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, count: c._count?.products || 0 }));
}

module.exports = { getRootCategories, getAllCategories, getCategoryBySlug, findCategoryBySlug, getTopCategories };

