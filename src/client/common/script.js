/**
 * ============================================================================
 * GORISE CLIENT SUITE — MASTER ORCHESTRATOR
 * File: src/client/common/script.js
 * Mô tả: Entry point chính nạp và điều phối các module chức năng chuyên biệt:
 *   - /core.js           : Trạng thái dùng chung, Toast, Format VNĐ, Event Bus
 *   - /navigation.js     : Menu mobile, Bottom nav, Back-to-top, Sticky CTA
 *   - /customer-auth.js  : Modal Tigori, validation form, đăng nhập/đăng ký khách hàng & admin
 *   - /cart.js           : Giỏ hàng, kiểm tra bắt buộc đăng nhập trước khi mua, tạo đơn hàng
 *   - /mascot.js         : Trợ lý hoạt hình Tigori, kéo thả, speech bubble, tích hợp AI chat
 *   - /interactive.js    : Cảnh 3D Safe Home, vòng xoay nhân vật, gameplay journey, bản đồ
 * ============================================================================
 */
(() => {
  if (window.__GORISE_ORCHESTRATOR_INITIALIZED__) return;
  window.__GORISE_ORCHESTRATOR_INITIALIZED__ = true;

  const modules = [
    '/core.js',
    '/navigation.js',
    '/customer-auth.js',
    '/cart.js',
    '/mascot.js',
    '/interactive.js'
  ];

  const version = '20261122_v2';

  // Nạp tuần tự các module đảm bảo thứ tự thực thi chuẩn xác
  modules.forEach((src) => {
    // Kiểm tra xem module đã có trong DOM chưa
    const existing = document.querySelector(`script[src^="${src}"]`);
    if (!existing) {
      const script = document.createElement('script');
      script.src = `${src}?v=${version}`;
      script.async = false; // Đảm bảo thứ tự thực thi tuần tự tuyệt đối
      document.head.appendChild(script);
    }
  });
})();
