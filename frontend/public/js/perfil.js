/*
 * Página "A minha conta" (/perfil).
 * - Completar a conta depois de entrar com Google (?completar=1&next=…)
 * - Dados pessoais, morada, palavra-passe, foto (R2), encomendas e favoritos
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var q = new URLSearchParams(location.search);
  var eu = null;

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function kz(v) { return v != null ? Number(v).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kz' : ''; }
  function destinoSeguro(n) { return n && n.charAt(0) === '/' && n.charAt(1) !== '/' && n.indexOf('/api/') !== 0 ? n : '/'; }

  async function api(url, opcoes) {
    var r = await fetch(url, Object.assign({ credentials: 'include' }, opcoes || {}));
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok) {
      var m = d && d.message;
      throw new Error(Array.isArray(m) ? m[0] : (m || 'Não foi possível guardar. Tente novamente.'));
    }
    return d;
  }
  function json(metodo, corpo) { return { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) }; }

  function mensagem(el, texto, tipo) {
    el.textContent = texto || '';
    el.className = 'pf-msg' + (texto ? ' ' + (tipo || 'ok') : '');
  }

  async function comBotao(form, texto, fn) {
    var btn = form.querySelector('button[type="submit"]');
    var original = btn.textContent;
    btn.disabled = true; btn.textContent = texto;
    try { await fn(); } finally { btn.disabled = false; btn.textContent = original; }
  }

  // ── Mostrar dados ──
  function pintar(c) {
    eu = c;
    var inicial = (c.name || '?').trim().charAt(0).toUpperCase();
    document.querySelectorAll('[data-pf-avatar]').forEach(function (el) {
      el.innerHTML = c.avatar ? '<img src="' + esc(c.avatar) + '" alt="" referrerpolicy="no-referrer">' : esc(inicial);
      el.classList.toggle('tem-foto', !!c.avatar);
    });
    document.querySelectorAll('[data-pf-nome]').forEach(function (el) { el.textContent = c.name || ''; });
    document.querySelectorAll('[data-pf-primeiro]').forEach(function (el) { el.textContent = (c.name || '').split(' ')[0]; });
    document.querySelectorAll('[data-pf-email]').forEach(function (el) { el.value = c.email || ''; });
    document.querySelectorAll('[data-pf-email-txt]').forEach(function (el) { el.textContent = c.email || ''; });
    if (c.createdAt) $('pfDesde').textContent = 'Cliente desde ' + new Date(c.createdAt).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
    $('pfEmailNota').textContent = c.google ? '(conta Google, não pode ser alterado)' : '(não pode ser alterado)';

    $('pfName').value = c.name || '';
    $('pfPhone').value = c.phone || '';
    $('pfProvince').value = c.province || '';
    $('pfCity').value = c.city || '';
    $('pfAddress').value = c.address || '';

    // Segurança: contas Google sem palavra-passe criam uma (sem pedir a atual)
    $('pfAtualBloco').hidden = !c.passwordSet;
    $('pfSegSub').textContent = c.passwordSet ? 'Altere a palavra-passe da sua conta.' : 'Crie uma palavra-passe para entrar também com o email.';
    $('pfPassBtn').textContent = c.passwordSet ? 'Mudar palavra-passe' : 'Criar palavra-passe';
    $('pfGoogleCard').hidden = !c.google;

    // Completar conta
    $('cpPhone').value = c.phone || '';
    $('cpProvince').value = c.province || '';
    $('cpCity').value = c.city || '';
    $('cpAddress').value = c.address || '';
    $('cpPassBloco').hidden = c.passwordSet;
  }

  // ── Separadores ──
  var TABS = ['dados', 'morada', 'seguranca', 'encomendas', 'favoritos'];
  function abrir(tab) {
    if (TABS.indexOf(tab) < 0) tab = 'dados';
    TABS.forEach(function (t) { $('tab-' + t).hidden = t !== tab; });
    document.querySelectorAll('.pf-nav [data-tab]').forEach(function (a) {
      var on = a.getAttribute('data-tab') === tab;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      if (on && window.innerWidth < 992 && a.scrollIntoView) a.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
    if (tab === 'encomendas') carregarEncomendas();
    if (tab === 'favoritos') carregarFavoritos();
  }
  document.querySelectorAll('.pf-nav [data-tab]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var t = a.getAttribute('data-tab');
      history.replaceState(null, '', '/perfil#' + t);
      abrir(t);
      if (window.innerWidth < 992) $('pfConta').querySelector('.pf-conteudo').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // ── Mostrar/ocultar palavra-passe ──
  document.querySelectorAll('[data-olho]').forEach(function (b) {
    b.addEventListener('click', function () {
      var i = $(b.getAttribute('data-olho'));
      var ver = i.type === 'password';
      i.type = ver ? 'text' : 'password';
      b.querySelector('i').className = ver ? 'far fa-eye-slash' : 'far fa-eye';
    });
  });

  // ── Formulários ──
  $('pfDadosForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.currentTarget, msg = $('pfDadosMsg');
    comBotao(f, 'A guardar…', async function () {
      try {
        var d = await api('/api/customers/me', json('PATCH', { name: $('pfName').value, phone: $('pfPhone').value }));
        pintar(d.customer); mensagem(msg, 'Dados guardados.');
      } catch (err) { mensagem(msg, err.message, 'erro'); }
    });
  });

  $('pfMoradaForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.currentTarget, msg = $('pfMoradaMsg');
    comBotao(f, 'A guardar…', async function () {
      try {
        var d = await api('/api/customers/me', json('PATCH', { province: $('pfProvince').value, city: $('pfCity').value, address: $('pfAddress').value }));
        pintar(d.customer); mensagem(msg, 'Morada guardada.');
      } catch (err) { mensagem(msg, err.message, 'erro'); }
    });
  });

  $('pfPassForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.currentTarget, msg = $('pfPassMsg');
    var nova = $('pfPassNova').value;
    if (nova.length < 8) { mensagem(msg, 'A palavra-passe deve ter pelo menos 8 caracteres.', 'erro'); return; }
    comBotao(f, 'A guardar…', async function () {
      try {
        var d = await api('/api/customers/me/password', json('POST', { current: $('pfPassAtual').value, password: nova }));
        $('pfPassAtual').value = ''; $('pfPassNova').value = '';
        pintar(d.customer); mensagem(msg, 'Palavra-passe guardada.');
      } catch (err) { mensagem(msg, err.message, 'erro'); }
    });
  });

  // ── Foto ──
  $('pfFotoInput').addEventListener('change', async function () {
    var file = this.files && this.files[0];
    this.value = '';
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { alerta('A imagem deve ter no máximo 3 MB.'); return; }
    var fd = new FormData(); fd.append('file', file);
    document.querySelectorAll('[data-pf-avatar]').forEach(function (el) { el.classList.add('a-enviar'); });
    try {
      var d = await api('/api/customers/me/avatar', { method: 'POST', body: fd });
      pintar(d.customer);
    } catch (err) { alerta(err.message); }
    finally { document.querySelectorAll('[data-pf-avatar]').forEach(function (el) { el.classList.remove('a-enviar'); }); }
  });
  function alerta(t) { if (window.ui && window.ui.toast) window.ui.toast(t, { type: 'error' }); else alert(t); }

  // ── Completar a conta ──
  var proximo = destinoSeguro(q.get('next'));
  $('cpDepois').addEventListener('click', function (e) { e.preventDefault(); location.href = proximo; });
  $('pfCompletarForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.currentTarget, msg = $('cpMsg');
    var faltam = [];
    if (!$('cpPhone').value.trim()) faltam.push('telefone');
    if (!$('cpProvince').value) faltam.push('província');
    if (!$('cpCity').value.trim()) faltam.push('município');
    if (!$('cpAddress').value.trim()) faltam.push('morada');
    var precisaPass = !eu.passwordSet;
    if (precisaPass && $('cpPassword').value.length < 8) faltam.push('palavra-passe (mín. 8 caracteres)');
    if (faltam.length) { mensagem(msg, 'Falta preencher: ' + faltam.join(', ') + '.', 'erro'); return; }
    comBotao(f, 'A guardar…', async function () {
      try {
        await api('/api/customers/me', json('PATCH', { phone: $('cpPhone').value, province: $('cpProvince').value, city: $('cpCity').value, address: $('cpAddress').value }));
        if (precisaPass) await api('/api/customers/me/password', json('POST', { password: $('cpPassword').value }));
        location.href = proximo;
      } catch (err) { mensagem(msg, err.message, 'erro'); }
    });
  });

  // ── Encomendas ──
  var ESTADOS = { pending: 'Aguarda confirmação', confirmed: 'Confirmada', preparing: 'Em preparação', processing: 'Em preparação', shipped: 'A caminho', delivered: 'Entregue', cancelled: 'Cancelada' };
  var encomendasFeitas = false;
  async function carregarEncomendas() {
    if (encomendasFeitas) return; encomendasFeitas = true;
    var box = $('ordersList');
    try {
      var d = await api('/api/customers/orders');
      var lista = d.orders || [];
      if (!lista.length) {
        box.innerHTML = '<div class="lj-card pf-vazio"><strong>Ainda não tem encomendas</strong><span>Quando comprar, as encomendas aparecem aqui.</span><a href="/" class="lj-btn lj-btn-escuro" style="margin-top:14px;">Ver produtos</a></div>';
        return;
      }
      box.innerHTML = lista.map(function (o) {
        var codigo = o.code || o.reference || '';
        var itens = o.items || [];
        var n = itens.reduce(function (s, i) { return s + (Number(i.qty) || 0); }, 0);
        var fotos = itens.slice(0, 4).map(function (i) {
          return '<span class="pf-ord-foto">' + (i.image ? '<img src="' + esc(i.image) + '" alt="" loading="lazy">' : '') + '</span>';
        }).join('') + (itens.length > 4 ? '<span class="pf-ord-foto pf-ord-mais">+' + (itens.length - 4) + '</span>' : '');
        return '<a class="lj-card pf-ord" href="/encomenda/' + encodeURIComponent(codigo) + '">'
          + '<div class="pf-ord-topo"><div><div class="pf-ord-cod">' + esc(codigo) + '</div>'
          + '<div class="pf-ord-data">' + (o.createdAt ? new Date(o.createdAt).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }) : '') + ' · ' + n + (n === 1 ? ' artigo' : ' artigos') + '</div></div>'
          + '<span class="lj-estado ' + esc(o.status) + '">' + esc(ESTADOS[o.status] || o.status) + '</span></div>'
          + '<div class="pf-ord-baixo"><div class="pf-ord-fotos">' + fotos + '</div>'
          + '<div class="pf-ord-total"><span>Total</span><b>' + kz(o.total) + '</b></div></div>'
          + '</a>';
      }).join('');
    } catch (err) {
      encomendasFeitas = false;
      box.innerHTML = '<div class="lj-card pf-vazio">Não foi possível carregar as encomendas.</div>';
    }
  }

  // ── Favoritos ──
  var favsFeitos = false;
  async function carregarFavoritos() {
    if (favsFeitos) return; favsFeitos = true;
    var grid = $('favGrid');
    try {
      var d = await api('/api/customers/favorites');
      var ids = d.favorites || [];
      $('favCount').textContent = ids.length ? ids.length + (ids.length === 1 ? ' produto guardado.' : ' produtos guardados.') : 'Os produtos que guardou.';
      if (!ids.length) {
        grid.innerHTML = '<div class="lj-card pf-vazio"><strong>Ainda não tem favoritos</strong><span>Toque no coração de um produto para o guardar aqui.</span></div>';
        return;
      }
      var mapa = new Map(((window.customerAuth && window.customerAuth.getLocalFavs && window.customerAuth.getLocalFavs()) || []).map(function (f) { return [f.id, f]; }));
      await Promise.all(ids.filter(function (id) { return !mapa.has(id); }).map(function (id) {
        return fetch('/api/products/' + id).then(function (r) { return r.ok ? r.json() : null; }).then(function (x) {
          if (!x || !x.product) return;
          var p = x.product, v = p.salePrice || p.basePrice;
          mapa.set(id, { id: id, name: p.name, image: p.imageKeys && p.imageKeys[0] ? 'https://cdn.100bytes.co.ao/' + p.imageKeys[0] : '', price: v ? kz(v) : '', url: '/' + ((p.category && p.category.slug) || 'produto') + '/' + p.slug + '--' + p.id });
        }).catch(function () {});
      }));
      grid.innerHTML = ids.map(function (id) {
        var p = mapa.get(id);
        if (!p) return '';
        return '<div class="lj-card pf-fav">'
          + '<a href="' + esc(p.url) + '" class="pf-fav-foto">' + (p.image ? '<img src="' + esc(p.image) + '" alt="" loading="lazy">' : '') + '</a>'
          + '<a href="' + esc(p.url) + '" class="pf-fav-nome">' + esc(p.name) + '</a>'
          + '<div class="pf-fav-preco">' + esc(p.price) + '</div>'
          + '<button type="button" class="pf-fav-tirar" data-id="' + esc(id) + '">Remover</button>'
          + '</div>';
      }).join('');
      grid.querySelectorAll('.pf-fav-tirar').forEach(function (b) {
        b.addEventListener('click', async function () {
          var id = b.getAttribute('data-id');
          b.disabled = true;
          await fetch('/api/customers/favorites/' + id, { method: 'DELETE', credentials: 'include' }).catch(function () {});
          if (window.customerAuth && window.customerAuth.removeLocalFav) window.customerAuth.removeLocalFav(id);
          favsFeitos = false; carregarFavoritos();
        });
      });
    } catch (err) {
      favsFeitos = false;
      grid.innerHTML = '<div class="lj-card pf-vazio">Não foi possível carregar os favoritos.</div>';
    }
  }

  // ── Início ──
  (async function () {
    try {
      var d = await api('/api/customers/me');
      if (!d.customer) { location.href = '/?openLogin=1&next=' + encodeURIComponent('/perfil' + location.hash); return; }
      pintar(d.customer);
      $('pfCarregar').hidden = true;
      if (q.get('completar') === '1' && !d.customer.completo) {
        $('pfCompletar').hidden = false;
      } else {
        $('pfConta').hidden = false;
        abrir(location.hash.slice(1));
      }
    } catch (e) {
      location.href = '/?openLogin=1&next=' + encodeURIComponent('/perfil' + location.hash);
    }
  })();
})();
