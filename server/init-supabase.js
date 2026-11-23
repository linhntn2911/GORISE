import pg from 'pg';
const { Client } = pg;

export const DEFAULT_SUPABASE_URL = 'postgres://postgres.mkmdvuknltnpgtobxcan:Nguyenlinh291104.@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres';

export const schemaSql = `
-- 1. Schema migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Products
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(120) NULL,
    description TEXT NOT NULL,
    short_description TEXT NULL,
    price_vnd BIGINT NULL,
    sale_price_vnd BIGINT NULL,
    sale_start DATE NULL,
    sale_end DATE NULL,
    category VARCHAR(150) NULL,
    age_range VARCHAR(150) NULL,
    components_json TEXT NULL,
    specs_json TEXT NULL,
    availability VARCHAR(150) NULL,
    stock_quantity INT NULL DEFAULT 100,
    status VARCHAR(32) NOT NULL DEFAULT 'selling',
    version_name VARCHAR(120) NULL,
    gallery_json TEXT NULL,
    video_url VARCHAR(500) NULL,
    shipping_json TEXT NULL,
    payment_json TEXT NULL,
    images_json TEXT NULL,
    product_url VARCHAR(255) NOT NULL,
    seo_json TEXT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CMS Articles
CREATE TABLE IF NOT EXISTS cms_articles (
    id VARCHAR(64) PRIMARY KEY,
    slug VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    summary TEXT NULL,
    content TEXT NOT NULL,
    category VARCHAR(150) NOT NULL DEFAULT 'Tin tức',
    tags_json TEXT NULL,
    thumbnail_url VARCHAR(500) NULL,
    seo_title VARCHAR(255) NULL,
    seo_description TEXT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'published',
    published_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL DEFAULT 'admin@gorise.vn',
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS idx_articles_status ON cms_articles (status, deleted_at, published_at);

-- 4. Admin Users
CREATE TABLE IF NOT EXISTS admin_users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    password_salt VARCHAR(64) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'super_admin',
    is_active INT NOT NULL DEFAULT 1,
    last_login_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_users_login ON admin_users (username, email, is_active);

-- 5. Customers
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) NULL UNIQUE,
    email VARCHAR(255) NULL UNIQUE,
    phone VARCHAR(32) NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    password_salt VARCHAR(64) NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500) NULL,
    auth_provider VARCHAR(50) NOT NULL DEFAULT 'local',
    provider_id VARCHAR(255) NULL,
    is_verified INT NOT NULL DEFAULT 0,
    is_active INT NOT NULL DEFAULT 1,
    loyalty_points INT NOT NULL DEFAULT 0,
    has_unlocked_play INT NOT NULL DEFAULT 0,
    last_login_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_login ON customers (username, email, phone, is_active);

-- 6. Customer Addresses
CREATE TABLE IF NOT EXISTS customer_addresses (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(32) NOT NULL,
    province VARCHAR(100) NULL,
    district VARCHAR(100) NULL,
    ward VARCHAR(100) NULL,
    street_address VARCHAR(500) NOT NULL,
    is_default INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Orders
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    order_code VARCHAR(32) NOT NULL UNIQUE,
    customer_id VARCHAR(64) NULL REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    customer_email VARCHAR(255) NULL,
    shipping_address TEXT NOT NULL,
    note TEXT NULL,
    total_amount BIGINT NOT NULL,
    shipping_fee BIGINT NOT NULL DEFAULT 35000,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    order_status VARCHAR(50) NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (order_status, payment_status, created_at);

-- 8. Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price BIGINT NOT NULL,
    total_price BIGINT NOT NULL
);

-- 9. Media Assets
CREATE TABLE IF NOT EXISTS media_assets (
    id VARCHAR(64) PRIMARY KEY,
    slot VARCHAR(80) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_key VARCHAR(255) NOT NULL UNIQUE,
    stable_url VARCHAR(500) NOT NULL,
    is_active INT NOT NULL DEFAULT 1,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS idx_media_slot_active ON media_assets (slot, is_active, deleted_at);

-- 10. Situation Videos
CREATE TABLE IF NOT EXISTS situation_videos (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    original_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_key VARCHAR(255) NOT NULL UNIQUE,
    stable_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500) NULL,
    is_active INT NOT NULL DEFAULT 1,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS idx_video_active ON situation_videos (is_active, deleted_at, created_at);

-- 11. Video Analytics
CREATE TABLE IF NOT EXISTS video_analytics (
    video_id VARCHAR(64) PRIMARY KEY REFERENCES situation_videos(id) ON DELETE CASCADE,
    views BIGINT NOT NULL DEFAULT 0,
    helpful BIGINT NOT NULL DEFAULT 0,
    saves BIGINT NOT NULL DEFAULT 0,
    shares BIGINT NOT NULL DEFAULT 0,
    copies BIGINT NOT NULL DEFAULT 0,
    question_opens BIGINT NOT NULL DEFAULT 0,
    playlist_opens BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. CMS Pages
CREATE TABLE IF NOT EXISTS cms_pages (
    id VARCHAR(64) PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    route VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'published',
    draft_schema TEXT NOT NULL,
    published_schema TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ NULL,
    updated_by VARCHAR(255) NULL,
    published_by VARCHAR(255) NULL
);
CREATE INDEX IF NOT EXISTS idx_cms_pages_route ON cms_pages (route);

-- 13. CMS Page Versions
CREATE TABLE IF NOT EXISTS cms_page_versions (
    id VARCHAR(64) PRIMARY KEY,
    page_id VARCHAR(64) NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
    version_type VARCHAR(32) NOT NULL DEFAULT 'published',
    schema_json TEXT NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    note VARCHAR(500) NULL
);

-- 14. Builder Templates
CREATE TABLE IF NOT EXISTS builder_templates (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    category VARCHAR(80) NOT NULL DEFAULT 'GORISE',
    schema_json TEXT NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. CMS Page Meta
CREATE TABLE IF NOT EXISTS cms_page_meta (
    page_slug VARCHAR(120) PRIMARY KEY,
    meta_title VARCHAR(255) NULL,
    meta_description VARCHAR(500) NULL,
    og_image VARCHAR(500) NULL,
    canonical_url VARCHAR(500) NULL,
    robots VARCHAR(40) NOT NULL DEFAULT 'index,follow',
    updated_by VARCHAR(255) NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Admin Activity Log
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id VARCHAR(64) PRIMARY KEY,
    actor VARCHAR(255) NOT NULL,
    action VARCHAR(120) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id VARCHAR(120) NULL,
    detail_json TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. Product Reviews
CREATE TABLE IF NOT EXISTS product_reviews (
    id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    customer_id VARCHAR(64) NULL REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'approved',
    admin_reply TEXT NULL,
    replied_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_product_status ON product_reviews (product_id, status, created_at);

-- 18. Activation Codes
CREATE TABLE IF NOT EXISTS activation_codes (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    batch_name VARCHAR(100) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'unused',
    activated_by_customer_id VARCHAR(64) NULL,
    activated_by_name VARCHAR(100) NULL,
    activated_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activation_code ON activation_codes (code, status);
`;

