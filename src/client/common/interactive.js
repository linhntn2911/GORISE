/**
 * ============================================================================
 * GORISE INTERACTIVE EXPERIENCES & GAMEPLAY
 * File: src/client/common/interactive.js
 * Mô tả: Cảnh 3D mở cửa Safe Home, vòng xoay nhân vật (An, Khang, Lan, Minh, Nam, Vy),
 *        bản đồ an toàn, gameplay journey modal, sách lật storybook và form liên hệ
 * ============================================================================
 */
(() => {
  const Gorise = window.Gorise || {};

  // 1. Tương tác chung (Nút lựa chọn A/B/C, topic liên hệ, media động)
  const initGeneralInteractions = () => {
    document.querySelectorAll('[data-product]').forEach((button) => {
      button.addEventListener('click', () => {
        Gorise.toast?.(`${button.dataset.product} đã sẵn sàng để khám phá.`);
      });
    });

    document.querySelectorAll('[data-choice]').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('[data-choice]').forEach((option) => option.classList.remove('is-selected'));
        button.classList.add('is-selected');
        const feedback = document.querySelector('[data-choice-feedback]');
        if (feedback) {
          feedback.textContent = `Bạn đã chọn phương án ${button.dataset.choice}. Hãy cùng nhau nói về lý do đằng sau lựa chọn này.`;
        }
      });
    });

    document.querySelectorAll('[data-contact-topic]').forEach((button) =>
      button.addEventListener('click', () => {
        const form = document.querySelector('[data-contact-form]');
        const topic = form?.querySelector('select[name=topic]');
        if (topic) topic.value = button.dataset.contactTopic || 'Hợp tác';
        form?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => form?.querySelector('input[name=name]')?.focus(), 450);
      })
    );

    document.querySelector('[data-contact-form]')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const status = form.querySelector('[data-form-status]');
      if (status) status.textContent = 'Cảm ơn bạn. Lời nhắn đã được ghi nhận — đội ngũ GORISE sẽ phản hồi sớm.';
      form.reset();
      Gorise.toast?.('Đã gửi lời nhắn đến đội ngũ GORISE.');
    });

    // Hydrate media slot
    const targets = document.querySelectorAll('[data-media-slot]');
    if (targets.length) {
      fetch('/api/media/active', { headers: { Accept: 'application/json' } })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          (data.media || []).forEach((item) => {
            document.querySelectorAll(`[data-media-slot="${item.slot}"]`).forEach((image) => {
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
        })
        .catch(() => {});
    }
  };

  // 2. Hiệu ứng Parallax 3D mở cửa Safe Home
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
      const opening = clamp((progress - 0.12) / 0.58, 0, 1);
      const reveal = clamp((progress - 0.28) / 0.54, 0, 1);
      const introOpacity = 1 - clamp(progress / 0.28, 0, 1);
      const finalOpacity = clamp((progress - 0.72) / 0.2, 0, 1);
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const baseWidth = viewportWidth <= 700 ? Math.min(viewportWidth * 0.84, 350) : Math.min(viewportWidth * 0.88, 430);
      const baseHeight = viewportWidth <= 700 ? Math.min(viewportHeight * 0.54, 360) : Math.min(viewportHeight * 0.6, 420);
      const targetWidth = viewportWidth;
      const targetHeight = viewportHeight;
      const scaleX = baseWidth ? targetWidth / baseWidth : 1;
      const scaleY = baseHeight ? targetHeight / baseHeight : 1;
      const scale = 1 + (Math.min(scaleX, scaleY) - 1) * reveal;
      const radius = 28 - 28 * reveal;
      if (intro) intro.style.opacity = String(introOpacity);
      if (interior) {
        interior.style.opacity = String(0.06 + reveal * 0.94);
        interior.style.clipPath = `inset(${29 - reveal * 29}% ${31 - reveal * 31}% round ${54 - reveal * 54}px)`;
        interior.style.transform = `scale(${0.88 + reveal * 0.12})`;
        interior.style.filter = `saturate(${0.9 + reveal * 0.1}) blur(${5 - reveal * 5}px)`;
      }
      if (frame) {
        frame.style.transform = `scale(${scale})`;
        const interiorOnTop = reveal >= 0.72;
        if (interior) interior.style.zIndex = interiorOnTop ? '6' : '2';
        frame.style.zIndex = interiorOnTop ? '3' : '4';
        frame.style.borderRadius = `${radius}px ${radius}px ${24 - reveal * 4}px ${24 - reveal * 4}px`;
      }
      if (leftDoor) leftDoor.style.transform = `translateX(${-opening * 105}%) rotateY(${-opening * 2}deg)`;
      if (rightDoor) rightDoor.style.transform = `translateX(${opening * 105}%) rotateY(${opening * 2}deg)`;
      if (finalCopy) {
        finalCopy.style.opacity = String(finalOpacity);
        finalCopy.style.transform = `translate(-50%, ${24 - finalOpacity * 24}px)`;
      }
    };
    const requestRender = () => {
      if (!raf) raf = window.requestAnimationFrame(render);
    };
    window.addEventListener('scroll', requestRender, { passive: true });
    window.addEventListener('resize', requestRender);
    reduceMotion.addEventListener?.('change', requestRender);
    requestRender();
  };

  // 3. Vòng xoay chọn nhân vật GORISE
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
      { name: 'Vy', nickname: 'Người truyền cảm hứng', icon: '⚡', description: 'Nhiệt huyết, vui vẻ và luôn khích lệ mọi người tiến lên.', accent: '#d82e46', theme: 'vy' },
    ];
    const total = cards.length;
    let active = 0;
    let touchStartX = 0;
    const clampWrap = (value) => (value + total) % total;

    const updateInfo = () => {
      const profile = profiles[active];
      if (!profile) return;
      root.style.setProperty('--character-accent', profile.accent);
      root.dataset.characterTheme = profile.theme;
      decor?.classList.remove('is-changing');
      if (position) position.textContent = String(active + 1).padStart(2, '0');
      info?.classList.remove('is-changing');
      requestAnimationFrame(() => {
        if (name) name.textContent = profile.name;
        if (nickname) nickname.textContent = profile.nickname;
        if (personalityIcon) personalityIcon.textContent = profile.icon;
        if (description) description.textContent = profile.description;
        info?.classList.add('is-changing');
        decor?.classList.add('is-changing');
        window.setTimeout(() => info?.classList.remove('is-changing'), 520);
      });
    };

    if (portraits && !portraits.children.length) {
      const portraitOrder = [3, 2, 4, 1, 5, 0];
      portraitOrder.forEach((index) => {
        const profile = profiles[index];
        const cardImg = cards[index]?.querySelector('img');
        if (!profile || !cardImg) return;
        const thumb = document.createElement('button');
        thumb.type = 'button';
        thumb.className = `character-portrait${index === active ? ' is-active' : ''}`;
        thumb.dataset.characterThumb = String(index);
        thumb.setAttribute('aria-label', `Chọn nhân vật ${profile.name}`);
        thumb.innerHTML = `<img src="${cardImg.src}" alt="${profile.name}" loading="lazy" />`;
        thumb.addEventListener('click', () => {
          active = index;
          render();
        });
        portraits.append(thumb);
      });
    }

    cards.forEach((card, index) => {
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.addEventListener('click', () => {
        active = index;
        render();
      });
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
      const cardWidth = Math.min((viewport?.clientWidth || 320) * (compact ? 0.7 : 0.26), compact ? 320 : 300);
      const step = cardWidth * (compact ? 0.72 : 0.78);
      cards.forEach((card, index) => {
        let relative = ((index - active + total + Math.floor(total / 2)) % total) - Math.floor(total / 2);
        if (relative === -Math.floor(total / 2) && total % 2 === 0 && index > active) relative = total / 2;
        const distance = Math.abs(relative);
        const scale = distance === 0 ? 1 : distance === 1 ? 0.86 : distance === 2 ? 0.72 : 0.58;
        card.classList.toggle('is-active', distance === 0);
        card.classList.toggle('is-near', distance === 1);
        card.style.transform = `translateX(calc(-50% + ${relative * step}px)) scale(${scale})`;
        card.style.zIndex = String(10 - distance);
        card.setAttribute('aria-hidden', distance > 2 ? 'true' : 'false');
      });
      if (portraits) {
        [...portraits.children].forEach((thumb) =>
          thumb.classList.toggle('is-active', Number(thumb.dataset.characterThumb) === active)
        );
      }
      updateInfo();
    };

    prev?.addEventListener('click', () => {
      active = clampWrap(active - 1);
      render();
    });
    next?.addEventListener('click', () => {
      active = clampWrap(active + 1);
      render();
    });
    root.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        active = clampWrap(active - 1);
        render();
      }
      if (event.key === 'ArrowRight') {
        active = clampWrap(active + 1);
        render();
      }
    });

    viewport?.addEventListener(
      'touchstart',
      (event) => {
        touchStartX = event.changedTouches[0].clientX;
      },
      { passive: true }
    );
    viewport?.addEventListener(
      'touchend',
      (event) => {
        const delta = event.changedTouches[0].clientX - touchStartX;
        if (Math.abs(delta) > 42) {
          active = clampWrap(active + (delta < 0 ? 1 : -1));
          render();
        }
      },
      { passive: true }
    );

    root.addEventListener('pointermove', (event) => {
      if (window.innerWidth <= 700 || !decor) return;
      const bounds = root.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 12;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 7;
      decor.style.setProperty('--arena-shift-x', `${x.toFixed(2)}px`);
      decor.style.setProperty('--arena-shift-y', `${y.toFixed(2)}px`);
    });
    root.addEventListener('pointerleave', () => {
      decor?.style.setProperty('--arena-shift-x', '0px');
      decor?.style.setProperty('--arena-shift-y', '0px');
    });

    root.tabIndex = 0;
    window.addEventListener('resize', render);
    render();
  };

  // 4. Gameplay Journey Modal & Safety Map
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
      learn: { number: '04', title: 'Bài học', icon: '▤', color: '#8b62d5', copy: 'Ghi nhớ bài học, chia sẻ suy nghĩ và sẵn sàng áp dụng vào những tình huống đời thường.' },
    };
    const setActive = (step) => {
      stations.forEach((station) => station.classList.toggle('is-active', station.dataset.gameplayStep === step));
    };
    const openModal = (step) => {
      const detail = details[step];
      if (!detail || !modal) return;
      setActive(step);
      if (modalIcon) {
        modalIcon.textContent = detail.icon;
        modalIcon.style.setProperty('--modal-color', detail.color);
      }
      if (modalKicker) modalKicker.textContent = `BƯỚC ${detail.number}`;
      if (modalTitle) modalTitle.textContent = detail.title;
      if (modalCopy) modalCopy.textContent = detail.copy;
      modal.hidden = false;
      document.body.classList.add('has-gameplay-modal');
      modal.querySelector('.gameplay-modal-close')?.focus();
    };
    const closeModal = () => {
      if (!modal) return;
      modal.hidden = true;
      document.body.classList.remove('has-gameplay-modal');
    };
    stations.forEach((station) => {
      station.addEventListener('click', () => openModal(station.dataset.gameplayStep));
      station.addEventListener('focus', () => setActive(station.dataset.gameplayStep));
    });
    root.querySelectorAll('[data-gameplay-close]').forEach((element) => element.addEventListener('click', closeModal));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal && !modal.hidden) closeModal();
    });
    if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && board) {
      const observer = new IntersectionObserver(
        (entries, currentObserver) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            root.classList.add('is-gameplay-visible');
            currentObserver.disconnect();
          }
        },
        { threshold: 0.18 }
      );
      observer.observe(board);
    } else {
      root.classList.add('is-gameplay-visible');
    }
  };

  const initSafetyMap = () => {
    const map = document.querySelector('[data-safety-map]');
    if (!map) return;
    const stations = [...map.querySelectorAll('[data-map-station]')];
    const pins = [...map.querySelectorAll('[data-map-pin]')];
    const syncTopic = (topic, active) => {
      pins.filter((pin) => pin.dataset.mapPin === topic).forEach((pin) => pin.classList.toggle('is-highlighted', active));
      stations
        .filter((station) => new URL(station.href, window.location.origin).searchParams.get('topic') === topic)
        .forEach((station) => station.classList.toggle('is-linked', active));
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
      const observer = new IntersectionObserver(
        (entries, currentObserver) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            showMap();
            currentObserver.disconnect();
          }
        },
        { threshold: 0.2 }
      );
      observer.observe(map);
    } else {
      showMap();
    }
  };

  const initReferenceGameplay = () => {
    const root = document.querySelector('[data-reference-gameplay]');
    if (!root) return;
    const stepPopup = root.querySelector('[data-step-popup]');
    const boardPopup = root.querySelector('[data-board-popup]');
    const characterPopup = root.querySelector('[data-character-popup]');
    const stepData = {
      observe: { progress: '01 / 04', title: 'Khám phá tình huống', copy: 'Quan sát tình huống trên thẻ bài hoặc video để nhận biết những nguy hiểm có thể xảy ra.', action: 'Xem tình huống', href: '/video-tinh-huong/' },
      choose: { progress: '02 / 04', title: 'Cùng nhau quyết định', copy: 'Người chơi thảo luận và lựa chọn phương án xử lý phù hợp với tình huống.', choices: true },
      result: { progress: '03 / 04', title: 'Khám phá điều xảy ra', copy: 'Sau khi lựa chọn, người chơi khám phá kết quả và tìm hiểu vì sao hành động đó an toàn hoặc chưa an toàn.', action: 'Lật thẻ kết quả' },
      learn: { progress: '04 / 04', title: 'Ghi nhớ bài học an toàn', copy: 'Người chơi cùng nhìn lại tình huống, ghi nhớ cách xử lý phù hợp và vận dụng vào cuộc sống.', action: 'Mở thẻ bài học' },
    };
    const boardData = {
      blue: ['Khám phá tình huống', 'Ô xanh dương – Quan sát: khám phá tình huống an toàn.'],
      yellow: ['Cùng nhau suy nghĩ', 'Ô vàng – Thảo luận và lựa chọn phương án phù hợp.'],
      purple: ['Khám phá gợi ý', 'Ô tím – Gợi ý cách xử lý để cùng trao đổi.'],
      teal: ['Tiến trình an toàn', 'Ô xanh ngọc – Ghi nhận tiến trình an toàn.'],
      red: ['Thử thách mới', 'Ô đỏ – Khám phá một thử thách mới.'],
      explore: ['Mở rộng khám phá', 'Ô xanh dương kính lúp – Tìm thêm manh mối trong tình huống.'],
      goal: ['Hoàn thành hành trình', 'Ô GOAL – Về đích và hoàn thành hành trình khám phá.'],
    };
    const characterData = {
      TIGORI: 'Người bạn đồng hành trong hành trình an toàn.',
      Minh: 'Dũng cảm.',
      An: 'Cẩn thận.',
      Khang: 'Bình tĩnh và logic.',
      Nam: 'Thông minh, biết phân tích.',
      Vy: 'Nhiệt tình, biết hợp tác.',
    };
    const close = (popup) => {
      if (popup) popup.hidden = true;
    };
    const openStep = (key) => {
      const d = stepData[key];
      if (!d) return;
      root.querySelectorAll('[data-step-hotspot]').forEach((el) => el.classList.toggle('is-active', el.dataset.stepHotspot === key));
      root.querySelector('[data-step-progress]').textContent = d.progress;
      root.querySelector('[data-step-title]').textContent = d.title;
      root.querySelector('[data-step-copy]').textContent = d.copy;
      const choices = root.querySelector('[data-choice-row]');
      const action = root.querySelector('[data-step-action]');
      if (choices) choices.hidden = !d.choices;
      if (action) {
        action.hidden = !d.action;
        action.textContent = d.action || '';
        action.dataset.href = d.href || '';
        action.dataset.stepAction = key;
      }
      if (stepPopup) stepPopup.hidden = false;
    };
    root.querySelectorAll('[data-step-hotspot]').forEach((el) => el.addEventListener('click', () => openStep(el.dataset.stepHotspot)));
    root.querySelector('[data-step-close]')?.addEventListener('click', () => close(stepPopup));
    root.querySelector('[data-step-action]')?.addEventListener('click', (event) => {
      const button = event.currentTarget;
      if (button.dataset.href) window.location.href = button.dataset.href;
      else {
        button.textContent = button.dataset.stepAction === 'result' ? 'Đã lật thẻ kết quả' : 'Đã mở bài học';
        button.classList.add('is-flipped');
      }
    });
    root.querySelectorAll('[data-board-tile]').forEach((el) =>
      el.addEventListener('click', () => {
        const d = boardData[el.dataset.boardTile];
        if (!d) return;
        root.querySelectorAll('[data-board-tile]').forEach((tile) => tile.classList.toggle('is-active', tile === el));
        root.querySelector('[data-board-title]').textContent = d[0];
        root.querySelector('[data-board-copy]').textContent = d[1];
        if (boardPopup) boardPopup.hidden = false;
      })
    );
    root.querySelector('[data-board-close]')?.addEventListener('click', () => close(boardPopup));
    root.querySelectorAll('[data-character-hotspot]').forEach((el) =>
      el.addEventListener('click', () => {
        const charName = el.dataset.characterHotspot;
        root.querySelectorAll('[data-character-hotspot]').forEach((item) => item.classList.toggle('is-active', item === el));
        root.querySelector('[data-character-title]').textContent = charName;
        root.querySelector('[data-character-copy]').textContent = characterData[charName] || '';
        if (characterPopup) characterPopup.hidden = false;
      })
    );
    root.querySelector('[data-character-close]')?.addEventListener('click', () => close(characterPopup));
  };

  const initQuickSectionNav = () => {
    const nav = document.querySelector('[data-quick-section-nav]');
    if (!nav) return;
    const links = [...nav.querySelectorAll('[data-quick-target]')];
    const targets = links.map((link) => document.getElementById(link.dataset.quickTarget)).filter(Boolean);
    const setActive = (id) =>
      links.forEach((link) => {
        const active = link.dataset.quickTarget === id;
        link.classList.toggle('is-active', active);
        link.setAttribute('aria-current', active ? 'step' : 'false');
      });
    links.forEach((link) =>
      link.addEventListener('click', (event) => {
        const target = document.getElementById(link.dataset.quickTarget);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActive(link.dataset.quickTarget);
        window.history.replaceState(null, '', `#${link.dataset.quickTarget}`);
      })
    );
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
            .slice(0, 1)
            .forEach((entry) => setActive(entry.target.id));
        },
        { rootMargin: '-28% 0px -55% 0px', threshold: [0.05, 0.2, 0.5] }
      );
      targets.forEach((target) => observer.observe(target));
    }
    setActive(window.location.hash ? window.location.hash.slice(1) : 'top');
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
    pages.forEach((src) => {
      const preload = new Image();
      preload.src = src;
    });
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
      if (image) {
        image.src = pages[currentPage];
        image.alt = `Flashcard ${String(currentPage + 1).padStart(2, '0')} — GORISE`;
      }
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
      } else {
        finishFlip(target, direction);
      }
      updateControls();
    };
    prev?.addEventListener('click', () => goTo(currentPage - 1));
    next?.addEventListener('click', () => {
      if (currentPage === pages.length - 1) {
        document.querySelector('#about-vision-mission')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      goTo(currentPage + 1);
    });
    dots.forEach((dot) => dot.addEventListener('click', () => goTo(Number(dot.dataset.storybookDot))));
    updateControls();
  };

  // Khởi động các tương tác
  initGeneralInteractions();
  initSafeHomeScene();
  initCharacterCarousel();
  initGameplayJourney();
  initSafetyMap();
  initReferenceGameplay();
  initQuickSectionNav();
  initAboutStorybook();
})();
