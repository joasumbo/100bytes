require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { getRootCategories, getAllCategories, findCategoryBySlug, getCategoryBySlug, getTopCategories } = require("./api/categories");
const { getFeatured, getOnSale, getNewest, getProductById, getRelated, getByCategory, getProductsPaged, getBestSellers, NOVIDADE_MS } = require("./api/products");
const { getBrands } = require("./api/brands");
const { paginas } = require("./data/paginas");

const app = express();
const PORT = process.env.PORT || 3030;
const PUBLIC_DIR = path.join(__dirname, "public");

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// EJS como view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.json());
app.use(express.static(PUBLIC_DIR, { index: false }));
app.use(cookieParser());

// Middleware que verifica JWT do cliente e passa para EJS
app.use((req, res, next) => {
  const token = req.cookies.customer_token;
  let currentCustomer = null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.type === "customer") {
        currentCustomer = { id: decoded.sub, name: decoded.name, email: decoded.email };
      }
    } catch (e) {
      // Token inválido ou expirado — continua sem customer
    }
  }

  res.locals.currentCustomer = currentCustomer;
  next();
});

// Cache de dados — refresca a cada 5 minutos
const DEFAULT_FREE_SHIPPING = 200000; // Kz — acordado com o cliente em 12/07/2026
let cache = { categories: [], allCategories: [], featured: [], onSale: [], newest: [], tabsData: { topCats: [], byCategory: {} }, brands: [], sliders: [], freeShippingThreshold: DEFAULT_FREE_SHIPPING, testimonials: [], fetchedAt: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Formata um valor em Kwanzas (sem casas decimais) para os textos de montra.
function formatKz(value) {
  return Number(value).toLocaleString("pt-PT", { maximumFractionDigits: 0 }) + " Kz";
}

async function refreshCache() {
  try {
    const [categories, allCategories, featured, onSale, newest, topCats, brands, slidersRes, shippingRes, testimonialsRes] = await Promise.all([
      getRootCategories(12),
      getAllCategories(),
      getFeatured(),
      getOnSale(),
      getNewest(),
      getTopCategories(5),
      getBrands(),
      fetch(`${BACKEND_URL}/api/content/home-sliders`).then((r) => r.json()).catch(() => null),
      fetch(`${BACKEND_URL}/api/content/shipping`).then((r) => r.json()).catch(() => null),
      fetch(`${BACKEND_URL}/api/content/testimonials`).then((r) => r.json()).catch(() => null),
    ]);

    const threshold = Number(shippingRes?.entry?.data?.freeShippingThreshold);
    const freeShippingThreshold = Number.isFinite(threshold) && threshold > 0 ? threshold : DEFAULT_FREE_SHIPPING;

    const testimonials = Array.isArray(testimonialsRes?.entry?.data?.testimonials)
      ? testimonialsRes.entry.data.testimonials
      : [];

    // Buscar produtos para cada tab de categoria em paralelo
    const catProducts = await Promise.all(topCats.map((cat) => getByCategory(cat.id, 8)));
    const byCategory = { all: newest };
    topCats.forEach((cat, i) => { byCategory[cat.id] = catProducts[i]; });

    const sliders = (slidersRes?.entry?.data ?? [])
      .filter((s) => s.active)
      .sort((a, b) => a.order - b.order);

    cache = { categories, allCategories, featured, onSale, newest, tabsData: { topCats, byCategory }, brands, sliders, freeShippingThreshold, testimonials, fetchedAt: Date.now() };
    console.log(`[cache] ${categories.length} cat-raiz, ${allCategories.length} cat-total, ${featured.length} destaque, ${onSale.length} oferta, ${sliders.length} slides`);
  } catch (e) {
    console.error("[cache] Erro ao carregar:", e.message);
  }
}

// Garante a cache populada por pedido. Necessário em serverless (Vercel), onde
// o processo congela entre pedidos e o setInterval não corre: sem isto o
// catálogo fica vazio (0 produtos) num cold start.
async function ensureCache() {
  if (Date.now() - cache.fetchedAt > CACHE_TTL) {
    try { await refreshCache(); } catch (e) { /* mantém a cache anterior */ }
  }
}

refreshCache();
setInterval(refreshCache, CACHE_TTL);

// ── ROTAS DE API LOCAL (antes do proxy, para não serem interceptadas) ──

// Força refresh imediato do cache (chamar após publicar conteúdo)
app.get("/api/cache-refresh", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  try {
    await refreshCache();
    res.json({ ok: true, fetchedAt: new Date(cache.fetchedAt).toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Oferta do Dia — produto mais barato
app.get("/api/oferta-do-dia", async (req, res, next) => {
  try {
    const { products } = await getProductsPaged({ page: 1, perPage: 1, sortBy: "salePrice", sortOrder: "asc" });
    if (!products || products.length === 0) return res.status(404).json({ error: "Sem produtos" });
    res.json(products[0]);
  } catch (e) {
    next(e);
  }
});

// Top 100 Ofertas — paginado
app.get("/api/top100", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const data = await getProductsPaged({ page, perPage: 20, sortBy: "salePrice", sortOrder: "asc" });
    res.json(data);
  } catch (e) {
    next(e);
  }
});

function rewriteAuthCookieForLocal(proxyRes) {
  const setCookie = proxyRes.headers["set-cookie"];
  if (!Array.isArray(setCookie)) return;
  proxyRes.headers["set-cookie"] = setCookie.map((cookie) =>
    cookie.replace(/;\s*Secure/gi, "")
  );
}

function extractTokenFromSetCookie(setCookieHeader) {
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const authCookie = headers.find((cookie) => cookie && cookie.startsWith("customer_token="));
  if (!authCookie) return null;
  const match = authCookie.match(/^customer_token=([^;]+)/);
  return match ? match[1] : null;
}

function setLocalCustomerCookie(res, token) {
  res.cookie("customer_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 30,
    secure: false,
  });
}

async function forwardCustomerAuth(req, res, endpoint) {
  const response = await fetch(`${BACKEND_URL}/api/customers/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(req.headers.cookie ? { cookie: req.headers.cookie } : {}),
    },
    body: JSON.stringify(req.body || {}),
  });

  const data = await response.json().catch(() => ({ message: "Erro inesperado." }));

  if (!response.ok) {
    return res.status(response.status).json(data);
  }

  const token = extractTokenFromSetCookie(response.headers.get("set-cookie"));
  if (token) {
    setLocalCustomerCookie(res, token);
  }

  return res.status(response.status).json(data);
}

// ── ORDERS ────────────────────────────────────────────────────────────
// As encomendas são agora persistidas na base de dados pelo backend NestJS.
//   POST /api/orders                        → criado no backend (desconta stock)
//   GET/PATCH/DELETE /api/admin/orders/...   → backend (protegido por admin)
//   GET /api/customers/orders                → backend (sessão de cliente)
// GET/PATCH/DELETE /api/admin/orders e GET /api/customers/orders são
// encaminhados pelos proxies /api/customers e /api/** definidos mais abaixo.
// O POST de criação é reencaminhado aqui explicitamente porque o proxy não
// reenvia o corpo JSON já consumido pelo express.json().
app.post("/api/orders", async (req, res) => {
  try {
    const r = await fetch(`${BACKEND_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(req.headers.cookie ? { cookie: req.headers.cookie } : {}),
      },
      body: JSON.stringify(req.body || {}),
    });
    const data = await r.json().catch(() => ({ message: "Erro inesperado." }));
    return res.status(r.status).json(data);
  } catch (e) {
    console.error("[orders] Erro ao reencaminhar:", e.message);
    return res.status(500).json({ message: "Erro de ligação ao servidor. Tente novamente." });
  }
});

