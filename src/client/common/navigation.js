/**
 * ============================================================================
 * GORISE NAVIGATION & MOBILE EXPERIENCE
 * File: src/client/common/navigation.js
 * Mô tả: Menu mobile, thanh điều hướng chân trang, nút lên đầu trang, sticky CTA
 * ============================================================================
 */
(() => {
  const nav = document.querySelector('[data-nav]');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const routePath = window.Gorise?.routePath || window.location.pathname.replace(/\/$/, '') || '/';

  // 1. Đóng / Mở menu chính trên mobile
  const setMenu = (open) => {
    nav?.classList.toggle('is-open', open);
    menuToggle?.setAttribute('aria-expanded', String(open));
    menuToggle?.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
    document.body.classList.toggle('nav-open', open);
    document.querySelector('[data-mobile-menu-backdrop]')?.classList.toggle('is-visible', open);
  };

  menuToggle?.addEventListener('click', () => setMenu(!nav?.classList.contains('is-open')));
  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav?.classList.contains('is-open')) {
      setMenu(false);
      menuToggle?.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (
      nav?.classList.contains('is-open') &&
      !nav.contains(event.target) &&
      !menuToggle?.contains(event.target) &&
      !event.target.closest('[data-mobile-menu]')
    ) {
      setMenu(false);
    }
  });

  window.matchMedia('(min-width: 821px)').addEventListener('change', (event) => {
    if (event.matches) setMenu(false);
  });

  // 2. Khởi tạo thanh điều hướng nhanh chân trang mobile
  const initMobileExperience = () => {
    if (!document.body || document.querySelector('[data-mobile-nav]') || routePath.startsWith('/quan-ly')) return;

    const navItems = [
      ['/', '⌂', 'Trang chủ'],
      ['/kham-pha-tro-choi/', '◆', 'Shop'],
      ['/video-tinh-huong/', '▶', 'Tình huống'],
      ['/gio-hang/', '□', 'Giỏ hàng']
    ];

    const navMarkup = navItems.map(([href, icon, label]) => {
      const normalized = href === '/' ? '/' : href.replace(/\/$/, '');
      const active = routePath === normalized;
      return `<a href="${href}" class="${active ? 'is-active' : ''}"${active ? ' aria-current="page"' : ''}><span aria-hidden="true">${icon}</span><b>${label}</b></a>`;
    }).join('');

    document.body.insertAdjacentHTML(
      'beforeend',
      `<div class="mobile-menu-backdrop" data-mobile-menu-backdrop aria-hidden="true"></div>
       <nav class="mobile-bottom-nav" data-mobile-nav aria-label="Điều hướng nhanh mobile">
         ${navMarkup}
         <button type="button" data-mobile-menu aria-label="Mở menu"><span aria-hidden="true">☰</span><b>Menu</b></button>
       </nav>
       <button type="button" class="back-to-top" data-back-to-top aria-label="Lên đầu trang">↑<span>Đầu trang</span></button>
       <aside class="mobile-mini-cart" data-mini-cart aria-live="polite">
         <div class="mobile-mini-cart-icon" aria-hidden="true">◆</div>
         <div><strong>Đã thêm vào giỏ</strong><span><b data-mini-cart-count>0</b> bộ GORISE</span></div>
         <a href="/gio-hang/">Xem giỏ <span aria-hidden="true">↗</span></a>
         <button type="button" data-mini-cart-close aria-label="Đóng thông báo">×</button>
       </aside>`
    );

    document.querySelector('[data-mobile-menu-backdrop]')?.addEventListener('click', () => setMenu(false));
    document.querySelector('[data-mobile-menu]')?.addEventListener('click', () => setMenu(!nav?.classList.contains('is-open')));
    document.querySelector('[data-mini-cart-close]')?.addEventListener('click', () => {
      document.querySelector('[data-mini-cart]')?.classList.remove('is-visible');
    });

    const topButton = document.querySelector('[data-back-to-top]');
    const syncTopButton = () => topButton?.classList.toggle('is-visible', window.scrollY > 560);
    window.addEventListener('scroll', syncTopButton, { passive: true });
    topButton?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });

    // Nút CTA cố định ở đáy màn hình điện thoại
    let stickyLabel = '';
    let stickyAction = null;
    if (routePath === '/kham-pha-tro-choi') {
      stickyLabel = 'Thêm Safe Home vào giỏ';
      stickyAction = () => document.querySelector('[data-add-cart]:not([disabled])')?.click();
    } else if (routePath === '/video-tinh-huong') {
      stickyLabel = 'Khám phá tình huống';
      stickyAction = () => document.querySelector('.video-viewer, .video-library, [data-video-page]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (routePath === '/lien-he') {
      stickyLabel = 'Gửi liên hệ';
      stickyAction = () => document.querySelector('[data-contact-form]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (routePath === '/') {
      stickyLabel = 'Khám phá Safe Home';
      stickyAction = () => { window.location.href = '/kham-pha-tro-choi/'; };
    }

    if (stickyLabel) {
      document.body.insertAdjacentHTML(
        'beforeend',
        `<button type="button" class="mobile-sticky-cta" data-mobile-sticky-cta>${stickyLabel}<span aria-hidden="true">↗</span></button>`
      );
      document.querySelector('[data-mobile-sticky-cta]')?.addEventListener('click', () => stickyAction?.());
    }
  };

  initMobileExperience();
})();
