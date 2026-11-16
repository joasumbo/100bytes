/**
 * SEO da loja: domínio único, etiquetas por página, dados estruturados (schema.org),
 * robots.txt e sitemap.xml.
 *
 * Cada rota pode chamar definirSeo(res, { titulo, descricao, imagem, robots, jsonld, ... });
 * o partial views/partials/_seo.ejs escreve as etiquetas no <head>.
 */
const SITE = (process.env.SITE_URL || "https://100bytes.co.ao").replace(/\/$/, "");
const NOME = "100 bytes";
const LOGO = SITE + "/img/logo-completo.png";
const IMAGEM_PADRAO = SITE + "/img/og-100bytes.jpg";
const DESCRICAO_PADRAO =
  "Loja de informática em Luanda: computadores, redes, câmaras de segurança e acessórios. " +
  "Lojas na Liga Africana e no Samba e entrega em todo o país.";

// Lojas físicas (dados mostrados no rodapé do site)
const LOJAS = [
  {
    nome: "100 bytes Liga Africana (loja e assistência técnica)",
    rua: "Rua da Liga Africana, n.º 81",
    telefone: "+244928499325",
  },
  {
    nome: "100 bytes Samba",
    rua: "Rua Direita da Samba, 153 (ao lado da Mecauto)",
    telefone: "+244928499319",
  },
];
const REDES = ["https://www.facebook.com/p/100bytes-100063935954143/", "https://www.instagram.com/100.bytes/"];

// Ficheiros antigos do modelo que não devem ser públicos nem indexados
const LIXO = /^\/(index\.backup[^/]*\.html|single-product-extended\.html|home\.html)$/i;

// Páginas que não devem aparecer no Google
const PRIVADAS = /^\/(checkout|perfil|encomenda|rastreio|pesquisa)(\/|$)/;

function limitar(txt, max) {
  const t = String(txt || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max - 1);
  return corte.slice(0, corte.lastIndexOf(" ") > 60 ? corte.lastIndexOf(" ") : corte.length).replace(/[,.;:\s]+$/, "") + "…";
}

/** www → domínio principal (301) e ficheiros antigos → 404. Deve vir antes dos ficheiros estáticos. */
function dominioUnico(req, res, next) {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim().toLowerCase();
  if (host.startsWith("www.") && /100bytes\.co\.ao$/.test(host)) return res.redirect(301, SITE + req.originalUrl);
  if (LIXO.test(req.path)) return res.status(404).send("Página não encontrada");
  next();
}

/** Valores por omissão de cada página (endereço canónico sem parâmetros, indexável). */
function padrao(req, res, next) {
  const privada = PRIVADAS.test(req.path);
  res.locals.seo = {
    site: SITE,
    nome: NOME,
    url: SITE + (req.path === "/index.html" ? "/" : req.path),
    titulo: null,
    descricao: DESCRICAO_PADRAO,
    imagem: IMAGEM_PADRAO,
    tipo: "website",
    robots: privada ? "noindex, follow" : "index, follow, max-image-preview:large",
    jsonld: [],
  };
  next();
}

function definirSeo(res, dados) {
  res.locals.seo = Object.assign({}, res.locals.seo || {}, dados || {});
  if (dados && dados.jsonld) res.locals.seo.jsonld = [].concat(dados.jsonld).filter(Boolean);
}

// ── schema.org ──
function organizacao() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": SITE + "/#empresa",
    name: NOME,
    legalName: "100bytes, Lda",
    url: SITE,
    logo: LOGO,
    email: "geral@100bytes.co.ao",
    telephone: "+244946920882",
    foundingDate: "2020",
    sameAs: REDES,
    address: { "@type": "PostalAddress", streetAddress: "Rua António Américo Lencastre, n.º 11", addressLocality: "Luanda", addressCountry: "AO" },
  };
}

function siteComPesquisa() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE + "/#site",
    name: NOME,
    url: SITE,
    inLanguage: "pt-AO",
    publisher: { "@id": SITE + "/#empresa" },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: SITE + "/pesquisa?q={search_term_string}" },
      "query-input": "required name=search_term_string",
    },
  };
}

function lojas() {
  return LOJAS.map((l) => ({
    "@context": "https://schema.org",
    "@type": "ComputerStore",
    name: l.nome,
    url: SITE,
    image: LOGO,
    telephone: l.telefone,
    priceRange: "Kz",
    parentOrganization: { "@id": SITE + "/#empresa" },
    address: { "@type": "PostalAddress", streetAddress: l.rua, addressLocality: "Luanda", addressCountry: "AO" },
  }));
}

