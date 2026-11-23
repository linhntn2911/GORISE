(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

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
  const date = (value) => value ? new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
  const number = (value) => Number(value || 0).toLocaleString('vi-VN');

  async function api(url, options = {}) {
    const response = await fetch(url, { credentials: 'include', ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Có lỗi xảy ra.');
    return data;
  }

  async function uploadProductMedia(file, slot) {
    const query = new URLSearchParams({ name: file.name, size: String(file.size), slot });
    const uploaded = await api(`/api/media/upload?${query.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file
    });
    return uploaded.media.stableUrl;
  }

  // =========================================================================
  // BỘ PHÂN TRANG CHUNG (UNIVERSAL PAGINATION)
  // =========================================================================
  const pagination = {
    accounts: { page: 1, size: 8 },
    transactions: { page: 1, size: 8 },
    reviews: { page: 1, size: 8 },
    activationCodes: { page: 1, size: 50 },
    products: { page: 1, size: 8 },
    articles: { page: 1, size: 8 }
  };

  function renderPagination(containerSelector, totalItems, currentPage, pageSize, onPageChange) {
    const container = typeof containerSelector === 'string' ? $(containerSelector) : containerSelector;
    if (!container) return;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    if (totalItems <= pageSize) {
      container.innerHTML = '';
      return;
    }

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    let pagesHtml = '';
    for (let p = startPage; p <= endPage; p++) {
      pagesHtml += `<button type="button" class="cms-page-number ${p === currentPage ? 'is-active' : ''}" data-page="${p}">${p}</button>`;
    }

    container.innerHTML = `
      <div style="font-size: 13px; color: var(--muted); font-weight: 500;">
        Trang <b>${currentPage}</b> / <b>${totalPages}</b> (Tổng <b>${totalItems}</b> mục)
      </div>
      <div class="cms-page-numbers" style="display: flex; align-items: center; gap: 6px;">
        <button type="button" class="cms-page-btn" data-page-btn="prev" ${currentPage <= 1 ? 'disabled' : ''}>← Trước</button>
        <div style="display: flex; gap: 4px;">${pagesHtml}</div>
        <button type="button" class="cms-page-btn" data-page-btn="next" ${currentPage >= totalPages ? 'disabled' : ''}>Sau →</button>
      </div>
    `;

    container.querySelectorAll('[data-page]').forEach((b) => {
      b.onclick = () => onPageChange(Number(b.dataset.page));
    });
    container.querySelector('[data-page-btn="prev"]')?.addEventListener('click', () => {
      if (currentPage > 1) onPageChange(currentPage - 1);
    });
    container.querySelector('[data-page-btn="next"]')?.addEventListener('click', () => {
      if (currentPage < totalPages) onPageChange(currentPage + 1);
    });
  }

  // Chuyển tab trong CMS
  function showPanel(name) {
    $$('.cms-nav [data-tab]').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === name));
    $$('.cms-panel').forEach((p) => p.classList.toggle('is-active', p.dataset.panel === name));

    if (name === 'overview') {
      loadDashboardStats();
      loadRevenueChart(currentChartDays);
    }
    if (name === 'accounts') loadAccounts();
    if (name === 'transactions') loadTransactions();
    if (name === 'income') loadIncome();
    if (name === 'reviews') loadReviews();
    if (name === 'activation-codes') loadActivationCodes();
    if (name === 'articles') loadArticles();
    if (name === 'products') loadProducts();
    if (name === 'videos') loadAnalytics();
  }

  // =========================================================================
  // 1A. DASHBOARD & STATS
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
    } catch (err) {
      toast('Lỗi tải Dashboard: ' + err.message);
    }
  }

  // =========================================================================
  // 1B. SƠ ĐỒ BÁO CÁO DOANH THU (BIỂU ĐỒ ĐƯỜNG LIÊN TỤC)
  // =========================================================================
  let currentChartDays = 7;
  async function loadRevenueChart(days = 7) {
    currentChartDays = days;
    const container = $('[data-revenue-chart-container]');
    if (container) {
      container.innerHTML = '<div style="display: grid; place-items: center; height: 100%; color: var(--muted); font-size: 13px;">Đang tải biểu đồ doanh thu…</div>';
    }
    try {
      const res = await api(`/api/admin/dashboard/chart?days=${days}`);
      renderRevenueLineChart(res.dailyChart || [], days);
    } catch (err) {
      if (container) {
        container.innerHTML = `<div style="display: grid; place-items: center; height: 100%; color: #dc2626; font-size: 13px;">Lỗi tải biểu đồ: ${esc(err.message)}</div>`;
      }
    }
  }

  function renderRevenueLineChart(dbRows, days) {
    const container = $('[data-revenue-chart-container]');
    if (!container) return;

    // 1. Tạo chuỗi liên tục các ngày trong quá khứ
    const rowMap = new Map();
    (dbRows || []).forEach((r) => {
      if (r.date) rowMap.set(String(r.date).slice(0, 10), r);
    });

    const series = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const match = rowMap.get(iso);
      series.push({
        date: iso,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        revenue: match ? Number(match.revenue || 0) : 0,
        ordersCount: match ? Number(match.ordersCount || 0) : 0
      });
    }

    // 2. Cập nhật các chỉ số tổng hợp
    const sumRevenue = series.reduce((acc, s) => acc + s.revenue, 0);
    const sumOrders = series.reduce((acc, s) => acc + s.ordersCount, 0);
    const avgRevenue = Math.round(sumRevenue / days);

    const sumRevEl = $('[data-chart-sum-revenue]');
    if (sumRevEl) sumRevEl.textContent = money(sumRevenue);
    const sumOrdEl = $('[data-chart-sum-orders]');
    if (sumOrdEl) sumOrdEl.textContent = `${number(sumOrders)} đơn`;
    const avgRevEl = $('[data-chart-avg-revenue]');
    if (avgRevEl) avgRevEl.textContent = money(avgRevenue);

    // 3. Tính toán thông số vẽ SVG Line Chart
    const maxVal = Math.max(...series.map((s) => s.revenue), 1000000);
    const ceiling = Math.ceil(maxVal * 1.15);

    const W = 800;
    const H = 240;
    const padL = 82;
    const padR = 30;
    const padT = 25;
    const padB = 35;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const n = series.length;
    const points = series.map((s, idx) => {
      const x = padL + (n > 1 ? (idx / (n - 1)) * chartW : chartW / 2);
      const y = padT + chartH - (s.revenue / ceiling) * chartH;
      return { x, y, ...s };
    });

    // Đường line path và area fill
    const linePathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const areaPathD = `${linePathD} L ${points[points.length - 1].x.toFixed(1)} ${(padT + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padT + chartH).toFixed(1)} Z`;

    // 4 vạch lưới ngang trục Y (0%, 33%, 66%, 100%)
    const gridLines = [0, 0.33, 0.66, 1].map((pct) => {
      const y = padT + chartH - pct * chartH;
      const val = Math.round(pct * ceiling);
      const label = val >= 1000000 ? `${(val / 1000000).toFixed(1)}tr` : val >= 1000 ? `${Math.round(val / 1000)}k` : `${val}₫`;
      return `
        <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#e8eff5" stroke-dasharray="3,3" stroke-width="1" />
        <text x="${padL - 14}" y="${y + 4}" fill="#8fa2b4" font-size="11" font-weight="600" text-anchor="end">${label}</text>
      `;
    }).join('');

    // Nhãn ngày trục X - Đảm bảo khoảng cách giữa 2 nhãn >= 46px để không bao giờ bị đè số
    let lastLabelX = -999;
    const xLabels = points.map((p, idx) => {
      const isLast = idx === n - 1;
      const isStep = (days === 30 && idx % 5 === 0) || (days === 14 && idx % 2 === 0) || (days === 7);
      if (!isStep && !isLast) return '';
      if (p.x - lastLabelX < 46) return '';
      lastLabelX = p.x;
      return `<text x="${p.x}" y="${H - 10}" fill="#64748b" font-size="11" font-weight="600" text-anchor="middle">${p.label}</text>`;
    }).join('');

    // Điểm nút tròn và vùng tương tác tooltip
    const dotsAndHover = points.map((p, idx) => `
      <g class="cms-chart-node" data-node-idx="${idx}">
        <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#ffffff" stroke="#2c9bf0" stroke-width="2.5" class="cms-chart-dot" />
        <circle cx="${p.x}" cy="${p.y}" r="16" fill="transparent" style="cursor: pointer;" data-tooltip-date="${p.date}" data-tooltip-rev="${money(p.revenue)}" data-tooltip-orders="${p.ordersCount}" />
      </g>
    `).join('');

    container.innerHTML = `
      <div style="position: relative; width: 100%; height: 100%;">
        <svg viewBox="0 0 ${W} ${H}" class="cms-line-chart-svg" preserveAspectRatio="none" style="width: 100%; height: 100%; display: block; overflow: visible;">
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#2c9bf0" stop-opacity="0.32" />
              <stop offset="85%" stop-color="#2c9bf0" stop-opacity="0.02" />
              <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
            </linearGradient>
          </defs>
          ${gridLines}
          <path d="${areaPathD}" fill="url(#revenueGrad)" />
          <path d="${linePathD}" fill="none" stroke="#2c9bf0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          ${dotsAndHover}
          ${xLabels}
        </svg>
        <div class="cms-chart-tooltip" style="display: none; position: absolute; pointer-events: none; background: #082b57; color: #fff; padding: 7px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; white-space: nowrap; box-shadow: 0 4px 14px rgba(0,0,0,0.2); transform: translate(-50%, -125%); z-index: 10;"></div>
      </div>
    `;

    // Tooltip tương tác chuột
    const tooltip = container.querySelector('.cms-chart-tooltip');
    container.querySelectorAll('[data-tooltip-date]').forEach((hit) => {
      hit.addEventListener('mouseenter', () => {
        const dateStr = hit.dataset.tooltipDate;
        const rev = hit.dataset.tooltipRev;
        const orders = hit.dataset.tooltipOrders;
        const rect = container.getBoundingClientRect();
        const hitRect = hit.getBoundingClientRect();
        const left = hitRect.left - rect.left + hitRect.width / 2;
        const top = hitRect.top - rect.top;

        tooltip.innerHTML = `<div>📅 ${dateStr}</div><div style="color: #ffd35a; font-weight: 800; margin-top: 2px;">💰 ${rev}</div><div style="color: #a8d5fa; font-size: 11px;">📦 ${orders} đơn hàng</div>`;
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.style.display = 'block';

        const dot = hit.parentElement.querySelector('.cms-chart-dot');
        if (dot) {
          dot.setAttribute('r', '7');
          dot.setAttribute('fill', '#ffd35a');
          dot.setAttribute('stroke', '#123b72');
        }
      });

      hit.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
        const dot = hit.parentElement.querySelector('.cms-chart-dot');
        if (dot) {
          dot.setAttribute('r', '4.5');
          dot.setAttribute('fill', '#ffffff');
          dot.setAttribute('stroke', '#2c9bf0');
        }
      });
    });
  }

  // Lắng nghe click các chip lọc ngày (7, 14, 30 ngày)
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-chart-days]');
    if (!chip) return;
    const days = Number(chip.dataset.chartDays) || 7;
    $$('[data-chart-days]').forEach((c) => c.classList.toggle('is-active', c === chip));
    loadRevenueChart(days);
  });

  // =========================================================================
  // 2. QUẢN LÝ TÀI KHOẢN KHÁCH HÀNG (CÓ PHÂN TRANG)
  // =========================================================================
  let cachedAccounts = [];
  async function loadAccounts() {
    try {
      const target = $('[data-accounts-list]');
      if (target) target.innerHTML = '<tr><td colspan="8" class="cms-empty-cell">Đang tải danh sách tài khoản…</td></tr>';
      const { accounts } = await api('/api/admin/accounts');
      cachedAccounts = accounts || [];
      pagination.accounts.page = 1;
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
      renderPagination('[data-pagination-accounts]', 0, 1, pagination.accounts.size, () => {});
      return;
    }

    const { page, size } = pagination.accounts;
    const start = (page - 1) * size;
    const pageItems = list.slice(start, start + size);

    target.innerHTML = pageItems.map((a) => {
      const isAdminAccount = a.username === 'admin' || a.role === 'super_admin' || a.role === 'admin';
      const actionHtml = isAdminAccount
        ? '<span style="color: var(--muted); font-size: 12px; font-weight: 600;">Hệ thống</span>'
        : `<button data-toggle-account="${esc(a.id)}" data-current-active="${a.is_active ? '1' : '0'}" style="color: ${a.is_active ? '#dc2626' : '#16a34a'}; font-weight: 700; cursor: pointer;">
            ${a.is_active ? 'Khóa' : 'Mở khóa'}
          </button>`;

      return `
        <tr>
          <td><b>@${esc(a.username || 'user')}</b></td>
          <td>${esc(a.full_name || '—')}</td>
          <td>${esc(a.phone || a.email || '—')}</td>
          <td><strong>${number(a.orders_count)}</strong> đơn</td>
          <td>${money(a.total_spent)}</td>
          <td>${date(a.created_at)}</td>
          <td><span class="cms-status cms-status-${a.is_active ? 'active' : 'locked'}">${a.is_active ? 'Hoạt động' : 'Đang khóa'}</span></td>
          <td class="cms-row-actions">${actionHtml}</td>
        </tr>
      `;
    }).join('');

    renderPagination('[data-pagination-accounts]', list.length, page, size, (newPage) => {
      pagination.accounts.page = newPage;
      renderAccountsList(list);
    });
  }

  // Tìm kiếm tài khoản
  $('[data-account-search]')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    pagination.accounts.page = 1;
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
  // 3. QUẢN LÝ GIAO DỊCH & ĐƠN HÀNG (CÓ PHÂN TRANG)
  // =========================================================================
  let cachedOrders = [];
  const getOrderStatusName = (s) => ({
    new: 'Chờ xác nhận',
    confirmed: 'Xác nhận đơn',
    preparing: 'Chuẩn bị đơn',
    processing: 'Chuẩn bị đơn',
    shipping: 'Giao hàng',
    completed: 'Hoàn thành đơn',
    cancelled: 'Hủy đơn'
  }[s] || s);

  async function loadTransactions() {
    try {
      const target = $('[data-transactions-list]');
      if (target) target.innerHTML = '<tr><td colspan="8" class="cms-empty-cell">Đang tải danh sách giao dịch…</td></tr>';
      const { transactions } = await api('/api/admin/transactions');
      cachedOrders = transactions || [];
      pagination.transactions.page = 1;
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
      renderPagination('[data-pagination-transactions]', 0, 1, pagination.transactions.size, () => {});
      return;
    }

    const { page, size } = pagination.transactions;
    const start = (page - 1) * size;
    const pageItems = list.slice(start, start + size);

    target.innerHTML = pageItems.map((o) => `
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
            <option value="confirm_order">Xác nhận đơn</option>
            <option value="prepare_order">Chuẩn bị đơn</option>
            <option value="mark_shipping">Giao hàng</option>
            <option value="mark_completed">Hoàn thành đơn</option>
            <option value="mark_cancelled">Hủy đơn</option>
          </select>
        </td>
      </tr>
    `).join('');

    renderPagination('[data-pagination-transactions]', list.length, page, size, (newPage) => {
      pagination.transactions.page = newPage;
      renderTransactionsList(list);
    });
  }

  // Bộ lọc trạng thái đơn hàng & thanh toán
  $('[data-filter-order-status]')?.addEventListener('change', filterOrders);
  $('[data-filter-payment-status]')?.addEventListener('change', filterOrders);

  function filterOrders() {
    const orderStatus = $('[data-filter-order-status]')?.value;
    const paymentStatus = $('[data-filter-payment-status]')?.value;

    pagination.transactions.page = 1;
    let filtered = cachedOrders;
    if (orderStatus) {
      filtered = filtered.filter((o) => (
        orderStatus === 'preparing'
          ? ['preparing', 'processing'].includes(o.order_status)
          : o.order_status === orderStatus
      ));
    }
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
  // 5. QUẢN LÝ ĐÁNH GIÁ SẢN PHẨM (CÓ PHÂN TRANG)
  // =========================================================================
  let cachedReviews = [];
  async function loadReviews() {
    try {
      const target = $('[data-reviews-list]');
      if (target) target.innerHTML = '<tr><td colspan="7" class="cms-empty-cell">Đang tải danh sách đánh giá…</td></tr>';
      const { reviews } = await api('/api/admin/reviews');
      cachedReviews = reviews || [];
      pagination.reviews.page = 1;
      renderReviewsList(cachedReviews);
    } catch (err) {
      toast('Lỗi tải đánh giá: ' + err.message);
    }
  }

  function renderReviewsList(list) {
    const target = $('[data-reviews-list]');
    if (!target) return;

    if (!list.length) {
      target.innerHTML = '<tr><td colspan="7" class="cms-empty-cell">Chưa có đánh giá nào từ khách hàng.</td></tr>';
      renderPagination('[data-pagination-reviews]', 0, 1, pagination.reviews.size, () => {});
      return;
    }

    const { page, size } = pagination.reviews;
    const start = (page - 1) * size;
    const pageItems = list.slice(start, start + size);

    target.innerHTML = pageItems.map((r) => `
      <tr>
        <td><b>${esc(r.customer_name)}</b><small>${esc(r.customer_phone || '—')}</small></td>
        <td>${esc(r.product_name || 'GORISE Board Game')}</td>
        <td><span class="cms-stars">${'★'.repeat(r.rating || 5)}${'☆'.repeat(5 - (r.rating || 5))}</span></td>
        <td><div style="max-width: 320px; line-height: 1.45;">${esc(r.comment)}</div></td>
        <td><span class="cms-status cms-status-${esc(r.status)}">${r.status === 'approved' ? 'Hiển thị' : 'Đã ẩn'}</span></td>
        <td><small>${date(r.created_at)}</small></td>
        <td class="cms-row-actions">
          <button data-toggle-review="${esc(r.id)}" data-current-status="${esc(r.status)}">
            ${r.status === 'approved' ? 'Ẩn' : 'Duyệt'}
          </button>
          <button data-delete-review="${esc(r.id)}">Xóa</button>
        </td>
      </tr>
    `).join('');

    renderPagination('[data-pagination-reviews]', list.length, page, size, (newPage) => {
      pagination.reviews.page = newPage;
      renderReviewsList(list);
    });
  }

  // =========================================================================
  // 5B. QUẢN LÝ MÃ KÍCH HOẠT GORISE PLAY
  // =========================================================================
  async function loadActivationCodes() {
    const tableBody = $('#activationCodesTableBody');
    if (!tableBody) return;

    const page = pagination.activationCodes.page;
    const size = pagination.activationCodes.size;
    const search = $('#actSearchInput')?.value.trim() || '';
    const status = $('#actStatusSelect')?.value || 'all';
    const batch = $('#actBatchSelect')?.value || '';

    const params = new URLSearchParams({
      page: String(page),
      limit: String(size),
      status,
      search,
      batch
    });

    try {
      const data = await api(`/api/admin/activation-codes?${params.toString()}`);
      const codes = data.codes || [];
      const stats = data.stats || {};
      const batches = data.batches || [];

      // Cập nhật thẻ KPI
      $('[data-act-stat="total"]')?.replaceChildren(document.createTextNode(number(stats.totalAll)));
      $('[data-act-stat="unused"]')?.replaceChildren(document.createTextNode(number(stats.unusedCount)));
      $('[data-act-stat="used"]')?.replaceChildren(document.createTextNode(number(stats.usedCount)));

      // Điền danh sách các đợt phát hành vào dropdown nếu chưa có
      const batchSelect = $('#actBatchSelect');
      if (batchSelect && batchSelect.options.length <= 1) {
        batches.forEach(b => {
          const opt = document.createElement('option');
          opt.value = b;
          opt.textContent = b;
          batchSelect.appendChild(opt);
        });
        if (batch) batchSelect.value = batch;
      }

      if (codes.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="cms-empty-cell">Không tìm thấy mã kích hoạt nào.</td></tr>';
        $('#activationCodesPagination')?.replaceChildren();
        return;
      }

      tableBody.innerHTML = codes.map((c, idx) => {
        const stt = (page - 1) * size + idx + 1;
        const statusBadge = c.status === 'used'
          ? '<span style="background:#dcfce7; color:#15803d; font-size:12px; font-weight:700; padding:4px 10px; border-radius:99px;">Đã kích hoạt</span>'
          : (c.status === 'revoked'
            ? '<span style="background:#fee2e2; color:#b91c1c; font-size:12px; font-weight:700; padding:4px 10px; border-radius:99px;">Đã hủy</span>'
            : '<span style="background:#e0f2fe; color:#0369a1; font-size:12px; font-weight:700; padding:4px 10px; border-radius:99px;">Chưa sử dụng</span>');

        return `
          <tr>
            <td>${stt}</td>
            <td><strong style="font-family:monospace; font-size:14px; letter-spacing:0.05em; color:var(--navy,#123b72);">${esc(c.code)}</strong></td>
            <td><span style="font-size:13px; color:#475569;">${esc(c.batch_name || '—')}</span></td>
            <td>${statusBadge}</td>
            <td>${c.activated_by_name ? `<b style="color:#0f172a;">${esc(c.activated_by_name)}</b>` : '<span style="color:#94a3b8;">—</span>'}</td>
            <td>${c.activated_at ? `<span style="font-size:12px; color:#475569;">${date(c.activated_at)}</span>` : '<span style="color:#94a3b8;">—</span>'}</td>
            <td><span style="font-size:12px; color:#64748b;">${date(c.created_at)}</span></td>
          </tr>
        `;
      }).join('');

      renderPagination('#activationCodesPagination', data.total, page, size, (newPage) => {
        pagination.activationCodes.page = newPage;
        loadActivationCodes();
      });
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="7" class="cms-empty-cell" style="color:#dc2626;">Lỗi tải mã: ${esc(err.message)}</td></tr>`;
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

    // 5. Bài viết và sản phẩm
    const editA = e.target.closest('[data-edit-article]');
    if (editA) fillArticle((window.__articles || []).find((a) => a.id === editA.dataset.editArticle));
    const delA = e.target.closest('[data-delete-article]');
    if (delA && confirm('Ẩn bài viết này khỏi website?')) {
      await api(`/api/articles/${delA.dataset.deleteArticle}`, { method: 'DELETE' });
      toast('Đã ẩn bài viết.');
      await loadArticles();
      await loadStats();
    }
    const editP = e.target.closest('[data-edit-product]');
    if (editP) fillProduct((window.__products || []).find((p) => p.id === editP.dataset.editProduct));
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
    if (action === 'confirm_order') {
      payload = { orderStatus: 'confirmed' };
    } else if (action === 'prepare_order') {
      payload = { orderStatus: 'preparing' };
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
      await loadRevenueChart(currentChartDays);
    } catch (err) {
      toast(err.message);
    } finally {
      select.value = '';
    }
  });

  // =========================================================================
  // 7. ARTICLES, PRODUCTS, VIDEO ANALYTICS (CÓ PHÂN TRANG)
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
    if (!article) return;
    $('[data-article-id]').value = article.id;
    $('[data-article-title]').value = article.title;
    $('[data-article-slug]').value = article.slug;
    $('[data-article-category]').value = article.category;
    $('[data-article-status]').value = article.status;
    $('[data-article-summary]').value = article.summary;
    $('[data-article-content]').value = article.content;
    $('[data-article-image]').value = article.thumbnailUrl;
    $('[data-article-tags]').value = (article.tags || []).join(', ');
    $('[data-article-seo-title]').value = article.seoTitle || '';
    $('[data-article-seo-description]').value = article.seoDescription || '';
    articleForm.hidden = false;
    articleForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  window.__articles = [];
  async function loadArticles() {
    try {
      const { articles } = await api('/api/articles/admin');
      window.__articles = articles || [];
      pagination.articles.page = 1;
      renderArticlesList(window.__articles);
    } catch (err) {
      toast('Lỗi tải bài viết: ' + err.message);
    }
  }

  function renderArticlesList(list) {
    const target = $('[data-article-list]');
    if (!target) return;
    if (!list.length) {
      target.innerHTML = '<tr><td colspan="5" class="cms-empty-cell">Chưa có bài viết CMS.</td></tr>';
      renderPagination('[data-pagination-articles]', 0, 1, pagination.articles.size, () => {});
      return;
    }
    const { page, size } = pagination.articles;
    const start = (page - 1) * size;
    const pageItems = list.slice(start, start + size);

    target.innerHTML = pageItems.map((a) => `
      <tr>
        <td><b>${esc(a.title)}</b><small>/${esc(a.slug)}</small></td>
        <td>${esc(a.category)}</td>
        <td><span class="cms-status cms-status-${esc(a.status)}">${a.status === 'published' ? 'Đã xuất bản' : a.status === 'hidden' ? 'Đã ẩn' : 'Bản nháp'}</span></td>
        <td>${date(a.updatedAt)}</td>
        <td class="cms-row-actions">
          <button data-edit-article="${esc(a.id)}">Sửa</button>
          <a href="/tin-tuc/${encodeURIComponent(a.slug)}/" target="_blank">Xem</a>
          <button data-delete-article="${esc(a.id)}">Xóa</button>
        </td>
      </tr>
    `).join('');

    renderPagination('[data-pagination-articles]', list.length, page, size, (newPage) => {
      pagination.articles.page = newPage;
      renderArticlesList(list);
    });
  }

  const productForm = $('[data-product-form]');
  function clearProduct() {
    productForm.reset();
    if ($('[data-product-id]')) $('[data-product-id]').value = '';
    if ($('[data-product-image]')) $('[data-product-image]').value = '';
    if ($('[data-product-gallery]')) $('[data-product-gallery]').value = '';
    if ($('[data-product-video]')) $('[data-product-video]').value = '';
    const imgName = $('[data-product-image-name]'); if (imgName) imgName.textContent = 'Chưa chọn ảnh.';
    const galName = $('[data-product-gallery-name]'); if (galName) galName.textContent = 'Chưa chọn ảnh gallery.';
    const vidName = $('[data-product-video-name]'); if (vidName) vidName.textContent = 'Chưa chọn video.';
    const statusText = $('[data-product-status-text]'); if (statusText) statusText.textContent = '';
    productForm.hidden = true;
  }
  function fillProduct(p) {
    if (!p) return;
    if ($('[data-product-id]')) $('[data-product-id]').value = p.id;
    if ($('[data-product-name]')) $('[data-product-name]').value = p.productName || '';
    if ($('[data-product-sku]')) $('[data-product-sku]').value = p.sku || '';
    const singlePrice = p.salePrice ?? p.price ?? '';
    if ($('[data-product-price]')) $('[data-product-price]').value = singlePrice;
    if ($('[data-product-sale]')) $('[data-product-sale]').value = singlePrice;
    if ($('[data-product-status]')) $('[data-product-status]').value = p.status || 'selling';
    if ($('[data-product-stock]')) $('[data-product-stock]').value = p.stockQuantity ?? '';
    if ($('[data-product-age]')) $('[data-product-age]').value = p.ageRange || '';
    if ($('[data-product-specs]')) $('[data-product-specs]').value = Object.entries(p.specs || {}).map(([k,v]) => `${k}: ${v}`).join(', ');
    if ($('[data-product-image]')) $('[data-product-image]').value = p.images?.[0] || '';
    if ($('[data-product-gallery]')) $('[data-product-gallery]').value = (p.gallery || []).join(', ');
    if ($('[data-product-video]')) $('[data-product-video]').value = p.videoUrl || '';
    const imgName = $('[data-product-image-name]');
    if (imgName) imgName.textContent = p.images?.[0] ? `Đang dùng: ${p.images[0]}` : 'Chưa có ảnh chính.';
    if ($('[data-product-short]')) $('[data-product-short]').value = p.shortDescription || '';
    if ($('[data-product-description]')) $('[data-product-description]').value = p.description || '';
    productForm.hidden = false;
    productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  window.__products = [];
  async function loadProducts() {
    try {
      const { products } = await api('/api/products/admin');
      window.__products = products || [];
      pagination.products.page = 1;
      renderProductsList(window.__products);
    } catch (err) {
      toast('Lỗi tải sản phẩm: ' + err.message);
    }
  }

  function renderProductsList(list) {
    const target = $('[data-product-list]');
    if (!target) return;
    if (!list.length) {
      target.innerHTML = '<tr><td colspan="5" class="cms-empty-cell">Chưa có sản phẩm.</td></tr>';
      renderPagination('[data-pagination-products]', 0, 1, pagination.products.size, () => {});
      return;
    }
    const { page, size } = pagination.products;
    const start = (page - 1) * size;
    const pageItems = list.slice(start, start + size);

    target.innerHTML = pageItems.map((p) => `
      <tr>
        <td><b>${esc(p.productName)}</b></td>
        <td>${money(p.salePrice ?? p.price)}</td>
        <td><span class="cms-status">${p.status === 'selling' ? 'Đang bán' : p.status === 'out_of_stock' ? 'Hết hàng' : p.status === 'stopped' ? 'Ngừng bán' : 'Bản nháp'}</span></td>
        <td>${date(p.updatedAt)}</td>
        <td class="cms-row-actions">
          <button data-edit-product="${esc(p.id)}">Sửa</button>
          <button data-delete-product="${esc(p.id)}">Ẩn</button>
        </td>
      </tr>
    `).join('');

    renderPagination('[data-pagination-products]', list.length, page, size, (newPage) => {
      pagination.products.page = newPage;
      renderProductsList(list);
    });
  }

  $$('.cms-nav [data-tab]').forEach((button) => button.addEventListener('click', () => showPanel(button.dataset.tab)));
  $$('[data-switch]').forEach((button) => button.addEventListener('click', () => showPanel(button.dataset.switch)));

  $('[data-new-article]')?.addEventListener('click', () => { clearArticle(); articleForm.hidden = false; articleForm.scrollIntoView({ behavior:'smooth' }); });
  $('[data-cancel-article]')?.addEventListener('click', clearArticle);
  $('[data-new-product]')?.addEventListener('click', () => { clearProduct(); productForm.hidden = false; productForm.scrollIntoView({ behavior:'smooth' }); });
  $('[data-cancel-product]')?.addEventListener('click', clearProduct);

  $('[data-product-image-file]')?.addEventListener('change', async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    const status = $('[data-product-status-text]');
    try {
      if (status) status.textContent = `Đang tải ảnh chính ${file.name}…`;
      const url = await uploadProductMedia(file, 'product-main');
      if ($('[data-product-image]')) $('[data-product-image]').value = url;
      const imgName = $('[data-product-image-name]');
      if (imgName) imgName.textContent = `Đã tải: ${file.name}`;
      if (status) status.textContent = 'Ảnh chính đã tải xong. Nhấn “Lưu sản phẩm” để áp dụng.';
    } catch (error) {
      if (status) status.textContent = error.message;
      toast(error.message);
    }
  });

  $('[data-product-gallery-files]')?.addEventListener('change', async (event) => {
    const files = [...event.target.files];
    if (!files.length) return;
    const status = $('[data-product-status-text]');
    const uploaded = [];
    try {
      for (const [index, file] of files.entries()) {
        if (status) status.textContent = `Đang tải ảnh gallery ${index + 1}/${files.length}: ${file.name}…`;
        uploaded.push(await uploadProductMedia(file, 'product-gallery'));
      }
      if ($('[data-product-gallery]')) $('[data-product-gallery]').value = uploaded.join(', ');
      const galName = $('[data-product-gallery-name]');
      if (galName) galName.textContent = `Đã tải ${uploaded.length} ảnh gallery.`;
      if (status) status.textContent = 'Gallery đã tải xong. Nhấn “Lưu sản phẩm” để áp dụng.';
    } catch (error) {
      if (status) status.textContent = error.message;
      toast(error.message);
    }
  });

  $('[data-product-video-file]')?.addEventListener('change', async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    const status = $('[data-product-status-text]');
    try {
      if (status) status.textContent = `Đang tải video ${file.name}…`;
      const url = await uploadProductMedia(file, 'product-video');
      if ($('[data-product-video]')) $('[data-product-video]').value = url;
      const vidName = $('[data-product-video-name]');
      if (vidName) vidName.textContent = `Đã tải: ${file.name}`;
      if (status) status.textContent = 'Video đã tải xong. Nhấn “Lưu sản phẩm” để áp dụng.';
    } catch (error) {
      if (status) status.textContent = error.message;
      toast(error.message);
    }
  });

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
    const id = $('[data-product-id]')?.value;
    const specsEl = $('[data-product-specs]');
    const specsText = (specsEl?.value || '').trim();
    const specPairs = specsText.split(',').map((x) => x.split(':').map((v) => v.trim())).filter((x) => x.length === 2 && x[0] && x[1]);
    const priceVal = Number($('[data-product-price]')?.value) || null;
    const body = {
      id: id || undefined,
      productName: $('[data-product-name]')?.value || '',
      sku: $('[data-product-sku]') ? $('[data-product-sku]').value : '',
      price: priceVal,
      salePrice: priceVal,
      status: $('[data-product-status]')?.value || 'selling',
      stockQuantity: Number($('[data-product-stock]')?.value) || null,
      ageRange: $('[data-product-age]')?.value || '',
      shortDescription: $('[data-product-short]')?.value || '',
      description: $('[data-product-description]')?.value || '',
      images: $('[data-product-image]')?.value ? [$('[data-product-image]').value] : [],
      gallery: $('[data-product-gallery]')?.value ? $('[data-product-gallery]').value.split(',').map((x) => x.trim()).filter(Boolean) : [],
      videoUrl: $('[data-product-video]') ? $('[data-product-video]').value : '',
      specs: specPairs.length ? Object.fromEntries(specPairs) : (specsText ? { 'Số người chơi': specsText } : {})
    };
    try {
      await api('/api/products/admin', { method: id ? 'PATCH' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      toast('Đã lưu sản phẩm vào database.');
      clearProduct();
      await loadProducts();
      await loadStats();
    } catch (error) { toast(error.message); }
  });

  // Đăng xuất admin: xóa sạch phiên và chuyển ngay về trang chủ website
  $$('[data-logout]').forEach((b) => b.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      await fetch('/api/customer/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    } catch (err) {
      console.error('Logout error:', err);
    }
    try {
      localStorage.removeItem('gorise_customer_name');
      localStorage.removeItem('gorise_customer_data');
    } catch {}
    toast('Đã đăng xuất.');
    setTimeout(() => {
      window.location.replace('/');
    }, 150);
  }));

  $('[data-refresh-analytics]')?.addEventListener('click', () => loadAnalytics().then(() => toast('Đã cập nhật thống kê video.')).catch((error) => toast(error.message)));

  // Sự kiện quản lý Mã kích hoạt GORISE Play
  const modalBatch = $('#batchCodesModal');
  $('#btnOpenCreateBatchModal')?.addEventListener('click', () => {
    if (modalBatch) modalBatch.style.display = 'flex';
  });
  $('#btnCloseBatchModal')?.addEventListener('click', () => {
    if (modalBatch) modalBatch.style.display = 'none';
  });
  $('#btnCancelBatchModal')?.addEventListener('click', () => {
    if (modalBatch) modalBatch.style.display = 'none';
  });
  modalBatch?.addEventListener('click', (e) => {
    if (e.target === modalBatch) modalBatch.style.display = 'none';
  });

  $('#createBatchCodesForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#btnSubmitCreateBatch');
    const count = parseInt($('#batchCountInput')?.value, 10) || 100;
    const batchName = $('#batchNameInput')?.value.trim();
    const prefix = $('#batchPrefixInput')?.value.trim() || 'GORISE';

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Đang sinh mã…';
    }

    try {
      const res = await api('/api/admin/activation-codes/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, batchName, prefix })
      });
      toast(res.message || 'Tạo lô mã thành công!');
      if (modalBatch) modalBatch.style.display = 'none';
      $('#createBatchCodesForm')?.reset();
      pagination.activationCodes.page = 1;
      await loadActivationCodes();
    } catch (err) {
      toast('Lỗi: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Xác nhận tạo mã ↗';
      }
    }
  });

  $('#btnExportCodesCsv')?.addEventListener('click', () => {
    const batch = $('#actBatchSelect')?.value || '';
    const status = $('#actStatusSelect')?.value || 'all';
    const params = new URLSearchParams({ batch, status });
    window.open(`/api/admin/activation-codes/export?${params.toString()}`, '_blank');
  });

  let actSearchTimeout;
  $('#actSearchInput')?.addEventListener('input', () => {
    clearTimeout(actSearchTimeout);
    actSearchTimeout = setTimeout(() => {
      pagination.activationCodes.page = 1;
      loadActivationCodes();
    }, 300);
  });
  $('#actStatusSelect')?.addEventListener('change', () => {
    pagination.activationCodes.page = 1;
    loadActivationCodes();
  });
  $('#actBatchSelect')?.addEventListener('change', () => {
    pagination.activationCodes.page = 1;
    loadActivationCodes();
  });

  // Boot CMS: Bắt buộc đã đăng nhập quyền admin; nếu chưa -> chuyển thẳng về trang chủ website
  async function boot() {
    try {
      const auth = await api('/api/auth/me');
      if (!auth.authenticated || !auth.identity || !auth.identity.isAdmin) {
        window.location.replace('/');
        return;
      }
      if (identity) identity.textContent = `${auth.identity.name} · ${auth.identity.email}`;
      const adminNameEl = $('[data-admin-name]');
      if (adminNameEl) adminNameEl.textContent = auth.identity.name || 'Admin';

      if (workspace) {
        workspace.style.display = '';
        workspace.hidden = false;
      }

      // Nạp dữ liệu các tab (độc lập, không để lỗi nhỏ làm sập màn hình)
      loadDashboardStats().catch((e) => console.warn('Stats load err:', e));
      loadRevenueChart(7).catch((e) => console.warn('Chart load err:', e));
      loadAccounts().catch((e) => console.warn('Accounts load err:', e));
      loadAnalytics().catch((e) => console.warn('Analytics load err:', e));
      loadArticles().catch((e) => console.warn('Articles load err:', e));
      loadProducts().catch((e) => console.warn('Products load err:', e));
    } catch (error) {
      window.location.replace('/');
    }
  }

  boot();
})();
