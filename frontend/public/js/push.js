/*
 * Notificações push da 100 bytes (lado do site).
 *  - Pede autorização só depois de um convite nosso (nunca ao abrir o site)
 *  - Regista o aparelho no Backend e mantém a sessão atualizada (para avisos de carrinho e interesse)
 *  - Regista o clique quando se entra pelo link de uma notificação (?pn=…) e limpa o endereço
 * Elementos com [data-push-ativar="origem"] ativam as notificações; [data-push-estado] mostra o estado.
 */
(function () {
  'use strict';

  var suportado = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  var DISPENSA = 'bb_push_dispensa';
  var SYNC = 'bb_push_sync';
  var VISTAS = 'bb_push_vistas';

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function sessao() { try { return window.bbSessionId ? window.bbSessionId() : ''; } catch (e) { return ''; } }
  function registar(acao, origem) { if (window.bbTrack) window.bbTrack('push_prompt', { meta: { acao: acao, origem: origem || '' } }); }

  // ── Clique vindo de uma notificação ──
  (function () {
    try {
      var u = new URL(location.href);
      var pn = u.searchParams.get('pn');
      if (!pn) return;
      fetch('/api/push/clique/' + encodeURIComponent(pn), { method: 'POST', keepalive: true }).catch(function () {});
      ['pn', 'utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) { u.searchParams.delete(k); });
      history.replaceState(null, '', u.pathname + (u.searchParams.toString() ? '?' + u.searchParams : '') + u.hash);
    } catch (e) { /* ignorar */ }
  })();

  if (!suportado) {
    window.bbPush = { suportado: false, estado: function () { return 'indisponivel'; }, ativar: function () { return Promise.resolve(false); } };
    document.addEventListener('DOMContentLoaded', pintarEstado);
    return;
  }

  var chaveP = null;
  function chave() {
    if (!chaveP) chaveP = fetch('/api/push/chave').then(function (r) { return r.json(); }).catch(function () { chaveP = null; return { ativo: false }; });
    return chaveP;
  }
  function bytes(b64) {
    var pad = '='.repeat((4 - (b64.length % 4)) % 4);
    var raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function registo() { return navigator.serviceWorker.register('/sw.js', { scope: '/' }); }

  function enviar(sub, origem) {
    var sid = sessao();
    return fetch('/api/push/subscrever', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ subscription: sub.toJSON(), sessionId: sid, origem: origem || 'site' }),
    }).then(function (r) { if (r.ok) ls(SYNC, sid || 'sem-sessao'); return r.ok; });
  }

  // Uma só subscrição de cada vez (o registo automático e o botão podem correr ao mesmo tempo)
  var emCurso = null;
  function obterSubscricao(reg, k) {
    if (!emCurso) {
      emCurso = (async function () {
        var sub = await reg.pushManager.getSubscription();
        if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(k.publicKey) });
        return sub;
      })();
      emCurso.catch(function () {}).then(function () { emCurso = null; });
    }
    return emCurso;
  }

  /** Pede autorização e regista o aparelho. Devolve true se ficou ativo. */
  async function ativar(origem) {
    try {
      var k = await chave();
      if (!k || !k.ativo || !k.publicKey) return false;
      var perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (perm !== 'granted') { registar('recusado', origem); ls(DISPENSA, String(Date.now())); pintarEstado(); return false; }
      var reg = await registo();
      await navigator.serviceWorker.ready;
      var sub = await obterSubscricao(reg, k);
      await enviar(sub, origem);
      registar('aceite', origem);
      pintarEstado();
      return true;
    } catch (e) {
      console.warn('[push]', e);
      pintarEstado();
      return false;
    }
  }

  async function desativar() {
    try {
      var reg = await navigator.serviceWorker.getRegistration('/');
      var sub = reg && (await reg.pushManager.getSubscription());
      if (sub) {
        await fetch('/api/push/cancelar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      ls(SYNC, null);
    } catch (e) { /* ignorar */ }
    pintarEstado();
  }

  /** Com autorização já dada: garante o registo e atualiza a sessão associada ao aparelho */
  async function sincronizar() {
    if (Notification.permission !== 'granted') return;
    try {
      var k = await chave();
      if (!k || !k.ativo) return;
      var reg = (await navigator.serviceWorker.getRegistration('/')) || (await registo());
      await navigator.serviceWorker.ready;
      var sub = await obterSubscricao(reg, k);
      if (ls(SYNC) !== (sessao() || 'sem-sessao')) await enviar(sub, 'sync');
    } catch (e) { /* ignorar */ }
  }

  // ── Interface ──
  function estado() { return Notification.permission === 'granted' ? 'ativo' : Notification.permission === 'denied' ? 'bloqueado' : 'por_pedir'; }

  function pintarEstado() {
    var e = window.bbPush ? window.bbPush.estado() : 'indisponivel';
    document.querySelectorAll('[data-push-bloco]').forEach(function (b) { b.hidden = e === 'indisponivel'; b.setAttribute('data-estado', e); });
    document.querySelectorAll('[data-push-estado]').forEach(function (el) {
      el.textContent = e === 'ativo' ? 'Ativas neste aparelho' : e === 'bloqueado' ? 'Bloqueadas no navegador. Pode permitir nas definições do site.' : 'Desligadas';
    });
    document.querySelectorAll('[data-push-ativar]').forEach(function (b) { b.hidden = e !== 'por_pedir'; });
    document.querySelectorAll('[data-push-desativar]').forEach(function (b) { b.hidden = e !== 'ativo'; });
    document.querySelectorAll('[data-push-ok]').forEach(function (b) { b.hidden = e !== 'ativo'; });
  }

  function estilos() {
    if (document.getElementById('bbPushCss')) return;
    var css = document.createElement('style');
    css.id = 'bbPushCss';
    css.textContent =
      '.bbp{position:fixed;left:20px;bottom:20px;z-index:10020;width:min(380px,calc(100vw - 32px));background:#fff;border:1px solid #ececf0;border-radius:18px;box-shadow:0 18px 50px rgba(22,22,29,.18);padding:18px;display:flex;gap:14px;font-family:inherit;color:#1a1a2e;animation:bbpEntra .35s ease-out}' +
      '@keyframes bbpEntra{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}' +
      '.bbp-ico{flex:0 0 42px;width:42px;height:42px;border-radius:12px;background:#fff4e5;color:#E06F00;display:flex;align-items:center;justify-content:center}' +
      '.bbp-ico svg{width:22px;height:22px}' +
      '.bbp b{display:block;font-size:15px;font-weight:600;margin-bottom:2px}' +
      '.bbp p{margin:0 0 12px;font-size:13px;line-height:1.45;color:#6b7280}' +
      '.bbp-acoes{display:flex;gap:8px}' +
      '.bbp-acoes button{height:38px;padding:0 16px;border-radius:999px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;border:1px solid #d4d4d8;background:#fff;color:#1a1a2e}' +
      '.bbp-acoes .bbp-sim{background:#16161d;border-color:#16161d;color:#fff}' +
      '.bbp-acoes .bbp-sim:hover{background:#F57C00;border-color:#F57C00}' +
      '@media (max-width:575.98px){.bbp{left:16px;bottom:16px}}';
    document.head.appendChild(css);
  }

  var aberto = false;
  function convite(origem, titulo, texto) {
    if (aberto || estado() !== 'por_pedir') return;
    aberto = true;
    estilos();
    var el = document.createElement('div');
    el.className = 'bbp';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', titulo);
    el.innerHTML =
      '<span class="bbp-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></span>' +
      '<div><b></b><p></p><div class="bbp-acoes"><button type="button" class="bbp-sim">Ativar avisos</button><button type="button" class="bbp-nao">Agora não</button></div></div>';
    el.querySelector('b').textContent = titulo;
    el.querySelector('p').textContent = texto;
    document.body.appendChild(el);
    registar('mostrado', origem);
    function fechar() { el.remove(); aberto = false; }
    el.querySelector('.bbp-nao').addEventListener('click', function () { ls(DISPENSA, String(Date.now())); registar('dispensado', origem); fechar(); });
    el.querySelector('.bbp-sim').addEventListener('click', function () { fechar(); ativar(origem); });
  }

  function dispensadoHaPouco() {
    var t = parseInt(ls(DISPENSA) || '0', 10);
    return t && Date.now() - t < 7 * 24 * 3600 * 1000;
  }

  window.bbPush = { suportado: true, estado: estado, ativar: ativar, desativar: desativar, convite: convite };

  document.addEventListener('DOMContentLoaded', function () {
    pintarEstado();
    document.querySelectorAll('[data-push-ativar]').forEach(function (b) {
      b.addEventListener('click', function () { b.disabled = true; ativar(b.getAttribute('data-push-ativar')).then(function () { b.disabled = false; }); });
    });
    document.querySelectorAll('[data-push-desativar]').forEach(function (b) { b.addEventListener('click', desativar); });

    // Ao guardar um favorito: oferecer avisos de baixa de preço
    document.addEventListener('click', function (e) {
      var fav = e.target.closest && e.target.closest('.js-favorite-toggle');
      if (!fav || dispensadoHaPouco()) return;
      setTimeout(function () {
        if (fav.getAttribute('data-favorited') === '1') convite('favorito', 'Quer saber quando baixar de preço?', 'Avisamos se um produto dos seus favoritos baixar de preço ou voltar ao stock.');
      }, 900);
    });

    // Convite geral: a partir da 2.ª página vista ou 25 s no site (nunca no checkout nem na conta)
    if (/^\/(checkout|perfil)/.test(location.pathname)) return;
    var vistas = (parseInt(sessionStorage.getItem(VISTAS) || '0', 10) || 0) + 1;
    try { sessionStorage.setItem(VISTAS, String(vistas)); } catch (e) { /* ignorar */ }
    if (dispensadoHaPouco() || document.querySelector('[data-push-ativar]')) return;
    setTimeout(function () {
      convite('banner', 'Receber avisos da 100 bytes?', 'Novidades, baixas de preço e o estado das suas encomendas. Pode desligar quando quiser.');
    }, vistas >= 2 ? 4000 : 25000);
  });

  window.addEventListener('load', function () { setTimeout(sincronizar, 1500); });
})();
