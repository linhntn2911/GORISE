import sql from 'mssql';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

export const mssqlConfig = {
  server: process.env.MSSQL_SERVER || '127.0.0.1',
  port: Number(process.env.MSSQL_PORT || 1433),
  database: process.env.MSSQL_DATABASE || 'GORISE_DB',
  user: process.env.MSSQL_USER || 'gorise_user',
  password: process.env.MSSQL_PASSWORD || 'GorisePassword123!',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

export async function seedDatabase() {
  const pool = await sql.connect(mssqlConfig);
  console.log('Connected to SQL Server GORISE_DB for seeding...');

  // 1. Seed Products
  const products = JSON.parse(await readFile(new URL('./product-seed.json', import.meta.url), 'utf8'));
  for (const item of products) {
    const req = pool.request();
    req.input('id', sql.NVarChar(64), item.id);
    req.input('productName', sql.NVarChar(255), item.productName);
    req.input('description', sql.NVarChar(sql.MAX), item.description);
    req.input('price', sql.BigInt, item.price);
    req.input('category', sql.NVarChar(150), item.category);
    req.input('ageRange', sql.NVarChar(150), item.ageRange);
    req.input('components', sql.NVarChar(sql.MAX), JSON.stringify(item.components || []));
    req.input('availability', sql.NVarChar(150), item.availability);
    req.input('shipping', sql.NVarChar(sql.MAX), item.shipping ? JSON.stringify(item.shipping) : null);
    req.input('payment', sql.NVarChar(sql.MAX), item.payment ? JSON.stringify(item.payment) : null);
    req.input('images', sql.NVarChar(sql.MAX), JSON.stringify(item.images || []));
    req.input('productUrl', sql.NVarChar(255), item.productUrl || '/kham-pha-tro-choi');

    await req.query(`
      IF NOT EXISTS (SELECT 1 FROM products WHERE id = @id)
      BEGIN
        INSERT INTO products (id, product_name, description, price_vnd, category, age_range, components_json, availability, shipping_json, payment_json, images_json, product_url, status)
        VALUES (@id, @productName, @description, @price, @category, @ageRange, @components, @availability, @shipping, @payment, @images, @productUrl, 'selling')
      END
    `);
  }
  console.log(`Seeded ${products.length} products.`);

  // 2. Seed Articles from news-seo-meta.json
  const articles = JSON.parse(await readFile(new URL('../news-seo-meta.json', import.meta.url), 'utf8'));
  for (const item of articles) {
    const id = crypto.randomUUID();
    const req = pool.request();
    req.input('id', sql.NVarChar(64), id);
    req.input('slug', sql.NVarChar(255), item.slug);
    req.input('title', sql.NVarChar(255), item.title);
    req.input('summary', sql.NVarChar(sql.MAX), item.summary || '');
    req.input('content', sql.NVarChar(sql.MAX), item.summary || item.title);
    req.input('category', sql.NVarChar(150), 'Kỹ năng an toàn');
    req.input('thumbnailUrl', sql.NVarChar(500), item.image || '');
    req.input('seoTitle', sql.NVarChar(255), item.title);
    req.input('seoDescription', sql.NVarChar(sql.MAX), item.summary || '');
    req.input('createdBy', sql.NVarChar(255), 'system@gorise.vn');

    await req.query(`
      IF NOT EXISTS (SELECT 1 FROM cms_articles WHERE slug = @slug)
      BEGIN
        INSERT INTO cms_articles (id, slug, title, summary, content, category, thumbnail_url, seo_title, seo_description, status, published_at, created_by)
        VALUES (@id, @slug, @title, @summary, @content, @category, @thumbnailUrl, @seoTitle, @seoDescription, 'published', GETDATE(), @createdBy)
      END
    `);
  }
  console.log(`Seeded ${articles.length} articles.`);

  // 3. Seed Builder default pages
  const defaultPages = [
    { slug: 'home', route: '/', title: 'Trang chủ' },
    { slug: 've-gorise', route: '/ve-gorise', title: 'Về GORISE' },
    { slug: 'shop', route: '/kham-pha-tro-choi', title: 'Safe Home Shop' },
    { slug: 'video-tinh-huong', route: '/video-tinh-huong', title: 'Video tình huống' },
    { slug: 'tin-tuc', route: '/tin-tuc', title: 'Tin tức' },
    { slug: 'lien-he', route: '/lien-he', title: 'Liên hệ' },
    { slug: 'thu-thach', route: '/thu-thach', title: 'Thử thách' },
    { slug: 'gio-hang', route: '/gio-hang', title: 'Giỏ hàng' },
  ];

  for (const page of defaultPages) {
    const id = crypto.randomUUID();
    const schema = JSON.stringify({ sections: [] });
    const req = pool.request();
    req.input('id', sql.NVarChar(64), id);
    req.input('slug', sql.NVarChar(120), page.slug);
    req.input('route', sql.NVarChar(255), page.route);
    req.input('title', sql.NVarChar(255), page.title);
    req.input('schema', sql.NVarChar(sql.MAX), schema);

    await req.query(`
      IF NOT EXISTS (SELECT 1 FROM cms_pages WHERE slug = @slug)
      BEGIN
        INSERT INTO cms_pages (id, slug, route, title, status, draft_schema, published_schema, updated_by, published_by)
        VALUES (@id, @slug, @route, @title, 'published', @schema, @schema, 'admin@gorise.vn', 'admin@gorise.vn')
      END
    `);
  }
  console.log(`Seeded ${defaultPages.length} default CMS pages.`);

  await pool.close();
  console.log('SQL Server Database Seeding Completed!');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seedDatabase().catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  });
}
