/**
 * Valores em kwanzas mais legíveis: "25 650,00 Kz" passa a ter a parte inteira
 * em destaque e os cêntimos e a moeda mais discretos (só em preços grandes).
 *
 * O texto não muda (textContent fica igual), por isso os scripts que leem os
 * preços continuam a funcionar. Valores que mudam depois (quantidade, carrinho)
 * são tratados pelo MutationObserver.
 */
(function () {
  var RE = /^(\s*[-−]?\s*)(\d[\d\s  .]*?)(,\d{2})(\s*)(Kz)(\s*)$/;
  var IGNORAR = 'script, style, textarea, input, select, option, .kz';

  function ehPreco(no) {
    var v = no.nodeValue;
    if (!v || v.indexOf('Kz') < 0 || !RE.test(v)) return false;
    var pai = no.parentNode;
    return pai && pai.nodeType === 1 && !(pai.closest && pai.closest(IGNORAR));
  }

  function embrulhar(no) {
    var m = no.nodeValue.match(RE);
    var pai = no.parentNode;
    var grande = parseFloat(window.getComputedStyle(pai).fontSize) >= 18;
    var span = document.createElement('span');
    span.className = 'kz' + (grande ? ' kz-grande' : '');
    span.appendChild(document.createTextNode(m[1]));
    [
      ['kz-int', m[2]],
      ['kz-dec', m[3]],
      [null, m[4]],
      ['kz-cur', m[5]],
      [null, m[6]],
    ].forEach(function (p) {
      if (!p[1]) return;
      if (!p[0]) return span.appendChild(document.createTextNode(p[1]));
      var s = document.createElement('span');
      s.className = p[0];
      s.textContent = p[1];
      span.appendChild(s);
    });
    pai.replaceChild(span, no);
  }

  function processar(raiz) {
    if (!raiz) return;
    if (raiz.nodeType === 3) {
      if (ehPreco(raiz)) embrulhar(raiz);
      return;
    }
    if (raiz.nodeType !== 1 || (raiz.closest && raiz.closest(IGNORAR))) return;
    var w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return ehPreco(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    var lista = [];
    while (w.nextNode()) lista.push(w.currentNode);
    lista.forEach(embrulhar);
  }

  function iniciar() {
    processar(document.body);
    var pendentes = [];
    var agendado = false;
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          pendentes.push(n);
        });
        if (m.type === 'characterData') pendentes.push(m.target);
      });
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(function () {
        agendado = false;
        var fila = pendentes.splice(0);
        fila.forEach(function (n) {
          if (n.isConnected) processar(n);
        });
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
