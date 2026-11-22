(() => {
  const money = (value) => value == null ? 'Đang cập nhật' : `${Number(value).toLocaleString('vi-VN')}₫`;
  fetch('/api/products').then((r) => r.ok ? r.json() : { products: [] }).then(({ products = [] }) => {
    const product = products.find((item) => item.status !== 'stopped') || products[0];
    const card = document.querySelector('.shop-product-standard');
    if (!product || !card) return;
    const title = card.querySelector('h3'); const description = card.querySelector('.product-card-body > p'); const price = card.querySelector('.product-buy-row strong'); const button = card.querySelector('[data-add-cart]');
    if (title) title.textContent = product.productName;
    if (description) description.textContent = product.shortDescription || product.description;
    if (price) price.textContent = money(product.salePrice ?? product.price);
    if (button) { button.disabled = product.status === 'out_of_stock'; button.dataset.productId = product.id; button.textContent = product.status === 'out_of_stock' ? 'Hết hàng' : 'Thêm vào giỏ ↗'; }
    card.querySelectorAll('.product-facts span')[0]?.replaceChildren(document.createTextNode(product.ageRange || '6–11 tuổi'));
    if (product.images?.[0]) card.querySelector('.product-card-visual img')?.setAttribute('src', product.images[0]);
  }).catch(() => {});
})();