export async function initSupabaseSchema(connStr = process.env.DATABASE_URL || DEFAULT_SUPABASE_URL) {
  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  try {
    await client.query(schemaSql);

    // Seed admin
    const adminCheck = await client.query("SELECT id FROM admin_users WHERE username = 'admin'");
    if (adminCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO admin_users (
          id, username, email, password_hash, password_salt, full_name, role, is_active
        ) VALUES (
          gen_random_uuid(),
          'admin',
          'admin@gorise.vn',
          '5cf173c5bc4135313dd67e0a13684eae8550008cc1d64726580676196f3307615403188c175b55a5ec2efd94cdc08233bc17036ef48ed4fdde0a534e3ab2c0a7',
          '6ba4d13a7848c617dac8f26f084fdf7f',
          'Quản trị viên GORISE',
          'super_admin',
          1
        );
      `);
    }

    // Seed admin in customers
    const custCheck = await client.query("SELECT id FROM customers WHERE username = 'admin'");
    if (custCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO customers (
          id, username, email, phone, password_hash, password_salt, full_name, has_unlocked_play, is_active
        ) VALUES (
          gen_random_uuid(),
          'admin',
          'admin@gorise.vn',
          '0987654321',
          '5cf173c5bc4135313dd67e0a13684eae8550008cc1d64726580676196f3307615403188c175b55a5ec2efd94cdc08233bc17036ef48ed4fdde0a534e3ab2c0a7',
          '6ba4d13a7848c617dac8f26f084fdf7f',
          'Quản trị viên GORISE',
          1,
          1
        );
      `);
    }

    // Seed default product
    const prodCheck = await client.query("SELECT id FROM products WHERE id = 'gorise-board-game'");
    if (prodCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO products (
          id, product_name, description, short_description, price_vnd, sale_price_vnd, category, age_range,
          stock_quantity, status, product_url, images_json, updated_at
        ) VALUES (
          'gorise-board-game',
          'Board Game GORISE - Học Kỹ Năng An Toàn Gia Đình',
          'Bộ cờ giáo dục kỹ năng sinh tồn và an toàn thông minh dành cho trẻ em và gia đình.',
          'Bộ cờ tương tác thông minh rèn luyện kỹ năng ứng biến an toàn.',
          350000,
          299000,
          'Board Game Giáo Dục',
          '6-15 tuổi',
          200,
          'selling',
          '/kham-pha-tro-choi',
          '["/assets/images/box-mockup.png"]',
          NOW()
        );
      `);
    }

    // Seed activation codes
    const demoCodes = ['GORISE-SAFE-8888', 'GORISE-SAFE-9999', 'GORISE-VIP-2026', 'GORISE-TEST-1111', 'GORISE-TEST-2222'];
    for (const code of demoCodes) {
      await client.query(`
        INSERT INTO activation_codes (id, code, batch_name, status, created_at)
        VALUES (gen_random_uuid(), $1, 'Đợt khởi tạo Supabase', 'unused', NOW())
        ON CONFLICT (code) DO NOTHING;
      `, [code]);
    }
  } finally {
    await client.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith('init-supabase.js')) {
  initSupabaseSchema()
    .then(() => console.log('Supabase initialized successfully!'))
    .catch((err) => console.error('Supabase init failed:', err));
}
