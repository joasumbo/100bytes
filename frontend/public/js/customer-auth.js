// Customer auth management for 100bytes storefront
(function() {
  const API_BASE = '/api/customers';
  
  // ──────────────────────────────────────
  // Modal Management
  // ──────────────────────────────────────
  
  function showLoginModal() {
    const modal = document.getElementById('customerLoginModal');
    if (modal) modal.style.display = 'block';
  }
  
  function showRegisterModal() {
    const modal = document.getElementById('customerRegisterModal');
    if (modal) modal.style.display = 'block';
  }
  
  function closeModals() {
    document.querySelectorAll('.customer-modal').forEach(m => m.style.display = 'none');
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
    await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      credentials: 'include',
    });
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
    // Close modal on X or Escape
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', closeModals);
    });
    
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModals();
    });
    
    // Click outside modal to close
    document.querySelectorAll('.customer-modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModals();
      });
    });
    
    // Login form submission
    const loginForm = document.getElementById('customerLoginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const btn = loginForm.querySelector('button');
        const originalText = btn.textContent;
        
        try {
          btn.disabled = true;
          btn.textContent = 'Entrando...';
          await login(email, password);
          closeModals();
          window.location.reload();
        } catch (err) {
          alert('Erro: ' + err.message);
        } finally {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      });
    }
    
    // Register form submission
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
        
        if (password !== confirmPassword) {
          alert('As senhas não coincidem');
          return;
        }
        
        try {
          btn.disabled = true;
          btn.textContent = 'Criando conta...';
          await register(name, phone, email, password);
          closeModals();
          window.location.reload();
        } catch (err) {
          alert('Erro: ' + err.message);
        } finally {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      });
    }
    
    // Logout
    document.querySelectorAll('[data-customer-logout]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        await logout();
      });
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
  };
})();
