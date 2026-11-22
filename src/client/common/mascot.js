/**
 * ============================================================================
 * GORISE MASCOT WIDGET — TIGORI
 * File: src/client/common/mascot.js
 * Mô tả: Widget trợ lý hoạt hình Tigori: kéo thả, ghi nhớ tọa độ, hội thoại theo route,
 *        tích hợp mở AI chat và chống đè lên các nút thao tác trên mobile
 * ============================================================================
 */
(() => {
  const Gorise = window.Gorise || {};
  const routePath = Gorise.routePath || window.location.pathname.replace(/\/$/, '') || '/';
  const mascotPositionKey = 'goriseMascotPosition';
  const mascotGreetingKey = 'goriseMascotGreetingV2';

  let mascotRoot = null;
  let mascotMessage = null;
  let mascotAction = null;
  let updateMascotCollision = () => {};

  const mascotCopy = {
    '/': {
      greeting: 'Chào bạn! Cùng TIGORI khám phá GORISE nhé!',
      follow: 'Mình sẽ đồng hành cùng bạn trong hành trình này nhé!',
      action: ['KHÁM PHÁ NGAY →', '/kham-pha-tro-choi/'],
    },
    '/ve-gorise': {
      greeting: 'Bạn tò mò GORISE ra đời như thế nào à?',
      follow: 'Để mình kể bạn nghe câu chuyện phía sau GORISE nhé!',
    },
    '/kham-pha-tro-choi': {
      greeting: 'Đoán xem trong hộp GORISE có gì nào?',
      follow: 'Có rất nhiều điều thú vị đang chờ bạn khám phá!',
      action: ['KHÁM PHÁ →', '/kham-pha-tro-choi/#buy'],
    },
    '/thu-thach': {
      greeting: 'Một thử thách mới đang chờ bạn!',
      follow: 'Bạn sẽ chọn cách xử lý nào?',
      action: ['THỬ NGAY →', '/thu-thach/#choice'],
    },
    '/tin-tuc': {
      greeting: 'Cùng khám phá những kiến thức mới nhé!',
      follow: 'Mình có thể giúp bạn tìm bài viết phù hợp.',
    },
    '/video-tinh-huong': {
      greeting: 'Bạn muốn khám phá tình huống nào hôm nay?',
      follow: 'Mình có thể cùng bạn quan sát và suy nghĩ.',
    },
    '/gio-hang': {
      greeting: () => (Gorise.cartItems > 0 ? 'Ồ! Bạn đã chọn được những món mình thích rồi!' : 'Giỏ hàng đang trống nè! Cùng khám phá một chút nhé?'),
      follow: () => (Gorise.cartItems > 0 ? 'Sắp hoàn thành rồi! 🎉' : 'Mình biết một vài điều thú vị đang chờ bạn.'),
      action: ['XEM SẢN PHẨM →', '/kham-pha-tro-choi/'],
    },
  };

  const getMascotCopy = (state = 'greeting') => {
    if (state === 'payment') {
      return { message: 'Bước QR đang minh họa thôi nhé. Đừng chuyển tiền trước khi hỏi đội ngũ GORISE!', action: null };
    }
    if (state === 'success') {
      return { message: 'Bạn đã hoàn tất đặt hàng demo! Liên hệ GORISE để được hỗ trợ nhé. 🎉', action: ['TIẾP TỤC KHÁM PHÁ →', '/'] };
    }
    const content = mascotCopy[routePath] || mascotCopy['/'];
    const greetingMsg = typeof content.greeting === 'function' ? content.greeting() : content.greeting;
    const followMsg = typeof content.follow === 'function' ? content.follow() : content.follow;
    const message = state === 'greeting' ? greetingMsg : (followMsg || greetingMsg);
    return { message, action: state === 'greeting' ? content.action : null };
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
    if (document.querySelector('[data-mascot]')) return;

    document.body.insertAdjacentHTML(
      'beforeend',
      `<aside class="mascot-widget" data-mascot data-mascot-state="idle" aria-label="TIGORI — Trợ lý GORISE">
        <div class="mascot-bubble">
          <span class="mascot-bubble-kicker">TIGORI · TRỢ LÝ GORISE</span>
          <p data-mascot-message></p>
          <a class="mascot-bubble-action" data-mascot-action href="#"></a>
          <span class="mascot-tail" aria-hidden="true"></span>
        </div>
        <div class="mascot-panel" data-mascot-panel>
          <div class="mascot-panel-heading">
            <span class="mascot-panel-icon">🐯</span>
            <div>
              <strong>TIGORI – Trợ lý GORISE</strong>
              <small>Người bạn đồng hành trên hành trình khám phá!</small>
            </div>
          </div>
          <button type="button" data-mascot-choice data-question="GORISE là gì?">🎲 GORISE là gì? <span>↗</span></button>
          <button type="button" data-mascot-choice data-question="Khám phá Safe Home">🏠 Khám phá Safe Home <span>↗</span></button>
          <button type="button" data-mascot-choice data-question="Xem video tình huống">🎬 Xem video tình huống <span>↗</span></button>
          <button type="button" data-mascot-choice data-question="Các kỹ năng an toàn">🛡️ Các kỹ năng an toàn <span>↗</span></button>
          <button type="button" data-mascot-choice data-question="Liên hệ GORISE">✉ Liên hệ GORISE <span>↗</span></button>
          <button type="button" data-mascot-ask>❓ Hỏi TIGORI <span>+</span></button>
        </div>
        <button class="mascot-trigger" type="button" aria-label="Mở trợ lý TIGORI" aria-expanded="false">
          <span class="mascot-platform" aria-hidden="true"></span>
          <span class="mascot-sparkles" aria-hidden="true">✦ · ✧</span>
          <video class="mascot-motion" muted loop playsinline preload="none" aria-label="TIGORI đang chuyển động">
            <source src="/tigori-assistant.webm" type="video/webm" />
          </video>
          <img src="/tigori-mascot.png" alt="TIGORI — Trợ lý GORISE" />
        </button>
      </aside>`
    );

    mascotRoot = document.querySelector('[data-mascot]');
    mascotMessage = mascotRoot?.querySelector('[data-mascot-message]');
    mascotAction = mascotRoot?.querySelector('[data-mascot-action]');
    const mascotTrigger = mascotRoot?.querySelector('.mascot-trigger');
    const mascotMotion = mascotRoot?.querySelector('.mascot-motion');

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const liteMedia = Boolean(
      connection?.saveData ||
        /(^|-)2g$/.test(connection?.effectiveType || '') ||
        (window.matchMedia('(max-width: 600px)').matches && connection?.effectiveType === 'slow-2g')
    );

    const startMascotMotion = () => {
      if (!liteMedia && mascotMotion) {
        mascotMotion.preload = 'metadata';
        mascotMotion.play().catch(() => {});
      }
    };

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
    mascotTrigger?.addEventListener('mouseenter', () => setMascotState('hover'));
    mascotTrigger?.addEventListener('mouseleave', () => {
      if (!mascotRoot.classList.contains('is-chatting')) setMascotState('idle');
    });

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
    } catch {}

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
        try {
          window.localStorage.setItem(
            mascotPositionKey,
            JSON.stringify({ left: mascotRoot.offsetLeft, top: mascotRoot.offsetTop })
          );
        } catch {}
        window.setTimeout(() => {
          suppressMascotClick = false;
        }, 0);
      }
      dragState = null;
      mascotRoot.classList.remove('is-dragging');
      if (event?.pointerId !== undefined) mascotTrigger.releasePointerCapture?.(event.pointerId);
      updateMascotCollision();
    };

    mascotTrigger?.addEventListener('pointerup', finishMascotDrag);
    mascotTrigger?.addEventListener('pointercancel', finishMascotDrag);

    mascotRoot?.querySelectorAll('[data-mascot-choice]').forEach((choice) =>
      choice.addEventListener('click', async (event) => {
        event.preventDefault();
        try {
          const { openChat } = await import('/ai-chat.js');
          openChat(mascotRoot, choice.dataset.question || 'Mình có thể giúp gì?');
        } catch {
          Gorise.toast?.('Mình chưa mở được cửa sổ trò chuyện. Bạn thử lại nhé!');
        }
      })
    );

    mascotTrigger?.addEventListener('click', (event) => {
      if (suppressMascotClick) {
        event.preventDefault();
        return;
      }
      if (mascotRoot.classList.contains('is-chatting')) {
        mascotRoot.dispatchEvent(new Event('gorise-close-chat'));
        return;
      }
      const isOpen = mascotRoot.classList.toggle('is-open');
      if (isOpen) {
        setMascotCopy('greeting');
        setMascotState('greeting');
        window.setTimeout(() => {
          if (mascotRoot && !mascotRoot.classList.contains('is-chatting')) setMascotState('idle');
        }, 900);
      }
      mascotRoot.querySelector('.mascot-trigger')?.setAttribute('aria-expanded', String(isOpen));
      mascotRoot.classList.add('is-cheer');
      window.setTimeout(() => mascotRoot?.classList.remove('is-cheer'), 650);
    });

    mascotRoot?.querySelector('[data-mascot-ask]')?.addEventListener('click', async () => {
      try {
        const { openChat } = await import('/ai-chat.js');
        openChat(mascotRoot);
      } catch {
        Gorise.toast?.('Oops! Mình gặp một chút trục trặc. Bạn thử hỏi lại mình nhé! 😅');
      }
    });

    document.addEventListener('click', (event) => {
      if (mascotRoot && !mascotRoot.contains(event.target)) {
        mascotRoot.classList.remove('is-open');
        setMascotState('idle');
      }
    });

    let greeted = false;
    try {
      greeted = sessionStorage.getItem(mascotGreetingKey) === '1';
    } catch {}
    if (!greeted) {
      window.setTimeout(() => {
        if (!mascotRoot) return;
        setMascotCopy('greeting');
        mascotRoot.classList.add('is-greeting');
        setMascotState('greeting');
        try {
          sessionStorage.setItem(mascotGreetingKey, '1');
        } catch {}
        window.setTimeout(() => {
          if (mascotRoot && !mascotRoot.classList.contains('is-open') && !mascotRoot.classList.contains('is-chatting')) {
            mascotRoot.classList.remove('is-greeting');
            setMascotState('idle');
          }
        }, 5600);
      }, 850);
    }

    const mobileViewport = window.matchMedia('(max-width: 600px)');
    const importantActions = document.querySelectorAll(
      'main button, main .button, main .challenge-card-cta, main .continue-shopping, [data-mobile-nav], [data-mobile-sticky-cta]'
    );

    updateMascotCollision = () => {
      if (!mascotRoot || !mobileViewport.matches) {
        mascotRoot?.classList.remove('is-avoiding');
        return;
      }
      const trigger = mascotRoot.querySelector('.mascot-trigger')?.getBoundingClientRect();
      if (!trigger) return;
      const overlap = Array.from(importantActions).some((action) => {
        const rect = action.getBoundingClientRect();
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          rect.left < trigger.right + 8 &&
          rect.right > trigger.left - 8 &&
          rect.top < trigger.bottom + 8 &&
          rect.bottom > trigger.top - 8
        );
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
    window.addEventListener('resize', () => {
      clampMascot();
      queueCollision();
    });
    queueCollision();
  };

  initMascot();
})();
