(() => {
  const nav = document.querySelector('[data-nav]');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const toast = document.querySelector('[data-toast]');
  const cartCount = document.querySelector('[data-cart-count]');
  const cartLabel = document.querySelector('[data-cart-label]');
  const quantityValue = document.querySelector('[data-quantity-value]');
  const cartPage = document.querySelector('[data-cart-page]');
  const cartKey = 'goriseCartItems';
  const routePath = window.location.pathname.replace(/\/$/, '') || '/';
  let cartItems = 0;
  let quantity = 1;
  let toastTimer;
  let miniCartTimer;
  let orderTotal = 329000;
  let mascotRoot;
  let mascotMessage;
  let mascotAction;
  let updateMascotCollision = () => {};
  const mascotPositionKey = 'goriseMascotPosition';
  const mascotGreetingKey = 'goriseMascotGreetingV2';

  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
  };

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
    } catch {
      // Keep the interaction useful even if storage is unavailable.
    }
  };

  const formatVnd = (amount) => `${new Intl.NumberFormat('vi-VN').format(amount)}₫`;
  const subtotal = () => cartItems * 299000;
  const shipping = () => cartItems > 0 ? 30000 : 0;
  const total = () => subtotal() + shipping();

  const updateCart = () => {
    if (cartCount) cartCount.textContent = String(cartItems);
    cartLabel?.setAttribute('aria-label', `Giỏ hàng, ${cartItems} sản phẩm`);
    const miniCount = document.querySelector('[data-mini-cart-count]');
    if (miniCount) miniCount.textContent = String(cartItems);
  };

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
    if (nav?.classList.contains('is-open') && !nav.contains(event.target) && !menuToggle?.contains(event.target) && !event.target.closest('[data-mobile-menu]')) setMenu(false);
  });
  window.matchMedia('(min-width: 821px)').addEventListener('change', (event) => { if (event.matches) setMenu(false); });

  const showMiniCart = () => {
    const panel = document.querySelector('[data-mini-cart]');
    if (!panel) return;
    panel.classList.add('is-visible');
    clearTimeout(miniCartTimer);
    miniCartTimer = window.setTimeout(() => panel.classList.remove('is-visible'), 5200);
  };

  const initMobileExperience = () => {
    if (!document.body || document.querySelector('[data-mobile-nav]') || routePath.startsWith('/quan-ly')) return;
    const activeRoute = routePath;
    const navItems = [['/', '⌂', 'Trang chủ'], ['/kham-pha-tro-choi/', '◆', 'Shop'], ['/video-tinh-huong/', '▶', 'Tình huống'], ['/gio-hang/', '□', 'Giỏ hàng']];
    const navMarkup = navItems.map(([href, icon, label]) => {
      const normalized = href === '/' ? '/' : href.replace(/\/$/, '');
      const active = activeRoute === normalized;
      return `<a href="${href}" class="${active ? 'is-active' : ''}"${active ? ' aria-current="page"' : ''}><span aria-hidden="true">${icon}</span><b>${label}</b></a>`;
    }).join('');
    document.body.insertAdjacentHTML('beforeend', `<div class="mobile-menu-backdrop" data-mobile-menu-backdrop aria-hidden="true"></div><nav class="mobile-bottom-nav" data-mobile-nav aria-label="Điều hướng nhanh mobile">${navMarkup}<button type="button" data-mobile-menu aria-label="Mở menu"><span aria-hidden="true">☰</span><b>Menu</b></button></nav><button type="button" class="back-to-top" data-back-to-top aria-label="Lên đầu trang">↑<span>Đầu trang</span></button><aside class="mobile-mini-cart" data-mini-cart aria-live="polite"><div class="mobile-mini-cart-icon" aria-hidden="true">◆</div><div><strong>Đã thêm vào giỏ</strong><span><b data-mini-cart-count>0</b> bộ GORISE</span></div><a href="/gio-hang/">Xem giỏ <span aria-hidden="true">↗</span></a><button type="button" data-mini-cart-close aria-label="Đóng thông báo">×</button></aside>`);
    document.querySelector('[data-mobile-menu-backdrop]')?.addEventListener('click', () => setMenu(false));
    document.querySelector('[data-mobile-menu]')?.addEventListener('click', () => setMenu(!nav?.classList.contains('is-open')));
    document.querySelector('[data-mini-cart-close]')?.addEventListener('click', () => document.querySelector('[data-mini-cart]')?.classList.remove('is-visible'));
    const topButton = document.querySelector('[data-back-to-top]');
    const syncTopButton = () => topButton?.classList.toggle('is-visible', window.scrollY > 560);
    window.addEventListener('scroll', syncTopButton, { passive: true });
    topButton?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
    let stickyLabel = '';
    let stickyAction = null;
    if (activeRoute === '/kham-pha-tro-choi') { stickyLabel = 'Thêm Safe Home vào giỏ'; stickyAction = () => document.querySelector('[data-add-cart]:not([disabled])')?.click(); }
    else if (activeRoute === '/video-tinh-huong') { stickyLabel = 'Khám phá tình huống'; stickyAction = () => document.querySelector('.video-viewer, .video-library, [data-video-page]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (activeRoute === '/lien-he') { stickyLabel = 'Gửi liên hệ'; stickyAction = () => document.querySelector('[data-contact-form]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    else if (activeRoute === '/') { stickyLabel = 'Khám phá Safe Home'; stickyAction = () => { window.location.href = '/kham-pha-tro-choi/'; }; }
    if (stickyLabel) { document.body.insertAdjacentHTML('beforeend', `<button type="button" class="mobile-sticky-cta" data-mobile-sticky-cta>${stickyLabel}<span aria-hidden="true">↗</span></button>`); document.querySelector('[data-mobile-sticky-cta]')?.addEventListener('click', () => stickyAction?.()); }
    updateCart();
  };

  cartItems = readStoredCart();
  initMobileExperience();
  updateCart();

  const mascotCopy = {
    '/': {
      greeting: 'Chào bạn! Cùng TIGORI khám phá GORISE nhé!',
      follow: 'Mình sẽ đồng hành cùng bạn trong hành trình này nhé!',
      action: ['KHÁM PHÁ NGAY →', '/kham-pha-tro-choi/'],
    },
    '/ve-gorise/': {
      greeting: 'Bạn tò mò GORISE ra đời như thế nào à?',
      follow: 'Để mình kể bạn nghe câu chuyện phía sau GORISE nhé!',
    },
    '/kham-pha-tro-choi/': {
      greeting: 'Đoán xem trong hộp GORISE có gì nào?',
      follow: 'Có rất nhiều điều thú vị đang chờ bạn khám phá!',
      action: ['KHÁM PHÁ →', '/kham-pha-tro-choi/#buy'],
    },
    '/thu-thach/': {
      greeting: 'Một thử thách mới đang chờ bạn!',
      follow: 'Bạn sẽ chọn cách xử lý nào?',
      action: ['THỬ NGAY →', '/thu-thach/#choice'],
    },
    '/tin-tuc/': {
      greeting: 'Cùng khám phá những kiến thức mới nhé!',
      follow: 'Mình có thể giúp bạn tìm bài viết phù hợp.',
    },
    '/video-tinh-huong/': {
      greeting: 'Bạn muốn khám phá tình huống nào hôm nay?',
      follow: 'Mình có thể cùng bạn quan sát và suy nghĩ.',
    },
    '/gio-hang/': {
      greeting: cartItems > 0 ? 'Ồ! Bạn đã chọn được những món mình thích rồi!' : 'Giỏ hàng đang trống nè! Cùng khám phá một chút nhé?',
      follow: cartItems > 0 ? 'Sắp hoàn thành rồi! 🎉' : 'Mình biết một vài điều thú vị đang chờ bạn.',
      action: ['XEM SẢN PHẨM →', '/kham-pha-tro-choi/'],
    },
  };

  const getMascotCopy = (state = 'greeting') => {
    if (state === 'payment') return { message: 'Bước QR đang minh họa thôi nhé. Đừng chuyển tiền trước khi hỏi đội ngũ GORISE!', action: null };
    if (state === 'success') return { message: 'Bạn đã xem xong bản demo! Liên hệ GORISE để đặt hàng thật nhé. 🎉', action: ['TIẾP TỤC KHÁM PHÁ →', '/'] };
    const content = mascotCopy[routePath] || mascotCopy['/'];
    return { message: content[state] || content.greeting, action: state === 'greeting' ? content.action : null };
  };

  const setMascotCopy = (state = 'greeting') => {
    if (!mascotMessage || !mascotAction) return;
    const copy = getMascotCopy(state);
    mascotMessage.textContent = copy.message;
    if (copy.action) {
      mascotAction.hidden = false;
      mascotAction.textContent = copy.action[0];
      mascotAction.href = copy.action[1];
    } else {
      mascotAction.hidden = true;
      mascotAction.removeAttribute('href');
    }
  };

  const initMascot = () => {
    document.body.insertAdjacentHTML('beforeend', `<aside class="mascot-widget" data-mascot data-mascot-state="idle" aria-label="TIGORI — Trợ lý GORISE"><div class="mascot-bubble"><span class="mascot-bubble-kicker">TIGORI · TRỢ LÝ GORISE</span><p data-mascot-message></p><a class="mascot-bubble-action" data-mascot-action href="#"></a><span class="mascot-tail" aria-hidden="true"></span></div><div class="mascot-panel" data-mascot-panel><div class="mascot-panel-heading"><span class="mascot-panel-icon">🐯</span><div><strong>TIGORI – Trợ lý GORISE</strong><small>Người bạn đồng hành trên hành trình khám phá!</small></div></div><button type="button" data-mascot-choice data-question="GORISE là gì?">🎲 GORISE là gì? <span>↗</span></button><button type="button" data-mascot-choice data-question="Khám phá Safe Home">🏠 Khám phá Safe Home <span>↗</span></button><button type="button" data-mascot-choice data-question="Xem video tình huống">🎬 Xem video tình huống <span>↗</span></button><button type="button" data-mascot-choice data-question="Các kỹ năng an toàn">🛡️ Các kỹ năng an toàn <span>↗</span></button><button type="button" data-mascot-choice data-question="Liên hệ GORISE">✉ Liên hệ GORISE <span>↗</span></button><button type="button" data-mascot-ask>❓ Hỏi TIGORI <span>+</span></button></div><button class="mascot-trigger" type="button" aria-label="Mở trợ lý TIGORI" aria-expanded="false"><span class="mascot-platform" aria-hidden="true"></span><span class="mascot-sparkles" aria-hidden="true">✦ · ✧</span><video class="mascot-motion" muted loop playsinline preload="none" aria-label="TIGORI đang chuyển động"><source src="/tigori-assistant.webm" type="video/webm" /></video><img src="/tigori-mascot.png" alt="TIGORI — Trợ lý GORISE" /></button></aside>`);
    mascotRoot = document.querySelector('[data-mascot]');
    mascotMessage = mascotRoot?.querySelector('[data-mascot-message]');
    mascotAction = mascotRoot?.querySelector('[data-mascot-action]');
    const mascotTrigger = mascotRoot?.querySelector('.mascot-trigger');
    const mascotMotion = mascotRoot?.querySelector('.mascot-motion');
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const liteMedia = Boolean(connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '') || (window.matchMedia('(max-width: 600px)').matches && connection?.effectiveType === 'slow-2g'));
    const startMascotMotion = () => { if (!liteMedia && mascotMotion) { mascotMotion.preload = 'metadata'; mascotMotion.play().catch(() => {}); } };
    mascotTrigger?.addEventListener('pointerenter', startMascotMotion, { once: true });
    mascotTrigger?.addEventListener('pointerdown', startMascotMotion, { once: true });
    mascotMotion?.addEventListener('error', () => mascotRoot?.classList.add('mascot-video-fallback'));
    mascotMotion?.addEventListener('loadeddata', () => mascotRoot?.classList.remove('mascot-video-fallback'));
    const setMascotState = (state = 'idle') => {
      if (!mascotRoot) return;
      mascotRoot.dataset.mascotState = state;
      mascotRoot.classList.remove('is-idle', 'is-greeting', 'is-hover', 'is-thinking', 'is-answering', 'is-goodbye');
      mascotRoot.classList.add(`is-${state}`);
    };
    mascotRoot?.addEventListener('gorise-mascot-state', (event) => setMascotState(event.detail?.state || 'idle'));
    mascotTrigger?.addEventListener('mouseenter', () => { setMascotState('hover'); });
    mascotTrigger?.addEventListener('mouseleave', () => { if (!mascotRoot.classList.contains('is-chatting')) setMascotState('idle'); });
    let dragState = null;
    let suppressMascotClick = false;
    const clampMascot = () => {
      if (!mascotRoot || mascotRoot.style.left === '') return;
      const rect = mascotRoot.getBoundingClientRect();
      const left = Math.max(4, Math.min(rect.left, window.innerWidth - rect.width - 4));
      const top = Math.max(4, Math.min(rect.top, window.innerHeight - rect.height - 4));
      mascotRoot.style.left = `${left}px`;
      mascotRoot.style.top = `${top}px`;
    };
    try {
      const stored = JSON.parse(window.localStorage.getItem(mascotPositionKey) || 'null');
      if (stored && Number.isFinite(stored.left) && Number.isFinite(stored.top)) {
        mascotRoot.style.left = `${stored.left}px`;
        mascotRoot.style.top = `${stored.top}px`;
        mascotRoot.style.right = 'auto';
        mascotRoot.style.bottom = 'auto';
        clampMascot();
      }
    } catch {
      // Use the default bottom-right position when storage is unavailable.
    }
    mascotTrigger?.addEventListener('pointerdown', (event) => {
      if (!event.isPrimary || event.button !== 0 || !mascotRoot) return;
      const rect = mascotRoot.getBoundingClientRect();
      dragState = { startX: event.clientX, startY: event.clientY, left: rect.left, top: rect.top, moved: false };
      mascotTrigger.setPointerCapture?.(event.pointerId);
    });
    mascotTrigger?.addEventListener('pointermove', (event) => {
      if (!dragState || !mascotRoot) return;
      const dx = event.clientX - dragState.startX;
      const dy = event.clientY - dragState.startY;
      if (!dragState.moved && Math.hypot(dx, dy) < 6) return;
      dragState.moved = true;
      mascotRoot.classList.add('is-dragging');
      mascotRoot.style.right = 'auto';
      mascotRoot.style.bottom = 'auto';
      mascotRoot.style.left = `${Math.max(4, Math.min(dragState.left + dx, window.innerWidth - mascotRoot.offsetWidth - 4))}px`;
      mascotRoot.style.top = `${Math.max(4, Math.min(dragState.top + dy, window.innerHeight - mascotRoot.offsetHeight - 4))}px`;
      updateMascotCollision();
    });
    const finishMascotDrag = (event) => {
      if (!dragState || !mascotRoot) return;
      if (dragState.moved) {
        suppressMascotClick = true;
        try { window.localStorage.setItem(mascotPositionKey, JSON.stringify({ left: mascotRoot.offsetLeft, top: mascotRoot.offsetTop })); } catch { /* Optional persistence. */ }
        window.setTimeout(() => { suppressMascotClick = false; }, 0);
      }
      dragState = null;
      mascotRoot.classList.remove('is-dragging');
      if (event?.pointerId !== undefined) mascotTrigger.releasePointerCapture?.(event.pointerId);
      updateMascotCollision();
    };
    mascotTrigger?.addEventListener('pointerup', finishMascotDrag);
    mascotTrigger?.addEventListener('pointercancel', finishMascotDrag);
    mascotRoot?.querySelectorAll('[data-mascot-choice]').forEach((choice) => choice.addEventListener('click', async (event) => {
      event.preventDefault();
      try { const { openChat } = await import('/ai-chat.js'); openChat(mascotRoot, choice.dataset.question || 'Mình có thể giúp gì?'); } catch { showToast('Mình chưa mở được cửa sổ trò chuyện. Bạn thử lại nhé!'); }
    }));
    mascotTrigger?.addEventListener('click', (event) => {
      if (suppressMascotClick) { event.preventDefault(); return; }
      if (mascotRoot.classList.contains('is-chatting')) {
        mascotRoot.dispatchEvent(new Event('gorise-close-chat'));
        return;
      }
      const isOpen = mascotRoot.classList.toggle('is-open');
      if (isOpen) { setMascotCopy('greeting'); setMascotState('greeting'); window.setTimeout(() => { if (mascotRoot && !mascotRoot.classList.contains('is-chatting')) setMascotState('idle'); }, 900); }
      mascotRoot.querySelector('.mascot-trigger')?.setAttribute('aria-expanded', String(isOpen));
      mascotRoot.classList.add('is-cheer');
      window.setTimeout(() => mascotRoot?.classList.remove('is-cheer'), 650);
    });
    mascotRoot?.querySelector('[data-mascot-ask]')?.addEventListener('click', async () => {
      try {
        const { openChat } = await import('/ai-chat.js');
        openChat(mascotRoot);
      } catch {
        showToast('Oops! Mình gặp một chút trục trặc. Bạn thử hỏi lại mình nhé! 😅');
      }
    });
    document.addEventListener('click', (event) => {
      if (mascotRoot && !mascotRoot.contains(event.target)) { mascotRoot.classList.remove('is-open'); setMascotState('idle'); }
    });
    let greeted = false;
    try { greeted = sessionStorage.getItem(mascotGreetingKey) === '1'; } catch {}
    if (!greeted) {
      window.setTimeout(() => {
        if (!mascotRoot) return;
        setMascotCopy('greeting');
        mascotRoot.classList.add('is-greeting');
        setMascotState('greeting');
        try { sessionStorage.setItem(mascotGreetingKey, '1'); } catch {}
        window.setTimeout(() => { if (mascotRoot && !mascotRoot.classList.contains('is-open') && !mascotRoot.classList.contains('is-chatting')) { mascotRoot.classList.remove('is-greeting'); setMascotState('idle'); } }, 5600);
      }, 850);
    }
    const mobileViewport = window.matchMedia('(max-width: 600px)');
    const importantActions = document.querySelectorAll('main button, main .button, main .challenge-card-cta, main .continue-shopping, [data-mobile-nav], [data-mobile-sticky-cta]');
    updateMascotCollision = () => {
      if (!mascotRoot || !mobileViewport.matches) {
        mascotRoot?.classList.remove('is-avoiding');
        return;
      }
      const trigger = mascotRoot.querySelector('.mascot-trigger').getBoundingClientRect();
      const overlap = Array.from(importantActions).some((action) => {
        const rect = action.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.left < trigger.right + 8 && rect.right > trigger.left - 8 && rect.top < trigger.bottom + 8 && rect.bottom > trigger.top - 8;
      });
      mascotRoot.classList.toggle('is-avoiding', overlap);
    };
    let collisionFrame = 0;
    const queueCollision = () => {
      if (collisionFrame) return;
      collisionFrame = window.requestAnimationFrame(() => {
        collisionFrame = 0;
        updateMascotCollision();
      });
    };
    window.addEventListener('scroll', queueCollision, { passive: true });
    window.addEventListener('resize', () => { clampMascot(); queueCollision(); });
    queueCollision();
  };

  initMascot();

  const hydrateManagedMedia = async () => {
    const targets = document.querySelectorAll('[data-media-slot]');
    if (!targets.length) return;
    try {
      const response = await fetch('/api/media/active', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const data = await response.json();
      (data.media || []).forEach((item) => {
        document.querySelectorAll(`[data-media-slot=\"${item.slot}\"]`).forEach((image) => {
          const fallback = image.getAttribute('src') || '/product-safe-home.webp';
          image.dataset.mediaFallback = fallback;
          image.onerror = () => {
            if (image.src.endsWith(fallback)) return;
            image.src = fallback;
          };
          image.src = item.stableUrl;
          image.closest('[data-managed-media]')?.removeAttribute('hidden');
        });
      });
    } catch {
      // Keep the authored fallback image if the media index is unavailable.
    }
  };
  hydrateManagedMedia();

  const hydrateHeroVideo = async () => {
    const video = document.querySelector('[data-hero-video]');
    const source = video?.querySelector('[data-hero-video-source]');
    if (!video || !source || source.getAttribute('src')) return;
    try {
      const response = await fetch('/api/videos', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const data = await response.json();
      const heroVideo = (data.videos || []).find((item) => item.stableUrl);
      if (!heroVideo) return;
      source.src = heroVideo.stableUrl;
      source.type = heroVideo.contentType || 'video/mp4';
      video.load();
      video.play().catch(() => {});
    } catch {
      // The fixed local hero video remains the only hero visual when the API is unavailable.
    }
  };
  hydrateHeroVideo();

  const heroSound = document.querySelector('[data-hero-sound]');
  const heroSoundIcon = heroSound?.querySelector('span[aria-hidden]');
  const heroSoundLabel = heroSound?.querySelector('[data-hero-sound-label]');
  const updateHeroSound = () => {
    const isOn = Boolean(heroVideo?.muted === false);
    heroSound?.setAttribute('aria-pressed', String(isOn));
    heroSound?.setAttribute('aria-label', isOn ? 'Tắt âm thanh video' : 'Bật âm thanh video');
    if (heroSoundIcon) heroSoundIcon.textContent = isOn ? '🔊' : '🔇';
    if (heroSoundLabel) heroSoundLabel.textContent = isOn ? 'Âm thanh bật' : 'Âm thanh tắt';
  };
  const heroVideo = document.querySelector('[data-hero-video]');
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const liteConnection = Boolean(connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || ''));
  if (heroVideo && liteConnection) {
    heroVideo.querySelector('source')?.removeAttribute('src');
    heroVideo.load();
    heroVideo.classList.add('is-lite-poster');
  }
  heroSound?.addEventListener('click', () => {
    if (!heroVideo) return;
    heroVideo.muted = !heroVideo.muted;
    if (!heroVideo.muted) heroVideo.play().catch(() => {});
    updateHeroSound();
  });
  updateHeroSound();
  if (heroVideo) {
    const heroSection = heroVideo.closest('.hero-video-banner');
    const playWhenVisible = (entry) => {
      if (liteConnection) return;
      if (entry.isIntersecting) heroVideo.play().catch(() => {});
      else heroVideo.pause();
    };
    if ('IntersectionObserver' in window && heroSection) {
      const heroObserver = new IntersectionObserver((entries) => entries.forEach(playWhenVisible), { threshold: 0.2 });
      heroObserver.observe(heroSection);
    } else {
      heroVideo.play().catch(() => {});
    }
  }

  document.querySelectorAll('[data-product]').forEach((button) => {
    button.addEventListener('click', () => showToast(`${button.dataset.product} đã sẵn sàng để khám phá.`));
  });

  document.querySelector('[data-quantity="minus"]')?.addEventListener('click', () => {
    quantity = Math.max(1, quantity - 1);
    if (quantityValue) quantityValue.textContent = String(quantity);
  });
  document.querySelector('[data-quantity="plus"]')?.addEventListener('click', () => {
    quantity = Math.min(9, quantity + 1);
    if (quantityValue) quantityValue.textContent = String(quantity);
  });
  document.querySelectorAll('[data-add-cart]').forEach((button) => {
    button.addEventListener('click', () => {
      cartItems += quantity;
      storeCart(cartItems);
      updateCart();
      showMiniCart();
      showToast(`Đã thêm ${quantity} bộ GORISE vào giỏ hàng. Bạn có thể tiếp tục khám phá.`);
    });
  });

  document.querySelectorAll('[data-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-choice]').forEach((option) => option.classList.remove('is-selected'));
      button.classList.add('is-selected');
      const feedback = document.querySelector('[data-choice-feedback]');
      if (feedback) feedback.textContent = `Bạn đã chọn phương án ${button.dataset.choice}. Hãy cùng nhau nói về lý do đằng sau lựa chọn này.`;
    });
  });

  document.querySelectorAll('[data-contact-topic]').forEach((button) => button.addEventListener('click', () => {
    const form = document.querySelector('[data-contact-form]');
    const topic = form?.querySelector('select[name=topic]');
    if (topic) topic.value = button.dataset.contactTopic || 'Hợp tác';
    form?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => form?.querySelector('input[name=name]')?.focus(), 450);
  }));

  document.querySelector('[data-contact-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = form.querySelector('[data-form-status]');
    if (status) status.textContent = 'Cảm ơn bạn. Lời nhắn đã được ghi nhận — đội ngũ GORISE sẽ phản hồi sớm.';
    form.reset();
    showToast('Đã gửi lời nhắn đến đội ngũ GORISE.');
  });

  const cartItemsNode = document.querySelector('[data-cart-items]');
  const renderCart = () => {
    if (!cartPage || !cartItemsNode) return;
    const hasItems = cartItems > 0;
    cartItemsNode.innerHTML = hasItems ? `
      <div class="cart-item">
        <div class="cart-product">
          <div class="cart-product-art"><img src="/product-safe-home.webp" alt="Bộ trò chơi GORISE" loading="lazy" decoding="async" /></div>
          <div class="cart-product-info"><strong>GORISE – Board Game</strong><span>Bộ trò chơi giáo dục GORISE</span></div>
        </div>
        <div class="cart-unit-price">299.000₫</div>
        <div class="cart-quantity" aria-label="Số lượng sản phẩm">
          <button type="button" data-cart-qty="minus" aria-label="Giảm số lượng">−</button><span>${cartItems}</span><button type="button" data-cart-qty="plus" aria-label="Tăng số lượng">+</button>
        </div>
        <div class="cart-line-total"><span>${formatVnd(subtotal())}</span><button class="cart-remove" type="button" data-cart-remove aria-label="Xóa sản phẩm">✕</button></div>
      </div>` : '<div class="empty-cart"><span>✦</span><strong>Giỏ hàng đang chờ một cuộc phiêu lưu.</strong><p>Hãy chọn bộ trò chơi GORISE để bắt đầu hành trình.</p><a class="button button-primary" href="/kham-pha-tro-choi/">Khám phá trò chơi <span>↗</span></a></div>';
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
    payment: ['THANH TOÁN MINH HỌA', 'Đây là bản demo: không dùng mã QR này để chuyển tiền.'],
    success: ['HOÀN TẤT BẢN DEMO', 'Bạn chưa tạo đơn hàng thật hoặc được xác minh thanh toán.'],
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
    if (titleNode) titleNode.innerHTML = step === 'success' ? 'HOÀN TẤT <span>BẢN DEMO</span>' : title;
    if (subtitleNode) subtitleNode.textContent = subtitle;
    if (step === 'payment' || step === 'success') mascotRoot?.dispatchEvent(new Event('gorise-close-chat'));
    setMascotCopy(step === 'payment' ? 'payment' : step === 'success' ? 'success' : 'greeting');
    window.requestAnimationFrame(updateMascotCollision);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (cartPage) {
    renderCart();
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
        showToast('Đã xóa sản phẩm khỏi giỏ hàng.');
      }
    });

    document.querySelector('[data-go-info]')?.addEventListener('click', () => {
      if (!cartItems) { showToast('Giỏ hàng đang trống. Hãy chọn một bộ GORISE trước nhé.'); return; }
      setStep('info');
    });
    document.querySelector('[data-shipping-form]')?.addEventListener('submit', (event) => {
      event.preventDefault();
      orderTotal = total();
      setStep('payment');
    });
    document.querySelectorAll('[data-back-step]').forEach((button) => button.addEventListener('click', () => setStep(button.dataset.backStep)));
    document.querySelector('[data-go-success]')?.addEventListener('click', () => {
      orderTotal = total();
      document.querySelectorAll('[data-success-total]').forEach((node) => { node.textContent = formatVnd(orderTotal); });
      cartItems = 0;
      storeCart(cartItems);
      updateCart();
      renderCart();
      setStep('success');
    });
    document.querySelector('[data-reset-order]')?.addEventListener('click', () => {
      setStep('cart');
      showToast('Bạn có thể xem lại hành trình đơn hàng của mình.');
    });
    document.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', async () => {
      const value = button.dataset.copy;
      try {
        await navigator.clipboard.writeText(value);
        showToast('Đã sao chép thông tin chuyển khoản.');
      } catch {
        showToast('Không sao chép được. Hãy chọn và sao chép thông tin thủ công.');
      }
    }));
  }

  const initSafeHomeScene = () => {
    const root = document.querySelector('[data-safe-home-scene]');
    if (!root) return;
    const intro = root.querySelector('[data-safe-intro]');
    const interior = root.querySelector('[data-safe-interior]');
    const leftDoor = root.querySelector('[data-safe-door-left]');
    const rightDoor = root.querySelector('[data-safe-door-right]');
    const frame = root.querySelector('.safe-home-door-frame');
    const finalCopy = root.querySelector('[data-safe-final]');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const render = () => {
      raf = 0;
      const bounds = root.getBoundingClientRect();
      const travel = Math.max(1, root.offsetHeight - window.innerHeight);
      const progress = reduceMotion.matches ? 1 : clamp(-bounds.top / travel, 0, 1);
      const opening = clamp((progress - .12) / .58, 0, 1);
      const reveal = clamp((progress - .28) / .54, 0, 1);
      const introOpacity = 1 - clamp(progress / .28, 0, 1);
      const finalOpacity = clamp((progress - .72) / .2, 0, 1);
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const baseWidth = viewportWidth <= 700 ? Math.min(viewportWidth * .84, 350) : Math.min(viewportWidth * .88, 430);
      const baseHeight = viewportWidth <= 700 ? Math.min(viewportHeight * .54, 360) : Math.min(viewportHeight * .60, 420);
      const targetWidth = viewportWidth;
      const targetHeight = viewportHeight;
      const scaleX = baseWidth ? targetWidth / baseWidth : 1;
      const scaleY = baseHeight ? targetHeight / baseHeight : 1;
      const scale = 1 + (Math.min(scaleX, scaleY) - 1) * reveal;
      const radius = 28 - 28 * reveal;
      intro.style.opacity = String(introOpacity);
      interior.style.opacity = String(.06 + reveal * .94);
      interior.style.clipPath = `inset(${29 - reveal * 29}% ${31 - reveal * 31}% round ${54 - reveal * 54}px)`;
      interior.style.transform = `scale(${.88 + reveal * .12})`;
      interior.style.filter = `saturate(${.9 + reveal * .1}) blur(${5 - reveal * 5}px)`;
      frame.style.transform = `scale(${scale})`;
      // Khi cửa đã mở, nội thất phải nằm trên khung cửa để chuyển cảnh hoàn tất rõ ràng.
      const interiorOnTop = reveal >= .72;
      interior.style.zIndex = interiorOnTop ? '6' : '2';
      frame.style.zIndex = interiorOnTop ? '3' : '4';
      frame.style.borderRadius = `${radius}px ${radius}px ${24 - reveal * 4}px ${24 - reveal * 4}px`;
      leftDoor.style.transform = `translateX(${-opening * 105}%) rotateY(${-opening * 2}deg)`;
      rightDoor.style.transform = `translateX(${opening * 105}%) rotateY(${opening * 2}deg)`;
      finalCopy.style.opacity = String(finalOpacity);
      finalCopy.style.transform = `translate(-50%, ${24 - finalOpacity * 24}px)`;
    };
    const requestRender = () => { if (!raf) raf = window.requestAnimationFrame(render); };
    window.addEventListener('scroll', requestRender, { passive: true });
    window.addEventListener('resize', requestRender);
    reduceMotion.addEventListener?.('change', requestRender);
    requestRender();
  };

  const initCharacterCarousel = () => {
    const root = document.querySelector('[data-character-carousel]');
    if (!root) return;
    const viewport = root.querySelector('.character-viewport');
    const cards = [...root.querySelectorAll('[data-character-card]')];
    const prev = root.querySelector('[data-character-prev]');
    const next = root.querySelector('[data-character-next]');
    const portraits = document.querySelector('[data-character-dots]');
    const decor = root.querySelector('.character-arena-decor');
    const info = document.querySelector('[data-character-info]');
    const name = document.querySelector('[data-character-name]');
    const nickname = document.querySelector('[data-character-nickname]');
    const description = document.querySelector('[data-character-description]');
    const personalityIcon = document.querySelector('[data-character-icon]');
    const position = document.querySelector('[data-character-position]');
    const profiles = [
      { name: 'An', nickname: 'Nhà khám phá', icon: '✦', description: 'Quan sát tốt, luôn lạc quan và thích khám phá những điều mới.', accent: '#2c9bf0', theme: 'an' },
      { name: 'Khang', nickname: 'Người suy nghĩ', icon: '◈', description: 'Điềm tĩnh, logic và luôn bình tĩnh trước mọi tình huống.', accent: '#7b45c7', theme: 'khang' },
      { name: 'Lan', nickname: 'Người lan tỏa', icon: '☀', description: 'Lạc quan, năng động và mang niềm vui đến cho cả nhóm.', accent: '#e6aa16', theme: 'lan' },
      { name: 'Minh', nickname: 'Người dẫn đường', icon: '◆', description: 'Dũng cảm, kiên định và sẵn sàng đối mặt thử thách.', accent: '#167bd1', theme: 'minh' },
      { name: 'Nam', nickname: 'Nhà phân tích', icon: '✧', description: 'Thích tìm tòi, quan sát và cùng cả nhóm tìm ra giải pháp.', accent: '#18a957', theme: 'nam' },
      { name: 'Vy', nickname: 'Người truyền cảm hứng', icon: '⚡', description: 'Nhiệt huyết, vui vẻ và luôn khích lệ mọi người tiến lên.', accent: '#d82e46', theme: 'vy' }
    ];
    const total = cards.length;
    let active = 0;
    let touchStartX = 0;
    const clampWrap = (value) => (value + total) % total;
    const updateInfo = () => {
      const profile = profiles[active];
      root.style.setProperty('--character-accent', profile.accent);
      root.dataset.characterTheme = profile.theme;
      decor.classList.remove('is-changing');
      position.textContent = String(active + 1).padStart(2, '0');
      info.classList.remove('is-changing');
      requestAnimationFrame(() => {
        name.textContent = profile.name;
        nickname.textContent = profile.nickname;
        personalityIcon.textContent = profile.icon;
        description.textContent = profile.description;
        info.classList.add('is-changing');
        decor.classList.add('is-changing');
        window.setTimeout(() => info.classList.remove('is-changing'), 520);
      });
    };
    const portraitOrder = [3, 2, 4, 1, 5, 0];
    portraitOrder.forEach((index) => {
      const profile = profiles[index];
      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = `character-portrait${index === active ? ' is-active' : ''}`;
      thumb.dataset.characterThumb = String(index);
      thumb.setAttribute('aria-label', `Chọn nhân vật ${profile.name}`);
      thumb.innerHTML = `<img src="${cards[index].querySelector('img').src}" alt="${profile.name}" loading="lazy" />`;
      thumb.addEventListener('click', () => { active = index; render(); });
      portraits.append(thumb);
    });
    cards.forEach((card, index) => {
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.addEventListener('click', () => { active = index; render(); });
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          active = index;
          render();
        }
      });
    });
    const render = () => {
      const compact = window.innerWidth <= 700;
      const cardWidth = Math.min(viewport.clientWidth * (compact ? .70 : .26), compact ? 320 : 300);
      const step = cardWidth * (compact ? .72 : .78);
      cards.forEach((card, index) => {
        let relative = ((index - active + total + Math.floor(total / 2)) % total) - Math.floor(total / 2);
        if (relative === -Math.floor(total / 2) && total % 2 === 0 && index > active) relative = total / 2;
        const distance = Math.abs(relative);
        const scale = distance === 0 ? 1 : distance === 1 ? .86 : distance === 2 ? .72 : .58;
        card.classList.toggle('is-active', distance === 0);
        card.classList.toggle('is-near', distance === 1);
        card.style.transform = `translateX(calc(-50% + ${relative * step}px)) scale(${scale})`;
        card.style.zIndex = String(10 - distance);
        card.setAttribute('aria-hidden', distance > 2 ? 'true' : 'false');
      });
      [...portraits.children].forEach((thumb) => thumb.classList.toggle('is-active', Number(thumb.dataset.characterThumb) === active));
      updateInfo();
    };
    prev.addEventListener('click', () => { active = clampWrap(active - 1); render(); });
    next.addEventListener('click', () => { active = clampWrap(active + 1); render(); });
    root.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') { active = clampWrap(active - 1); render(); }
      if (event.key === 'ArrowRight') { active = clampWrap(active + 1); render(); }
    });
    viewport.addEventListener('touchstart', (event) => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
    viewport.addEventListener('touchend', (event) => {
      const delta = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(delta) > 42) { active = clampWrap(active + (delta < 0 ? 1 : -1)); render(); }
    }, { passive: true });
    root.addEventListener('pointermove', (event) => {
      if (window.innerWidth <= 700) return;
      const bounds = root.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - .5) * 12;
      const y = ((event.clientY - bounds.top) / bounds.height - .5) * 7;
      decor.style.setProperty('--arena-shift-x', `${x.toFixed(2)}px`);
      decor.style.setProperty('--arena-shift-y', `${y.toFixed(2)}px`);
    });
    root.addEventListener('pointerleave', () => {
      decor.style.setProperty('--arena-shift-x', '0px');
      decor.style.setProperty('--arena-shift-y', '0px');
    });
    root.tabIndex = 0;
    window.addEventListener('resize', render);
    render();
  };
  const initReferenceGameplay = () => {
    const root = document.querySelector('[data-reference-gameplay]');
    if (!root) return;
    const stepPopup = root.querySelector('[data-step-popup]');
    const boardPopup = root.querySelector('[data-board-popup]');
    const characterPopup = root.querySelector('[data-character-popup]');
    const stepData = {
      observe: { progress:'01 / 04', title:'Khám phá tình huống', copy:'Quan sát tình huống trên thẻ bài hoặc video để nhận biết những nguy hiểm có thể xảy ra.', action:'Xem tình huống', href:'/video-tinh-huong/' },
      choose: { progress:'02 / 04', title:'Cùng nhau quyết định', copy:'Người chơi thảo luận và lựa chọn phương án xử lý phù hợp với tình huống.', choices:true },
      result: { progress:'03 / 04', title:'Khám phá điều xảy ra', copy:'Sau khi lựa chọn, người chơi khám phá kết quả và tìm hiểu vì sao hành động đó an toàn hoặc chưa an toàn.', action:'Lật thẻ kết quả' },
      learn: { progress:'04 / 04', title:'Ghi nhớ bài học an toàn', copy:'Người chơi cùng nhìn lại tình huống, ghi nhớ cách xử lý phù hợp và vận dụng vào cuộc sống.', action:'Mở thẻ bài học' }
    };
    const boardData = {
      blue:['Khám phá tình huống','Ô xanh dương – Quan sát: khám phá tình huống an toàn.'], yellow:['Cùng nhau suy nghĩ','Ô vàng – Thảo luận và lựa chọn phương án phù hợp.'], purple:['Khám phá gợi ý','Ô tím – Gợi ý cách xử lý để cùng trao đổi.'], teal:['Tiến trình an toàn','Ô xanh ngọc – Ghi nhận tiến trình an toàn.'], red:['Thử thách mới','Ô đỏ – Khám phá một thử thách mới.'], explore:['Mở rộng khám phá','Ô xanh dương kính lúp – Tìm thêm manh mối trong tình huống.'], goal:['Hoàn thành hành trình','Ô GOAL – Về đích và hoàn thành hành trình khám phá.']
    };
    const characterData = { TIGORI:'Người bạn đồng hành trong hành trình an toàn.', Minh:'Dũng cảm.', An:'Cẩn thận.', Khang:'Bình tĩnh và logic.', Nam:'Thông minh, biết phân tích.', Vy:'Nhiệt tình, biết hợp tác.' };
    const close = (popup) => { if (popup) popup.hidden = true; };
    const openStep = (key) => {
      const d=stepData[key]; if (!d) return;
      root.querySelectorAll('[data-step-hotspot]').forEach((el) => el.classList.toggle('is-active', el.dataset.stepHotspot===key));
      root.querySelector('[data-step-progress]').textContent=d.progress; root.querySelector('[data-step-title]').textContent=d.title; root.querySelector('[data-step-copy]').textContent=d.copy;
      const choices=root.querySelector('[data-choice-row]'), action=root.querySelector('[data-step-action]'); choices.hidden=!d.choices; action.hidden=!d.action; action.textContent=d.action||''; action.dataset.href=d.href||''; action.dataset.stepAction=key;
      stepPopup.hidden=false;
    };
    root.querySelectorAll('[data-step-hotspot]').forEach((el) => el.addEventListener('click', () => openStep(el.dataset.stepHotspot)));
    root.querySelector('[data-step-close]')?.addEventListener('click', () => close(stepPopup));
    root.querySelector('[data-step-action]')?.addEventListener('click', (event) => { const button=event.currentTarget; if (button.dataset.href) window.location.href=button.dataset.href; else { button.textContent=button.dataset.stepAction==='result'?'Đã lật thẻ kết quả':'Đã mở bài học'; button.classList.add('is-flipped'); } });
    root.querySelectorAll('[data-board-tile]').forEach((el) => el.addEventListener('click', () => { const d=boardData[el.dataset.boardTile]; root.querySelectorAll('[data-board-tile]').forEach((tile)=>tile.classList.toggle('is-active',tile===el)); root.querySelector('[data-board-title]').textContent=d[0]; root.querySelector('[data-board-copy]').textContent=d[1]; boardPopup.hidden=false; }));
    root.querySelector('[data-board-close]')?.addEventListener('click', () => close(boardPopup));
    root.querySelectorAll('[data-character-hotspot]').forEach((el) => el.addEventListener('click', () => { const name=el.dataset.characterHotspot; root.querySelectorAll('[data-character-hotspot]').forEach((item)=>item.classList.toggle('is-active',item===el)); root.querySelector('[data-character-title]').textContent=name; root.querySelector('[data-character-copy]').textContent=characterData[name]; characterPopup.hidden=false; }));
    root.querySelector('[data-character-close]')?.addEventListener('click', () => close(characterPopup));
    const boardScene=root.querySelector('.gameplay-reference-scene-two'), tiles=[...root.querySelectorAll('[data-board-tile]')], assets=[...root.querySelectorAll('[data-board-asset]')], characters=[...root.querySelectorAll('[data-character-hotspot]')], start=root.querySelector('[data-journey-start]'), reset=root.querySelector('[data-journey-reset]'), status=root.querySelector('[data-journey-status]');
    let journeyTimers=[];
    const clearJourney=()=>journeyTimers.forEach(window.clearTimeout);
    const runJourney=()=>{ clearJourney(); boardScene.classList.remove('journey-complete'); boardScene.classList.add('journey-running'); tiles.forEach((tile)=>tile.classList.remove('journey-active')); assets.forEach((asset)=>asset.classList.remove('journey-active','journey-completed')); characters.forEach((character)=>character.classList.remove('is-active')); start.hidden=true; reset.hidden=false; status.textContent='Hành trình đang bắt đầu…'; tiles.forEach((tile,index)=>{ journeyTimers.push(window.setTimeout(()=>{ tile.classList.add('journey-active'); const asset=assets.find((item)=>item.dataset.boardAsset===tile.dataset.boardTile); asset?.classList.add('journey-active'); if(index>0){ const previous=assets.find((item)=>item.dataset.boardAsset===tiles[index-1].dataset.boardTile); previous?.classList.add('journey-completed'); } characters[index]?.classList.add('is-active'); status.textContent=index===tiles.length-1?'Chúc mừng! Hành trình khám phá Safe Home đã hoàn thành!':`Đang tiến tới ô ${index+1}…`; if(index===tiles.length-1) boardScene.classList.add('journey-complete'); },index*680)); }); };
    const resetJourney=()=>{ clearJourney(); boardScene.classList.remove('journey-running','journey-complete'); tiles.forEach((tile)=>tile.classList.remove('journey-active')); assets.forEach((asset)=>asset.classList.remove('journey-active','journey-completed')); characters.forEach((character)=>character.classList.remove('is-active')); start.hidden=false; reset.hidden=true; status.textContent=''; };
    start?.addEventListener('click',runJourney); reset?.addEventListener('click',resetJourney);
  };
  const initGameplayJourney = () => {
    const root = document.querySelector('[data-gameplay-journey]');
    if (!root) return;
    const board = root.querySelector('.gameplay-board');
    const stations = [...root.querySelectorAll('[data-gameplay-step]')];
    const modal = root.querySelector('[data-gameplay-modal]');
    const modalIcon = root.querySelector('[data-gameplay-modal-icon]');
    const modalKicker = root.querySelector('[data-gameplay-modal-kicker]');
    const modalTitle = root.querySelector('[data-gameplay-modal-title]');
    const modalCopy = root.querySelector('[data-gameplay-modal-copy]');
    const details = {
      observe: { number: '01', title: 'Quan sát', icon: '◉', color: '#2999eb', copy: 'Nhìn kỹ tình huống và cùng nhau gọi tên điều đang xảy ra trước khi hành động.' },
      choose: { number: '02', title: 'Lựa chọn', icon: '↗', color: '#e7a51a', copy: 'Cùng trao đổi các phương án A, B, C và chọn cách xử lý phù hợp nhất.' },
      result: { number: '03', title: 'Kết quả', icon: '✦', color: '#18b7a5', copy: 'Xem điều gì xảy ra sau lựa chọn để hiểu rõ hơn về rủi ro và hành động an toàn.' },
      learn: { number: '04', title: 'Bài học', icon: '▤', color: '#8b62d5', copy: 'Ghi nhớ bài học, chia sẻ suy nghĩ và sẵn sàng áp dụng vào những tình huống đời thường.' }
    };
    const setActive = (step) => {
      stations.forEach((station) => station.classList.toggle('is-active', station.dataset.gameplayStep === step));
    };
    const openModal = (step) => {
      const detail = details[step];
      if (!detail) return;
      setActive(step);
      modalIcon.textContent = detail.icon;
      modalIcon.style.setProperty('--modal-color', detail.color);
      modalKicker.textContent = `BƯỚC ${detail.number}`;
      modalTitle.textContent = detail.title;
      modalCopy.textContent = detail.copy;
      modal.hidden = false;
      document.body.classList.add('has-gameplay-modal');
      modal.querySelector('.gameplay-modal-close')?.focus();
    };
    const closeModal = () => { modal.hidden = true; document.body.classList.remove('has-gameplay-modal'); };
    stations.forEach((station) => {
      station.addEventListener('click', () => openModal(station.dataset.gameplayStep));
      station.addEventListener('focus', () => setActive(station.dataset.gameplayStep));
    });
    root.querySelectorAll('[data-gameplay-close]').forEach((element) => element.addEventListener('click', closeModal));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) closeModal(); });
    if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const observer = new IntersectionObserver((entries, currentObserver) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          root.classList.add('is-gameplay-visible');
          currentObserver.disconnect();
        }
      }, { threshold: .18 });
      observer.observe(board);
    } else root.classList.add('is-gameplay-visible');
  };
  const initSafetyMap = () => {
    const map = document.querySelector('[data-safety-map]');
    if (!map) return;
    const stations = [...map.querySelectorAll('[data-map-station]')];
    const pins = [...map.querySelectorAll('[data-map-pin]')];
    const syncTopic = (topic, active) => {
      pins.filter((pin) => pin.dataset.mapPin === topic).forEach((pin) => pin.classList.toggle('is-highlighted', active));
      stations.filter((station) => new URL(station.href, window.location.origin).searchParams.get('topic') === topic).forEach((station) => station.classList.toggle('is-linked', active));
      const connector = map.querySelector(`.safety-map-link-${topic}`);
      if (connector) connector.classList.toggle('is-highlighted', active);
    };
    stations.forEach((station) => {
      const topic = new URL(station.href, window.location.origin).searchParams.get('topic');
      station.addEventListener('pointerenter', () => syncTopic(topic, true));
      station.addEventListener('pointerleave', () => syncTopic(topic, false));
      station.addEventListener('focus', () => syncTopic(topic, true));
      station.addEventListener('blur', () => syncTopic(topic, false));
    });
    pins.forEach((pin) => {
      const topic = pin.dataset.mapPin;
      pin.addEventListener('pointerenter', () => syncTopic(topic, true));
      pin.addEventListener('pointerleave', () => syncTopic(topic, false));
      pin.addEventListener('focus', () => syncTopic(topic, true));
      pin.addEventListener('blur', () => syncTopic(topic, false));
    });
    const showMap = () => {
      map.classList.add('is-map-visible');
      stations.forEach((station, index) => {
        window.setTimeout(() => station.classList.add('is-visible'), 120 + index * 110);
      });
    };
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries, currentObserver) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          showMap();
          currentObserver.disconnect();
        }
      }, { threshold: .2 });
      observer.observe(map);
    } else showMap();
  };
  const initQuickSectionNav = () => {
    const nav = document.querySelector('[data-quick-section-nav]');
    if (!nav) return;
    const links = [...nav.querySelectorAll('[data-quick-target]')];
    const targets = links.map((link) => document.getElementById(link.dataset.quickTarget)).filter(Boolean);
    const setActive = (id) => links.forEach((link) => {
      const active = link.dataset.quickTarget === id;
      link.classList.toggle('is-active', active);
      link.setAttribute('aria-current', active ? 'step' : 'false');
    });
    links.forEach((link) => link.addEventListener('click', (event) => {
      const target = document.getElementById(link.dataset.quickTarget);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActive(link.dataset.quickTarget);
      window.history.replaceState(null, '', `#${link.dataset.quickTarget}`);
    }));
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio).slice(0, 1).forEach((entry) => setActive(entry.target.id));
      }, { rootMargin: '-28% 0px -55% 0px', threshold: [0.05, 0.2, 0.5] });
      targets.forEach((target) => observer.observe(target));
    }
    setActive(window.location.hash ? window.location.hash.slice(1) : 'top');
  };
  const initAboutHeroCta = () => {
    document.querySelectorAll('[data-about-hero-cta]').forEach((link) => link.addEventListener('click', (event) => {
      const target = document.getElementById('cau-chuyen-gorise');
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      window.history.replaceState(null, '', '#cau-chuyen-gorise');
    }));
  };
  const initAboutStory = () => {
    const more = document.querySelector('[data-about-story-more]');
    const toggle = document.querySelector('[data-about-story-toggle]');
    const label = document.querySelector('[data-about-story-toggle-label]');
    const icon = document.querySelector('[data-about-story-toggle-icon]');
    if (more && toggle) toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      more.hidden = expanded;
      toggle.setAttribute('aria-expanded', String(!expanded));
      if (label) label.textContent = expanded ? 'Đọc tiếp câu chuyện GORISE' : 'Thu gọn câu chuyện';
      if (icon) icon.textContent = expanded ? '↓' : '↑';
    });
    document.querySelectorAll('[data-about-story-cta]').forEach((link) => link.addEventListener('click', (event) => {
      const target = document.getElementById('y-tuong-gorise');
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      window.history.replaceState(null, '', '#y-tuong-gorise');
    }));
  };
  const initAboutStorybook = () => {
    const root = document.querySelector('[data-storybook]');
    if (!root) return;
    const section = document.querySelector('#y-tuong-gorise');
    const image = root.querySelector('[data-storybook-image]');
    const blur = root.querySelector('[data-storybook-blur]');
    const flip = root.querySelector('[data-storybook-flip]');
    const flipFront = root.querySelector('[data-storybook-flip-front]');
    const flipBack = root.querySelector('[data-storybook-flip-back]');
    const prev = root.querySelector('[data-storybook-prev]');
    const next = root.querySelector('[data-storybook-next]');
    const nextLabel = root.querySelector('[data-storybook-next-label]');
    const counter = root.querySelector('[data-storybook-counter]');
    const dots = [...root.querySelectorAll('[data-storybook-dot]')];
    const pages = [1, 2, 3, 4].map((n) => `/about-idea-page-0${n}.webp`);
    let currentPage = 0;
    let isFlipping = false;
    pages.forEach((src) => { const preload = new Image(); preload.src = src; });
    const updateControls = () => {
      if (counter) counter.textContent = `${String(currentPage + 1).padStart(2, '0')} / 04`;
      if (prev) prev.disabled = currentPage === 0 || isFlipping;
      if (next) {
        next.disabled = isFlipping;
        next.classList.toggle('is-discover', currentPage === pages.length - 1);
        if (nextLabel) nextLabel.textContent = currentPage === pages.length - 1 ? 'Khám phá tiếp →' : '→';
        next.setAttribute('aria-label', currentPage === pages.length - 1 ? 'Khám phá tiếp' : 'Trang tiếp');
      }
      dots.forEach((dot, index) => dot.setAttribute('aria-selected', String(index === currentPage)));
    };
    const finishFlip = (target, direction) => {
      currentPage = target;
      if (image) { image.src = pages[currentPage]; image.alt = `Flashcard ${String(currentPage + 1).padStart(2, '0')} — GORISE`; }
      if (flip) flip.classList.remove(direction === 'next' ? 'is-flipping-forward' : 'is-flipping-back');
      if (flip) flip.style.visibility = 'hidden';
      isFlipping = false;
      updateControls();
      window.setTimeout(() => root.classList.remove('is-storybook-transitioning'), 180);
    };
    const goTo = (target) => {
      if (isFlipping || target < 0 || target >= pages.length || target === currentPage) return;
      const direction = target > currentPage ? 'next' : 'prev';
      isFlipping = true;
      root.classList.add('is-storybook-transitioning');
      if (blur) blur.src = pages[target];
      if (flipFront) flipFront.src = pages[currentPage];
      if (flipBack) flipBack.src = pages[target];
      if (flip) {
        flip.classList.remove('is-flipping-forward', 'is-flipping-back');
        flip.style.visibility = 'visible';
        void flip.offsetWidth;
        flip.classList.add(direction === 'next' ? 'is-flipping-forward' : 'is-flipping-back');
        flip.addEventListener('animationend', () => finishFlip(target, direction), { once: true });
      } else finishFlip(target, direction);
      updateControls();
    };
    prev?.addEventListener('click', () => goTo(currentPage - 1));
    next?.addEventListener('click', () => {
      if (currentPage === pages.length - 1) { document.querySelector('#about-vision-mission')?.scrollIntoView({ behavior: 'smooth' }); return; }
      goTo(currentPage + 1);
    });
    dots.forEach((dot) => dot.addEventListener('click', () => goTo(Number(dot.dataset.storybookDot))));
    section?.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); goTo(currentPage + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(currentPage - 1); }
    });
    let touchStartX = 0;
    root.addEventListener('touchstart', (event) => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', (event) => { const delta = event.changedTouches[0].clientX - touchStartX; if (Math.abs(delta) > 45) goTo(currentPage + (delta < 0 ? 1 : -1)); }, { passive: true });
    updateControls();
  };
  const initAboutSpaceBanner = () => {
    const banner = document.querySelector('.about-space-banner');
    if (!banner) return;
    if (!('IntersectionObserver' in window)) { banner.classList.add('is-visible'); return; }
    const observer = new IntersectionObserver((entries, instance) => {
      if (entries.some((entry) => entry.isIntersecting)) { banner.classList.add('is-visible'); instance.disconnect(); }
    }, { threshold: 0.18 });
    observer.observe(banner);
  };
  initReferenceGameplay();
  initCharacterCarousel();
  initSafeHomeScene();
  initGameplayJourney();
  initSafetyMap();
  initQuickSectionNav();
  initAboutHeroCta();
  initAboutStory();
  initAboutStorybook();
  initAboutSpaceBanner();

  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach((element) => observer.observe(element));
  } else {
    reveals.forEach((element) => element.classList.add('is-visible'));
  }
})();
