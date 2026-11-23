(() => {
  const money = (value) => value == null ? 'Đang cập nhật' : `${Number(value).toLocaleString('vi-VN')}₫`;
  const firstSpec = (product, patterns) => {
    const match = Object.entries(product.specs || {}).find(([key]) => patterns.some((pattern) => pattern.test(key)));
    return match?.[1] || '';
  };

  const openLightbox = (url, alt) => {
    const lightbox = document.querySelector('[data-shop-lightbox]');
    const image = lightbox?.querySelector('[data-lightbox-image]');
    if (!lightbox || !image) return;
    image.src = url;
    image.alt = alt;
    lightbox.hidden = false;
    document.body.classList.add('shop-overlay-open');
  };

  const renderGallery = (product) => {
    const grid = document.querySelector('.shop-gallery-grid');
    if (!grid) return;
    const urls = [...new Set([...(product.images || []), ...(product.gallery || [])].filter(Boolean))];
    if (!urls.length) return;
    grid.replaceChildren(...urls.map((url, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.lightbox = url;
      button.setAttribute('aria-label', `Xem ảnh ${index + 1} của ${product.productName}`);
      const image = document.createElement('img');
      image.onerror = () => { image.onerror = null; image.src = '/assets/images/product-safe-home.webp'; };
      image.src = url;
      image.alt = `${product.productName} — ảnh ${index + 1}`;
      image.loading = 'lazy';
      image.decoding = 'async';
      const caption = document.createElement('span');
      caption.textContent = index === 0 ? 'Ảnh chính sản phẩm' : `Ảnh sản phẩm ${index + 1}`;
      button.append(image, caption);
      button.addEventListener('click', () => openLightbox(url, image.alt));
      return button;
    }));
  };

  const renderProductVideo = (product) => {
    const container = document.querySelector('.experience-video');
    if (!container || !product.videoUrl) return;
    const oldMedia = container.querySelector('img, video');
    const video = document.createElement('video');
    video.src = product.videoUrl;
    video.controls = true;
    video.preload = 'metadata';
    video.playsInline = true;
    video.setAttribute('aria-label', `Video giới thiệu ${product.productName}`);
    video.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    oldMedia?.replaceWith(video);
    const playButton = container.querySelector('.experience-play');
    if (playButton) playButton.hidden = true;
  };

  fetch('/api/products')
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('Không tải được sản phẩm.')))
    .then(({ products = [] }) => {
      const product = products.find((item) => item.status === 'selling') || products.find((item) => item.status !== 'stopped') || products[0];
      if (!product) return;

      const card = document.querySelector('.shop-product-standard');
      const displayPrice = product.salePrice ?? product.price;
      const playerSpec = firstSpec(product, [/người/i, /player/i, /số lượng/i]) || Object.values(product.specs || {})[0] || '';
      const mainImage = product.images?.[0] || product.gallery?.[0] || '';

      if (card) {
        const title = card.querySelector('h3');
        const description = card.querySelector('.product-card-body > p');
        const price = card.querySelector('.product-buy-row strong');
        const button = card.querySelector('[data-add-cart]');
        const facts = card.querySelectorAll('.product-facts span');
        if (title) title.textContent = product.productName;
        if (description) description.textContent = product.shortDescription || product.description;
        if (price) price.textContent = money(displayPrice);
        if (facts[0]) facts[0].textContent = product.ageRange || 'Đang cập nhật';
        if (facts[1]) facts[1].textContent = playerSpec || 'Đang cập nhật';
        if (mainImage) {
          const image = card.querySelector('.product-card-visual img');
          if (image) {
            image.onerror = () => { image.onerror = null; image.src = '/assets/images/product-safe-home.webp'; };
            image.src = mainImage;
            image.alt = product.productName;
          }
        }
        if (button) {
          const unavailable = product.status !== 'selling' || product.stockQuantity === 0;
          button.disabled = unavailable;
          button.dataset.productId = product.id;
          button.textContent = unavailable ? 'Tạm hết hàng' : 'Thêm vào giỏ ↗';
        }
      }

      const compareHeader = document.querySelector('.compare-standard-head');
      if (compareHeader) {
        const image = compareHeader.querySelector('img');
        const name = compareHeader.querySelector('span');
        if (image && mainImage) {
          image.onerror = () => { image.onerror = null; image.src = '/assets/images/product-safe-home.webp'; };
          image.src = mainImage;
          image.alt = product.productName;
        }
        if (name) name.textContent = product.productName;
      }
      const compareRows = document.querySelectorAll('.compare-table tbody tr');
      if (compareRows[0]?.children[1]) compareRows[0].children[1].textContent = product.ageRange || 'Đang cập nhật';
      if (compareRows[1]?.children[1]) compareRows[1].children[1].textContent = playerSpec || 'Đang cập nhật';
      const comparePrice = document.querySelector('.compare-table .compare-price');
      if (comparePrice) comparePrice.textContent = money(displayPrice);

      const detailDescription = document.querySelector('.experience-copy > p');
      if (detailDescription && product.description) detailDescription.textContent = product.description;

      renderGallery(product);
      renderProductVideo(product);
      document.dispatchEvent(new CustomEvent('gorise:product-loaded', { detail: { product } }));
    })
    .catch((error) => console.warn('Product CMS sync failed:', error.message));
})();
