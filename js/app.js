// ============================================================
//  ElectroMart — Main Application Script
//  Firebase Compat SDK loaded from CDN; CONFIG from config.js
// ============================================================

(function () {
  'use strict';

  // ── Firebase Init ──────────────────────────────────────────
  firebase.initializeApp(CONFIG.firebase);
  const db = firebase.firestore();
  const auth = firebase.auth();

  // ── State ──────────────────────────────────────────────────
  let allProducts = [];
  let cart = [];
  let isAdminAuthenticated = false;
  let productsLoaded = false;
  let adminDataLoaded = false;

  // ── Utility: HTML Escape ───────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(str).replace(/[&<>"']/g, (c) => map[c]);
  }

  // ── Utility: Disable / Enable Button ──────────────────────
  function setButtonLoading(btn, loading, originalText) {
    if (loading) {
      btn.disabled = true;
      btn.dataset.originalText = btn.textContent;
      btn.textContent = 'Please wait…';
    } else {
      btn.disabled = false;
      btn.textContent = originalText || btn.dataset.originalText || 'Submit';
    }
  }

  // ============================================================
  //  1. TOAST NOTIFICATIONS
  // ============================================================
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ============================================================
  //  2. THEME TOGGLE
  // ============================================================
  function initTheme() {
    const saved = localStorage.getItem('electromart-theme');
    if (saved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    updateThemeIcon();

    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', () => {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        if (isLight) {
          document.documentElement.removeAttribute('data-theme');
          localStorage.setItem('electromart-theme', 'dark');
        } else {
          document.documentElement.setAttribute('data-theme', 'light');
          localStorage.setItem('electromart-theme', 'light');
        }
        updateThemeIcon();
      });
    }
  }

  function updateThemeIcon() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    // In dark mode show sun (click → light); in light mode show moon (click → dark)
    btn.textContent = isLight ? '🌙' : '☀️';
  }

  // ============================================================
  //  3. ROUTER (Hash-based)
  // ============================================================
  function initRouter() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  function handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'about';
    const validViews = ['about', 'shop', 'admin'];
    const view = validViews.includes(hash) ? hash : 'about';

    // Hide all views
    document.querySelectorAll('.view').forEach((el) => el.classList.remove('active'));

    // Update nav-link active states
    document.querySelectorAll('.nav-link[data-view]').forEach((link) => {
      link.classList.toggle('active', link.getAttribute('data-view') === view);
    });

    if (view === 'admin') {
      if (isAdminAuthenticated) {
        showView('admin-view');
        if (!adminDataLoaded) loadAdminData();
      } else {
        showAdminModal();
      }
    } else if (view === 'shop') {
      showView('shop-view');
      if (!productsLoaded) {
        loadProducts();
        productsLoaded = true;
      }
    } else {
      showView('about-view');
    }
  }

  function showView(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  // ============================================================
  //  4. MOBILE NAV
  // ============================================================
  function initNavToggle() {
    const toggle = document.getElementById('nav-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) navLinks.classList.toggle('open');
      });
    }

    // Close mobile nav when a link is clicked
    document.querySelectorAll('.nav-link[data-view]').forEach((link) => {
      link.addEventListener('click', () => {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) navLinks.classList.remove('open');
      });
    });
  }

  // ============================================================
  //  5. SHOP — LOAD PRODUCTS
  // ============================================================
  async function loadProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    grid.innerHTML =
      '<div class="loading-container"><div class="spinner"></div><p>Loading products...</p></div>';

    try {
      const snapshot = await db.collection('components').orderBy('createdAt', 'desc').get();
      allProducts = [];
      snapshot.forEach((doc) => allProducts.push({ id: doc.id, ...doc.data() }));
      renderProducts(allProducts);
    } catch (err) {
      console.error('Error loading products:', err);
      grid.innerHTML =
        '<div class="products-empty"><div class="empty-icon">📦</div><p>No products available yet.</p></div>';
    }
  }

  // ============================================================
  //  6. SHOP — RENDER PRODUCTS
  // ============================================================
  function renderProducts(products) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    if (!products || products.length === 0) {
      grid.innerHTML =
        '<div class="products-empty"><div class="empty-icon">🔍</div><p>No products found.</p></div>';
      return;
    }

    grid.innerHTML = products
      .map(
        (product) => `
      <div class="product-card">
        <div class="product-image-wrap">
          ${
            product.imageUrl
              ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.title)}">`
              : '<div class="product-no-image">📷</div>'
          }
        </div>
        <div class="product-info">
          <div class="product-title">${escapeHtml(product.title)}</div>
          <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
          <div class="product-desc">${escapeHtml(product.description || '')}</div>
          <div class="product-actions">
            <button class="btn btn-primary btn-block btn-sm add-to-cart" data-id="${escapeHtml(product.id)}">🛒 Add to Cart</button>
          </div>
        </div>
      </div>
    `
      )
      .join('');

    // Attach add-to-cart listeners
    grid.querySelectorAll('.add-to-cart').forEach((btn) => {
      btn.addEventListener('click', () => addToCart(btn.dataset.id));
    });
  }

  // ============================================================
  //  7. SHOP — SEARCH
  // ============================================================
  function initSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;
    input.addEventListener('input', () => {
      const query = input.value.toLowerCase().trim();
      if (!query) {
        renderProducts(allProducts);
        return;
      }
      const filtered = allProducts.filter((p) =>
        (p.title || '').toLowerCase().includes(query)
      );
      renderProducts(filtered);
    });
  }

  // ============================================================
  //  8. CART
  // ============================================================
  function initCart() {
    // Cart toggle
    const cartToggle = document.getElementById('cart-toggle');
    if (cartToggle) {
      cartToggle.addEventListener('click', openCartSidebar);
    }

    // Cart close
    const cartClose = document.getElementById('cart-close');
    if (cartClose) {
      cartClose.addEventListener('click', closeCartSidebar);
    }

    // Overlay close
    const overlay = document.getElementById('cart-overlay');
    if (overlay) {
      overlay.addEventListener('click', closeCartSidebar);
    }

    // Checkout
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', handleCheckout);
    }

    // Order modal close
    const orderClose = document.getElementById('order-modal-close');
    if (orderClose) {
      orderClose.addEventListener('click', () => {
        const modal = document.getElementById('order-modal');
        if (modal) modal.classList.remove('active');
      });
    }

    updateCartUI();
  }

  function addToCart(productId) {
    const product = allProducts.find((p) => p.id === productId);
    if (!product) return;

    const existing = cart.find((item) => item.product.id === productId);
    if (existing) {
      existing.quantity++;
    } else {
      cart.push({ product, quantity: 1 });
    }

    updateCartUI();
    showToast(`${product.title} added to cart`);
  }

  function updateCartUI() {
    // Update badge
    const badge = document.getElementById('cart-count');
    if (badge) {
      const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
      badge.textContent = totalItems;
      badge.classList.toggle('show', totalItems > 0);
    }

    // Render cart items
    const cartItemsEl = document.getElementById('cart-items');
    if (cartItemsEl) {
      if (cart.length === 0) {
        cartItemsEl.innerHTML =
          '<div class="cart-empty"><div class="cart-empty-icon">🛒</div><p>Your cart is empty</p></div>';
      } else {
        cartItemsEl.innerHTML = cart
          .map(
            (item) => `
          <div class="cart-item">
            <div class="cart-item-image">
              ${item.product.imageUrl ? `<img src="${escapeHtml(item.product.imageUrl)}">` : '📷'}
            </div>
            <div class="cart-item-info">
              <div class="cart-item-name">${escapeHtml(item.product.title)}</div>
              <div class="cart-item-price">$${(item.product.price * item.quantity).toFixed(2)}</div>
            </div>
            <div class="cart-item-controls">
              <button class="cart-qty-btn" data-action="minus" data-id="${escapeHtml(item.product.id)}">−</button>
              <span class="cart-qty">${item.quantity}</span>
              <button class="cart-qty-btn" data-action="plus" data-id="${escapeHtml(item.product.id)}">+</button>
            </div>
          </div>
        `
          )
          .join('');

        // Wire up qty buttons
        cartItemsEl.querySelectorAll('.cart-qty-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            const idx = cart.findIndex((item) => item.product.id === id);
            if (idx === -1) return;

            if (action === 'plus') {
              cart[idx].quantity++;
            } else if (action === 'minus') {
              cart[idx].quantity--;
              if (cart[idx].quantity <= 0) {
                cart.splice(idx, 1);
              }
            }
            updateCartUI();
          });
        });
      }
    }

    // Update total
    const totalEl = document.getElementById('cart-total');
    if (totalEl) {
      const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      totalEl.textContent = total.toFixed(2);
    }
  }

  // ============================================================
  //  9. CART SIDEBAR TOGGLE
  // ============================================================
  function openCartSidebar() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('active');
  }

  function closeCartSidebar() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
  }

  // ============================================================
  //  10. CHECKOUT
  // ============================================================
  async function handleCheckout() {
    if (cart.length === 0) {
      showToast('Your cart is empty', 'error');
      return;
    }

    const btn = document.getElementById('checkout-btn');
    setButtonLoading(btn, true);

    try {
      await db.collection('orders').add({
        items: cart.map((i) => ({
          title: i.product.title,
          price: i.product.price,
          quantity: i.quantity,
          productId: i.product.id,
        })),
        total: cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });

      cart = [];
      updateCartUI();
      closeCartSidebar();

      const orderModal = document.getElementById('order-modal');
      if (orderModal) orderModal.classList.add('active');
    } catch (err) {
      console.error('Checkout error:', err);
      showToast('Checkout failed. Please try again.', 'error');
    } finally {
      setButtonLoading(btn, false, '💳 Checkout');
    }
  }

  // ============================================================
  //  11. ADMIN LOGIN
  // ============================================================
  function showAdminModal() {
    const modal = document.getElementById('admin-modal');
    const errorEl = document.getElementById('admin-error');
    const passInput = document.getElementById('admin-password-input');
    if (errorEl) { errorEl.textContent = ''; errorEl.style.display = 'none'; }
    if (passInput) passInput.value = '';
    if (modal) modal.classList.add('active');

    // Wire login button (only once)
    const loginBtn = document.getElementById('admin-login-btn');
    if (loginBtn && !loginBtn.dataset.wired) {
      loginBtn.dataset.wired = 'true';
      loginBtn.addEventListener('click', handleAdminLogin);

      // Allow Enter key
      if (passInput) {
        passInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') handleAdminLogin();
        });
      }
    }
  }

  async function handleAdminLogin() {
    const passInput = document.getElementById('admin-password-input');
    const errorEl = document.getElementById('admin-error');
    const loginBtn = document.getElementById('admin-login-btn');
    const passwordValue = passInput ? passInput.value.trim() : '';

    if (!passwordValue) {
      if (errorEl) { errorEl.textContent = 'Please enter a password.'; errorEl.style.display = 'block'; }
      return;
    }

    setButtonLoading(loginBtn, true);
    if (errorEl) { errorEl.textContent = ''; errorEl.style.display = 'none'; }

    try {
      const doc = await db.collection('admin').doc('config').get();
      if (doc.exists && doc.data().password === passwordValue) {
        isAdminAuthenticated = true;
        const modal = document.getElementById('admin-modal');
        if (modal) modal.classList.remove('active');
        showView('admin-view');
        loadAdminData();
      } else {
        if (errorEl) { errorEl.textContent = 'Incorrect password. Please try again.'; errorEl.style.display = 'block'; }
      }
    } catch (err) {
      console.error('Admin login error:', err);
      if (errorEl) { errorEl.textContent = 'Login failed. Please try again.'; errorEl.style.display = 'block'; }
    } finally {
      setButtonLoading(loginBtn, false, 'Login');
    }
  }

  // ============================================================
  //  ADMIN DATA LOADER
  // ============================================================
  function loadAdminData() {
    adminDataLoaded = true;
    loadOrders();
    loadComponents();
    initAdminTabs();
    initAddComponentForm();
    initEditModal();
  }

  // ============================================================
  //  12. ADMIN — ORDERS
  // ============================================================
  async function loadOrders() {
    const list = document.getElementById('orders-list');
    if (!list) return;
    list.innerHTML = '<div class="loading-container"><div class="spinner"></div></div>';

    try {
      const snapshot = await db.collection('orders').orderBy('timestamp', 'desc').get();
      if (snapshot.empty) {
        list.innerHTML =
          '<div class="products-empty"><div class="empty-icon">📋</div><p>No orders yet.</p></div>';
        return;
      }
      list.innerHTML = '';
      snapshot.forEach((doc) => {
        const order = doc.data();
        const date = order.timestamp
          ? order.timestamp.toDate().toLocaleString()
          : 'Pending';
        list.innerHTML += `
          <div class="order-card">
            <div class="order-header">
              <span class="order-id">#${doc.id.substring(0, 8).toUpperCase()}</span>
              <span class="order-date">${escapeHtml(date)}</span>
            </div>
            <div class="order-items-list">
              ${order.items
                .map(
                  (i) =>
                    `<div class="order-item-row"><span>${escapeHtml(i.title)} × ${i.quantity}</span><span>$${(i.price * i.quantity).toFixed(2)}</span></div>`
                )
                .join('')}
            </div>
            <div class="order-total">Total: $${order.total.toFixed(2)}</div>
          </div>
        `;
      });
    } catch (err) {
      console.error('Error loading orders:', err);
      list.innerHTML =
        '<div class="products-empty"><div class="empty-icon">⚠️</div><p>Failed to load orders.</p></div>';
    }
  }

  // ============================================================
  //  13. ADMIN — ADD COMPONENT
  // ============================================================
  function initAddComponentForm() {
    const submitBtn = document.getElementById('comp-submit');
    if (!submitBtn || submitBtn.dataset.wired) return;
    submitBtn.dataset.wired = 'true';

    // Show filename on label when file selected
    const fileInput = document.getElementById('comp-image');
    const fileLabel = document.getElementById('comp-image-label');
    if (fileInput && fileLabel) {
      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files.length > 0) {
          fileLabel.textContent = fileInput.files[0].name;
          fileLabel.classList.add('has-file');
        } else {
          fileLabel.textContent = 'Choose Image';
          fileLabel.classList.remove('has-file');
        }
      });
    }

    submitBtn.addEventListener('click', handleAddComponent);
  }

  async function handleAddComponent() {
    const titleInput = document.getElementById('comp-title');
    const priceInput = document.getElementById('comp-price');
    const descInput = document.getElementById('comp-desc');
    const imageInput = document.getElementById('comp-image');
    const submitBtn = document.getElementById('comp-submit');

    const title = titleInput ? titleInput.value.trim() : '';
    const price = priceInput ? priceInput.value.trim() : '';
    const description = descInput ? descInput.value.trim() : '';

    if (!title || !price) {
      showToast('Title and Price are required.', 'error');
      return;
    }

    if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      showToast('Please enter a valid price.', 'error');
      return;
    }

    setButtonLoading(submitBtn, true);

    try {
      let imageUrl = '';
      if (imageInput && imageInput.files && imageInput.files.length > 0) {
        imageUrl = await uploadImageToGitHub(imageInput.files[0]);
      }

      await db.collection('components').add({
        title,
        price: parseFloat(price),
        description,
        imageUrl: imageUrl || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // Clear form
      if (titleInput) titleInput.value = '';
      if (priceInput) priceInput.value = '';
      if (descInput) descInput.value = '';
      if (imageInput) imageInput.value = '';
      const fileLabel = document.getElementById('comp-image-label');
      if (fileLabel) {
        fileLabel.textContent = 'Choose Image';
        fileLabel.classList.remove('has-file');
      }

      showToast('Component added successfully!');
      loadComponents();
      // Also refresh products if they were loaded
      productsLoaded = false;
    } catch (err) {
      console.error('Error adding component:', err);
      showToast('Failed to add component.', 'error');
    } finally {
      setButtonLoading(submitBtn, false, '➕ Add Component');
    }
  }

  // ============================================================
  //  14. ADMIN — MANAGE COMPONENTS
  // ============================================================
  async function loadComponents() {
    const list = document.getElementById('components-list');
    if (!list) return;
    list.innerHTML = '<div class="loading-container"><div class="spinner"></div></div>';

    try {
      const snapshot = await db.collection('components').orderBy('createdAt', 'desc').get();
      if (snapshot.empty) {
        list.innerHTML =
          '<div class="products-empty"><div class="empty-icon">📦</div><p>No components added yet.</p></div>';
        return;
      }
      list.innerHTML = '';
      snapshot.forEach((doc) => {
        const comp = doc.data();
        list.innerHTML += `
          <div class="component-row">
            <div class="component-thumb">
              ${comp.imageUrl ? `<img src="${escapeHtml(comp.imageUrl)}">` : '📷'}
            </div>
            <div class="component-info">
              <div class="component-name">${escapeHtml(comp.title)}</div>
              <div class="component-meta">$${parseFloat(comp.price).toFixed(2)}</div>
            </div>
            <div class="component-actions">
              <button class="btn btn-secondary btn-sm edit-comp" data-id="${doc.id}">✏️ Edit</button>
              <button class="btn btn-danger btn-sm delete-comp" data-id="${doc.id}">🗑️</button>
            </div>
          </div>
        `;
      });

      // Attach event listeners for edit buttons
      list.querySelectorAll('.edit-comp').forEach((btn) => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id));
      });

      // Attach event listeners for delete buttons
      list.querySelectorAll('.delete-comp').forEach((btn) => {
        btn.addEventListener('click', () => deleteComponent(btn.dataset.id));
      });
    } catch (err) {
      console.error('Error loading components:', err);
      list.innerHTML =
        '<div class="products-empty"><div class="empty-icon">⚠️</div><p>Failed to load components.</p></div>';
    }
  }

  // ============================================================
  //  15. EDIT COMPONENT
  // ============================================================
  function initEditModal() {
    const cancelBtn = document.getElementById('edit-cancel');
    if (cancelBtn && !cancelBtn.dataset.wired) {
      cancelBtn.dataset.wired = 'true';
      cancelBtn.addEventListener('click', closeEditModal);
    }

    const submitBtn = document.getElementById('edit-submit');
    if (submitBtn && !submitBtn.dataset.wired) {
      submitBtn.dataset.wired = 'true';
      submitBtn.addEventListener('click', handleEditSubmit);
    }

    // Show filename on label when file selected
    const editFileInput = document.getElementById('edit-image');
    const editFileLabel = document.getElementById('edit-image-label');
    if (editFileInput && editFileLabel && !editFileInput.dataset.wired) {
      editFileInput.dataset.wired = 'true';
      editFileInput.addEventListener('change', () => {
        if (editFileInput.files && editFileInput.files.length > 0) {
          editFileLabel.textContent = editFileInput.files[0].name;
          editFileLabel.classList.add('has-file');
        } else {
          editFileLabel.textContent = 'Choose New Image';
          editFileLabel.classList.remove('has-file');
        }
      });
    }
  }

  async function openEditModal(docId) {
    const modal = document.getElementById('edit-modal');
    if (!modal) return;

    try {
      const doc = await db.collection('components').doc(docId).get();
      if (!doc.exists) {
        showToast('Component not found.', 'error');
        return;
      }

      const data = doc.data();
      const idField = document.getElementById('edit-id');
      const titleField = document.getElementById('edit-title');
      const priceField = document.getElementById('edit-price');
      const descField = document.getElementById('edit-desc');
      const imageInput = document.getElementById('edit-image');
      const imageLabel = document.getElementById('edit-image-label');

      if (idField) idField.value = docId;
      if (titleField) titleField.value = data.title || '';
      if (priceField) priceField.value = data.price || '';
      if (descField) descField.value = data.description || '';
      if (imageInput) imageInput.value = '';
      if (imageLabel) {
        imageLabel.textContent = 'Choose New Image';
        imageLabel.classList.remove('has-file');
      }

      modal.classList.add('active');
    } catch (err) {
      console.error('Error opening edit modal:', err);
      showToast('Failed to load component data.', 'error');
    }
  }

  function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) modal.classList.remove('active');
  }

  async function handleEditSubmit() {
    const idField = document.getElementById('edit-id');
    const titleField = document.getElementById('edit-title');
    const priceField = document.getElementById('edit-price');
    const descField = document.getElementById('edit-desc');
    const imageInput = document.getElementById('edit-image');
    const submitBtn = document.getElementById('edit-submit');

    const docId = idField ? idField.value : '';
    const title = titleField ? titleField.value.trim() : '';
    const price = priceField ? priceField.value.trim() : '';
    const description = descField ? descField.value.trim() : '';

    if (!docId || !title || !price) {
      showToast('Title and Price are required.', 'error');
      return;
    }

    if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      showToast('Please enter a valid price.', 'error');
      return;
    }

    setButtonLoading(submitBtn, true);

    try {
      const updateData = {
        title,
        price: parseFloat(price),
        description,
      };

      if (imageInput && imageInput.files && imageInput.files.length > 0) {
        updateData.imageUrl = await uploadImageToGitHub(imageInput.files[0]);
      }

      await db.collection('components').doc(docId).update(updateData);

      closeEditModal();
      showToast('Component updated successfully!');
      loadComponents();
      // Mark products as stale so they reload when shop is visited
      productsLoaded = false;
    } catch (err) {
      console.error('Error updating component:', err);
      showToast('Failed to update component.', 'error');
    } finally {
      setButtonLoading(submitBtn, false, '💾 Save Changes');
    }
  }

  // ============================================================
  //  16. DELETE COMPONENT
  // ============================================================
  async function deleteComponent(docId) {
    if (!confirm('Are you sure you want to delete this component?')) return;

    try {
      await db.collection('components').doc(docId).delete();
      showToast('Component deleted.');
      loadComponents();
      productsLoaded = false;
    } catch (err) {
      console.error('Error deleting component:', err);
      showToast('Failed to delete component.', 'error');
    }
  }

  // ============================================================
  //  17. GITHUB IMAGE UPLOAD
  // ============================================================
  async function uploadImageToGitHub(file) {
    const base64 = await fileToBase64(file);
    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const path = `${CONFIG.github.path}/${filename}`;
    const url = `https://api.github.com/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/contents/${path}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `token ${CONFIG.github.tokenPart1}${CONFIG.github.tokenPart2}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Upload ${filename}`,
        content: base64,
        branch: CONFIG.github.branch,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('GitHub upload error:', errorBody);
      throw new Error('GitHub upload failed');
    }

    const data = await response.json();
    return data.content.download_url;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ============================================================
  //  19. ADMIN TABS
  // ============================================================
  function initAdminTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    if (!tabs.length) return;

    tabs.forEach((tab) => {
      if (tab.dataset.wired) return;
      tab.dataset.wired = 'true';

      tab.addEventListener('click', () => {
        // Remove active from all tabs and panels
        document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
        document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('active'));

        // Activate clicked tab
        tab.classList.add('active');

        // Determine corresponding panel
        const tabId = tab.id; // e.g. "admin-orders-tab"
        const panelId = tabId.replace('-tab', '-panel');
        const panel = document.getElementById(panelId);
        if (panel) panel.classList.add('active');

        // Refresh data when switching tabs
        if (tabId === 'admin-orders-tab') loadOrders();
        if (tabId === 'admin-manage-tab') loadComponents();
      });
    });
  }

  // ============================================================
  //  20. INITIALIZATION
  // ============================================================
  // Admin logout
  function initAdminLogout() {
    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        isAdminAuthenticated = false;
        adminDataLoaded = false;
        window.location.hash = '#about';
        showToast('Logged out of admin panel.');
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initRouter();
    initNavToggle();
    initCart();
    initSearch();
    initAdminLogout();
  });
})();
