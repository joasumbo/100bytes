// Cart management — 100bytes storefront
(function () {
  var CART_KEY = 'cart100_items';

  // ── State ────────────────────────────────────────────────────

  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  }

  function saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }

  function addItem(product, qty) {
    // product: { id, name, price (number), priceFormatted, image, url }
    qty = Math.max(1, Math.min(99, parseInt(qty) || 1));
    var cart = getCart();
    var existing = cart.find(function (i) { return i.id === product.id; });
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, 99);
    } else {
      cart.push(Object.assign({}, product, { qty: qty }));
    }
    saveCart(cart);
    updateUI();
    // NÃO abrir o drawer automaticamente — o estado fica visível no botão
    // (vira stepper) e no ícone do carrinho. O drawer só abre por clique no ícone.
  }

  function removeItem(id) {
    saveCart(getCart().filter(function (i) { return i.id !== id; }));
    updateUI();
  }

  function changeQty(id, delta) {
    var cart = getCart();
    var item = cart.find(function (i) { return i.id === id; });
    if (!item) return;
    var next = item.qty + delta;
    if (next <= 0) { removeItem(id); return; }   // baixar de 1 → remove (volta ao botão "Adicionar")
    item.qty = Math.min(99, next);
    saveCart(cart);
    updateUI();
  }

  function setQty(id, qty) {
    qty = parseInt(qty, 10) || 0;
    if (qty <= 0) { removeItem(id); return; }
    var cart = getCart();
    var item = cart.find(function (i) { return i.id === id; });
    if (!item) return;
    item.qty = Math.min(99, qty);
    saveCart(cart);
    updateUI();
  }

  function clearCart() {
    localStorage.removeItem(CART_KEY);
    updateUI();
  }

  function getCount() {
    return getCart().reduce(function (s, i) { return s + i.qty; }, 0);
  }

  function getSubtotal() {
    return getCart().reduce(function (s, i) { return s + (i.price * i.qty); }, 0);
  }

  // ── Format ───────────────────────────────────────────────────

  function formatPrice(value) {
    return value.toLocaleString('pt-PT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' Kz';
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Render ───────────────────────────────────────────────────

  function updateUI() {
    var cart = getCart();
    var count = getCount();

    // Header badges
    document.querySelectorAll('.js-cart-count').forEach(function (el) {
      el.textContent = count > 99 ? '99+' : count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
    document.querySelectorAll('.js-cart-total').forEach(function (el) {
      el.textContent = count > 0 ? formatPrice(getSubtotal()) : '0,00 Kz';
    });

    // Drawer meta
    var meta = document.getElementById('cartDrawerCount');
    if (meta) meta.textContent = count + (count === 1 ? ' produto' : ' produtos');

    // Reflete o estado do carrinho nos botões "Adicionar" (vira +/- stepper)
    syncAddControls();

    var empty = document.getElementById('cartEmpty');
    var itemsList = document.getElementById('cartItems');
    var footer = document.getElementById('cartFooter');
    if (!empty || !itemsList) return;

    if (cart.length === 0) {
      empty.style.display = 'flex';
      itemsList.style.display = 'none';
      if (footer) footer.style.display = 'none';
    } else {
      empty.style.display = 'none';
      itemsList.style.display = 'block';
      if (footer) footer.style.display = 'block';
      renderItems(cart, itemsList);
      var sub = document.getElementById('cartSubtotal');
      if (sub) sub.textContent = formatPrice(getSubtotal());
    }
  }

  function renderItems(cart, list) {
    list.innerHTML = cart.map(function (item) {
      return '<li class="cart-item" data-id="' + escHtml(item.id) + '">' +
        '<img class="cart-item__img" src="' + escHtml(item.image || '') + '"' +
          ' alt="' + escHtml(item.name) + '" onerror="this.style.display=\'none\'">' +
        '<div class="cart-item__details">' +
          '<a href="' + escHtml(item.url || '/') + '" class="cart-item__name">' + escHtml(item.name) + '</a>' +
          '<div class="cart-item__price">' + (item.priceFormatted || formatPrice(item.price)) + '</div>' +
          '<div class="cart-item__qty">' +
            '<button class="cart-item__qty-btn" data-action="decrease" data-id="' + escHtml(item.id) + '">&#8722;</button>' +
            '<span class="cart-item__qty-val">' + item.qty + '</span>' +
            '<button class="cart-item__qty-btn" data-action="increase" data-id="' + escHtml(item.id) + '">+</button>' +
          '</div>' +
        '</div>' +
        '<button class="cart-item__remove" data-id="' + escHtml(item.id) + '" title="Remover">&times;</button>' +
      '</li>';
    }).join('');

    list.querySelectorAll('.cart-item__qty-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var delta = btn.dataset.action === 'increase' ? 1 : -1;
        changeQty(btn.dataset.id, delta);
      });
    });

    list.querySelectorAll('.cart-item__remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        removeItem(btn.dataset.id);
      });
    });
  }

  // ── Add-to-cart controls (botão ↔ stepper) ───────────────────
  // Cada botão .js-add-to-cart vira um stepper (− qty +) quando o produto
  // está no carrinho, e volta a botão quando é removido. Reflete sempre o
  // estado real do carrinho — inclusive ao recarregar a página.

  function syncAddControls() {
    var cart = getCart();
    document.querySelectorAll('.js-add-to-cart').forEach(function (btn) {
      var id = btn.dataset.id;
      var item = cart.find(function (i) { return i.id === id; });
      var style = btn.dataset.cartStyle || 'full';
      var stepper = btn.nextElementSibling &&
        btn.nextElementSibling.classList &&
        btn.nextElementSibling.classList.contains('cart-stepper')
          ? btn.nextElementSibling : null;

      if (item) {
        if (!stepper) {
          stepper = document.createElement('div');
          stepper.className = 'cart-stepper cart-stepper--' + style;
          btn.parentNode.insertBefore(stepper, btn.nextSibling);
        }
        stepper.dataset.id = id;
        stepper.innerHTML =
          '<button type="button" class="cart-stepper__btn" data-cart-action="dec" aria-label="Reduzir">&#8722;</button>' +
          '<span class="cart-stepper__val">' + item.qty + '</span>' +
          '<button type="button" class="cart-stepper__btn" data-cart-action="inc" aria-label="Aumentar">+</button>';
        btn.style.display = 'none';
      } else {
        if (stepper) stepper.parentNode.removeChild(stepper);
        btn.style.display = '';
      }
    });

    // Página de produto: esconder o seletor de quantidade e a pré-visualização
    // do total quando o produto já está no carrinho (o stepper passa a mandar).
    var addBtn = document.getElementById('btnAddToCart');
    if (addBtn) {
      var inCart = cart.some(function (i) { return i.id === addBtn.dataset.id; });
      var qw = document.getElementById('qtyWidget');
      var tw = document.getElementById('totalPriceWrap');
      if (qw) qw.style.display = inCart ? 'none' : '';
      if (inCart && tw) tw.classList.add('d-none');

      // Link explícito "Remover do carrinho" (só quando o produto está no carrinho)
      var slot = document.getElementById('cartRemoveSlot');
      if (slot) {
        slot.innerHTML = inCart
          ? '<button type="button" class="cart-remove-link js-cart-remove" data-id="' +
              escHtml(addBtn.dataset.id) + '"><i class="fas fa-trash-alt"></i> Remover do carrinho</button>'
          : '';
      }
    }
  }

  // ── Drawer ───────────────────────────────────────────────────

  function openDrawer() {
    var drawer = document.getElementById('cartDrawer');
    var overlay = document.getElementById('cartDrawerOverlay');
    if (!drawer) return;
    drawer.classList.add('is-open');
    if (overlay) overlay.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-drawer-open');
  }

  function closeDrawer() {
    var drawer = document.getElementById('cartDrawer');
    var overlay = document.getElementById('cartDrawerOverlay');
    if (!drawer) return;
    drawer.classList.remove('is-open');
    if (overlay) overlay.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-drawer-open');
  }

  // ── Floating Button ──────────────────────────────────────────

  function initFloating() {
    var floating = document.getElementById('floatingCart');
    if (!floating) return;
    function sync() {
      if (window.innerWidth >= 1200 && window.scrollY > 320) {
        floating.classList.add('is-visible');
      } else {
        floating.classList.remove('is-visible');
      }
    }
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync, { passive: true });
    sync();
  }

  // ── Init ─────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    updateUI();
    initFloating();

    document.addEventListener('click', function (e) {
      if (e.target.closest('.js-add-to-cart')) {
        e.preventDefault();
        var btn = e.target.closest('.js-add-to-cart');
        var qty = parseInt(btn.dataset.qty) || 1;
        addItem({
          id: btn.dataset.id,
          name: btn.dataset.name,
          price: parseFloat(btn.dataset.price) || 0,
          priceFormatted: btn.dataset.priceFormatted,
          image: btn.dataset.image || '',
          url: btn.dataset.url || '/'
        }, qty);
        return;
      }
      if (e.target.closest('.js-buy-now')) {
        e.preventDefault();
        var btn = e.target.closest('.js-buy-now');
        var qty = parseInt(btn.dataset.qty) || 1;
        addItem({
          id: btn.dataset.id,
          name: btn.dataset.name,
          price: parseFloat(btn.dataset.price) || 0,
          priceFormatted: btn.dataset.priceFormatted,
          image: btn.dataset.image || '',
          url: btn.dataset.url || '/'
        }, qty);
        window.location.href = '/checkout';
        return;
      }
      // +/- nos steppers que substituem o botão "Adicionar"
      var stepBtn = e.target.closest('.cart-stepper__btn');
      if (stepBtn) {
        e.preventDefault();
        var stepper = stepBtn.closest('.cart-stepper');
        if (stepper) {
          changeQty(stepper.dataset.id, stepBtn.dataset.cartAction === 'inc' ? 1 : -1);
        }
        return;
      }
      var rmBtn = e.target.closest('.js-cart-remove');
      if (rmBtn) {
        e.preventDefault();
        removeItem(rmBtn.dataset.id);
        return;
      }
      if (e.target.closest('.js-cart-clear')) {
        e.preventDefault();
        if (getCount() === 0) return;
        var ask = (window.ui && window.ui.confirm)
          ? window.ui.confirm('Esta ação remove todos os produtos do carrinho.', {
              title: 'Esvaziar carrinho?', okText: 'Esvaziar', danger: true,
            })
          : Promise.resolve(true);
        ask.then(function (ok) { if (ok) clearCart(); });
        return;
      }
      if (e.target.closest('.js-cart-continue')) {
        e.preventDefault();
        closeDrawer();
        return;
      }
      if (e.target.closest('.js-cart-drawer-trigger')) {
        e.preventDefault();
        openDrawer();
        return;
      }
      if (e.target.closest('#cartDrawerClose')) {
        closeDrawer();
        return;
      }
      if (e.target.closest('#cartDrawerOverlay')) {
        closeDrawer();
        return;
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });
  });

  // ── Public API ───────────────────────────────────────────────

  window.cart = {
    addItem: addItem,
    removeItem: removeItem,
    changeQty: changeQty,
    setQty: setQty,
    clearCart: clearCart,
    getCart: getCart,
    getCount: getCount,
    getSubtotal: getSubtotal,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    updateUI: updateUI,
    formatPrice: formatPrice
  };
})();
