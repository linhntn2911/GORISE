/**
 * ============================================================================
 * GORISE CORE & SHARED STATE
 * File: src/client/common/core.js
 * Mô tả: Chứa biến trạng thái dùng chung, toast thông báo và các hàm tiện ích
 * ============================================================================
 */
(() => {
  window.Gorise = window.Gorise || {};

  const toastNode = document.querySelector('[data-toast]');
  let toastTimer = null;

  // 1. Toast thông báo toàn website
  Gorise.toast = (message, duration = 3200) => {
    if (!toastNode) {
      console.log('[GORISE Toast]:', message);
      return;
    }
    toastNode.textContent = message;
    toastNode.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastNode.classList.remove('is-visible'), duration);
  };

  // 2. Định dạng tiền tệ VNĐ
  Gorise.formatVnd = (amount) => {
    return `${new Intl.NumberFormat('vi-VN').format(Number(amount) || 0)}₫`;
  };

  // 3. Escape HTML an toàn
  Gorise.esc = (value) => {
    return String(value ?? '').replace(/[&<>'"]/g, (c) => ({
      '&': '&#38;',
      '<': '&#60;',
      '>': '&#62;',
      "'": '&#39;',
      '"': '&#34;',
    }[c]));
  };

  // 4. Đường dẫn trang hiện tại
  Gorise.routePath = window.location.pathname.replace(/\/$/, '') || '/';

  // 5. Trạng thái chia sẻ
  Gorise.currentCustomer = null;
  Gorise.cartItems = 0;
  Gorise.openAuthModal = null;
  Gorise.updateCartUI = () => {};

  // 6. Event Bus tiện ích
  Gorise.on = (event, callback) => document.addEventListener(event, callback);
  Gorise.emit = (event, detail) => document.dispatchEvent(new CustomEvent(event, { detail }));
})();
