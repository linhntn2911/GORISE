(() => {
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&':'&#38;', '<':'&#60;', '>':'&#62;', "'":'&#39;', '"':'&#34;' }[c]));
  const slug = location.pathname.replace(/^\/tin-tuc\/?/, '').replace(/\/$/, '');
  fetch('/api/articles').then((response) => response.ok ? response.json() : { articles: [] }).then(({ articles = [] }) => {
    const current = articles.find((article) => article.slug === slug);
    const detail = document.querySelector('[data-news-detail]');
    if (current && detail) {
      document.body.classList.add('news-detail-mode'); detail.hidden = false;
      document.querySelectorAll('.news-hero, .news-filter-section, .news-featured, .news-list-section, .news-safehome-cta, .news-follow').forEach((node) => { node.hidden = true; });
      detail.querySelector('[data-detail-category]').textContent = current.category;
      detail.querySelector('[data-detail-title]').textContent = current.title;
      detail.querySelector('[data-detail-summary]').textContent = current.summary;
      detail.querySelector('[data-detail-image]').src = current.thumbnailUrl || '/news-hero-reference.webp';
      detail.querySelector('[data-detail-image]').alt = current.title;
      detail.querySelector('[data-detail-body]').innerHTML = current.content;
      detail.querySelector('[data-detail-meta]').textContent = current.publishedAt ? `Đăng ngày ${new Date(current.publishedAt).toLocaleDateString('vi-VN')}` : 'Nội dung GORISE';
      document.title = `${current.title} | Tin tức GORISE`;
      const meta = document.querySelector('meta[name="description"]'); if (meta) meta.content = current.seoDescription || current.summary;
      const copy = detail.querySelector('[data-copy-link]'); copy?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); copy.textContent = 'Đã sao chép liên kết'; } catch {} });
      return;
    }
    if (slug || !articles.length) return;
    const grid = document.querySelector('[data-news-grid]'); if (!grid) return;
    const existing = new Set([...grid.querySelectorAll('a[href*="/tin-tuc/"]')].map((a) => a.getAttribute('href').split('/').filter(Boolean).pop()));
    articles.filter((article) => !existing.has(article.slug)).forEach((article) => { const card = document.createElement('article'); card.className = 'news-grid-card news-card-link'; card.dataset.newsCard = ''; card.dataset.category = 'cms'; card.dataset.title = article.title; card.innerHTML = `<a href="/tin-tuc/${encodeURIComponent(article.slug)}/"><img src="${esc(article.thumbnailUrl || '/news-hero-reference.webp')}" alt="${esc(article.title)}" loading="lazy" /><div class="news-grid-copy"><span class="news-tag">${esc(article.category)}</span><h3>${esc(article.title)}</h3><p>${esc(article.summary)}</p><span class="news-read-link">Đọc tiếp <b>→</b></span></div></a>`; grid.append(card); });
  }).catch(() => {});
})();
