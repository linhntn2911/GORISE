/**
 * ============================================================================
 * GORISE CART & CHECKOUT SYSTEM
 * File: src/client/common/cart.js
 * Mô tả: Quản lý giỏ hàng, kiểm tra đăng nhập trước khi mua hàng / thêm vào giỏ,
 *        tiến trình thanh toán và tạo đơn hàng thực tế vào database
 * ============================================================================
 */
(() => {
  const Gorise = window.Gorise || {};

  const cartCount = document.querySelector('[data-cart-count]');
  const cartLabel = document.querySelector('[data-cart-label]');
  const quantityValue = document.querySelector('[data-quantity-value]');
  const cartPage = document.querySelector('[data-cart-page]');
  const cartKey = 'goriseCartItems';

  let cartItems = 0;
  let quantity = 1;
  let miniCartTimer = null;
  let orderTotal = 329000;

  // 1. Đọc / Lưu giỏ hàng từ localStorage
  const readStoredCart = () => {
    try {
      return Math.max(0, Number(window.localStorage.getItem(cartKey)) || 0);
    } catch {
      return 0;
    }
  };

  const storeCart = (value) => {
    try {
      window.localStorage.setItem(cartKey, String(Math.max(0, value)));
    } catch {}
  };

  const formatVnd = Gorise.formatVnd || ((amount) => `${new Intl.NumberFormat('vi-VN').format(amount)}₫`);
  const subtotal = () => cartItems * 299000;
  const shipping = () => (cartItems > 0 ? 35000 : 0);
  const total = () => subtotal() + shipping();

  // 2. Cập nhật số lượng trên các badge giỏ hàng
  const updateCart = () => {
    Gorise.cartItems = cartItems;
    if (cartCount) cartCount.textContent = String(cartItems);
    cartLabel?.setAttribute('aria-label', `Giỏ hàng, ${cartItems} sản phẩm`);
    const miniCount = document.querySelector('[data-mini-cart-count]');
    if (miniCount) miniCount.textContent = String(cartItems);
  };
  Gorise.updateCartUI = updateCart;

  const showMiniCart = () => {
    const panel = document.querySelector('[data-mini-cart]');
    if (!panel) return;
    panel.classList.add('is-visible');
    clearTimeout(miniCartTimer);
    miniCartTimer = window.setTimeout(() => panel.classList.remove('is-visible'), 5200);
  };

  cartItems = readStoredCart();
  updateCart();

  // 3. Nút tăng giảm số lượng mua
  document.querySelector('[data-quantity="minus"]')?.addEventListener('click', () => {
    quantity = Math.max(1, quantity - 1);
    if (quantityValue) quantityValue.textContent = String(quantity);
  });
  document.querySelector('[data-quantity="plus"]')?.addEventListener('click', () => {
    quantity = Math.min(9, quantity + 1);
    if (quantityValue) quantityValue.textContent = String(quantity);
  });

  // 4. BẮT BUỘC ĐĂNG NHẬP MỚI ĐƯỢC THÊM VÀO GIỎ HÀNG
  document.querySelectorAll('[data-add-cart]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!Gorise.currentCustomer) {
        Gorise.toast?.('Vui lòng đăng nhập tài khoản để thêm vào giỏ hàng!');
        if (typeof Gorise.openAuthModal === 'function') {
          Gorise.openAuthModal('login', 'Bạn ơi, hãy đăng nhập để thêm vào giỏ hàng và lưu sản phẩm nhé! 🐾');
        }
        return;
      }

      cartItems += quantity;
      storeCart(cartItems);
      updateCart();
      showMiniCart();
      Gorise.toast?.(`Đã thêm ${quantity} bộ GORISE vào giỏ hàng. Bạn có thể tiếp tục khám phá.`);
    });
  });

  // 5. TRANG GIỎ HÀNG & TIẾN TRÌNH ĐẶT HÀNG (GIO-HANG)
  const cartItemsNode = document.querySelector('[data-cart-items]');
  const renderCart = () => {
    if (!cartPage || !cartItemsNode) return;
    const hasItems = cartItems > 0;
    cartItemsNode.innerHTML = hasItems
      ? `
      <div class="cart-item">
        <div class="cart-product">
          <div class="cart-product-art"><img src="/product-safe-home.webp" alt="Bộ trò chơi GORISE" loading="lazy" decoding="async" /></div>
          <div class="cart-product-info"><strong>GORISE – Board Game</strong><span>Bộ trò chơi giáo dục Safe Home</span></div>
        </div>
        <div class="cart-unit-price">299.000₫</div>
        <div class="cart-quantity" aria-label="Số lượng sản phẩm">
          <button type="button" data-cart-qty="minus" aria-label="Giảm số lượng">−</button><span>${cartItems}</span><button type="button" data-cart-qty="plus" aria-label="Tăng số lượng">+</button>
        </div>
        <div class="cart-line-total"><span>${formatVnd(subtotal())}</span><button class="cart-remove" type="button" data-cart-remove aria-label="Xóa sản phẩm">✕</button></div>
      </div>`
      : '<div class="empty-cart"><span>✦</span><strong>Giỏ hàng đang chờ một cuộc phiêu lưu.</strong><p>Hãy chọn bộ trò chơi GORISE để bắt đầu hành trình.</p><a class="button button-primary" href="/kham-pha-tro-choi/">Khám phá trò chơi <span>↗</span></a></div>';

    const amount = total();
    document.querySelectorAll('[data-cart-item-count]').forEach((node) => { node.textContent = `${cartItems} sản phẩm`; });
    document.querySelectorAll('[data-cart-subtotal]').forEach((node) => { node.textContent = formatVnd(subtotal()); });
    document.querySelectorAll('[data-cart-shipping]').forEach((node) => { node.textContent = shipping() ? formatVnd(shipping()) : '—'; });
    document.querySelectorAll('[data-cart-total],[data-info-total],[data-payment-total]').forEach((node) => { node.textContent = formatVnd(amount); });
    document.querySelectorAll('[data-mini-quantity]').forEach((node) => { node.textContent = `SL: ${cartItems}`; });
    orderTotal = amount || orderTotal;
  };

  const progressOrder = ['cart', 'info', 'payment', 'success'];
  const pageCopy = {
    cart: ['GIỎ HÀNG CỦA BẠN', 'Kiểm tra lại những sản phẩm bạn đã chọn trước khi thanh toán.'],
    info: ['THÔNG TIN NHẬN HÀNG', 'Một vài thông tin để GORISE gửi hành trình đến đúng nơi.'],
    payment: ['THANH TOÁN MINH HỌA', 'Chuyển khoản QR ngân hàng hoặc thanh toán khi nhận hàng (COD).'],
    success: ['ĐẶT HÀNG THÀNH CÔNG', 'Đơn hàng của bạn đã được ghi nhận vào hệ thống GORISE!'],
  };

  const setStep = (step) => {
    if (!cartPage) return;
    const currentIndex = progressOrder.indexOf(step);
    document.querySelectorAll('[data-step-panel]').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.stepPanel === step));
    document.querySelectorAll('[data-progress-step]').forEach((node) => {
      const index = progressOrder.indexOf(node.dataset.progressStep);
      node.classList.toggle('is-current', node.dataset.progressStep === step);
      node.classList.toggle('is-complete', index < currentIndex);
    });
    const [title, subtitle] = pageCopy[step];
    const titleNode = document.querySelector('[data-page-title]');
    const subtitleNode = document.querySelector('[data-page-subtitle]');
    if (titleNode) titleNode.innerHTML = step === 'success' ? 'HOÀN TẤT <span>ĐƠN HÀNG</span>' : title;
    if (subtitleNode) subtitleNode.textContent = subtitle;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (cartPage) {
    renderCart();

    // Thay đổi số lượng / Xóa trong giỏ hàng
    cartItemsNode?.addEventListener('click', (event) => {
      const quantityButton = event.target.closest('[data-cart-qty]');
      if (quantityButton) {
        cartItems = quantityButton.dataset.cartQty === 'plus' ? Math.min(9, cartItems + 1) : Math.max(0, cartItems - 1);
        storeCart(cartItems);
        updateCart();
        renderCart();
        return;
      }
      if (event.target.closest('[data-cart-remove]')) {
        cartItems = 0;
        storeCart(cartItems);
        updateCart();
        renderCart();
        Gorise.toast?.('Đã xóa sản phẩm khỏi giỏ hàng.');
      }
    });

    // BẮT BUỘC ĐĂNG NHẬP MỚI ĐƯỢC TIẾN HÀNH ĐẶT HÀNG
    document.querySelector('[data-go-info]')?.addEventListener('click', () => {
      if (!Gorise.currentCustomer) {
        Gorise.toast?.('Vui lòng đăng nhập tài khoản để tiến hành mua hàng!');
        if (typeof Gorise.openAuthModal === 'function') {
          Gorise.openAuthModal('login', 'Vui lòng đăng nhập để tiếp tục thanh toán đơn hàng GORISE nhé! 🐾');
        }
        return;
      }

      if (!cartItems) {
        Gorise.toast?.('Giỏ hàng đang trống. Hãy chọn một bộ GORISE trước nhé.');
        return;
      }

      // Tự động điền thông tin tài khoản vào form giao hàng
      const shippingForm = document.querySelector('[data-shipping-form]');
      if (shippingForm && Gorise.currentCustomer) {
        const nameInput = shippingForm.querySelector('input[name="name"], [data-shipping-name]');
        const phoneInput = shippingForm.querySelector('input[name="phone"], [data-shipping-phone]');
        if (nameInput && !nameInput.value) nameInput.value = Gorise.currentCustomer.fullName || '';
        if (phoneInput && !phoneInput.value) phoneInput.value = Gorise.currentCustomer.phone || '';
      }

      setStep('info');
    });

    // QUẢN LÝ THANH TOÁN SEPAY & TPBANK VIETQR
    let activePaymentPoll = null;
    let activeCreatedOrder = null;

    const startPaymentPolling = (orderCode) => {
      if (activePaymentPoll) clearInterval(activePaymentPoll);
      activePaymentPoll = setInterval(async () => {
        try {
          const res = await fetch('/api/customer/orders');
          if (!res.ok) return;
          const data = await res.json();
          const match = (data.orders || []).find(o => o.order_code === orderCode || o.orderCode === orderCode);
          if (match && (match.payment_status === 'paid' || match.paymentStatus === 'paid')) {
            clearInterval(activePaymentPoll);
            activePaymentPoll = null;
            Gorise.toast?.('Thanh toán thành công! SePay đã xác nhận đơn hàng.');
            cartItems = 0;
            storeCart(cartItems);
            updateCartUi();
            setStep('success');
          }
        } catch(e) {}
      }, 3000);
    };

    // Submit form thông tin nhận hàng -> Tự động tạo đơn & render VietQR TPBank
    document.querySelector('[data-shipping-form]')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!Gorise.currentCustomer) {
        Gorise.toast?.('Vui lòng đăng nhập để tiếp tục đặt hàng.');
        if (typeof Gorise.openAuthModal === 'function') Gorise.openAuthModal('login');
        return;
      }
      orderTotal = total();

      const submitBtn = event.target.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Đang khởi tạo đơn hàng…'; }

      try {
        const shippingForm = event.target;
        const recipientName = shippingForm?.querySelector('input[name="name"], [data-shipping-name]')?.value || Gorise.currentCustomer.fullName || 'Khách hàng';
        const recipientPhone = shippingForm?.querySelector('input[name="phone"], [data-shipping-phone]')?.value || Gorise.currentCustomer.phone || '0900000000';
        const shippingAddress = shippingForm?.querySelector('textarea[name="address"], [data-shipping-address]')?.value || 'Nhận tại địa chỉ đăng ký';
        const note = shippingForm?.querySelector('textarea[name="note"], [data-shipping-note]')?.value || '';

        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: recipientName,
            customerPhone: recipientPhone,
            shippingAddress: shippingAddress,
            note: note,
            quantity: Math.max(1, cartItems),
            paymentMethod: 'bank_transfer',
          }),
        });

        const data = await res.json();
        if (res.ok && data.success && data.order) {
          activeCreatedOrder = data.order;
          const orderCode = data.order.orderCode;
          orderTotal = data.order.totalAmount || orderTotal;

          const bankAccount = '00000807788';
          const accountName = 'BUI THI NGOC ANH';
          const bankName = 'TPBank (Ngân hàng Tiên Phong)';
          const transferMemo = `GORISE ${orderCode}`;

          // Cập nhật thông tin trên màn hình thanh toán
          const qrImg = document.querySelector('[data-qr-image]');
          if (qrImg) {
            qrImg.src = `https://img.vietqr.io/image/tpbank-${bankAccount}-compact2.png?amount=${orderTotal}&addInfo=${encodeURIComponent(transferMemo)}&accountName=${encodeURIComponent(accountName)}`;
          }
          const bankEl = document.querySelector('[data-transfer-bank]');
          if (bankEl) bankEl.textContent = bankName;

          const accEl = document.querySelector('[data-transfer-account]');
          if (accEl) accEl.textContent = bankAccount;

          const nameEl = document.querySelector('[data-transfer-name]');
          if (nameEl) nameEl.textContent = accountName;

          const contentEl = document.querySelector('[data-transfer-content]');
          if (contentEl) contentEl.textContent = transferMemo;

          document.querySelectorAll('[data-copy-type="account"]').forEach(b => b.setAttribute('data-copy', bankAccount));
          document.querySelectorAll('[data-copy-type="content"]').forEach(b => b.setAttribute('data-copy', transferMemo));

          document.querySelectorAll('[data-order-code]').forEach(n => n.textContent = '#' + orderCode);
          document.querySelectorAll('[data-payment-total]').forEach(n => n.textContent = formatVnd(orderTotal));
          document.querySelectorAll('[data-success-total]').forEach(n => n.textContent = formatVnd(orderTotal));

          startPaymentPolling(orderCode);
          setStep('payment');
        } else {
          Gorise.toast?.(data.error || 'Không thể tạo đơn hàng lúc này.');
        }
      } catch (err) {
        console.error('Order creation error:', err);
        setStep('payment');
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = 'Tiếp tục thanh toán <span>→</span>'; }
      }
    });

    document.querySelectorAll('[data-back-step]').forEach((button) => {
      button.addEventListener('click', () => {
        if (activePaymentPoll) { clearInterval(activePaymentPoll); activePaymentPoll = null; }
        setStep(button.dataset.backStep);
      });
    });

    document.querySelector('[data-reset-order]')?.addEventListener('click', () => {
      setStep('cart');
      Gorise.toast?.('Bạn có thể xem lại hành trình đơn hàng của mình.');
    });

    // Sao chép số tài khoản chuyển khoản
    document.querySelectorAll('[data-copy]').forEach((button) => {
      button.addEventListener('click', async () => {
        const value = button.dataset.copy;
        try {
          await navigator.clipboard.writeText(value);
          Gorise.toast?.('Đã sao chép: ' + value);
          button.classList.add('is-copied');
          setTimeout(() => {
            button.classList.remove('is-copied');
          }, 1500);
        } catch {
          Gorise.toast?.('Không sao chép được. Hãy chọn và sao chép thông tin thủ công.');
        }
      });
    });
  }
})();