// Converte a encomenda do backend para o formato esperado pelos templates EJS.
function mapOrder(o) {
  if (!o) return null;
  return {
    code: o.code,
    reference: o.code,
    status: o.status,
    total: o.total,
    subtotal: o.subtotal,
    shipping: o.shipping,
    createdAt: o.createdAt,
    customer: { name: o.customerName, email: o.customerEmail, phone: o.customerPhone },
    delivery: { province: o.province, city: o.city, address: o.address, notes: o.notes },
    items: (o.items || []).map(function (i) {
      return { name: i.name, price: i.unitPrice, priceFormatted: i.priceFormatted, qty: i.qty, image: i.image };
    }),
  };
}

async function fetchOrderByCode(code) {
  try {
    const r = await fetch(`${BACKEND_URL}/api/orders/${encodeURIComponent(code)}`);
    if (!r.ok) return null;
    const data = await r.json();
    return mapOrder(data.order);
  } catch (e) {
    return null;
  }
}

app.post("/api/customers/register", async (req, res, next) => {
  try {
    return await forwardCustomerAuth(req, res, "register");
  } catch (e) {
    return next(e);
  }
});

app.post("/api/customers/login", async (req, res, next) => {
  try {
    return await forwardCustomerAuth(req, res, "login");
  } catch (e) {
    return next(e);
  }
});

