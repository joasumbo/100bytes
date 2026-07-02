// Custom modal + toast UI for 100bytes — replaces native alert/confirm/prompt.
// API: window.ui.confirm(msg, opts) -> Promise<bool>
//      window.ui.alert(msg, opts)   -> Promise<void>
//      window.ui.toast(msg, opts)   -> void   (opts.type: success|error|warning|info)
(function () {
  var STYLE = [
    '.ui-modal-overlay{position:fixed;inset:0;background:rgba(20,20,35,.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;visibility:hidden;transition:opacity .18s,visibility .18s;}',
    '.ui-modal-overlay.is-open{opacity:1;visibility:visible;}',
    '.ui-modal{background:#fff;border-radius:14px;max-width:420px;width:100%;box-shadow:0 18px 50px rgba(0,0,0,.28);transform:translateY(12px) scale(.98);transition:transform .2s ease;overflow:hidden;}',
    '.ui-modal-overlay.is-open .ui-modal{transform:translateY(0) scale(1);}',
    '.ui-modal__icon{display:flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:50%;margin:22px auto 0;font-size:24px;}',
    '.ui-modal__icon.is-danger{background:#fdecec;color:#c62828;}',
    '.ui-modal__icon.is-info{background:#fff3e6;color:#F57C00;}',
    '.ui-modal__title{font-size:17px;font-weight:700;color:#1a1a2e;text-align:center;padding:14px 24px 0;}',
    '.ui-modal__body{font-size:14px;color:#5a5a6a;line-height:1.6;text-align:center;padding:8px 24px 4px;}',
    '.ui-modal__body input{width:100%;margin-top:10px;padding:9px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;}',
    '.ui-modal__actions{display:flex;gap:10px;padding:18px 24px 22px;}',
    '.ui-btn{flex:1;padding:11px 14px;border:0;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .15s,opacity .15s;}',
    '.ui-btn--primary{background:#F57C00;color:#fff;}.ui-btn--primary:hover{background:#D96A00;}',
    '.ui-btn--danger{background:#c62828;color:#fff;}.ui-btn--danger:hover{background:#a31f1f;}',
    '.ui-btn--ghost{background:#f1f1f4;color:#444;}.ui-btn--ghost:hover{background:#e6e6ea;}',
    '.ui-toast-wrap{position:fixed;top:18px;right:18px;z-index:2100;display:flex;flex-direction:column;gap:10px;max-width:340px;}',
    '.ui-toast{display:flex;align-items:center;gap:10px;background:#1a1a2e;color:#fff;padding:12px 16px;border-radius:10px;font-size:13.5px;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,.22);transform:translateX(120%);opacity:0;transition:transform .25s ease,opacity .25s;}',
    '.ui-toast.is-open{transform:translateX(0);opacity:1;}',
    '.ui-toast i{font-size:16px;flex-shrink:0;}',
    '.ui-toast--success i{color:#34d399;}.ui-toast--error i{color:#f87171;}.ui-toast--warning i{color:#fbbf24;}.ui-toast--info i{color:#F57C00;}',
    '@media(max-width:480px){.ui-toast-wrap{left:12px;right:12px;max-width:none;}}'
  ].join('');

  function ensureStyle() {
    if (document.getElementById('ui-kit-style')) return;
    var s = document.createElement('style');
    s.id = 'ui-kit-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function dialog(opts) {
    ensureStyle();
    opts = opts || {};
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'ui-modal-overlay';
      var iconCls = opts.danger ? 'is-danger' : 'is-info';
      var iconGlyph = opts.danger ? 'fa-exclamation-triangle' : 'fa-info-circle';
      overlay.innerHTML =
        '<div class="ui-modal" role="dialog" aria-modal="true">' +
          '<div class="ui-modal__icon ' + iconCls + '"><i class="fas ' + iconGlyph + '"></i></div>' +
          (opts.title ? '<div class="ui-modal__title">' + esc(opts.title) + '</div>' : '') +
          '<div class="ui-modal__body">' + (opts.html || esc(opts.message)) + '</div>' +
          '<div class="ui-modal__actions">' +
            (opts.showCancel ? '<button type="button" class="ui-btn ui-btn--ghost" data-act="cancel">' + esc(opts.cancelText || 'Cancelar') + '</button>' : '') +
            '<button type="button" class="ui-btn ' + (opts.danger ? 'ui-btn--danger' : 'ui-btn--primary') + '" data-act="ok">' + esc(opts.okText || 'OK') + '</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);
      requestAnimationFrame(function () { overlay.classList.add('is-open'); });

      function close(val) {
        overlay.classList.remove('is-open');
        document.removeEventListener('keydown', onKey);
        setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
        resolve(val);
      }
      function onKey(e) {
        if (e.key === 'Escape') close(false);
        else if (e.key === 'Enter') close(true);
      }
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) return close(false);
        var act = e.target.closest('[data-act]');
        if (act) close(act.dataset.act === 'ok');
      });
      document.addEventListener('keydown', onKey);
      var okBtn = overlay.querySelector('[data-act="ok"]');
      if (okBtn) okBtn.focus();
    });
  }

  function toast(message, opts) {
    ensureStyle();
    opts = opts || {};
    var wrap = document.getElementById('ui-toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'ui-toast-wrap';
      wrap.className = 'ui-toast-wrap';
      document.body.appendChild(wrap);
    }
    var type = opts.type || 'info';
    var icon = type === 'success' ? 'fa-check-circle'
      : type === 'error' ? 'fa-exclamation-circle'
      : type === 'warning' ? 'fa-exclamation-triangle'
      : 'fa-info-circle';
    var t = document.createElement('div');
    t.className = 'ui-toast ui-toast--' + type;
    t.innerHTML = '<i class="fas ' + icon + '"></i><span>' + esc(message) + '</span>';
    wrap.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('is-open'); });
    setTimeout(function () {
      t.classList.remove('is-open');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 280);
    }, opts.duration || 3400);
  }

  window.ui = {
    confirm: function (message, opts) {
      opts = opts || {};
      return dialog({
        message: message,
        title: opts.title || 'Confirmar',
        okText: opts.okText || 'Confirmar',
        cancelText: opts.cancelText || 'Cancelar',
        showCancel: true,
        danger: opts.danger,
      });
    },
    alert: function (message, opts) {
      opts = opts || {};
      return dialog({
        message: message,
        html: opts.html,
        title: opts.title || 'Aviso',
        okText: opts.okText || 'OK',
        showCancel: false,
        danger: opts.danger,
      });
    },
    dialog: dialog,
    toast: toast,
  };
})();
