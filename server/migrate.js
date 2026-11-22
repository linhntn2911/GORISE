import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, closeDatabase } from './db.js';
import { ensureBuilderPages } from './db-builder.js';

export async function migrate() {
  const database = getPool();
  await database.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INT PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await database.query(`CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(120) NULL,
    description TEXT NOT NULL,
    short_description TEXT NULL,
    price_vnd INT UNSIGNED NULL,
    sale_price_vnd INT UNSIGNED NULL,
    sale_start DATE NULL,
    sale_end DATE NULL,
    category VARCHAR(150) NULL,
    age_range VARCHAR(150) NULL,
    components_json JSON NULL,
    specs_json JSON NULL,
    availability VARCHAR(150) NULL,
    stock_quantity INT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'selling',
    version_name VARCHAR(120) NULL,
    gallery_json JSON NULL,
    video_url VARCHAR(500) NULL,
    shipping_json JSON NULL,
    payment_json JSON NULL,
    images_json JSON NULL,
    product_url VARCHAR(255) NOT NULL,
    seo_json JSON NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await database.query(`CREATE TABLE IF NOT EXISTS cms_articles (
    id VARCHAR(64) PRIMARY KEY,
    slug VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    summary TEXT NULL,
    content LONGTEXT NOT NULL,
    category VARCHAR(150) NOT NULL DEFAULT 'Tin tức khác',
    tags_json JSON NULL,
    thumbnail_url VARCHAR(500) NULL,
    seo_title VARCHAR(255) NULL,
    seo_description TEXT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMP NULL,
    INDEX idx_articles_status (status, deleted_at, published_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  for (const statement of [
    'ALTER TABLE products ADD COLUMN sku VARCHAR(120) NULL',
    'ALTER TABLE products ADD COLUMN short_description TEXT NULL',
    'ALTER TABLE products ADD COLUMN sale_price_vnd INT UNSIGNED NULL',
    'ALTER TABLE products ADD COLUMN sale_start DATE NULL',
    'ALTER TABLE products ADD COLUMN sale_end DATE NULL',
    'ALTER TABLE products ADD COLUMN specs_json JSON NULL',
    "ALTER TABLE products ADD COLUMN stock_quantity INT NULL",
    "ALTER TABLE products ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'selling'",
    'ALTER TABLE products ADD COLUMN version_name VARCHAR(120) NULL',
    'ALTER TABLE products ADD COLUMN gallery_json JSON NULL',
    'ALTER TABLE products ADD COLUMN video_url VARCHAR(500) NULL',
    'ALTER TABLE products ADD COLUMN seo_json JSON NULL',
  ]) {
    try { await database.query(statement); } catch (error) { if (!/duplicate column|already exists/i.test(String(error.message))) throw error; }
  }
  await database.query(`CREATE TABLE IF NOT EXISTS media_assets (
    id VARCHAR(64) PRIMARY KEY,
    slot VARCHAR(80) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT UNSIGNED NOT NULL,
    storage_key VARCHAR(255) NOT NULL UNIQUE,
    stable_url VARCHAR(500) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_media_slot_active (slot, is_active, deleted_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await database.query(`CREATE TABLE IF NOT EXISTS situation_videos (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    original_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT UNSIGNED NOT NULL,
    storage_key VARCHAR(255) NOT NULL UNIQUE,
    stable_url VARCHAR(500) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_video_active (is_active, deleted_at, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  try {
    await database.query('ALTER TABLE situation_videos ADD COLUMN thumbnail_url VARCHAR(500) NULL AFTER stable_url');
  } catch (error) {
    if (!/duplicate column|already exists/i.test(String(error.message))) throw error;
  }
  await database.query(`CREATE TABLE IF NOT EXISTS video_analytics (
    video_id VARCHAR(64) PRIMARY KEY,
    views BIGINT UNSIGNED NOT NULL DEFAULT 0,
    helpful BIGINT UNSIGNED NOT NULL DEFAULT 0,
    saves BIGINT UNSIGNED NOT NULL DEFAULT 0,
    shares BIGINT UNSIGNED NOT NULL DEFAULT 0,
    copies BIGINT UNSIGNED NOT NULL DEFAULT 0,
    question_opens BIGINT UNSIGNED NOT NULL DEFAULT 0,
    playlist_opens BIGINT UNSIGNED NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_video_analytics_video FOREIGN KEY (video_id) REFERENCES situation_videos(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await database.query(`CREATE TABLE IF NOT EXISTS cms_pages (
    id VARCHAR(64) PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    route VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    draft_schema JSON NOT NULL,
    published_schema JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    updated_by VARCHAR(255) NULL,
    published_by VARCHAR(255) NULL,
    INDEX idx_cms_pages_route (route)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await database.query(`CREATE TABLE IF NOT EXISTS cms_page_versions (
    id VARCHAR(64) PRIMARY KEY,
    page_id VARCHAR(64) NOT NULL,
    version_type VARCHAR(32) NOT NULL DEFAULT 'published',
    schema_json JSON NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note VARCHAR(500) NULL,
    CONSTRAINT fk_cms_page_versions_page FOREIGN KEY (page_id) REFERENCES cms_pages(id) ON DELETE CASCADE,
    INDEX idx_cms_page_versions_page (page_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await database.query(`CREATE TABLE IF NOT EXISTS builder_templates (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    category VARCHAR(80) NOT NULL DEFAULT 'GORISE',
    schema_json JSON NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_builder_templates_updated (updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await database.query(`CREATE TABLE IF NOT EXISTS cms_page_meta (
    page_slug VARCHAR(120) PRIMARY KEY,
    meta_title VARCHAR(255) NULL,
    meta_description VARCHAR(500) NULL,
    og_image VARCHAR(500) NULL,
    canonical_url VARCHAR(500) NULL,
    robots VARCHAR(40) NOT NULL DEFAULT 'index,follow',
    updated_by VARCHAR(255) NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await database.query(`CREATE TABLE IF NOT EXISTS admin_activity_log (
    id VARCHAR(64) PRIMARY KEY,
    actor VARCHAR(255) NOT NULL,
    action VARCHAR(120) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id VARCHAR(120) NULL,
    detail_json JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_activity_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  const [applied] = await database.execute('SELECT version FROM schema_migrations WHERE version = ?', [1]);
  await ensureBuilderPages();
  if (applied.length) return { applied: false, builderPagesSeeded: true };

  const products = JSON.parse(await readFile(new URL('./product-seed.json', import.meta.url), 'utf8'));
  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();
    for (const item of products) {
      await connection.execute(`INSERT IGNORE INTO products
        (id, product_name, description, price_vnd, category, age_range, components_json,
         availability, shipping_json, payment_json, images_json, product_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        item.id, item.productName, item.description, item.price, item.category, item.ageRange,
        JSON.stringify(item.components), item.availability,
        item.shipping === null ? null : JSON.stringify(item.shipping),
        item.payment === null ? null : JSON.stringify(item.payment),
        JSON.stringify(item.images), item.productUrl,
      ]);
    }
    await connection.execute('INSERT IGNORE INTO schema_migrations (version) VALUES (?)', [1]);
    await connection.commit();
    return { applied: true, products: products.length };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const result = await migrate();
    console.log('Product migration:', result);
  } catch (error) {
    console.error('Product migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}