app.post("/api/customers/logout", async (req, res) => {
  res.clearCookie("customer_token", { path: "/" });
  return res.json({ ok: true });
});

// Proxy /api/customers/* → Backend NestJS (com credentials/cookies)
app.use(
  "/api/customers",
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    pathFilter: "/api/customers/**",
    on: {
      proxyReq: (proxyReq, req) => {
        // Passa cookies do cliente para o backend
        if (req.headers.cookie) {
          proxyReq.setHeader("cookie", req.headers.cookie);
        }
      },
      proxyRes: (proxyRes) => {
        // Em localhost (HTTP), remove Secure para o browser aceitar customer_token.
        rewriteAuthCookieForLocal(proxyRes);
      },
    },
  })
);

// Proxy /api/* → Backend NestJS
app.use(
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    pathFilter: "/api/**",
    on: {
      proxyReq: (proxyReq, req) => {
        if (req.headers.cookie) {
          proxyReq.setHeader("cookie", req.headers.cookie);
        }
      },
    },
  })
);

// ──────────────────────────────────────────
//  ROTAS SSR
// ──────────────────────────────────────────

// Garante que o catálogo está carregado antes de renderizar qualquer página SSR
// (serverless-safe). Não afeta /api, /assets nem /js.
app.use(async (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/assets") || req.path.startsWith("/js")) {
    return next();
  }
  try { await ensureCache(); } catch (e) { /* segue com a cache que houver */ }
  // Disponibiliza o limiar de portes grátis (editável no backoffice) a todas as views.
  res.locals.freeShippingThreshold = cache.freeShippingThreshold;
  res.locals.freeShippingLabel = formatKz(cache.freeShippingThreshold);
  next();
});

// Página inicial
app.get(["/", "/index.html"], async (req, res, next) => {
  try {
    res.render("index", {
      categories: cache.categories,
      featured: cache.featured,
      onSale: cache.onSale,
      newest: cache.newest,
      tabsData: cache.tabsData,
      brands: cache.brands,
      sliders: cache.sliders,
      testimonials: cache.testimonials,
    });
  } catch (e) {
    next(e);
  }
});

// ── PÁGINAS DE LISTAGEM ──

// Perfil do cliente
app.get("/perfil", (req, res) => {
  if (!res.locals.currentCustomer) return res.redirect("/?openLogin=1");
  res.render("perfil", { categories: cache.categories });
});

// Checkout
app.get("/checkout", (req, res) => {
  res.render("checkout", { categories: cache.categories });
});

// Confirmação de encomenda
app.get("/encomenda/:code", async (req, res) => {
  const order = await fetchOrderByCode(req.params.code);
  if (!order) return res.status(404).render("encomenda", { order: null, categories: cache.categories });
  res.render("encomenda", { order, categories: cache.categories });
});

// Rastreio de encomenda
app.get("/rastreio", (req, res) => {
  res.render("rastreio", { order: null, searched: false, categories: cache.categories });
});
app.get("/rastreio/:code", async (req, res) => {
  const order = await fetchOrderByCode(req.params.code);
  res.render("rastreio", { order: order || null, searched: true, code: req.params.code.toUpperCase(), categories: cache.categories });
});

