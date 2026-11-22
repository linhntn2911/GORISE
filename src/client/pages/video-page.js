(() => {
  const list = document.querySelector('[data-video-list]');
  const feature = document.querySelector('[data-video-feature]');
  const title = document.querySelector('[data-video-title]');
  const description = document.querySelector('[data-video-description]');
  const status = document.querySelector('[data-video-status]');
  const copyButton = document.querySelector('[data-copy-video]');
  const shareButton = document.querySelector('[data-share-video]');
  const searchInput = document.querySelector('[data-video-search]');
  const sortSelect = document.querySelector('[data-video-sort]');
  const emptyState = document.querySelector('[data-video-empty]');
  const resultCount = document.querySelector('[data-video-result-count]');
  const totalNode = document.querySelector('[data-video-total]');
  const categoryNode = document.querySelector('[data-video-category]');
  const positionNode = document.querySelector('[data-video-position]');
  const tagsNode = document.querySelector('[data-video-tags]');
  const helpfulButton = document.querySelector('[data-video-helpful]');
  const saveButton = document.querySelector('[data-video-save]');
  const learningCard = document.querySelector('[data-learning-card]');
  const upNextNode = document.querySelector('[data-video-up-next]');
  const playlistPanel = document.querySelector('[data-playlist-panel]');
  const playlistToggle = document.querySelector('[data-playlist-toggle]');
  const playlistToggleLabel = document.querySelector('[data-playlist-toggle-label]');
  const playlistCurrent = document.querySelector('[data-playlist-current]');
  const openPlaylistButton = document.querySelector('[data-open-playlist]');
  const FALLBACK_VIDEOS = [{"id": "980c42e9-f5a6-4a9f-85ad-317e8be9fbd1", "title": "Người lạ gõ cửa", "description": "", "originalName": "ngu-o-i-la-go-cu-a.mp4", "stableUrl": "/manus-storage/gorise/videos/980c42e9-f5a6-4a9f-85ad-317e8be9fbd1-ngu-o-i-la-go-cu-a.mp4", "thumbnailUrl": "/video-thumb-980c42e9-f5a6-4a9f-85ad-317e8be9fbd1.jpg", "createdAt": "2026-10-12T02:49:38.000Z"}, {"id": "9976601c-f9a4-4a5d-a7da-b3d1c8807579", "title": "Người lạ cho bánh kẹo", "description": "", "originalName": "ngu-o-i-la-cho-ke-o.mp4", "stableUrl": "/manus-storage/gorise/videos/9976601c-f9a4-4a5d-a7da-b3d1c8807579-ngu-o-i-la-cho-ke-o.mp4", "thumbnailUrl": "/video-thumb-9976601c-f9a4-4a5d-a7da-b3d1c8807579.jpg", "createdAt": "2026-10-12T02:48:20.000Z"}, {"id": "ae6e9d6b-1e18-431e-be0a-0643cbd30d61", "title": "Đặt máy sấy gần nước", "description": "", "originalName": "-e-o-ie-n-ga-n-nu-o-c.mp4", "stableUrl": "/manus-storage/gorise/videos/ae6e9d6b-1e18-431e-be0a-0643cbd30d61--e-o-ie-n-ga-n-nu-o-c.mp4", "thumbnailUrl": "/video-thumb-ae6e9d6b-1e18-431e-be0a-0643cbd30d61.jpg", "createdAt": "2026-10-12T02:47:01.000Z"}, {"id": "2eff7c1f-cd07-42ef-8275-a13e8a178b95", "title": "Chọc vật lạ vào ổ điện", "description": "", "originalName": "cho-c-va-o-o-ie-n-vid.mp4", "stableUrl": "/manus-storage/gorise/videos/2eff7c1f-cd07-42ef-8275-a13e8a178b95-cho-c-va-o-o-ie-n-vid.mp4", "thumbnailUrl": "/video-thumb-2eff7c1f-cd07-42ef-8275-a13e8a178b95.jpg", "createdAt": "2026-10-12T02:43:07.000Z"}, {"id": "dd94a715-6f89-45d3-a55b-d4fb312ad58a", "title": "Tay ướt chạm ổ điện", "description": "", "originalName": "cha-m-tay-va-o-o-ie-n.mp4", "stableUrl": "/manus-storage/gorise/videos/dd94a715-6f89-45d3-a55b-d4fb312ad58a-cha-m-tay-va-o-o-ie-n.mp4", "thumbnailUrl": "/video-thumb-dd94a715-6f89-45d3-a55b-d4fb312ad58a.jpg", "createdAt": "2026-10-12T02:42:30.000Z"}, {"id": "86a863ec-5802-4a32-9305-5c32391f481c", "title": "Nuốt phải vật lạ", "description": "", "originalName": "vid-5.mp4", "stableUrl": "/manus-storage/gorise/videos/86a863ec-5802-4a32-9305-5c32391f481c-vid-5.mp4", "thumbnailUrl": "/video-thumb-86a863ec-5802-4a32-9305-5c32391f481c.jpg", "createdAt": "2026-10-12T02:32:37.000Z"}, {"id": "0dda7ce7-0955-4929-bd29-2a6959ff3c0b", "title": "Phát hiện khói trong nhà", "description": "", "originalName": "vid-4.mp4", "stableUrl": "/manus-storage/gorise/videos/0dda7ce7-0955-4929-bd29-2a6959ff3c0b-vid-4.mp4", "thumbnailUrl": "/video-thumb-0dda7ce7-0955-4929-bd29-2a6959ff3c0b.jpg", "createdAt": "2026-10-12T02:30:45.000Z"}, {"id": "b4bbdfeb-6086-40e5-b261-d112903afa03", "title": "Người thân bị thương", "description": "", "originalName": "vid-3.mp4", "stableUrl": "/manus-storage/gorise/videos/b4bbdfeb-6086-40e5-b261-d112903afa03-vid-3.mp4", "thumbnailUrl": "/video-thumb-b4bbdfeb-6086-40e5-b261-d112903afa03.jpg", "createdAt": "2026-10-12T02:28:47.000Z"}, {"id": "09dc8664-fc6e-4748-b7a7-ed307b6e9770", "title": "Người lạ rủ đi chơi", "description": "", "originalName": "vid-2.mp4", "stableUrl": "/manus-storage/gorise/videos/09dc8664-fc6e-4748-b7a7-ed307b6e9770-vid-2.mp4", "thumbnailUrl": "/video-thumb-09dc8664-fc6e-4748-b7a7-ed307b6e9770.jpg", "createdAt": "2026-10-12T02:26:49.000Z"}, {"id": "1757ee19-32f3-4e52-8ad5-40e974761f23", "title": "Người lạ hỏi thông tin", "description": "", "originalName": "vid-1.mp4", "stableUrl": "/manus-storage/gorise/videos/1757ee19-32f3-4e52-8ad5-40e974761f23-vid-1.mp4", "thumbnailUrl": "/video-thumb-1757ee19-32f3-4e52-8ad5-40e974761f23.jpg", "createdAt": "2026-10-12T02:25:48.000Z"}, {"id": "0305e94c-c0a8-4dae-891b-0f39e9af3326", "title": "Leo lên bồn rửa mặt", "description": "", "originalName": "Tre-o-le-n-be-ru-a-ma-t.mp4", "stableUrl": "/manus-storage/gorise/videos/0305e94c-c0a8-4dae-891b-0f39e9af3326-Tre-o-le-n-be-ru-a-ma-t.mp4", "thumbnailUrl": "/video-thumb-0305e94c-c0a8-4dae-891b-0f39e9af3326.jpg", "createdAt": "2026-10-12T02:19:48.000Z"}, {"id": "607ea7c0-f14e-425b-8883-3e4daa04ad3f", "title": "Ngửi thấy mùi gas", "description": "", "originalName": "Ngu-i-tha-y-mu-i-ga-trong-be-p.mp4", "stableUrl": "/manus-storage/gorise/videos/607ea7c0-f14e-425b-8883-3e4daa04ad3f-Ngu-i-tha-y-mu-i-ga-trong-be-p.mp4", "thumbnailUrl": "/video-thumb-607ea7c0-f14e-425b-8883-3e4daa04ad3f.jpg", "createdAt": "2026-10-12T02:18:06.000Z"}, {"id": "9160d2d3-be02-410d-9305-7b0ac0b379f0", "title": "Nghịch chai tẩy rửa", "description": "", "originalName": "Nghi-ch-nu-o-c-ta-y-ru-a.mp4", "stableUrl": "/manus-storage/gorise/videos/9160d2d3-be02-410d-9305-7b0ac0b379f0-Nghi-ch-nu-o-c-ta-y-ru-a.mp4", "thumbnailUrl": "/video-thumb-9160d2d3-be02-410d-9305-7b0ac0b379f0.jpg", "createdAt": "2026-10-12T02:17:16.000Z"}, {"id": "ef0fd8ae-e9f2-4c3c-9a9d-1c3006d7102e", "title": "Nghịch dao trong bếp", "description": "", "originalName": "Nghi-ch-dao-bi-u-t-tay.mp4", "stableUrl": "/manus-storage/gorise/videos/ef0fd8ae-e9f2-4c3c-9a9d-1c3006d7102e-Nghi-ch-dao-bi-u-t-tay.mp4", "thumbnailUrl": "/video-thumb-ef0fd8ae-e9f2-4c3c-9a9d-1c3006d7102e.jpg", "createdAt": "2026-10-12T02:14:51.000Z"}, {"id": "8c292d2d-d7c5-4807-b182-0659d9a5f271", "title": "Khói lan vào phòng", "description": "", "originalName": "Kho-i-lan-trong-nha-.mp4", "stableUrl": "/manus-storage/gorise/videos/8c292d2d-d7c5-4807-b182-0659d9a5f271-Kho-i-lan-trong-nha-.mp4", "thumbnailUrl": "/video-thumb-8c292d2d-d7c5-4807-b182-0659d9a5f271.jpg", "createdAt": "2026-10-12T02:13:46.000Z"}, {"id": "55753926-ffc1-4b00-b484-7d6735d6573b", "title": "Chạy nhảy trên sàn nhà tắm", "description": "", "originalName": "Cha-y-nha-y-tre-n-sa-n-nha-ta-m.mp4", "stableUrl": "/manus-storage/gorise/videos/55753926-ffc1-4b00-b484-7d6735d6573b-Cha-y-nha-y-tre-n-sa-n-nha-ta-m.mp4", "thumbnailUrl": "/video-thumb-55753926-ffc1-4b00-b484-7d6735d6573b.jpg", "createdAt": "2026-10-12T02:09:09.000Z"}, {"id": "eb4a9595-1c2e-471f-b042-21da3efd408c", "title": "Chảo dầu bốc cháy", "description": "", "originalName": "Cha-o-da-u-bo-c-cha-y.mp4", "stableUrl": "/manus-storage/gorise/videos/eb4a9595-1c2e-471f-b042-21da3efd408c-Cha-o-da-u-bo-c-cha-y.mp4", "thumbnailUrl": "/video-thumb-eb4a9595-1c2e-471f-b042-21da3efd408c.jpg", "createdAt": "2026-10-12T02:08:36.000Z"}, {"id": "2aec2141-6704-453e-9b83-9a3820348c11", "title": "Chạm vào nồi nóng", "description": "", "originalName": "Cha-m-va-o-no-i-no-ng.mp4", "stableUrl": "/manus-storage/gorise/videos/2aec2141-6704-453e-9b83-9a3820348c11-Cha-m-va-o-no-i-no-ng.mp4", "thumbnailUrl": "/video-thumb-2aec2141-6704-453e-9b83-9a3820348c11.jpg", "createdAt": "2026-10-12T02:08:06.000Z"}, {"id": "91734004-39e3-42c4-b0eb-b6626c480254", "title": "Chạm vào dây điện hở", "description": "", "originalName": "Cha-m-va-o-da-y-ie-n.mp4", "stableUrl": "/manus-storage/gorise/videos/91734004-39e3-42c4-b0eb-b6626c480254-Cha-m-va-o-da-y-ie-n.mp4", "thumbnailUrl": "/video-thumb-91734004-39e3-42c4-b0eb-b6626c480254.jpg", "createdAt": "2026-10-12T02:07:22.000Z"}, {"id": "04d37692-0493-4915-a348-05d1c6dc990d", "title": "Cắm quá nhiều thiết bị điện", "description": "", "originalName": "Ca-m-qua-nhie-u-thie-t-bi-ie-n.mp4", "stableUrl": "/manus-storage/gorise/videos/04d37692-0493-4915-a348-05d1c6dc990d-Ca-m-qua-nhie-u-thie-t-bi-ie-n.mp4", "thumbnailUrl": "/video-thumb-04d37692-0493-4915-a348-05d1c6dc990d.jpg", "createdAt": "2026-10-12T02:05:53.000Z"}];

  let videos = [...FALLBACK_VIDEOS];
  let selected = null;
  const requestedTopic = new URLSearchParams(window.location.search).get('topic');
  const validTopics = new Set(['all', 'kitchen', 'electric', 'bathroom', 'stranger', 'emergency']);
  let topic = validTopics.has(requestedTopic) ? requestedTopic : 'all';
  let view = 'grid';

  playlistToggle?.addEventListener('click', () => {
    const open = playlistToggle.getAttribute('aria-expanded') === 'true';
    playlistToggle.setAttribute('aria-expanded', String(!open));
    if (playlistPanel) {
      if (open) { playlistPanel.classList.remove('is-open'); window.setTimeout(() => { if (playlistToggle.getAttribute('aria-expanded') !== 'true') playlistPanel.hidden = true; }, 320); }
      else { playlistPanel.hidden = false; window.requestAnimationFrame(() => playlistPanel.classList.add('is-open')); }
    }
    if (playlistToggleLabel) playlistToggleLabel.textContent = open ? 'Xem danh sách' : 'Thu gọn';
  });
  openPlaylistButton?.addEventListener('click', () => {
    if (selected) trackEvent(selected.id, 'playlist');
    if (playlistToggle?.getAttribute('aria-expanded') !== 'true') playlistToggle?.click();
    window.setTimeout(() => playlistPanel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
  });

  const esc = (value) => String(value || '').replace(/[&<>'"]/g, (c) => ({ '&': '&#38;', '<': '&#60;', '>': '&#62;', "'": '&#39;', '"': '&#34;' }[c]));
  const publicUrl = (video) => `${window.location.origin}/video-tinh-huong/?v=${encodeURIComponent(video.id)}`;
  const situationName = (video) => {
    const raw = String(video.title || '').replace(/\.(mp4|webm|mov|avi)$/i, '').trim();
    return /cắm.*điện|điện.*cắm/i.test(raw) ? 'Cắm quá nhiều thiết bị điện' : (raw || 'Tình huống GORISE');
  };
  const topicFor = (video) => {
    const haystack = `${video.title || ''} ${video.description || ''} ${video.originalName || ''}`.toLocaleLowerCase('vi-VN');
    if (/điện|cắm|ổ điện|dây điện|thiết bị/.test(haystack)) return 'electric';
    if (/bồn rửa|phòng tắm|nhà tắm|tắm|máy sấy.*nước|nước.*máy sấy/.test(haystack)) return 'bathroom';
    if (/người lạ|cửa ra vào|gõ cửa|cho bánh|rủ đi|hỏi thông tin/.test(haystack)) return 'stranger';
    if (/bếp|dao|nồi|chảo|dầu|gas|tẩy rửa/.test(haystack)) return 'kitchen';
    if (/khẩn cấp|nguy hiểm|sơ cứu|lạc|khói|bị thương|cháy|nuốt|vật lạ|nghẹn/.test(haystack)) return 'emergency';
    return 'other';
  };
  const topicName = (key) => ({ all: 'Tất cả tình huống', kitchen: 'Nhà bếp', electric: 'An toàn điện', bathroom: 'Phòng tắm', stranger: 'Cửa ra vào & người lạ', emergency: 'Ứng phó khẩn cấp', other: 'Khác' }[key] || 'Tình huống GORISE');
  const learningFor = (video) => {
    const key = topicFor(video);
    const rules = {
      stranger: { question: 'Khi có người lạ gõ cửa lúc đang ở nhà, bạn nên làm gì?', choices: ['Mở cửa ngay để hỏi chuyện', 'Không mở cửa, gọi người lớn hỗ trợ', 'Cho người lạ biết mình đang ở nhà'], answer: 1, explain: 'Không mở cửa và báo ngay cho người lớn là lựa chọn an toàn hơn.' },
      electric: { question: 'Khi thấy ổ điện có dấu hiệu bất thường, bạn nên làm gì?', choices: ['Tự tháo ổ điện để kiểm tra', 'Báo người lớn và tránh chạm vào', 'Tiếp tục sử dụng thật nhanh'], answer: 1, explain: 'Hãy tránh xa và báo người lớn để kiểm tra, sửa chữa đúng cách.' },
      kitchen: { question: 'Khi ở gần bếp đang nấu, lựa chọn nào an toàn nhất?', choices: ['Tự với tay lấy đồ trên bếp', 'Đứng cách xa và gọi người lớn khi cần', 'Chơi cạnh nồi đang nóng'], answer: 1, explain: 'Bếp và nồi nóng có thể gây bỏng. Hãy giữ khoảng cách và nhờ người lớn.' },
      bathroom: { question: 'Khi sàn phòng tắm bị ướt, bạn nên làm gì?', choices: ['Chạy thật nhanh qua sàn', 'Đi chậm, báo người lớn và lau khô', 'Đùa nghịch trên sàn'], answer: 1, explain: 'Sàn ướt dễ trơn trượt. Hãy đi chậm và báo người lớn xử lý.' },
      emergency: { question: 'Khi gặp một tình huống nguy hiểm, điều đầu tiên nên làm là gì?', choices: ['Bình tĩnh tránh xa nguy hiểm và gọi người lớn', 'Tự mình xử lý ngay', 'Đứng lại xem chuyện gì xảy ra'], answer: 0, explain: 'Bình tĩnh, giữ khoảng cách an toàn và tìm người lớn hỗ trợ là lựa chọn phù hợp.' }
    };
    return rules[key] || null;
  };
  const savedVideoIds = () => { try { return JSON.parse(localStorage.getItem('gorise-saved-videos') || '[]'); } catch { return []; } };
  const setSavedVideo = (id, saved) => { const ids = new Set(savedVideoIds()); saved ? ids.add(id) : ids.delete(id); localStorage.setItem('gorise-saved-videos', JSON.stringify([...ids])); };
  const trackEvent = (videoId, event) => { if (!videoId || !event) return; fetch(`/api/videos/${encodeURIComponent(videoId)}/analytics`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event }), keepalive: true }).catch(() => {}); };
  const viewedThisSession = (() => { try { return new Set(JSON.parse(sessionStorage.getItem('gorise-video-views') || '[]')); } catch { return new Set(); } })();
  const trackViewOnce = (videoId) => { if (!videoId || viewedThisSession.has(videoId)) return; viewedThisSession.add(videoId); try { sessionStorage.setItem('gorise-video-views', JSON.stringify([...viewedThisSession])); } catch {} trackEvent(videoId, 'view'); };
  const thumbnailCache = new Map();
  let thumbnailObserver;
  const thumbnailFallback = (video) => {
    const haystack = `${video.title || ''} ${video.originalName || ''}`.toLocaleLowerCase('vi-VN');
    if (/điện|cắm|ổ điện|cháy/.test(haystack)) return '/situation-electric.webp';
    if (/nuốt|vật lạ|nghẹn/.test(haystack)) return '/situation-danger.webp';
    return '/gorise-official.png';
  };
  const thumbnailFor = (video) => video.thumbnailUrl || `/video-thumb-${encodeURIComponent(video.id)}.jpg`;
  const createVideoThumbnail = (video) => new Promise((resolve) => {
    if (!video?.stableUrl || thumbnailCache.has(video.id)) return resolve(thumbnailCache.get(video.id) || null);
    const source = document.createElement('video');
    source.preload = 'metadata';
    source.muted = true;
    source.playsInline = true;
    source.src = video.stableUrl;
    let settled = false;
    const finish = (value = null) => { if (settled) return; settled = true; source.removeAttribute('src'); source.load(); resolve(value); };
    source.onerror = () => finish();
    source.onloadedmetadata = () => {
      const duration = Number.isFinite(source.duration) ? source.duration : 0;
      source.currentTime = duration > 1 ? Math.min(Math.max(duration * 0.35, 0.8), 8) : 0;
    };
    source.onseeked = () => {
      try {
        const width = source.videoWidth || 768;
        const height = source.videoHeight || 432;
        const maxWidth = 720;
        const scale = Math.min(1, maxWidth / width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext('2d', { alpha: false });
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
        thumbnailCache.set(video.id, dataUrl);
        finish(dataUrl);
      } catch { finish(); }
    };
    window.setTimeout(() => finish(), 12000);
    source.load();
  });
  const hydrateVideoThumbnail = async (video, image) => {
    if (!image || video.thumbnailUrl || thumbnailCache.has(video.id)) {
      if (thumbnailCache.has(video.id)) image.src = thumbnailCache.get(video.id);
      return;
    }
    image.dataset.thumbnailLoading = 'true';
    const generated = await createVideoThumbnail(video);
    image.dataset.thumbnailLoading = 'false';
    if (generated) image.src = generated;
  };
  const hydrateVisibleThumbnails = (items) => {
    const byId = new Map(items.map((video) => [video.id, video]));
    const images = [...document.querySelectorAll('[data-video-thumb-id]')];
    thumbnailObserver?.disconnect();
    if (!('IntersectionObserver' in window)) {
      images.slice(0, 6).forEach((image) => hydrateVideoThumbnail(byId.get(image.dataset.videoThumbId), image));
      return;
    }
    thumbnailObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const image = entry.target;
        observer.unobserve(image);
        const video = byId.get(image.dataset.videoThumbId);
        if (video) hydrateVideoThumbnail(video, image);
      });
    }, { rootMargin: '180px 0px', threshold: 0.01 });
    images.forEach((image) => thumbnailObserver.observe(image));
  };
  const revealVideoCards = () => {
    const cards = [...document.querySelectorAll('.video-list-card-pro')];
    if (!cards.length) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      cards.forEach((card) => card.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -35px' });
    cards.forEach((card) => observer.observe(card));
  };

  function renderLearning(video) {
    if (!learningCard) return;
    const learning = learningFor(video);
    if (!learning) { learningCard.hidden = true; learningCard.innerHTML = ''; return; }
    learningCard.hidden = false;
    learningCard.innerHTML = `<span class="learning-card-kicker">CÙNG TIGORI SUY NGHĨ!</span><h3>${esc(learning.question)}</h3><div class="learning-choices" data-learning-choices>${learning.choices.map((choice, index) => `<button type="button" data-learning-choice="${index}"><b class="choice-letter">${String.fromCharCode(65 + index)}</b><span class="choice-text">${esc(choice)}</span></button>`).join('')}</div><p class="learning-feedback" data-learning-feedback hidden></p>`;
    learningCard.querySelectorAll('[data-learning-choice]').forEach((button) => button.addEventListener('click', () => {
      const correct = Number(button.dataset.learningChoice) === learning.answer;
      learningCard.querySelectorAll('[data-learning-choice]').forEach((item) => { item.disabled = true; item.classList.toggle('is-correct', Number(item.dataset.learningChoice) === learning.answer); });
      button.classList.toggle('is-wrong', !correct);
      const feedback = learningCard.querySelector('[data-learning-feedback]');
      feedback.hidden = false;
      feedback.textContent = `${correct ? 'Chính xác! ' : 'Mình cùng suy nghĩ lại nhé. '}${learning.explain}`;
      feedback.classList.toggle('is-correct', correct);
    }));
  }
  function renderUpNext(video) {
    if (!upNextNode) return;
    const visible = filteredVideos();
    let next = visible.filter((item) => item.id !== video?.id).slice(0, 1);
    if (!next.length) next = videos.filter((item) => item.id !== video?.id).slice(0, 1);
    upNextNode.innerHTML = next.length ? next.map((item) => `<button class="video-up-next-item" type="button" data-up-next-id="${esc(item.id)}"><span class="video-up-next-thumb"><img src="${esc(thumbnailFor(item))}" alt="" loading="lazy" /><i>▶</i></span><span><b>${esc(situationName(item))}</b><small>${esc(topicName(topicFor(item)))}</small></span></button>`).join('') : '<span class="video-up-next-empty">Chưa có video tiếp theo.</span>';
    upNextNode.querySelectorAll('[data-up-next-id]').forEach((button) => button.addEventListener('click', () => selectVideo(button.dataset.upNextId)));
  }
  const swapFeaturePlayer = (video) => {
    const shell = feature?.querySelector('.video-player-shell');
    if (!shell) return;
    const previous = shell.querySelector('[data-feature-video]');
    const next = document.createElement('video');
    next.className = 'feature-video is-entering';
    next.controls = true;
    next.playsInline = true;
    next.preload = 'metadata';
    next.poster = thumbnailFor(video);
    next.dataset.featureVideo = '';
    next.setAttribute('aria-label', situationName(video));
    next.src = video.stableUrl;
    next.addEventListener('play', () => trackViewOnce(video.id), { once: true });
    shell.classList.add('is-switching');
    shell.append(next);
    const reveal = () => {
      next.classList.add('is-ready');
      previous?.classList.add('is-leaving');
      window.setTimeout(() => previous?.remove(), 260);
      window.setTimeout(() => shell.classList.remove('is-switching'), 320);
    };
    next.addEventListener('loadeddata', reveal, { once: true });
    next.addEventListener('error', () => shell.classList.remove('is-switching'), { once: true });
    next.load();
    window.setTimeout(() => { if (!next.classList.contains('is-ready')) reveal(); }, 900);
  };
  function renderSelected(video) {
    selected = video;
    if (!video) {
      feature?.classList.add('is-empty');
      feature?.querySelector('.video-player-shell')?.replaceChildren(Object.assign(document.createElement('div'), { className: 'video-placeholder', textContent: 'Chưa có video tình huống nào.' }));
      if (title) title.textContent = 'Kho video đang được cập nhật';
      if (description) description.textContent = 'Bạn quay lại sau nhé — GORISE sẽ bổ sung các tình huống mới.';
      if (status) status.textContent = '';
      if (categoryNode) categoryNode.textContent = 'Đang cập nhật';
      if (copyButton) copyButton.disabled = true;
      if (shareButton) shareButton.disabled = true;
      if (positionNode) positionNode.textContent = '--/-- tình huống';
      if (tagsNode) tagsNode.innerHTML = '';
      if (helpfulButton) helpfulButton.disabled = true;
      if (saveButton) saveButton.disabled = true;
      if (upNextNode) upNextNode.innerHTML = '';
      if (learningCard) learningCard.hidden = true;
      if (playlistCurrent) playlistCurrent.textContent = 'Chưa có video đang chọn';
      return;
    }
    feature?.classList.remove('is-empty');
    swapFeaturePlayer(video);
    if (title) title.textContent = situationName(video);
    if (description) description.textContent = video.description || 'Cùng quan sát tình huống và suy nghĩ về lựa chọn an toàn nhé.';
    if (status) status.textContent = 'Mỗi lựa chọn an toàn bắt đầu từ một lần quan sát.';
    if (categoryNode) categoryNode.textContent = topicName(topicFor(video));
    if (copyButton) copyButton.disabled = false;
    if (shareButton) shareButton.disabled = false;
    const position = videos.findIndex((item) => item.id === video.id) + 1;
    if (positionNode) positionNode.textContent = `${String(position).padStart(2, '0')}/${String(videos.length).padStart(2, '0')} tình huống`;
    if (playlistCurrent) playlistCurrent.textContent = `${String(position).padStart(2, '0')} · ${situationName(video)}`;
    if (tagsNode) tagsNode.innerHTML = [topicName(topicFor(video)), 'Safe Home', 'Kỹ năng an toàn'].map((tag) => `<span>${esc(tag)}</span>`).join('');
    if (helpfulButton) { helpfulButton.disabled = false; helpfulButton.setAttribute('aria-pressed', 'false'); }
    if (saveButton) { saveButton.disabled = false; const saved = savedVideoIds().includes(video.id); saveButton.setAttribute('aria-pressed', String(saved)); saveButton.classList.toggle('is-saved', saved); saveButton.querySelector('span').textContent = saved ? 'Đã lưu' : 'Lưu'; }
    renderLearning(video);
    renderUpNext(video);
  }
  const filteredVideos = () => {
    const query = String(searchInput?.value || '').trim().toLocaleLowerCase('vi-VN');
    const filtered = videos.filter((video) => {
      const matchesTopic = topic === 'all' || topicFor(video) === topic;
      const haystack = `${situationName(video)} ${video.description || ''}`.toLocaleLowerCase('vi-VN');
      return matchesTopic && (!query || haystack.includes(query));
    });
    const sort = sortSelect?.value || 'newest';
    return filtered.sort((a, b) => {
      if (sort === 'az' || sort === 'za') return situationName(a).localeCompare(situationName(b), 'vi') * (sort === 'az' ? 1 : -1);
      const aDate = Date.parse(a.createdAt || a.updatedAt || '') || 0;
      const bDate = Date.parse(b.createdAt || b.updatedAt || '') || 0;
      return sort === 'oldest' ? aDate - bDate : bDate - aDate;
    });
  };
  function renderCounts() {
    document.querySelectorAll('[data-topic-count], [data-area-count]').forEach((node) => {
      const key = node.dataset.topicCount || node.dataset.areaCount;
      node.textContent = key === 'all' ? videos.length : videos.filter((video) => topicFor(video) === key).length;
    });
    if (totalNode) totalNode.textContent = videos.length;
  }
  function renderList() {
    const visible = filteredVideos();
    if (resultCount) resultCount.textContent = `${visible.length} video${visible.length === 1 ? '' : 's'} trong thư viện`;
    const hasFilter = topic !== 'all' || String(searchInput?.value || '').trim() || sortSelect?.value !== 'newest';
    document.querySelectorAll('[data-video-reset]').forEach((button) => { button.hidden = !hasFilter; });
    if (!visible.length) { if (list) list.innerHTML = ''; if (emptyState) emptyState.hidden = false; return; }
    if (emptyState) emptyState.hidden = true;
    if (!list) return;
    list.innerHTML = visible.map((video, index) => {
      const key = topicFor(video);
      return `<article class="video-playlist-row${selected?.id === video.id ? ' is-selected' : ''}" data-video-id="${esc(video.id)}"><span class="video-playlist-index">${String(index + 1).padStart(2, '0')}</span><div class="video-playlist-thumb" data-video-image-select="${esc(video.id)}" role="button" tabindex="0" aria-label="Xem ${esc(situationName(video))}"><img data-video-thumb-id="${esc(video.id)}" src="${esc(thumbnailFor(video))}" alt="Thumbnail: ${esc(situationName(video))}" loading="lazy" decoding="async" onerror="this.src='${esc(thumbnailFallback(video))}'" /><span aria-hidden="true">▶</span></div><div class="video-playlist-copy"><b>${esc(situationName(video))}</b><small>${esc(topicName(key))}</small></div>${selected?.id === video.id ? '<span class="video-playlist-playing">ĐANG XEM</span>' : '<span class="video-playlist-arrow">›</span>'}</article>`;
    }).join('');
    hydrateVisibleThumbnails(visible);
    revealVideoCards();
  }
  const selectVideo = (id) => { const video = videos.find((item) => item.id === id); if (!video) return; renderSelected(video); renderList(); window.history.replaceState({}, '', `?v=${encodeURIComponent(video.id)}`); feature?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  list?.addEventListener('click', (event) => { const image = event.target.closest('[data-video-image-select]'); if (image) { event.preventDefault(); selectVideo(image.dataset.videoImageSelect); return; } const open = event.target.closest('[data-open-video]'); if (open) { event.preventDefault(); selectVideo(open.dataset.openVideo); } });
  list?.addEventListener('keydown', (event) => { const image = event.target.closest('[data-video-image-select]'); if (image && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); selectVideo(image.dataset.videoImageSelect); } });
  document.querySelectorAll('[data-video-topic]').forEach((button) => button.addEventListener('click', () => { topic = button.dataset.videoTopic; document.querySelectorAll('[data-video-topic]').forEach((item) => { const active = item === button; item.classList.toggle('is-active', active); item.setAttribute('aria-selected', String(active)); }); renderList(); }));
  document.querySelectorAll('[data-video-area]').forEach((button) => button.addEventListener('click', () => { const target = document.querySelector(`[data-video-topic="${button.dataset.videoArea}"]`); target?.click(); document.querySelector('#video-library')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
  searchInput?.addEventListener('input', renderList); sortSelect?.addEventListener('change', renderList);
  document.querySelectorAll('[data-video-view]').forEach((button) => button.addEventListener('click', () => { view = button.dataset.videoView; document.querySelectorAll('[data-video-view]').forEach((item) => item.classList.toggle('is-active', item === button)); list?.classList.toggle('is-list-view', view === 'list'); }));
  document.querySelectorAll('[data-video-reset]').forEach((button) => button.addEventListener('click', () => { topic = 'all'; if (searchInput) searchInput.value = ''; if (sortSelect) sortSelect.value = 'newest'; document.querySelectorAll('[data-video-topic]').forEach((item, index) => { item.classList.toggle('is-active', index === 0); item.setAttribute('aria-selected', String(index === 0)); }); renderList(); }));
  copyButton?.addEventListener('click', async () => { if (!selected) return; try { await navigator.clipboard.writeText(publicUrl(selected)); trackEvent(selected.id, 'copy'); copyButton.classList.add('is-done'); copyButton.querySelector('span').textContent = 'Đã chép'; setTimeout(() => { copyButton.classList.remove('is-done'); copyButton.querySelector('span').textContent = 'Sao chép'; }, 1800); } catch { if (status) status.textContent = 'Không thể tự sao chép — hãy dùng QR hoặc link video.'; } });
  shareButton?.addEventListener('click', async () => { if (!selected) return; const url = publicUrl(selected); try { if (navigator.share) await navigator.share({ title: situationName(selected), text: 'Cùng khám phá tình huống GORISE', url }); else { await navigator.clipboard.writeText(url); shareButton.classList.add('is-done'); shareButton.querySelector('span').textContent = 'Đã chép'; setTimeout(() => { shareButton.classList.remove('is-done'); shareButton.querySelector('span').textContent = 'Chia sẻ'; }, 1800); } trackEvent(selected.id, 'share'); } catch { /* Người dùng đóng bảng chia sẻ. */ } });
  helpfulButton?.addEventListener('click', () => { if (!selected) return; const active = helpfulButton.getAttribute('aria-pressed') !== 'true'; helpfulButton.setAttribute('aria-pressed', String(active)); helpfulButton.classList.toggle('is-helpful', active); if (active) trackEvent(selected.id, 'helpful'); });
  saveButton?.addEventListener('click', () => { if (!selected) return; const saved = saveButton.getAttribute('aria-pressed') !== 'true'; saveButton.setAttribute('aria-pressed', String(saved)); saveButton.classList.toggle('is-saved', saved); saveButton.querySelector('span').textContent = saved ? 'Đã lưu' : 'Lưu'; setSavedVideo(selected.id, saved); if (saved) trackEvent(selected.id, 'save'); });
  const applyVideos = (dataList) => {
    if (Array.isArray(dataList) && dataList.length) {
      videos = dataList;
    }
    renderCounts();
    const requested = new URLSearchParams(window.location.search).get('v');
    const categoryVideo = topic === 'all' ? null : videos.find((item) => topicFor(item) === topic);
    renderSelected(videos.find((item) => item.id === requested) || categoryVideo || videos[0]);
    document.querySelectorAll('[data-video-topic]').forEach((item) => {
      const active = item.dataset.videoTopic === topic;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
    });
    renderList();
  };

  // 1. Render ngay lập tức từ 20 video cố định để không bao giờ bị trống
  applyVideos(FALLBACK_VIDEOS);

  // 2. Tự động đồng bộ thêm từ server nếu có cập nhật mới
  fetch('/api/videos')
    .then((response) => response.json())
    .then((data) => {
      if (Array.isArray(data.videos) && data.videos.length) {
        applyVideos(data.videos);
      }
    })
    .catch(() => {});
})();