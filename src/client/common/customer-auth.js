/**
 * ============================================================================
 * GORISE CUSTOMER AUTHENTICATION SYSTEM
 * File: src/client/common/customer-auth.js
 * Mô tả: Modal đăng nhập/đăng ký 2 cột linh vật Tigori, validation form,
 *        nút Header Account Pill và Menu Dropdown tài khoản khách hàng
 * ============================================================================
 */
(() => {
  const Gorise = window.Gorise || {};

  function initCustomerAuthModal() {
    let modal = document.querySelector('[data-customer-auth-modal]');

    // 1. Tự động render Modal 2 cột nếu chưa có trong DOM
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'customer-modal-overlay';
      modal.setAttribute('data-customer-auth-modal', '');
      modal.setAttribute('aria-hidden', 'true');
      modal.innerHTML = `
        <div class="customer-modal-card" role="dialog" aria-modal="true">
          <button class="customer-modal-close" type="button" aria-label="Đóng cửa sổ" data-auth-close>×</button>
          
          <!-- Cột Trái: Video Linh vật Tigori & Speech Bubble -->
          <div class="customer-modal-media">
            <div class="tigori-bubble">
              <p><span class="bubble-sparkle">✦</span><span data-bubble-text>Chào mừng bạn trở lại! Tigori rất vui được gặp bạn 🐾</span></p>
            </div>
            <div class="tigori-video-wrapper">
              <video muted loop playsinline preload="metadata" poster="/assets/images/tigori-auth-card.png" aria-label="Linh vật Tigori chuyển động">
                <source src="/tigori-assistant.webm" type="video/webm" />
                <img src="/tigori-mascot.png" alt="Tigori Mascot" />
              </video>
            </div>
            <div class="tigori-badge">
              <span class="badge-star">★</span> GORISE – Học kỹ năng qua từng lượt chơi
            </div>
          </div>

          <!-- Cột Phải: Form Đăng nhập & Đăng ký -->
          <div class="customer-modal-content">
            <div class="customer-modal-heading">
              <h3 data-modal-title>Chào mừng bạn trở lại!</h3>
              <p data-modal-desc>Đăng nhập để trải nghiệm thế giới an toàn và học tập</p>
            </div>

            <!-- Tab Switcher -->
            <div class="customer-tabs">
              <button type="button" class="customer-tab-btn is-active" data-auth-tab="login">Đăng nhập</button>
              <button type="button" class="customer-tab-btn" data-auth-tab="register">Đăng ký tài khoản</button>
            </div>

            <div class="customer-auth-alert" data-auth-alert style="display: none;"></div>

            <!-- FORM ĐĂNG NHẬP -->
            <form class="customer-auth-form" data-form="login">
              <div class="customer-form-group">
                <label>Tên đăng nhập</label>
                <div class="input-icon-wrapper">
                  <span class="field-icon">👤</span>
                  <input type="text" name="username" placeholder="Nhập tên đăng nhập của bạn" required autocomplete="username" />
                </div>
              </div>
              <div class="customer-form-group">
                <label>Mật khẩu</label>
                <div class="input-icon-wrapper password-wrapper">
                  <span class="field-icon">🔒</span>
                  <input type="password" name="password" placeholder="Nhập mật khẩu" required autocomplete="current-password" />
                  <button type="button" class="toggle-password-btn" data-toggle-password aria-label="Hiện mật khẩu" title="Hiện mật khẩu">
                    <span class="eye-show">👁️</span>
                    <span class="eye-hide" style="display: none;">🙈</span>
                  </button>
                </div>
              </div>
              <button type="submit" class="customer-submit-btn">Đăng nhập ngay</button>
              <div class="customer-switch-link">
                Chưa có tài khoản? <a href="javascript:void(0)" data-switch-to="register">Đăng ký thành viên mới</a>
              </div>
            </form>

            <!-- FORM ĐĂNG KÝ -->
            <form class="customer-auth-form" data-form="register" style="display: none;">
              <div class="customer-form-group">
                <label>Tên đăng nhập (viết liền, không dấu)</label>
                <div class="input-icon-wrapper">
                  <span class="field-icon">👤</span>
                  <input type="text" name="username" placeholder="Ví dụ: hoangnam2026" required autocomplete="username" />
                </div>
                <div class="field-feedback" data-username-feedback></div>
              </div>

              <div class="customer-form-row">
                <div class="customer-form-group">
                  <label>Họ và tên</label>
                  <input type="text" name="fullName" placeholder="Ví dụ: Hoàng Nam" required autocomplete="name" />
                </div>
                <div class="customer-form-group">
                  <label>Số điện thoại (để giao hàng)</label>
                  <input type="tel" name="phone" placeholder="09xxxxxxxx" required autocomplete="tel" />
                  <div class="field-feedback" data-phone-feedback></div>
                </div>
              </div>

              <div class="customer-form-row">
                <div class="customer-form-group">
                  <label>Mật khẩu</label>
                  <div class="input-icon-wrapper password-wrapper">
                    <span class="field-icon">🔒</span>
                    <input type="password" name="password" placeholder="Tối thiểu 6 ký tự" required autocomplete="new-password" />
                    <button type="button" class="toggle-password-btn" data-toggle-password aria-label="Hiện mật khẩu" title="Hiện mật khẩu">
                      <span class="eye-show">👁️</span>
                      <span class="eye-hide" style="display: none;">🙈</span>
                    </button>
                  </div>
                </div>
                <div class="customer-form-group">
                  <label>Nhập lại mật khẩu</label>
                  <div class="input-icon-wrapper password-wrapper">
                    <span class="field-icon">🔒</span>
                    <input type="password" name="confirmPassword" placeholder="Khớp mật khẩu trên" required autocomplete="new-password" />
                    <button type="button" class="toggle-password-btn" data-toggle-password aria-label="Hiện mật khẩu" title="Hiện mật khẩu">
                      <span class="eye-show">👁️</span>
                      <span class="eye-hide" style="display: none;">🙈</span>
                    </button>
                  </div>
                  <div class="field-feedback" data-confirm-feedback></div>
                </div>
              </div>

              <button type="submit" class="customer-submit-btn">Đăng ký tài khoản</button>
              <div class="customer-switch-link">
                Đã có tài khoản? <a href="javascript:void(0)" data-switch-to="login">Đăng nhập ngay</a>
              </div>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    // 2. Tự động thêm nút Tài khoản vào Header trên tất cả các trang nếu chưa có
    const headerActions = document.querySelector('.header-actions');
    if (headerActions && !headerActions.querySelector('[data-account-btn]')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'account-wrapper';
      wrapper.style.position = 'relative';
      wrapper.style.display = 'inline-flex';
      wrapper.style.alignItems = 'center';
      wrapper.innerHTML = `
        <button class="account-pill" type="button" aria-label="Tài khoản khách hàng" data-account-btn>
          <span class="account-icon" aria-hidden="true">👤</span>
          <span data-account-label>Đăng nhập</span>
        </button>
        <div class="customer-dropdown" data-account-dropdown style="display: none;">
          <div class="user-name" data-dropdown-name>Khách hàng</div>
          <div class="user-phone" data-dropdown-phone></div>
          <button type="button" data-customer-logout-btn>Đăng xuất</button>
        </div>
      `;
      const cartPill = headerActions.querySelector('.cart-pill');
      if (cartPill) {
        headerActions.insertBefore(wrapper, cartPill);
      } else {
        headerActions.prepend(wrapper);
      }
    }

    // 3. Quản lý trạng thái và form
    const alertBox = modal.querySelector('[data-auth-alert]');
    const tabBtns = modal.querySelectorAll('[data-auth-tab]');
    const forms = modal.querySelectorAll('.customer-auth-form');
    const closeBtn = modal.querySelector('[data-auth-close]');

    const showAlert = (message, isError = true) => {
      if (!alertBox) return;
      alertBox.textContent = message;
      alertBox.className = 'customer-auth-alert ' + (isError ? 'is-error' : 'is-success');
      alertBox.style.display = 'block';
    };

    const clearAlert = () => {
      if (!alertBox) return;
      alertBox.textContent = '';
      alertBox.className = 'customer-auth-alert';
      alertBox.style.display = 'none';
    };

    const bubbleText = modal.querySelector('[data-bubble-text]');
    const modalTitle = modal.querySelector('[data-modal-title]');
    const modalDesc = modal.querySelector('[data-modal-desc]');

    const switchTab = (tabName) => {
      clearAlert();
      tabBtns.forEach((btn) => {
        btn.classList.toggle('is-active', btn.getAttribute('data-auth-tab') === tabName);
      });
      forms.forEach((form) => {
        form.style.display = form.getAttribute('data-form') === tabName ? 'block' : 'none';
      });
      if (tabName === 'register') {
        if (bubbleText) bubbleText.textContent = 'Gia nhập đại gia đình GORISE ngay nào bạn ơi! 🌟';
        if (modalTitle) modalTitle.textContent = 'Đăng ký thành viên';
        if (modalDesc) modalDesc.textContent = 'Tạo tài khoản chỉ mất 30 giây với Tên đăng nhập và Mật khẩu';
      } else {
        if (bubbleText) bubbleText.textContent = 'Chào mừng bạn trở lại! Tigori rất vui được gặp bạn 🐾';
        if (modalTitle) modalTitle.textContent = 'Chào mừng bạn trở lại!';
        if (modalDesc) modalDesc.textContent = 'Đăng nhập để trải nghiệm thế giới an toàn và học tập';
      }
    };

    const openModal = (tab = 'login', speechMessage = null) => {
      switchTab(tab);
      if (speechMessage && bubbleText) {
        bubbleText.textContent = speechMessage;
      }
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      const vid = modal.querySelector('video');
      if (vid) vid.play().catch(() => {});
    };

    const closeModal = () => {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      clearAlert();
    };

    Gorise.openAuthModal = openModal;

    closeBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) {
        closeModal();
      }
    });

    modal.querySelectorAll('[data-auth-tab]').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.getAttribute('data-auth-tab')));
    });

    modal.querySelectorAll('[data-switch-to]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(link.getAttribute('data-switch-to'));
      });
    });

    const updateAuthUI = (customer) => {
      Gorise.currentCustomer = customer;
      const labels = document.querySelectorAll('[data-account-label]');
      const names = document.querySelectorAll('[data-dropdown-name]');
      const phones = document.querySelectorAll('[data-dropdown-phone]');

      if (customer) {
        labels.forEach((l) => {
          if (customer.isAdmin) {
            l.textContent = '👑 Admin';
          } else {
            const name = customer.fullName || customer.username || '';
            const shortName = name.length > 12 ? (name.split(' ').slice(-1)[0] || name) : name;
            l.textContent = shortName;
          }
        });
        names.forEach((n) => (n.textContent = (customer.isAdmin ? '👑 ' : '') + (customer.fullName || customer.username)));
        phones.forEach((p) => (p.textContent = customer.isAdmin ? 'Quản trị viên hệ thống' : (customer.phone ? ('📞 ' + customer.phone) : ('@' + customer.username))));
      } else {
        labels.forEach((l) => (l.textContent = 'Đăng nhập'));
        names.forEach((n) => (n.textContent = 'Khách hàng'));
        phones.forEach((p) => (p.textContent = ''));
      }

      Gorise.emit('gorise-auth-change', { customer });
    };

    // Click nút tài khoản trên Header
    document.addEventListener('click', (e) => {
      const accountBtn = e.target.closest('[data-account-btn]');
      const dropdown = document.querySelector('[data-account-dropdown]');

      if (accountBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (Gorise.currentCustomer && dropdown) {
          const isOpen = dropdown.classList.toggle('is-open');
          dropdown.style.display = isOpen ? 'block' : 'none';
        } else {
          openModal('login');
        }
        return;
      }

      if (dropdown && !e.target.closest('[data-account-dropdown]')) {
        dropdown.classList.remove('is-open');
        dropdown.style.display = 'none';
      }
    });

    // Đăng xuất
    document.addEventListener('click', async (e) => {
      const logoutBtn = e.target.closest('[data-customer-logout-btn]');
      if (!logoutBtn) return;
      e.preventDefault();
      try {
        await fetch('/api/customer/logout', { method: 'POST' });
      } catch (err) {
        console.error('Logout error:', err);
      }
      updateAuthUI(null);
      const dropdown = document.querySelector('[data-account-dropdown]');
      if (dropdown) {
        dropdown.classList.remove('is-open');
        dropdown.style.display = 'none';
      }
      Gorise.toast?.('Đã đăng xuất tài khoản.');
    });

    // Kiểm tra phiên đăng nhập đã có qua Cookie
    fetch('/api/customer/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.authenticated && data.customer) {
          updateAuthUI(data.customer);
        }
      })
      .catch(() => {});

    // Mắt ẩn / hiện mật khẩu
    modal.querySelectorAll('[data-toggle-password]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const wrapper = btn.closest('.password-wrapper');
        const input = wrapper?.querySelector('input');
        if (!input) return;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        const eyeShow = btn.querySelector('.eye-show');
        const eyeHide = btn.querySelector('.eye-hide');
        if (eyeShow && eyeHide) {
          eyeShow.style.display = isPassword ? 'none' : 'block';
          eyeHide.style.display = isPassword ? 'block' : 'none';
        }
        const label = isPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu';
        btn.setAttribute('aria-label', label);
        btn.setAttribute('title', label);
      });
    });

    // Real-time Validation cho Form Đăng ký
    const regForm = modal.querySelector('form[data-form="register"]');
    const userFeedback = modal.querySelector('[data-username-feedback]');
    const phoneFeedback = modal.querySelector('[data-phone-feedback]');
    const confirmFeedback = modal.querySelector('[data-confirm-feedback]');

    let checkTimeout = null;
    if (regForm && regForm.username) {
      const checkUsernameAvailability = async () => {
        const username = regForm.username.value.trim().toLowerCase();
        if (!userFeedback) return;
        if (!username) {
          userFeedback.textContent = '';
          userFeedback.className = 'field-feedback';
          return;
        }
        if (username.length < 3) {
          userFeedback.textContent = 'Tên đăng nhập cần tối thiểu 3 ký tự.';
          userFeedback.className = 'field-feedback is-error';
          return;
        }
        if (!/^[a-z0-9_.-]+$/.test(username)) {
          userFeedback.textContent = 'Tên đăng nhập chỉ gồm chữ thường, số, dấu gạch nối hoặc chấm.';
          userFeedback.className = 'field-feedback is-error';
          return;
        }

        try {
          const res = await fetch('/api/customer/check-username?username=' + encodeURIComponent(username));
          const data = await res.json();
          if (data && data.exists) {
            userFeedback.textContent = '⚠️ Tên đăng nhập này đã có người sử dụng. Vui lòng chọn tên khác!';
            userFeedback.className = 'field-feedback is-error';
          } else {
            userFeedback.textContent = '✓ Tên đăng nhập này khả dụng!';
            userFeedback.className = 'field-feedback is-success';
          }
        } catch {
          // bỏ qua nếu lỗi mạng tạm thời
        }
      };

      regForm.username.addEventListener('blur', checkUsernameAvailability);
      regForm.username.addEventListener('input', () => {
        clearTimeout(checkTimeout);
        checkTimeout = setTimeout(checkUsernameAvailability, 500);
      });
    }

    if (regForm && regForm.phone) {
      regForm.phone.addEventListener('input', () => {
        if (!phoneFeedback) return;
        const phone = regForm.phone.value.trim();
        if (!phone) {
          phoneFeedback.textContent = '';
          phoneFeedback.className = 'field-feedback';
          return;
        }
        if (!/^0[0-9]{9}$/.test(phone)) {
          phoneFeedback.textContent = 'Số điện thoại cần đúng 10 số (bắt đầu bằng số 0).';
          phoneFeedback.className = 'field-feedback is-error';
        } else {
          phoneFeedback.textContent = '✓ Số điện thoại hợp lệ';
          phoneFeedback.className = 'field-feedback is-success';
        }
      });
    }

    if (regForm && regForm.confirmPassword && regForm.password) {
      const validateMatch = () => {
        if (!confirmFeedback) return;
        const p1 = regForm.password.value;
        const p2 = regForm.confirmPassword.value;
        if (!p2) {
          confirmFeedback.textContent = '';
          confirmFeedback.className = 'field-feedback';
          return;
        }
        if (p1 !== p2) {
          confirmFeedback.textContent = 'Mật khẩu xác nhận không khớp.';
          confirmFeedback.className = 'field-feedback is-error';
        } else {
          confirmFeedback.textContent = '✓ Mật khẩu trùng khớp';
          confirmFeedback.className = 'field-feedback is-success';
        }
      };
      regForm.confirmPassword.addEventListener('input', validateMatch);
      regForm.password.addEventListener('input', validateMatch);
    }

    // Submit Đăng nhập
    const loginForm = modal.querySelector('form[data-form="login"]');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAlert();
        const username = loginForm.username.value.trim();
        const password = loginForm.password.value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        if (!username) {
          showAlert('Vui lòng nhập Tên đăng nhập của bạn.');
          loginForm.username.focus();
          return;
        }
        if (!password) {
          showAlert('Vui lòng nhập Mật khẩu.');
          loginForm.password.focus();
          return;
        }

        try {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Đang kiểm tra...';
          const res = await fetch('/api/customer/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });
          const result = await res.json();
          if (res.ok && result.success) {
            updateAuthUI(result.customer);
            loginForm.reset();
            if (result.isAdmin) {
              showAlert('Đăng nhập Quản trị viên thành công! Đang chuyển đến trang quản lý...', false);
              setTimeout(() => {
                window.location.href = result.redirect || '/quan-ly/';
              }, 700);
            } else {
              showAlert('Đăng nhập thành công! Đang tải tài khoản...', false);
              setTimeout(() => {
                closeModal();
              }, 600);
            }
          } else {
            showAlert(result.error || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
          }
        } catch (err) {
          showAlert('Lỗi kết nối máy chủ: ' + err.message);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Đăng nhập ngay';
        }
      });
    }

    // Submit Đăng ký
    if (regForm) {
      regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAlert();
        const username = regForm.username.value.trim().toLowerCase();
        const fullName = regForm.fullName.value.trim();
        const phone = regForm.phone.value.trim();
        const password = regForm.password.value;
        const confirmPassword = regForm.confirmPassword.value;
        const submitBtn = regForm.querySelector('button[type="submit"]');

        if (username.length < 3) {
          showAlert('Tên đăng nhập cần tối thiểu 3 ký tự (chữ hoặc số).');
          regForm.username.focus();
          return;
        }
        if (!/^[a-z0-9_.-]+$/.test(username)) {
          showAlert('Tên đăng nhập không được chứa ký tự đặc biệt hoặc dấu cách.');
          regForm.username.focus();
          return;
        }
        if (!fullName) {
          showAlert('Vui lòng nhập Họ và tên.');
          regForm.fullName.focus();
          return;
        }
        if (!/^0[0-9]{9}$/.test(phone)) {
          showAlert('Số điện thoại nhận hàng cần đủ 10 số, bắt đầu bằng số 0.');
          regForm.phone.focus();
          return;
        }
        if (password.length < 6) {
          showAlert('Mật khẩu cần tối thiểu 6 ký tự.');
          regForm.password.focus();
          return;
        }
        if (password !== confirmPassword) {
          showAlert('Mật khẩu xác nhận không khớp.');
          regForm.confirmPassword.focus();
          return;
        }

        try {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Đang tạo tài khoản...';
          const res = await fetch('/api/customer/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, fullName, phone, password }),
          });
          const result = await res.json();
          if (res.ok && result.success) {
            updateAuthUI(result.customer);
            regForm.reset();
            showAlert('🎉 Đăng ký thành công! Chào mừng bạn gia nhập GORISE.', false);
            setTimeout(() => {
              closeModal();
            }, 900);
          } else {
            showAlert(result.error || 'Không thể tạo tài khoản. Vui lòng kiểm tra lại.');
          }
        } catch (err) {
          showAlert('Lỗi kết nối máy chủ: ' + err.message);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Đăng ký tài khoản';
        }
      });
    }
  }

  // Khởi chạy khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomerAuthModal);
  } else {
    initCustomerAuthModal();
  }
})();