// Pesquisa
app.get("/pesquisa", async (req, res, next) => {
  const q = (req.query.q || "").trim();
  const categoria = req.query.categoria || "";
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const sort = req.query.sort || "";
  const minPrice = req.query.minPrice || null;
  const maxPrice = req.query.maxPrice || null;
  const brandId = req.query.brandId || null;
  const { sortBy, sortOrder } = mapSort(sort);
  try {
    const paged = await getProductsPaged({
      page,
      perPage: 24,
      search: q || undefined,
      categorySlug: categoria || undefined,
      sortBy,
      sortOrder,
      minPrice,
      maxPrice,
      brandId,
    });
    res.render("categoria", {
      category: null,
      pageTitle: q ? `Resultados para "${q}"` : "Pesquisa",
      categories: cache.categories,
      products: paged.products,
      topProducts: [],
      brands: cache.brands,
      pagination: { page: paged.page, pages: paged.pages, total: paged.total, perPage: paged.perPage },
      currentFilters: { sort, minPrice, maxPrice, brandId },
    });
  } catch (e) {
    next(e);
  }
});

// ── LISTAGENS DE MONTRA ──
// Renderiza uma listagem paginada com o mesmo template da categoria.
function montra({ pageTitle, defaultSort, filter }) {
  return async (req, res, next) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const sort = req.query.sort || defaultSort;
      const minPrice = req.query.minPrice || null;
      const maxPrice = req.query.maxPrice || null;
      const brandId = req.query.brandId || null;
      const { sortBy, sortOrder } = mapSort(sort);
      // perPage maior quando há filtro em memória, para o corte não esvaziar a página
      const paged = await getProductsPaged({
        page: filter ? 1 : page,
        perPage: filter ? 120 : 24,
        sortBy,
        sortOrder,
        minPrice,
        maxPrice,
        brandId,
      });

      let products = paged.products;
      let pagination = { page: paged.page, pages: paged.pages, total: paged.total, perPage: paged.perPage };

      if (filter) {
        const todos = products.filter(filter);
        const perPage = 24;
        const pages = Math.max(1, Math.ceil(todos.length / perPage));
        const safePage = Math.min(page, pages);
        products = todos.slice((safePage - 1) * perPage, safePage * perPage);
        pagination = { page: safePage, pages, total: todos.length, perPage };
      }

      res.render("categoria", {
        category: null,
        pageTitle,
        categories: cache.categories,
        products,
        topProducts: [],
        brands: cache.brands,
        pagination,
        currentFilters: { sort, minPrice, maxPrice, brandId },
      });
    } catch (e) {
      next(e);
    }
  };
}

// Promoções — produtos com preço promocional activo
app.get("/promocoes", montra({
  pageTitle: "Promoções",
  defaultSort: "price_asc",
  filter: (p) => p.salePriceValue != null && p.salePriceValue > 0,
}));

// Novidades — artigos adicionados nos últimos 7 dias (critério acordado com o cliente)
app.get("/novidades", montra({
  pageTitle: "Novidades",
  defaultSort: "newest",
  filter: (p) => p.createdAt && (Date.now() - new Date(p.createdAt).getTime()) < NOVIDADE_MS,
}));

// Mais vendidos — ranking por volume de vendas (agregação em order_items no backend).
// Sem histórico de vendas ainda, recai nos artigos mais recentes para não ficar vazio.
app.get("/mais-vendidos", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    let products = await getBestSellers(72);

    if (products.length === 0) {
      const paged = await getProductsPaged({ page: 1, perPage: 72, sortBy: "createdAt", sortOrder: "desc" });
      products = paged.products;
    }

    const perPage = 24;
    const total = products.length;
    const pages = Math.max(1, Math.ceil(total / perPage));
    const safePage = Math.min(page, pages);
    const pageProducts = products.slice((safePage - 1) * perPage, safePage * perPage);

    res.render("categoria", {
      category: null,
      pageTitle: "Mais vendidos",
      categories: cache.categories,
      products: pageProducts,
      topProducts: [],
      brands: cache.brands,
      pagination: { page: safePage, pages, total, perPage },
      currentFilters: { sort: "", minPrice: null, maxPrice: null, brandId: null },
    });
  } catch (e) {
    next(e);
  }
});

