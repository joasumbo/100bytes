/*
 * Service worker da 100 bytes: recebe as notificações push e trata dos cliques.
 * O Backend envia { id, title, body, url, image, tag }; o clique é registado em /api/push/clique/:id.
 */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: '100 bytes', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || '100 bytes', {
    body: d.body || '',
    icon: '/img/push-icone.png',
    badge: '/img/push-badge.png',
    image: d.image || undefined,
    tag: d.tag || undefined,
    renotify: !!d.tag,
    lang: 'pt',
    data: { url: d.url || '/', id: d.id || null },
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var info = e.notification.data || {};
  var alvo = new URL(info.url || '/', self.location.origin).href;
  e.waitUntil((async function () {
    if (info.id) fetch('/api/push/clique/' + encodeURIComponent(info.id), { method: 'POST', keepalive: true }).catch(function () {});
    var janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (var i = 0; i < janelas.length; i++) {
      var j = janelas[i];
      if (j.url.indexOf(self.location.origin) === 0 && 'focus' in j) {
        try { await j.navigate(alvo); } catch (err) { /* algumas janelas não permitem navegar */ }
        return j.focus();
      }
    }
    return self.clients.openWindow(alvo);
  })());
});

// O navegador renovou a subscrição: voltar a registá-la no Backend
self.addEventListener('pushsubscriptionchange', function (e) {
  e.waitUntil((async function () {
    var r = await fetch('/api/push/chave').then(function (x) { return x.json(); });
    if (!r || !r.publicKey) return;
    var pad = '='.repeat((4 - (r.publicKey.length % 4)) % 4);
    var raw = atob((r.publicKey + pad).replace(/-/g, '+').replace(/_/g, '/'));
    var chave = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) chave[i] = raw.charCodeAt(i);
    var sub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chave });
    await fetch('/api/push/subscrever', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ subscription: sub.toJSON(), origem: 'renovacao' }) });
  })());
});
