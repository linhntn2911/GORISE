(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const login = $('[data-login-card]');
  const denied = $('[data-denied-card]');
  const workspace = $('[data-workspace]');
  const identity = $('[data-identity]');

  const toast = (message) => {
    const node = $('[data-toast]');
    if (!node) return;
    node.textContent = message;
    node.classList.add('is-visible');
    setTimeout(() => node.classList.remove('is-visible'), 3200);
  };

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&':'&#38;', '<':'&#60;', '>':'&#62;', "'":'&#39;', '"':'&#34;' }[c]));
  const money = (value) => value == null || value === '' ? '0₫' : `${Number(value).toLocaleString('vi-VN')}₫`;
  const date = (value) => value ? new Date(value).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  const number = (value) => Number(value || 0).toLocaleString('vi-VN');

  async function api(url, options = {}) {
    const response = await fetch(url, { credentials: 'include', ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Có lỗi xảy ra.');
    return data;
  }

  // Chuyển tab trong CMS
  function showPanel(name) {
    $$('.cms-nav [data-tab]').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === name));
    $$('.cms-panel').forEach((p) => p.classList.toggle('is-active', p.dataset.panel === name));

    if (name === 'overview') loadDashboardStats();
    if (name === 'accounts') loadAccounts();
    if (name === 'transactions') loadTransactions();
    if (name === 'income') loadIncome();
    if (name === 'reviews') loadReviews();
    if (name === 'articles') loadArticles();
    if (name === 'products') loadProducts();
    if (name === 'videos') loadAnalytics();
  }

  // =========================================================================
  // 1. DASHBOARD & STATS
  // =========================================================================
  async function loadDashboardStats() {
    try {
      const { stats } = await api('/api/admin/dashboard/stats');
      if (!stats) return;

      $('[data-dash="totalRevenue"]')?.replaceChildren(document.createTextNode(money(stats.totalRevenue)));
      $('[data-dash="monthRevenue"]')?.replaceChildren(document.createTextNode(money(stats.monthRevenue)));
      $('[data-dash="totalOrders"]')?.replaceChildren(document.createTextNode(number(stats.totalOrders)));
      $('[data-dash="completedOrders"]')?.replaceChildren(document.createTextNode(number(stats.completedOrders)));
      $('[data-dash="newOrders"]')?.replaceChildren(document.createTextNode(number(stats.newOrders)));
      $('[data-dash="totalCustomers"]')?.replaceChildren(document.createTextNode(number(stats.totalCustomers)));
      $('[data-dash="activeCustomers"]')?.replaceChildren(document.createTextNode(number(stats.activeCustomers)));
      $('[data-dash="avgRating"]')?.replaceChildren(document.createTextNode(`${stats.avgRating} ★`));
      $('[data-dash="totalReviews"]')?.replaceChildren(document.createTextNode(number(stats.totalReviews)));

      // Render 5 giao dịch gần đây
      const ordersList = $('[data-dash-orders-list]');
      if (ordersList) {
        ordersList.innerHTML = stats.recentOrders?.length ? stats.recentOrders.map((o) => `
          <tr>
            <td><b>${esc(o.order_code)}</b></td>
            <td>${esc(o.customer_name)}<small>${esc(o.customer_phone)}</small></td>
            <td><strong>${money(o.total_amount)}</strong></td>
            <td><span class="cms-status cms-status-${esc(o.payment_status)}">${o.payment_status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}</span></td>
            <td><span class="cms-status cms-status-${esc(o.order_status)}">${getOrderStatusName(o.order_status)}</span></td>
          </tr>
        `).join('') : '<tr><td colspan="5" class="cms-empty-cell">Chưa có giao dịch phát sinh.</td></tr>';
      }

      // Render 5 đánh giá gần đây
      const reviewsList = $('[data-dash-reviews-list]');
      if (reviewsList) {
        reviewsList.innerHTML = stats.recentReviews?.length ? stats.recentReviews.map((r) => `
          <tr>
            <td><b>${esc(r.customer_name)}</b></td>
            <td><span class="cms-stars">${'★'.repeat(r.rating || 5)}${'☆'.repeat(5 - (r.rating || 5))}</span></td>
            <td><div style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${esc(r.comment)}</div></td>
            <td><span class="cms-status cms-status-${esc(r.status)}">${r.status === 'approved' ? 'Hiển thị' : 'Đã ẩn'}</span></td>
          </tr>
        `).join('') : '<tr><td colspan="4" class="cms-empty-cell">Chưa có đánh giá nào.</td></tr>';
      }
    } catch (err) {
      toast('Lỗi tải Dashboard: ' + err.message);
    }
  }

  // =========================================================================
  // 2. QUẢN LÝ TÀI KHOẢN KHÁCH HÀNG
  // =========================================================================
  let cachedAccounts = [];
  async function loadAccounts() {
    try {
      const target = $('[data-accounts-list]');
      if (target) target.innerHTML = '<tr><td colspan="8" class="cms-empty-cell">Đang tải danh sách tài khoản…</td></tr>';
      const { accounts } = await api('/api/admin/accounts');
      cachedAccounts = accounts || [];
      renderAccountsList(cachedAccounts);
    } catch (err) {
      toast('Lỗi tải danh sách tài khoản: ' + err.message);
    }
  }

  function renderAccountsList(list) {
    const target = $('[data-accounts-list]');
    const countEl = $('[data-accounts-count]');
    if (countEl) countEl.textContent = String(list.length);
    if (!target) return;

    if (!list.length) {
      target.innerHTML = '<tr><td colspan="8" class="cms-empty-cell">Không tìm thấy tài khoản khách hàng nào.</td></tr>';
      return;
    }

    target.innerHTML = list.map((a) => `
      <tr>
        <td><b>@${esc(a.username || 'user')}</b></td>
        <td>${esc(a.full_name || '—')}</td>
        <td>${esc(a.phone || a.email || '—')}</td>
        <td><strong>${number(a.orders_count)}</strong> đơn</td>
        <td>${money(a.total_spent)}</td>
        <td>${date(a.created_at)}</td>
        <td><span class="cms-status cms-status-${a.is_active ? 'active' : 'locked'}">${a.is_active ? 'Hoạt động' : 'Đang khóa'}</span></td>
        <td class="cms-row-actions">
          <button data-toggle-account="${esc(a.id)}" data-current-active="${a.is_active ? '1' : '0'}" style="color: ${a.is_active ? '#dc2626' : '#16a34a'};">
            ${a.is_active ? 'Khóa' : 'Mở khóa'}
          </button>
        </td>
      </tr>
    `).join('');
  }

  // Tìm kiếm tài khoản
  $('[data-account-search]')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) {
      renderAccountsList(cachedAccounts);
      return;
    }
    const filtered = cachedAccounts.filter((a) =>
      (a.username && a.username.toLowerCase().includes(q)) ||
      (a.full_name && a.full_name.toLowerCase().includes(q)) ||
      (a.phone && a.phone.includes(q))
    );
    renderAccountsList(filtered);
  });

  // =========================================================================
  // 3. QUẢN LÝ GIAO DỊCH & ĐƠN HÀNG
  // =========================================================================
  let cachedOrders = [];
  const getOrderStatusName = (s) => ({
    new: 'Đơn mới',
    processing: 'Đang xử lý',
    shipping: 'Đang giao hàng',
    completed: 'Đã hoàn thành',
    cancelled: 'Đã hủy'
  }[s] || s);

  async function loadTransactions() {
    try {
      const target = $('[data-transactions-list]');
      if (target) target.innerHTML = '<tr><td colspan="8" class="cms-empty-cell">Đang tải danh sách giao dịch…</td></tr>';
      const { transactions } = await api('/api/admin/transactions');
      cachedOrders = transactions || [];
      renderTransactionsList(cachedOrders);
    } catch (err) {
      toast('Lỗi tải danh sách giao dịch: ' + err.message);
    }
  }

  function renderTransactionsList(list) {
    const target = $('[data-transactions-list]');
    const countEl = $('[data-orders-count]');
    if (countEl) countEl.textContent = String(list.length);
    if (!target) return;

    if (!list.length) {
      target.innerHTML = '<tr><td colspan="8" class="cms-empty-cell">Chưa có giao dịch / đơn hàng nào.</td></tr>';
      return;
    }

    target.innerHTML = list.map((o) => `
      <tr>
        <td><b>${esc(o.order_code)}</b></td>
        <td><b>${esc(o.customer_name)}</b><small>📞 ${esc(o.customer_phone)}</small></td>
        <td><small style="max-width: 220px; line-height: 1.4;">${esc(o.shipping_address)}</small></td>
        <td><strong style="color: var(--navy); font-size: 14px;">${money(o.total_amount)}</strong><small>${o.payment_method === 'cod' ? 'COD' : 'Chuyển khoản QR'}</small></td>
        <td><span class="cms-status cms-status-${esc(o.payment_status)}">${o.payment_status === 'paid' ? 'Đã thanh toán' : o.payment_status === 'refunded' ? 'Đã hoàn tiền' : 'Chờ thanh toán'}</span></td>
        <td><span class="cms-status cms-status-${esc(o.order_status)}">${getOrderStatusName(o.order_status)}</span></td>
        <td><small>${date(o.created_at)}</small></td>
        <td class="cms-row-actions">
          <select data-change-order-status="${esc(o.id)}" style="font-size: 12px; padding: 4px 6px; border-radius: 6px; border: 1px solid #d1d5db;">
            <option value="" disabled selected>Cập nhật...</option>
            <option value="paid_completed">✓ Đã thu tiền & Xong</option>
            <option value="mark_paid">Xác nhận Đã thanh toán</option>
            <option value="mark_shipping">Đang giao hàng</option>
            <option value="mark_completed">Hoàn thành đơn</option>
            <option value="mark_cancelled">Hủy đơn hàng</option>
          </select>
        </td>
      </tr>
    `).join('');
  }

  // Bộ lọc trạng thái đơn hàng & thanh toán
  $('[data-filter-order-status]')?.addEventListener('change', filterOrders);
  $('[data-filter-payment-status]')?.addEventListener('change', filterOrders);

  function filterOrders() {
    const orderStatus = $('[data-filter-order-status]')?.value;
    const paymentStatus = $('[data-filter-payment-status]')?.value;

    let filtered = cachedOrders;
    if (orderStatus) filtered = filtered.filter((o) => o.order_status === orderStatus);
    if (paymentStatus) filtered = filtered.filter((o) => o.payment_status === paymentStatus);
    renderTransactionsList(filtered);
  }

  // =========================================================================
  // 4. BÁO CÁO THU NHẬP
  // =========================================================================
  async function loadIncome() {
    try {
      const { income } = await api('/api/admin/income');
      if (!income) return;

      $('[data-income="todayIncome"]')?.replaceChildren(document.createTextNode(money(income.todayIncome)));
      $('[data-income="weekIncome"]')?.replaceChildren(document.createTextNode(money(income.weekIncome)));
      $('[data-income="monthIncome"]')?.replaceChildren(document.createTextNode(money(income.monthIncome)));
      $('[data-income="totalIncome"]')?.replaceChildren(document.createTextNode(money(income.totalIncome)));
      $('[data-income="aov"]')?.replaceChildren(document.createTextNode(money(income.averageOrderValue)));
      $('[data-income="qrBank"]')?.replaceChildren(document.createTextNode(money(income.qrBankIncome)));
      $('[data-income="cod"]')?.replaceChildren(document.createTextNode(money(income.codIncome)));

      const target = $('[data-income-orders-list]');
      if (!target) return;

      const txs = income.transactions || [];
      if (!txs.length) {
        target.innerHTML = '<tr><td colspan="7" class="cms-empty-cell">Chưa có giao dịch phát sinh thu nhập thành công.</td></tr>';
        return;
      }

      target.innerHTML = txs.map((t) => `
        <tr>
          <td><b>${esc(t.order_code)}</b></td>
          <td>${esc(t.customer_name)}</td>
          <td>${esc(t.customer_phone)}</td>
          <td>${t.payment_method === 'cod' ? 'Thanh toán COD' : 'Chuyển khoản QR'}</td>
          <td><strong style="color: #15803d; font-size: 14px;">+${money(t.total_amount)}</strong></td>
          <td><span class="cms-status cms-status-${esc(t.payment_status)}">${t.payment_status === 'paid' ? 'Đã thu tiền' : 'Hoàn tất'}</span></td>
          <td><small>${date(t.created_at)}</small></td>
        </tr>
      `).join('');
    } catch (err) {
      toast('Lỗi tải báo cáo thu nhập: ' + err.message);
    }
  }

  // =========================================================================
  // 5. QUẢN LÝ ĐÁNH GIÁ SẢN PHẨM
  // =========================================================================
  async function loadReviews() {
    try {
      const target = $('[data-reviews-list]');
      if (target) target.innerHTML = '<tr><td colspan="8" class="cms-empty-cell">Đang tải danh sách đánh giá…</td></tr>';
      const { reviews } = await api('/api/admin/reviews');
      const list = reviews || [];

      if (!list.length) {
        target.innerHTML = '<tr><td colspan="8" class="cms-empty-cell">Chưa có đánh giá nào từ khách hàng.</td></tr>';
        return;
      }

      target.innerHTML = list.map((r) => `
        <tr>
          <td><b>${esc(r.customer_name)}</b><small>${esc(r.customer_phone || '—')}</small></td>
          <td>${esc(r.product_name || 'GORISE Board Game')}</td>
          <td><span class="cms-stars">${'★'.repeat(r.rating || 5)}${'☆'.repeat(5 - (r.rating || 5))}</span></td>
          <td><div style="max-width: 280px; line-height: 1.45;">${esc(r.comment)}</div></td>
          <td><small style="color: var(--blue); max-width: 220px; display: block;">${r.admin_reply ? '💬 ' + esc(r.admin_reply) : '<i>Chưa phản hồi</i>'}</small></td>
          <td><span class="cms-status cms-status-${esc(r.status)}">${r.status === 'approved' ? 'Hiển thị' : 'Đã ẩn'}</span></td>
          <td><small>${date(r.created_at)}</small></td>
          <td class="cms-row-actions">
            <button data-toggle-review="${esc(r.id)}" data-current-status="${esc(r.status)}">
              ${r.status === 'approved' ? 'Ẩn' : 'Duyệt'}
            </button>
            <button data-reply-review="${esc(r.id)}" style="color: var(--blue);">Phản hồi</button>
            <button data-delete-review="${esc(r.id)}">Xóa</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      toast('Lỗi tải đánh giá: ' + err.message);
    }
  }

  // =========================================================================
  // 6. EVENT DELEGATION CHO TOÀN BỘ CÁC HÀNH ĐỘNG ADMIN
  // =========================================================================
  document.addEventListener('click', async (e) => {
    // 1. Khóa / Mở khóa tài khoản khách hàng
    const toggleAccBtn = e.target.closest('[data-toggle-account]');
    if (toggleAccBtn) {
      const id = toggleAccBtn.dataset.toggleAccount;
      const currentActive = toggleAccBtn.dataset.currentActive === '1';
      const actionText = currentActive ? 'Khóa' : 'Mở khóa';
      if (!confirm(`Bạn có chắc muốn ${actionText} tài khoản này?`)) return;

      try {
        await api('/api/admin/accounts/toggle-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId: id, isActive: !currentActive })
        });
        toast(`Đã ${actionText} tài khoản thành công.`);
        await loadAccounts();
        await loadDashboardStats();
      } catch (err) {
        toast(err.message);
      }
      return;
    }

    // 2. Duyệt / Ẩn đánh giá
    const toggleRevBtn = e.target.closest('[data-toggle-review]');
    if (toggleRevBtn) {
      const id = toggleRevBtn.dataset.toggleReview;
      const currentStatus = toggleRevBtn.dataset.currentStatus;
      const newStatus = currentStatus === 'approved' ? 'hidden' : 'approved';
      try {
        await api(`/api/admin/reviews/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        toast(`Đã chuyển trạng thái đánh giá sang: ${newStatus === 'approved' ? 'Hiển thị' : 'Đã ẩn'}`);
        await loadReviews();
        await loadDashboardStats();
      } catch (err) {
        toast(err.message);
      }
      return;
    }

    // 3. Phản hồi đánh giá
    const replyRevBtn = e.target.closest('[data-reply-review]');
    if (replyRevBtn) {
      const id = replyRevBtn.dataset.replyReview;
      const replyText = prompt('Nhập nội dung phản hồi từ đội ngũ GORISE:');
      if (replyText === null || !replyText.trim()) return;

      try {
        await api(`/api/admin/reviews/${id}/reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reply: replyText.trim() })
        });
        toast('Đã gửi phản hồi đánh giá thành công.');
        await loadReviews();
      } catch (err) {
        toast(err.message);
      }
      return;
    }

    // 4. Xóa đánh giá spam
    const delRevBtn = e.target.closest('[data-delete-review]');
    if (delRevBtn) {
      const id = delRevBtn.dataset.deleteReview;
      if (!confirm('Bạn có chắc muốn xóa vĩnh viễn đánh giá này?')) return;
      try {
        await api(`/api/admin/reviews/${id}`, { method: 'DELETE' });
        toast('Đã xóa đánh giá.');
        await loadReviews();
        await loadDashboardStats();
      } catch (err) {
        toast(err.message);
      }
      return;
    }

    // 5. Bài viết và sản phẩm (giữ nguyên chức năng hiện có)
    const editA = e.target.closest('[data-edit-article]');
    if (editA) fillArticle(window.__articles.find((a) => a.id === editA.dataset.editArticle));
    const delA = e.target.closest('[data-delete-article]');
    if (delA && confirm('Ẩn bài viết này khỏi website?')) {
      await api(`/api/articles/${delA.dataset.deleteArticle}`, { method: 'DELETE' });
      toast('Đã ẩn bài viết.');
      await loadArticles();
      await loadStats();
    }
    const editP = e.target.closest('[data-edit-product]');
    if (editP) fillProduct(window.__products.find((p) => p.id === editP.dataset.editProduct));
    const delP = e.target.closest('[data-delete-product]');
    if (delP && confirm('Đưa sản phẩm về trạng thái ngừng bán?')) {
      await api(`/api/products/admin/${delP.dataset.deleteProduct}`, { method: 'DELETE' });
      toast('Đã cập nhật trạng thái sản phẩm.');
      await loadProducts();
      await loadStats();
    }
  });

  // Thay đổi trạng thái giao dịch từ dropdown
  document.addEventListener('change', async (e) => {
    const select = e.target.closest('[data-change-order-status]');
    if (!select) return;

    const id = select.dataset.changeOrderStatus;
    const action = select.value;
    if (!action) return;

    let payload = {};
    if (action === 'paid_completed') {
      payload = { paymentStatus: 'paid', orderStatus: 'completed' };
    } else if (action === 'mark_paid') {
      payload = { paymentStatus: 'paid' };
    } else if (action === 'mark_shipping') {
      payload = { orderStatus: 'shipping' };
    } else if (action === 'mark_completed') {
      payload = { orderStatus: 'completed' };
    } else if (action === 'mark_cancelled') {
      if (!confirm('Xác nhận HỦY đơn hàng này?')) {
        select.value = '';
        return;
      }
      payload = { orderStatus: 'cancelled' };
    }

    try {
      await api(`/api/admin/transactions/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      toast('Đã cập nhật trạng thái đơn hàng thành công!');
      await loadTransactions();
      await loadDashboardStats();
    } catch (err) {
      toast(err.message);
    } finally {
      select.value = '';
    }
  });

  // =========================================================================
  // 7. ARTICLES, PRODUCTS, VIDEO ANALYTICS (GIỮ NGUYÊN)
  // =========================================================================
  async function loadStats() {
    try {
      const { stats } = await api('/api/admin/stats');
      if (stats) {
        Object.entries(stats).forEach(([key, value]) => $(`[data-stat="${key}"]`)?.replaceChildren(document.createTextNode(value)));
      }
    } catch {}
  }

  async function loadAnalytics() {
    try {
      const { analytics } = await api('/api/videos/admin/analytics');
      Object.entries(analytics.totals || {}).forEach(([key, value]) => $(`[data-analytics="${key}"]`)?.replaceChildren(document.createTextNode(number(value))));
      const rows = analytics.videos || [];
      const target = $('[data-analytics-list]');
      if (!target) return;
      target.innerHTML = rows.length ? rows.map((video) => `<tr><td><b>${esc(video.title || 'Video tình huống')}</b></td><td>${number(video.views)}</td><td>${number(video.helpful)}</td><td>${number(video.saves)}</td><td>${number(video.shares)}</td><td><strong>${number(video.interactions)}</strong></td></tr>`).join('') : '<tr><td colspan="6" class="cms-empty-cell">Chưa có dữ liệu tương tác video.</td></tr>';
    } catch {}
  }

  const articleForm = $('[data-article-form]');
  function clearArticle() { articleForm.reset(); $('[data-article-id]').value = ''; articleForm.hidden = true; }
  function fillArticle(article) {
    $('[data-article-id]').value = article.id;
    $('[data-article-title]').value = article.title;
    $('[data-article-slug]').value = article.slug;
    $('[data-article-category]').value = article.category;
    $('[data-article-status]').value = article.status;
    $('[data-article-summary]').value = article.summary;
    $('[data-article-content]').value = article.content;
    $('[data-article-image]').value = article.thumbnailUrl;
    $('[data-article-tags]').value = article.tags.join(', ');
    $('[data-article-seo-title]').value = article.seoTitle;
    $('[data-article-seo-description]').value = article.seoDescription;
    articleForm.hidden = false;
    articleForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function loadArticles() {
    const { articles } = await api('/api/articles/admin');
    $('[data-article-list]').innerHTML = articles.length ? articles.map((a) => `<tr><td><b>${esc(a.title)}</b><small>/${esc(a.slug)}</small></td><td>${esc(a.category)}</td><td><span class="cms-status cms-status-${esc(a.status)}">${a.status === 'published' ? 'Đã xuất bản' : a.status === 'hidden' ? 'Đã ẩn' : 'Bản nháp'}</span></td><td>${date(a.updatedAt)}</td><td class="cms-row-actions"><button data-edit-article="${esc(a.id)}">Sửa</button><a href="/tin-tuc/${encodeURIComponent(a.slug)}/" target="_blank">Xem</a><button data-delete-article="${esc(a.id)}">Xóa</button></td></tr>`).join('') : '<tr><td colspan="5" class="cms-empty-cell">Chưa có bài viết CMS.</td></tr>';
    window.__articles = articles;
  }

  const productForm = $('[data-product-form]');
  function clearProduct() { productForm.reset(); $('[data-product-id]').value = ''; productForm.hidden = true; }
  function fillProduct(p) {
    $('[data-product-id]').value = p.id;
    $('[data-product-name]').value = p.productName;
    $('[data-product-sku]').value = p.sku;
    $('[data-product-price]').value = p.price ?? '';
    $('[data-product-sale]').value = p.salePrice ?? '';
    $('[data-product-status]').value = p.status;
    $('[data-product-stock]').value = p.stockQuantity ?? '';
    $('[data-product-age]').value = p.ageRange;
    $('[data-product-specs]').value = Object.entries(p.specs || {}).map(([k,v]) => `${k}: ${v}`).join(', ');
    $('[data-product-image]').value = p.images?.[0] || '';
    $('[data-product-gallery]').value = (p.gallery || []).join(', ');
    $('[data-product-video]').value = p.videoUrl || '';
    $('[data-product-short]').value = p.shortDescription;
    $('[data-product-description]').value = p.description;
    productForm.hidden = false;
    productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function loadProducts() {
    const { products } = await api('/api/products/admin');
    $('[data-product-list]').innerHTML = products.length ? products.map((p) => `<tr><td><b>${esc(p.productName)}</b><small>${esc(p.versionName || p.category)}</small></td><td>${esc(p.sku || '—')}</td><td>${money(p.salePrice ?? p.price)}</td><td><span class="cms-status">${p.status === 'selling' ? 'Đang bán' : p.status === 'out_of_stock' ? 'Hết hàng' : p.status === 'stopped' ? 'Ngừng bán' : 'Bản nháp'}</span></td><td>${date(p.updatedAt)}</td><td class="cms-row-actions"><button data-edit-product="${esc(p.id)}">Sửa</button><button data-delete-product="${esc(p.id)}">Ẩn</button></td></tr>`).join('') : '<tr><td colspan="6" class="cms-empty-cell">Chưa có sản phẩm.</td></tr>';
    window.__products = products;
  }

  $$('.cms-nav [data-tab]').forEach((button) => button.addEventListener('click', () => showPanel(button.dataset.tab)));
  $$('[data-switch]').forEach((button) => button.addEventListener('click', () => showPanel(button.dataset.switch)));

  $('[data-new-article]')?.addEventListener('click', () => { clearArticle(); articleForm.hidden = false; articleForm.scrollIntoView({ behavior:'smooth' }); });
  $('[data-cancel-article]')?.addEventListener('click', clearArticle);
  $('[data-new-product]')?.addEventListener('click', () => { clearProduct(); productForm.hidden = false; productForm.scrollIntoView({ behavior:'smooth' }); });
  $('[data-cancel-product]')?.addEventListener('click', clearProduct);

  articleForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('[data-article-id]').value;
    const body = {
      id: id || undefined,
      title: $('[data-article-title]').value,
      slug: $('[data-article-slug]').value,
      category: $('[data-article-category]').value,
      status: $('[data-article-status]').value,
      summary: $('[data-article-summary]').value,
      content: $('[data-article-content]').value,
      thumbnailUrl: $('[data-article-image]').value,
      tags: $('[data-article-tags]').value.split(',').map((x) => x.trim()).filter(Boolean),
      seoTitle: $('[data-article-seo-title]').value,
      seoDescription: $('[data-article-seo-description]').value
    };
    try {
      await api('/api/articles', { method: id ? 'PATCH' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      toast('Đã lưu bài viết vào database.');
      clearArticle();
      await loadArticles();
      await loadStats();
    } catch (error) { toast(error.message); }
  });

  productForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('[data-product-id]').value;
    const body = {
      id: id || undefined,
      productName: $('[data-product-name]').value,
      sku: $('[data-product-sku]').value,
      price: Number($('[data-product-price]').value) || null,
      salePrice: Number($('[data-product-sale]').value) || null,
      status: $('[data-product-status]').value,
      stockQuantity: Number($('[data-product-stock]').value) || null,
      ageRange: $('[data-product-age]').value,
      shortDescription: $('[data-product-short]').value,
      description: $('[data-product-description]').value,
      images: $('[data-product-image]').value ? [$('[data-product-image]').value] : [],
      gallery: $('[data-product-gallery]').value.split(',').map((x) => x.trim()).filter(Boolean),
      videoUrl: $('[data-product-video]').value,
      specs: Object.fromEntries($('[data-product-specs]').value.split(',').map((x) => x.split(':').map((v) => v.trim())).filter((x) => x.length === 2))
    };
    try {
      await api('/api/products/admin', { method: id ? 'PATCH' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      toast('Đã lưu sản phẩm vào database.');
      clearProduct();
      await loadProducts();
      await loadStats();
    } catch (error) { toast(error.message); }
  });

  // Login & Logout
  const loginForm = $('[data-login-form]');
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('[data-login-username]').value.trim();
    const password = $('[data-login-password]').value;
    const errorEl = $('[data-login-error]');
    if (errorEl) errorEl.hidden = true;
    try {
      await api('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      toast('Đăng nhập thành công!');
      login.hidden = true;
      await boot();
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
      } else {
        toast(err.message);
      }
    }
  });

  $$('[data-logout]').forEach((b) => b.addEventListener('click', async () => {
    await api('/api/auth/logout', { method:'POST' });
    location.reload();
  }));

  $('[data-refresh-analytics]')?.addEventListener('click', () => loadAnalytics().then(() => toast('Đã cập nhật thống kê video.')).catch((error) => toast(error.message)));

  // Boot CMS
  async function boot() {
    try {
      const auth = await api('/api/auth/me');
      if (!auth.authenticated) {
        login.hidden = false;
        workspace.hidden = true;
        return;
      }
      identity.textContent = `${auth.identity.name} · ${auth.identity.email}`;
      $('[data-admin-name]').textContent = auth.identity.name || 'Admin';
      if (!auth.identity.isAdmin) {
        denied.hidden = false;
        denied.querySelector('[data-denied-copy]').textContent = 'Tài khoản hiện tại không có quyền quản trị viên.';
        return;
      }
      workspace.hidden = false;
      await Promise.all([loadDashboardStats(), loadAnalytics(), loadArticles(), loadProducts()]);
    } catch (error) {
      toast(error.message);
      login.hidden = false;
    }
  }

  boot();
})();