// URLs antigos → novos (301, preserva links já partilhados)
app.get("/ofertas", (req, res) => {
  const q = new URLSearchParams(req.query || {}).toString();
  res.redirect(301, `/promocoes${q ? `?${q}` : ""}`);
});
app.get("/tendencias", (req, res) => {
  const q = new URLSearchParams(req.query || {}).toString();
  res.redirect(301, `/mais-vendidos${q ? `?${q}` : ""}`);
});

// ── PÁGINAS INSTITUCIONAIS (coluna "Empresa" do footer) ──
// Registadas antes das rotas dinâmicas de produto/categoria. Se o slug não
// corresponder a uma página institucional, passa para as rotas seguintes.
app.get("/:slug([a-z0-9][a-z0-9-]*)", (req, res, next) => {
  const pagina = paginas[req.params.slug];
  if (!pagina) return next();
  res.render("pagina-info", {
    titulo: pagina.titulo,
    subtitulo: pagina.subtitulo,
    metaDescription: pagina.metaDescription,
    conteudo: pagina.conteudo,
    categories: cache.categories,
  });
});

// ── PRODUTOS ──

// Produto — novo URL: /:catSlug/:prodSlug--id
app.get("/:catSlug/:slugId([a-z0-9][a-z0-9-]*--[a-zA-Z0-9]+)", async (req, res, next) => {
  try {
    const parts = req.params.slugId.split("--");
    const id = parts[parts.length - 1];
    const product = await getProductById(id);
    if (!product) return res.status(404).sendFile(path.join(PUBLIC_DIR, "404.html"), (err) => {
      if (err) res.status(404).send("404 - Produto não encontrado");
    });
    const related = await getRelated(product.categoryId, product.id);
    res.render("produto", { product, related, categories: cache.categories });
  } catch (e) {
    next(e);
  }
});

// Produto — URL legado: /:slugId (redireciona para novo formato)
app.get("/:slugId([a-z0-9][a-z0-9-]*--[a-zA-Z0-9]+)", async (req, res, next) => {
  try {
    const parts = req.params.slugId.split("--");
    const id = parts[parts.length - 1];
    const product = await getProductById(id);
    if (!product) return next();
    const catSlug = product.categorySlug || "produto";
    return res.redirect(301, `/${catSlug}/${req.params.slugId}`);
  } catch (e) {
    next(e);
  }
});

// Categoria — /:slug
app.get("/categoria/:slug([a-z0-9][a-z0-9-]*)", async (req, res) => {
  const query = new URLSearchParams(req.query || {}).toString();
  const target = `/${req.params.slug}${query ? `?${query}` : ""}`;
  return res.redirect(301, target);
});