function caminho(itens) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: itens.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.nome, item: SITE + it.url })),
  };
}

function produto(p, url) {
  const preco = p.salePriceValue != null ? p.salePriceValue : p.basePriceValue;
  const emStock = !p.trackStock || (p.stock == null ? true : Number(p.stock) > 0);
  const o = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    url: SITE + url,
    image: (p.images && p.images.length ? p.images : [p.image]).filter(Boolean),
    description: limitar(p.description || p.name, 500),
    sku: p.reference || p.id,
    offers: {
      "@type": "Offer",
      url: SITE + url,
      priceCurrency: "AOA",
      price: Number(preco || 0).toFixed(2),
      availability: emStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": SITE + "/#empresa" },
    },
  };
  if (p.mpn) o.mpn = p.mpn;
  if (p.brand) o.brand = { "@type": "Brand", name: p.brand };
  if (p.category) o.category = p.category;
  return o;
}

function listaProdutos(produtos) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: produtos.slice(0, 24).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + "/" + (p.categorySlug || "produto") + "/" + p.urlKey, name: p.name })),
  };
}

// ── robots.txt e sitemap.xml ──
function registarRotas(app, { obterCache, getProductsPaged, paginas }) {
  app.get("/robots.txt", (req, res) => {
    res.type("text/plain").send(
      [
        "User-agent: *",
        "Allow: /",
        "Disallow: /checkout",
        "Disallow: /perfil",
        "Disallow: /encomenda/",
        "Disallow: /rastreio",
        "Disallow: /api/",
        "Disallow: /*?*sort=",
        "Disallow: /*?*minPrice=",
        "Disallow: /*?*maxPrice=",
        "",
        "Sitemap: " + SITE + "/sitemap.xml",
        "",
      ].join("\n"),
    );
  });

  let guardado = { em: 0, xml: "" };
  app.get("/sitemap.xml", async (req, res) => {
    try {
      if (Date.now() - guardado.em > 60 * 60 * 1000 || !guardado.xml) {
        const urls = [];
        const hoje = new Date().toISOString().slice(0, 10);
        const add = (loc, prioridade, freq, extra) => urls.push({ loc: SITE + loc, prioridade, freq, lastmod: (extra && extra.lastmod) || hoje, imagens: (extra && extra.imagens) || [] });

        add("/", "1.0", "daily");
        add("/novidades", "0.8", "daily");
        add("/mais-vendidos", "0.7", "weekly");
        Object.keys(paginas || {}).forEach((slug) => add("/" + slug, "0.3", "monthly"));

        const cache = obterCache();
        (cache.catalogo || []).forEach((r) => {
          add("/" + r.slug, "0.8", "daily");
          (r.children || []).forEach((c) => add("/" + c.slug, "0.7", "daily"));
        });

        // todos os produtos ativos (páginas de 200)
        for (let pagina = 1, total = 1; pagina <= total && pagina <= 50; pagina++) {
          const r = await getProductsPaged({ page: pagina, perPage: 200 });
          total = r.pages || 1;
          (r.products || []).forEach((p) =>
            add("/" + (p.categorySlug || "produto") + "/" + p.urlKey, "0.9", "weekly", {
              lastmod: p.createdAt ? String(p.createdAt).slice(0, 10) : hoje,
              imagens: [p.image, p.image2].filter(Boolean).map((im) => ({ loc: im, titulo: p.name })),
            }),
          );
        }

        const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        guardado = {
          em: Date.now(),
          xml:
            '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
            urls
              .map(
                (u) =>
                  "  <url><loc>" + esc(u.loc) + "</loc><lastmod>" + u.lastmod + "</lastmod><changefreq>" + u.freq + "</changefreq><priority>" + u.prioridade + "</priority>" +
                  u.imagens.map((im) => "<image:image><image:loc>" + esc(im.loc) + "</image:loc><image:title>" + esc(im.titulo) + "</image:title></image:image>").join("") +
                  "</url>",
              )
              .join("\n") +
            "\n</urlset>\n",
        };
      }
      res.type("application/xml").send(guardado.xml);
    } catch (e) {
      res.status(503).type("text/plain").send("Sitemap temporariamente indisponível");
    }
  });
}

module.exports = { SITE, NOME, DESCRICAO_PADRAO, dominioUnico, padrao, definirSeo, limitar, organizacao, siteComPesquisa, lojas, caminho, produto, listaProdutos, registarRotas };
