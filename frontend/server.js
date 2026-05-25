require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { getRootCategories, getAllCategories, findCategoryBySlug, getCategoryBySlug, getTopCategories } = require("./api/categories");
const { getFeatured, getOnSale, getNewest, getProductById, getRelated, getByCategory, getProductsPaged } = require("./api/products");
const { getBrands } = require("./api/brands");
const { createOrder, getOrderByCode, getOrdersByEmail, updateOrderStatus, deleteOrder } = require("./api/ordersStore");

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
let cache = { categories: [], allCategories: [], featured: [], onSale: [], newest: [], tabsData: { topCats: [], byCategory: {} }, brands: [], sliders: [], fetchedAt: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function refreshCache() {
  try {
    const [categories, allCategories, featured, onSale, newest, topCats, brands, slidersRes] = await Promise.all([
      getRootCategories(12),
      getAllCategories(),
      getFeatured(),
      getOnSale(),
      getNewest(),
      getTopCategories(5),
      getBrands(),
      fetch(`${BACKEND_URL}/api/content/home-sliders`).then((r) => r.json()).catch(() => null),
    ]);

    // Buscar produtos para cada tab de categoria em paralelo
    const catProducts = await Promise.all(topCats.map((cat) => getByCategory(cat.id, 8)));
    const byCategory = { all: newest };
    topCats.forEach((cat, i) => { byCategory[cat.id] = catProducts[i]; });

    const sliders = (slidersRes?.entry?.data ?? [])
      .filter((s) => s.active)
      .sort((a, b) => a.order - b.order);

    cache = { categories, allCategories, featured, onSale, newest, tabsData: { topCats, byCategory }, brands, sliders, fetchedAt: Date.now() };
    console.log(`[cache] ${categories.length} cat-raiz, ${allCategories.length} cat-total, ${featured.length} destaque, ${onSale.length} oferta, ${sliders.length} slides`);
  } catch (e) {
    console.error("[cache] Erro ao carregar:", e.message);
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
app.post("/api/orders", (req, res) => {
  try {
    const { customer, delivery, items } = req.body || {};
    if (!customer || !delivery || !items || !items.length) {
      return res.status(400).json({ message: "Dados incompletos." });
    }
    const order = createOrder({ customer, delivery, items });
    return res.status(201).json({ ok: true, code: order.code, order });
  } catch (e) {
    console.error("[orders] Erro ao criar:", e.message);
    return res.status(500).json({ message: "Erro interno. Tente novamente." });
  }
});

app.get("/api/admin/orders", (req, res) => {
  const { readOrders } = require("./api/ordersStore");
  return res.json({ orders: readOrders() });
});

app.patch("/api/admin/orders/:code/status", (req, res) => {
  const { status } = req.body || {};
  const valid = ['pending','confirmed','preparing','shipped','delivered','cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ message: "Estado inválido." });
  const order = updateOrderStatus(req.params.code, status);
  if (!order) return res.status(404).json({ message: "Encomenda não encontrada." });
  return res.json({ ok: true, order });
});

app.delete("/api/admin/orders/:code", (req, res) => {
  const ok = deleteOrder(req.params.code);
  if (!ok) return res.status(404).json({ message: "Encomenda não encontrada." });
  return res.json({ ok: true });
});

app.get("/api/customers/orders", (req, res) => {
  const customer = res.locals.currentCustomer;
  if (!customer) return res.status(401).json({ message: "Não autenticado." });
  const orders = getOrdersByEmail(customer.email).map(o => ({
    reference: o.code,
    code: o.code,
    status: o.status,
    createdAt: o.createdAt,
    total: o.total,
    items: o.items,
  }));
  return res.json({ orders });
});

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
app.get("/encomenda/:code", (req, res) => {
  const order = getOrderByCode(req.params.code);
  if (!order) return res.status(404).render("encomenda", { order: null, categories: cache.categories });
  res.render("encomenda", { order, categories: cache.categories });
});

// Rastreio de encomenda
app.get("/rastreio", (req, res) => {
  res.render("rastreio", { order: null, searched: false, categories: cache.categories });
});
app.get("/rastreio/:code", (req, res) => {
  const order = getOrderByCode(req.params.code);
  res.render("rastreio", { order: order || null, searched: true, code: req.params.code.toUpperCase(), categories: cache.categories });
});

// Pesquisa
app.get("/pesquisa", async (req, res, next) => {
  const q = (req.query.q || "").trim();
  const categoria = req.query.categoria || "";
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const sort = req.query.sort || "";
  const { sortBy, sortOrder } = mapSort(sort);
  try {
    const paged = await getProductsPaged({
      page,
      perPage: 24,
      search: q || undefined,
      categorySlug: categoria || undefined,
      sortBy,
      sortOrder,
    });
    res.render("categoria", {
      category: null,
      pageTitle: q ? `Resultados para "${q}"` : "Pesquisa",
      categories: cache.categories,
      products: paged.products,
      topProducts: [],
      brands: cache.brands,
      pagination: { page: paged.page, pages: paged.pages, total: paged.total, perPage: paged.perPage },
      currentFilters: { sort, minPrice: null, maxPrice: null, brandId: null },
    });
  } catch (e) {
    next(e);
  }
});

// Tendências (/tendencias)
app.get("/tendencias", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const sort = req.query.sort || "newest";
    const minPrice = req.query.minPrice || null;
    const maxPrice = req.query.maxPrice || null;
    const brandId = req.query.brandId || null;
    const { sortBy, sortOrder } = mapSort(sort);
    const paged = await getProductsPaged({ page, perPage: 24, sortBy, sortOrder, minPrice, maxPrice, brandId });
    res.render("categoria", {
      category: null,
      pageTitle: "Tendencias",
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

// Super Ofertas (/ofertas)
app.get("/ofertas", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const sort = req.query.sort || "price_asc";
    const minPrice = req.query.minPrice || null;
    const maxPrice = req.query.maxPrice || null;
    const brandId = req.query.brandId || null;
    const { sortBy, sortOrder } = mapSort(sort);
    const paged = await getProductsPaged({ page, perPage: 24, sortBy, sortOrder, minPrice, maxPrice, brandId });
    res.render("categoria", {
      category: null,
      pageTitle: "Super Ofertas",
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

