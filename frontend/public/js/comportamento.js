/**
 * Registo de comportamento (base da pesquisa e das recomendações).
 *
 * Eventos: view (produto visto), search (pesquisa e nº de resultados),
 * search_click (clique num resultado), add_to_cart. As compras são registadas
 * no servidor quando a encomenda é criada.
 *
 * Sessão anónima no localStorage (renovada após 30 min sem atividade).
 * Envio em lotes com sendBeacon: não atrasa a página e funciona ao sair.
 * Uso a partir de outros scripts: window.bbTrack(tipo, { productId, query, meta }).
 */
(function () {
  var CHAVE = 'bb_sessao';
  var INATIVIDADE = 30 * 60 * 1000;

  function novoId() {
    var c = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var s = '';
    for (var i = 0; i < 24; i++) s += c.charAt(Math.floor(Math.random() * c.length));
    return s;
  }

  function sessao() {
    var agora = Date.now();
    var d = null;
    try {
      d = JSON.parse(localStorage.getItem(CHAVE) || 'null');
    } catch (e) {
      d = null;
    }
    if (!d || !d.id || agora - (d.t || 0) > INATIVIDADE) d = { id: novoId() };
    d.t = agora;
    try {
      localStorage.setItem(CHAVE, JSON.stringify(d));
    } catch (e) {
      /* modo privado */
    }
    return d.id;
  }

  var fila = [];
  var temporizador = null;

  function enviar() {
    temporizador = null;
    if (!fila.length) return;
    var corpo = JSON.stringify({ sessionId: sessao(), events: fila.splice(0, 25) });
    var ok = false;
    try {
      ok = navigator.sendBeacon && navigator.sendBeacon('/api/events', new Blob([corpo], { type: 'application/json' }));
    } catch (e) {
      ok = false;
    }
    if (!ok) {
      fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo, keepalive: true }).catch(function () {});
    }
    if (fila.length) agendar();
  }

  function agendar() {
    if (!temporizador) temporizador = setTimeout(enviar, 1500);
  }

  function track(tipo, dados) {
    dados = dados || {};
    fila.push({ type: tipo, productId: dados.productId || undefined, query: dados.query || undefined, meta: dados.meta || undefined });
    agendar();
  }

  window.bbTrack = track;
  window.bbSessionId = sessao;
  window.addEventListener('pagehide', enviar);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') enviar();
  });

  // id do produto a partir de um URL da loja (/categoria/slug--ID)
  function idDoUrl(href) {
    var m = String(href || '').split('?')[0].match(/--([A-Za-z0-9]+)\/?$/);
    return m ? m[1] : null;
  }

  function iniciar() {
    // Produto visto
    var pid = window.bbProduto || idDoUrl(location.pathname);
    if (pid && document.querySelector('.product-page-ncr')) track('view', { productId: pid });

    // Pesquisa feita (página de resultados)
    var pesquisa = window.bbPesquisa;
    if (pesquisa && pesquisa.q) {
      track('search', { query: pesquisa.q, meta: { results: Number(pesquisa.total) || 0, page: Number(pesquisa.page) || 1 } });
      // Clique num resultado
      document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href*="--"]');
        if (!a) return;
        var id = idDoUrl(a.getAttribute('href'));
        if (!id) return;
        var links = Array.prototype.slice.call(document.querySelectorAll('a[href*="--' + id + '"]'));
        var todos = Array.prototype.slice.call(document.querySelectorAll('a[href*="--"]'));
        track('search_click', { productId: id, query: pesquisa.q, meta: { position: todos.indexOf(links[0]) + 1, source: 'results' } });
        enviar();
      });
    }

    // Adicionar ao carrinho pelos botões normais (o carrinho usa uma função interna)
    document.addEventListener(
      'click',
      function (e) {
        var btn = e.target.closest && e.target.closest('.js-add-to-cart, .js-buy-now');
        if (!btn || !btn.dataset.id) return;
        track('add_to_cart', {
          productId: btn.dataset.id,
          meta: { qty: Number(btn.dataset.qty) || 1, price: Number(btn.dataset.price) || 0, buyNow: btn.classList.contains('js-buy-now') },
        });
        enviar();
      },
      true,
    );

    // Adicionar ao carrinho por código (ex.: "Completa a tua compra")
    if (window.cart && window.cart.addItem && !window.cart.__bb) {
      var original = window.cart.addItem;
      window.cart.addItem = function (produto, qty) {
        try {
          track('add_to_cart', { productId: produto && produto.id, meta: { qty: Number(qty) || 1, price: Number(produto && produto.price) || 0 } });
        } catch (e) {
          /* nunca bloquear o carrinho */
        }
        return original.apply(this, arguments);
      };
      window.cart.__bb = true;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
