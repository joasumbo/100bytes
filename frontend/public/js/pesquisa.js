/**
 * Sugestões enquanto se escreve, em todas as caixas de pesquisa da loja
 * (formulários com action="/pesquisa"). Usa /api/search/suggest (Meilisearch:
 * tolerante a erros e sinónimos). Teclado: ↑ ↓ para escolher, Enter abre, Esc fecha.
 */
(function () {
  var CDN = 'https://cdn.100bytes.co.ao';
  var ESPERA = 160;

  function kz(v) {
    return Number(v || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kz';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // destaque seguro: escapar tudo e só depois repor <mark>
  function destaque(html) {
    return esc(html).replace(/&lt;mark&gt;/g, '<mark>').replace(/&lt;\/mark&gt;/g, '</mark>');
  }

  var css = document.createElement('style');
  css.textContent =
    '.sg{position:absolute;left:0;right:0;top:calc(100% + 6px);background:#fff;border:1px solid #e5e7eb;border-radius:14px;box-shadow:0 12px 32px rgba(16,24,40,.14);z-index:2000;overflow:hidden;text-align:left;min-width:320px}' +
    '.sg-sec{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#9ca3af;padding:10px 14px 4px}' +
    '.sg a{display:flex;align-items:center;gap:12px;padding:8px 14px;color:#1a1a2e;text-decoration:none!important}' +
    '.sg a.on,.sg a:hover{background:#f5f6f8}' +
    '.sg-img{width:40px;height:40px;flex:0 0 40px;border-radius:8px;background:#f4f4f7;display:flex;align-items:center;justify-content:center;overflow:hidden}' +
    '.sg-img img{max-width:100%;max-height:100%;object-fit:contain;mix-blend-mode:multiply}' +
    '.sg-nome{flex:1;min-width:0;font-size:14px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.sg-nome mark{background:none;color:#F57C00;font-weight:600;padding:0}' +
    '.sg-preco{font-size:13px;font-weight:600;white-space:nowrap}' +
    '.sg-cat{font-size:14px}.sg-cat span{color:#9ca3af;font-size:12px;margin-left:auto}' +
    '.sg-todos{justify-content:center;font-size:13px;font-weight:600;color:#F57C00!important;border-top:1px solid #f0f0f2}' +
    '.sg-vazio{padding:14px;font-size:14px;color:#6b7280}';
  document.head.appendChild(css);

  function ligar(form) {
    var input = form.querySelector('input[name="q"]');
    if (!input || input.__sg) return;
    input.__sg = true;
    input.setAttribute('autocomplete', 'off');
    if (getComputedStyle(form).position === 'static') form.style.position = 'relative';

    var caixa = document.createElement('div');
    caixa.className = 'sg';
    caixa.hidden = true;
    caixa.setAttribute('role', 'listbox');
    form.appendChild(caixa);

    var temporizador = null;
    var ultimo = '';
    var pedido = 0;
    var ativo = -1;

    function fechar() {
      caixa.hidden = true;
      ativo = -1;
    }
    function itens() {
      return Array.prototype.slice.call(caixa.querySelectorAll('a'));
    }
    function marcar(i) {
      var l = itens();
      l.forEach(function (a, k) {
        a.classList.toggle('on', k === i);
      });
      ativo = i;
    }

    function mostrar(q, d) {
      var html = '';
      if (d.categories && d.categories.length) {
        html += '<div class="sg-sec">Categorias</div>';
        d.categories.forEach(function (c) {
          html += '<a class="sg-cat" href="/pesquisa?q=' + encodeURIComponent(q) + '&categoria=' + encodeURIComponent(c.slug) + '">' + esc(c.name) + '<span>' + c.count + '</span></a>';
        });
      }
      if (d.products && d.products.length) {
        html += '<div class="sg-sec">Produtos</div>';
        d.products.forEach(function (p) {
          var url = '/' + (p.category ? p.category.slug : 'produto') + '/' + p.slug + '--' + p.id;
          var img = p.imageKeys && p.imageKeys[0] ? CDN + '/' + p.imageKeys[0] : '';
          var preco = p.salePrice || p.basePrice;
          html +=
            '<a href="' + url + '" data-id="' + esc(p.id) + '">' +
            '<span class="sg-img">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy">' : '') + '</span>' +
            '<span class="sg-nome">' + (p.nameHighlighted ? destaque(p.nameHighlighted) : esc(p.name)) + '</span>' +
            '<span class="sg-preco">' + kz(preco) + '</span></a>';
        });
        html += '<a class="sg-todos" href="/pesquisa?q=' + encodeURIComponent(q) + '">Ver todos os ' + (d.total || d.products.length) + ' resultados</a>';
      }
      if (!html) html = '<div class="sg-vazio">Sem resultados para "' + esc(q) + '". Experimente outra palavra.</div>';
      caixa.innerHTML = html;
      caixa.hidden = false;
      ativo = -1;
    }

    function procurar() {
      var q = input.value.trim();
      if (q.length < 2) return fechar();
      if (q === ultimo && !caixa.hidden) return;
      ultimo = q;
      var n = ++pedido;
      fetch('/api/search/suggest?q=' + encodeURIComponent(q))
        .then(function (r) {
          return r.json();
        })
        .then(function (d) {
          if (n === pedido && document.activeElement === input) mostrar(q, d);
        })
        .catch(fechar);
    }

    input.addEventListener('input', function () {
      clearTimeout(temporizador);
      temporizador = setTimeout(procurar, ESPERA);
    });
    input.addEventListener('focus', function () {
      if (input.value.trim().length >= 2) procurar();
    });
    input.addEventListener('keydown', function (e) {
      var l = itens();
      if (caixa.hidden || !l.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        marcar((ativo + 1) % l.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        marcar((ativo - 1 + l.length) % l.length);
      } else if (e.key === 'Enter' && ativo >= 0) {
        e.preventDefault();
        l[ativo].click();
      } else if (e.key === 'Escape') {
        fechar();
      }
    });
    caixa.addEventListener('mousedown', function (e) {
      e.preventDefault(); // não perder o foco antes do clique
    });
    caixa.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      if (a.dataset.id && window.bbTrack) {
        window.bbTrack('search_click', { productId: a.dataset.id, query: input.value.trim(), meta: { source: 'suggest', position: itens().indexOf(a) + 1 } });
      }
      window.location.href = a.getAttribute('href');
      e.preventDefault();
    });
    input.addEventListener('blur', function () {
      setTimeout(fechar, 150);
    });
  }

  function iniciar() {
    Array.prototype.forEach.call(document.querySelectorAll('form[action="/pesquisa"]'), ligar);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
