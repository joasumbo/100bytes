// Customer auth management for 100bytes storefront
(function() {
  const API_BASE = '/api/customers';
  const FAV_STORAGE_KEY = 'fav100_products';
  let currentUser = null;
  let favoriteIds = new Set();

  // ──────────────────────────────────────
  // LocalStorage Favorites
  // ──────────────────────────────────────

  function getLocalFavs() {
    try { return JSON.parse(localStorage.getItem(FAV_STORAGE_KEY)) || []; }
    catch { return []; }
  }

  function addLocalFav(data) {
    const favs = getLocalFavs().filter(f => f.id !== data.id);
    favs.unshift({ ...data, addedAt: Date.now() });
    localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(favs.slice(0, 50)));
    updateFavBadge();
  }

  function removeLocalFav(id) {
    const favs = getLocalFavs().filter(f => f.id !== id);
    localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(favs));
    updateFavBadge();
  }

  function clearLocalFavs() {
    localStorage.removeItem(FAV_STORAGE_KEY);
  }

  // ──────────────────────────────────────
  // Favorites Badge & Popup
  // ──────────────────────────────────────

  function updateFavBadge() {
    const badge = document.getElementById('favBadge');
    if (!badge) return;
    const count = getLocalFavs().length;
    if (count > 0) {
      badge.textContent = count > 9 ? '9+' : count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  function renderFavPopup() {
    const body = document.getElementById('favDropdownBody');
    if (!body) return;
    const favs = getLocalFavs().slice(0, 3);
    if (favs.length === 0) {
      body.innerHTML = '<div style="padding:24px;text-align:center;color:#999;font-size:13px;">Nenhum favorito ainda</div>';
      return;
    }
    body.innerHTML = favs.map(f => `
      <a href="${f.url || '#'}" style="display:flex;align-items:center;gap:10px;padding:10px 16px;text-decoration:none;color:#333;border-bottom:1px solid #f8f8f8;"
         onmouseenter="this.style.background='#fafafa'" onmouseleave="this.style.background=''">
        <img src="${f.image || ''}" alt="${f.name || ''}"
             style="width:46px;height:46px;object-fit:contain;border-radius:6px;border:1px solid #eee;flex-shrink:0;"
             onerror="this.style.display='none'">
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${f.name || ''}</div>
          <div style="font-size:12px;color:#F57C00;font-weight:600;margin-top:2px;">${f.price || ''}</div>
        </div>
      </a>
    `).join('');
  }

  function initFavPopup() {
    const btn = document.getElementById('favHeaderBtn');
    const dropdown = document.getElementById('favDropdown');
    if (!btn || !dropdown) return;

    updateFavBadge();

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!currentUser) { showLoginModal(); return; }
      const isOpen = dropdown.style.display !== 'none';
      if (isOpen) {
        dropdown.style.display = 'none';
      } else {
        renderFavPopup();
        dropdown.style.display = 'block';
      }
    });

    document.addEventListener('click', (e) => {
      if (dropdown.style.display !== 'none' && !btn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }

  // ──────────────────────────────────────
  // Modal Management
  // ──────────────────────────────────────

  function showLoginModal() {
    const modal = document.getElementById('customerLoginModal');
    if (modal) modal.style.display = 'flex';
  }

  function showRegisterModal() {
    const modal = document.getElementById('customerRegisterModal');
    if (modal) modal.style.display = 'flex';
  }

  function closeModals() {
    document.querySelectorAll('.customer-modal').forEach(m => m.style.display = 'none');
    clearError('loginError');
    clearError('registerError');
  }

  function showError(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
  }

  function clearError(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = '';
    el.style.display = 'none';
  }

  function bindPasswordToggle() {
    document.querySelectorAll('.toggle-password').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const input = document.getElementById(btn.getAttribute('data-target'));
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
          input.type = 'text';
          icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
          input.type = 'password';
          icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
      });
    });
  }

  function setFavoriteButtonState(button, isFavorite) {
    const icon = button.querySelector('i');
    const label = button.querySelector('[data-fav-label]');
    if (icon) {
      icon.classList.toggle('far', !isFavorite);
      icon.classList.toggle('fas', isFavorite);
      icon.style.color = isFavorite ? '#F57C00' : '';
    }
    if (label) {
      label.textContent = isFavorite ? 'Remover dos favoritos' : 'Adicionar à lista de desejos';
    }
    button.setAttribute('data-favorited', isFavorite ? '1' : '0');
  }

  function bindRequireLoginLinks() {
    document.querySelectorAll('[data-require-login]').forEach((link) => {
      link.addEventListener('click', (e) => {
        if (!currentUser) { e.preventDefault(); showLoginModal(); }
      });
    });
  }

  async function bindFavoriteButtons() {
    let ids = [];
    if (currentUser) {
      ids = await getFavorites();
      favoriteIds = new Set(ids);
      // Sync localStorage: keep only what server knows about
      const synced = getLocalFavs().filter(f => ids.includes(f.id));
      localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(synced));
    } else {
      favoriteIds = new Set();
    }

    document.querySelectorAll('.js-favorite-toggle').forEach((btn) => {
      const productId = btn.getAttribute('data-product-id');
      if (!productId) return;

      setFavoriteButtonState(btn, favoriteIds.has(productId));

      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!currentUser) { showLoginModal(); return; }

        const isFav = favoriteIds.has(productId);
        const productData = {
          id: productId,
          name: btn.getAttribute('data-product-name') || '',
          image: btn.getAttribute('data-product-image') || '',
          price: btn.getAttribute('data-product-price') || '',
          url: btn.getAttribute('data-product-url') || '#',
        };
        try {
          btn.style.pointerEvents = 'none';
          if (isFav) {
            await removeFavorite(productId);
            favoriteIds.delete(productId);
            removeLocalFav(productId);
            setFavoriteButtonState(btn, false);
          } else {
            await addFavorite(productId);
            favoriteIds.add(productId);
            addLocalFav(productData);
            setFavoriteButtonState(btn, true);
          }
        } catch (err) {
          console.error('Erro ao guardar favorito:', err.message);
        } finally {
          btn.style.pointerEvents = '';
        }
      });
    });

    updateFavBadge();
  }

  // ──────────────────────────────────────
  // Auth API Calls
  // ──────────────────────────────────────

  async function register(name, phone, email, password) {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email, password }),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Erro no registo');
    }
    return res.json();
  }

  async function login(email, password) {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Credenciais inválidas');
    }
    return res.json();
  }

  async function logout() {
    clearLocalFavs();
    await fetch(`${API_BASE}/logout`, { method: 'POST', credentials: 'include' });
    window.location.reload();
  }

  async function getCurrentUser() {
    try {
      const res = await fetch(`${API_BASE}/me`, { credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json();
      return data.customer;
    } catch {
      return null;
    }
  }

  async function addFavorite(productId) {
    const res = await fetch(`${API_BASE}/favorites/${productId}`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Erro ao adicionar favorito');
    return res.json();
  }

  async function removeFavorite(productId) {
    const res = await fetch(`${API_BASE}/favorites/${productId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Erro ao remover favorito');
    return res.json();
  }

  async function getFavorites() {
    try {
      const res = await fetch(`${API_BASE}/favorites`, { credentials: 'include' });
      if (!res.ok) return [];
      const data = await res.json();
      return data.favorites || [];
    } catch {
      return [];
    }
  }

  // ──────────────────────────────────────
  // Event Listeners
  // ──────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function() {
    bindPasswordToggle();

    document.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', closeModals);
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModals();
    });

    document.querySelectorAll('.customer-modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModals();
      });
    });

    const loginForm = document.getElementById('customerLoginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const btn = loginForm.querySelector('button');
        const originalText = btn.textContent;
        clearError('loginError');
        try {
          btn.disabled = true;
          btn.textContent = 'Entrando...';
          await login(email, password);
          closeModals();
          window.location.reload();
        } catch (err) {
          showError('loginError', err.message || 'Email ou senha incorretos.');
        } finally {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      });
    }

    const registerForm = document.getElementById('customerRegisterForm');
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const phone = document.getElementById('registerPhone').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const btn = registerForm.querySelector('button');
        const originalText = btn.textContent;
        clearError('registerError');
        if (password !== confirmPassword) {
          showError('registerError', 'As senhas não coincidem.');
          return;
        }
        try {
          btn.disabled = true;
          btn.textContent = 'Criando conta...';
          await register(name, phone, email, password);
          closeModals();
          window.location.reload();
        } catch (err) {
          showError('registerError', err.message || 'Erro ao criar conta.');
        } finally {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      });
    }

    document.querySelectorAll('[data-customer-logout]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        await logout();
      });
    });

    // Auto-open login if redirected from protected page
    if (new URLSearchParams(location.search).get('openLogin') === '1') {
      showLoginModal();
    }

    getCurrentUser()
      .then((user) => {
        currentUser = user;
        bindRequireLoginLinks();
        return bindFavoriteButtons();
      })
      .then(() => { initFavPopup(); })
      .catch(() => {
        currentUser = null;
        bindRequireLoginLinks();
        bindFavoriteButtons().then(() => initFavPopup());
      });
  });

  // ──────────────────────────────────────
  // Global exports
  // ──────────────────────────────────────

  window.customerAuth = {
    showLoginModal,
    showRegisterModal,
    closeModals,
    register,
    login,
    logout,
    getCurrentUser,
    addFavorite,
    removeFavorite,
    getFavorites,
    getLocalFavs,
    removeLocalFav,
  };
})();