app.get("/:slug([a-z0-9][a-z0-9-]*)", async (req, res, next) => {
  try {
    const slug = req.params.slug;
    // Verificar se é uma categoria conhecida (lookup síncrono no cache)
    const category = await getCategoryBySlug(slug, cache.allCategories);
    if (!category) return next(); // não é categoria → 404

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const sort = req.query.sort || "";
    const minPrice = req.query.minPrice || null;
    const maxPrice = req.query.maxPrice || null;
    const brandId = req.query.brandId || null;
    const { sortBy, sortOrder } = mapSort(sort);

    const categoryIds = [category.id, ...((category.children || []).map((child) => child.id))];
    let paged;
    let topProducts;

    if (categoryIds.length === 1) {
      const result = await Promise.all([
        getProductsPaged({ page, perPage: 24, categoryId: category.id, sortBy, sortOrder, minPrice, maxPrice, brandId }),
        getProductsPaged({ page: 1, perPage: 5, categoryId: category.id, sortBy: "createdAt", sortOrder: "desc" }),
      ]);
      paged = result[0];
      topProducts = result[1];
    } else {
      const perCategoryFetch = await Promise.all(
        categoryIds.map((categoryId) =>
          getProductsPaged({
            page: 1,
            perPage: 120,
            categoryId,
            sortBy,
            sortOrder,
            minPrice,
            maxPrice,
            brandId,
          })
        )
      );

      const byId = new Map();
      perCategoryFetch.forEach((group) => {
        (group.products || []).forEach((product) => {
          if (!byId.has(product.id)) byId.set(product.id, product);
        });
      });

      let mergedProducts = Array.from(byId.values());
      if (sortBy === "salePrice") {
        mergedProducts = mergedProducts.sort((a, b) => {
          const av = (a.salePriceValue || a.basePriceValue || 0);
          const bv = (b.salePriceValue || b.basePriceValue || 0);
          return sortOrder === "desc" ? (bv - av) : (av - bv);
        });
      } else if (sortBy === "createdAt") {
        mergedProducts = mergedProducts.sort((a, b) => {
          const av = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bv = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return sortOrder === "desc" ? (bv - av) : (av - bv);
        });
      }

      const total = mergedProducts.length;
      const perPage = 24;
      const pages = Math.max(1, Math.ceil(total / perPage));
      const safePage = Math.min(page, pages);
      const start = (safePage - 1) * perPage;
      const pageProducts = mergedProducts.slice(start, start + perPage);
      const newestProducts = [...mergedProducts]
        .sort((a, b) => {
          const av = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bv = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bv - av;
        })
        .slice(0, 5);

      paged = {
        products: pageProducts,
        total,
        page: safePage,
        pages,
        perPage,
      };

      topProducts = {
        products: newestProducts,
      };
    }

    res.render("categoria", {
      category,
      categories: cache.categories,
      products: paged.products,
      topProducts: topProducts.products,
      brands: cache.brands,
      pagination: { page: paged.page, pages: paged.pages, total: paged.total, perPage: paged.perPage },
      currentFilters: { sort, minPrice, maxPrice, brandId },
    });
  } catch (e) {
    console.error(`[categoria] Erro ao carregar ${req.params.slug}:`, e.message);
    const fallbackCategory = (cache.allCategories || []).find((c) => c.slug === req.params.slug) || null;
    const sort = req.query.sort || "";
    const minPrice = req.query.minPrice || null;
    const maxPrice = req.query.maxPrice || null;
    const brandId = req.query.brandId || null;

    return res.status(502).render("categoria", {
      category: fallbackCategory,
      pageTitle: fallbackCategory ? fallbackCategory.name : "Categoria",
      categories: cache.categories,
      products: [],
      topProducts: [],
      brands: cache.brands,
      pagination: { page: 1, pages: 1, total: 0, perPage: 24 },
      currentFilters: { sort, minPrice, maxPrice, brandId },
    });
  }
});

// ──────────────────────────────────────────
//  HELPER
// ──────────────────────────────────────────

function mapSort(sort) {
  switch (sort) {
    case "price_asc":  return { sortBy: "salePrice", sortOrder: "asc" };
    case "price_desc": return { sortBy: "salePrice", sortOrder: "desc" };
    case "newest":     return { sortBy: "createdAt", sortOrder: "desc" };
    default:           return { sortBy: null, sortOrder: "asc" };
  }
}

// Ficheiros estaticos (CSS, JS, imagens, etc.)
app.use(
  express.static(PUBLIC_DIR, {
    extensions: ["html"],
    index: false,
  })
);

app.use((err, req, res, next) => {
  console.error("[frontend] Erro nao tratado:", err.message);
  if (res.headersSent) return next(err);
  return res.status(502).send("Servico temporariamente indisponivel. Tenta novamente em instantes.");
});

// Fallback 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, "404.html"), (err) => {
    if (err) res.status(404).send("404 - Pagina nao encontrada");
  });
});

app.listen(PORT, () => {
  console.log(`[100bytes frontend] http://localhost:${PORT}`);
});

