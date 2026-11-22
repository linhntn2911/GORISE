USE GORISE_DB;
GO

-- 1. Schema Migrations
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'schema_migrations')
BEGIN
    CREATE TABLE schema_migrations (
        version INT PRIMARY KEY,
        applied_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

-- 2. Products
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'products')
BEGIN
    CREATE TABLE products (
        id NVARCHAR(64) PRIMARY KEY,
        product_name NVARCHAR(255) NOT NULL,
        sku NVARCHAR(120) NULL,
        description NVARCHAR(MAX) NOT NULL,
        short_description NVARCHAR(MAX) NULL,
        price_vnd BIGINT NULL,
        sale_price_vnd BIGINT NULL,
        sale_start DATE NULL,
        sale_end DATE NULL,
        category NVARCHAR(150) NULL,
        age_range NVARCHAR(150) NULL,
        components_json NVARCHAR(MAX) NULL,
        specs_json NVARCHAR(MAX) NULL,
        availability NVARCHAR(150) NULL,
        stock_quantity INT NULL,
        status NVARCHAR(32) NOT NULL DEFAULT 'selling',
        version_name NVARCHAR(120) NULL,
        gallery_json NVARCHAR(MAX) NULL,
        video_url NVARCHAR(500) NULL,
        shipping_json NVARCHAR(MAX) NULL,
        payment_json NVARCHAR(MAX) NULL,
        images_json NVARCHAR(MAX) NULL,
        product_url NVARCHAR(255) NOT NULL,
        seo_json NVARCHAR(MAX) NULL,
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

-- 3. CMS Articles
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'cms_articles')
BEGIN
    CREATE TABLE cms_articles (
        id NVARCHAR(64) PRIMARY KEY,
        slug NVARCHAR(255) NOT NULL UNIQUE,
        title NVARCHAR(255) NOT NULL,
        summary NVARCHAR(MAX) NULL,
        content NVARCHAR(MAX) NOT NULL,
        category NVARCHAR(150) NOT NULL DEFAULT N'Tin tức',
        tags_json NVARCHAR(MAX) NULL,
        thumbnail_url NVARCHAR(500) NULL,
        seo_title NVARCHAR(255) NULL,
        seo_description NVARCHAR(MAX) NULL,
        status NVARCHAR(32) NOT NULL DEFAULT 'draft',
        published_at DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        created_by NVARCHAR(255) NOT NULL,
        deleted_at DATETIME2 NULL
    );
    CREATE INDEX idx_articles_status ON cms_articles (status, deleted_at, published_at);
END
GO

-- 4. Media Assets
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'media_assets')
BEGIN
    CREATE TABLE media_assets (
        id NVARCHAR(64) PRIMARY KEY,
        slot NVARCHAR(80) NOT NULL,
        original_name NVARCHAR(255) NOT NULL,
        content_type NVARCHAR(100) NOT NULL,
        size_bytes BIGINT NOT NULL,
        storage_key NVARCHAR(255) NOT NULL UNIQUE,
        stable_url NVARCHAR(500) NOT NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_by NVARCHAR(255) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2 NULL
    );
    CREATE INDEX idx_media_slot_active ON media_assets (slot, is_active, deleted_at);
END
GO

-- 5. Situation Videos
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'situation_videos')
BEGIN
    CREATE TABLE situation_videos (
        id NVARCHAR(64) PRIMARY KEY,
        title NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NULL,
        original_name NVARCHAR(255) NOT NULL,
        content_type NVARCHAR(100) NOT NULL,
        size_bytes BIGINT NOT NULL,
        storage_key NVARCHAR(255) NOT NULL UNIQUE,
        stable_url NVARCHAR(500) NOT NULL,
        thumbnail_url NVARCHAR(500) NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_by NVARCHAR(255) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        deleted_at DATETIME2 NULL
    );
    CREATE INDEX idx_video_active ON situation_videos (is_active, deleted_at, created_at);
END
GO

-- 6. Video Analytics
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'video_analytics')
BEGIN
    CREATE TABLE video_analytics (
        video_id NVARCHAR(64) PRIMARY KEY,
        views BIGINT NOT NULL DEFAULT 0,
        helpful BIGINT NOT NULL DEFAULT 0,
        saves BIGINT NOT NULL DEFAULT 0,
        shares BIGINT NOT NULL DEFAULT 0,
        copies BIGINT NOT NULL DEFAULT 0,
        question_opens BIGINT NOT NULL DEFAULT 0,
        playlist_opens BIGINT NOT NULL DEFAULT 0,
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT fk_video_analytics_video FOREIGN KEY (video_id) REFERENCES situation_videos(id) ON DELETE CASCADE
    );
END
GO

-- 7. CMS Pages (Website Builder)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'cms_pages')
BEGIN
    CREATE TABLE cms_pages (
        id NVARCHAR(64) PRIMARY KEY,
        slug NVARCHAR(120) NOT NULL UNIQUE,
        route NVARCHAR(255) NOT NULL,
        title NVARCHAR(255) NOT NULL,
        status NVARCHAR(32) NOT NULL DEFAULT 'draft',
        draft_schema NVARCHAR(MAX) NOT NULL,
        published_schema NVARCHAR(MAX) NOT NULL,
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        published_at DATETIME2 NULL,
        updated_by NVARCHAR(255) NULL,
        published_by NVARCHAR(255) NULL
    );
    CREATE INDEX idx_cms_pages_route ON cms_pages (route);
END
GO

-- 8. CMS Page Versions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'cms_page_versions')
BEGIN
    CREATE TABLE cms_page_versions (
        id NVARCHAR(64) PRIMARY KEY,
        page_id NVARCHAR(64) NOT NULL,
        version_type NVARCHAR(32) NOT NULL DEFAULT 'published',
        schema_json NVARCHAR(MAX) NOT NULL,
        created_by NVARCHAR(255) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        note NVARCHAR(500) NULL,
        CONSTRAINT fk_cms_page_versions_page FOREIGN KEY (page_id) REFERENCES cms_pages(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_cms_page_versions_page ON cms_page_versions (page_id, created_at);
END
GO

-- 9. Builder Templates
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'builder_templates')
BEGIN
    CREATE TABLE builder_templates (
        id NVARCHAR(64) PRIMARY KEY,
        name NVARCHAR(160) NOT NULL,
        category NVARCHAR(80) NOT NULL DEFAULT 'GORISE',
        schema_json NVARCHAR(MAX) NOT NULL,
        created_by NVARCHAR(255) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX idx_builder_templates_updated ON builder_templates (updated_at);
END
GO

-- 10. CMS Page Meta (SEO)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'cms_page_meta')
BEGIN
    CREATE TABLE cms_page_meta (
        page_slug NVARCHAR(120) PRIMARY KEY,
        meta_title NVARCHAR(255) NULL,
        meta_description NVARCHAR(500) NULL,
        og_image NVARCHAR(500) NULL,
        canonical_url NVARCHAR(500) NULL,
        robots NVARCHAR(40) NOT NULL DEFAULT 'index,follow',
        updated_by NVARCHAR(255) NULL,
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

-- 11. Admin Activity Log
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'admin_activity_log')
BEGIN
    CREATE TABLE admin_activity_log (
        id NVARCHAR(64) PRIMARY KEY,
        actor NVARCHAR(255) NOT NULL,
        action NVARCHAR(120) NOT NULL,
        entity_type NVARCHAR(80) NOT NULL,
        entity_id NVARCHAR(120) NULL,
        detail_json NVARCHAR(MAX) NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX idx_admin_activity_created ON admin_activity_log (created_at);
END
GO

-- 12. Orders (Đơn hàng mua từ website)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'orders')
BEGIN
    CREATE TABLE orders (
        id NVARCHAR(64) PRIMARY KEY,
        order_code NVARCHAR(32) NOT NULL UNIQUE,
        customer_name NVARCHAR(255) NOT NULL,
        customer_phone NVARCHAR(32) NOT NULL,
        customer_email NVARCHAR(255) NULL,
        shipping_address NVARCHAR(MAX) NOT NULL,
        note NVARCHAR(MAX) NULL,
        total_amount BIGINT NOT NULL,
        payment_method NVARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
        payment_status NVARCHAR(50) NOT NULL DEFAULT 'pending',
        order_status NVARCHAR(50) NOT NULL DEFAULT 'new',
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX idx_orders_status ON orders (order_status, payment_status, created_at);
END
GO

-- 13. Order Items
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'order_items')
BEGIN
    CREATE TABLE order_items (
        id NVARCHAR(64) PRIMARY KEY,
        order_id NVARCHAR(64) NOT NULL,
        product_id NVARCHAR(64) NOT NULL,
        product_name NVARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        unit_price BIGINT NOT NULL,
        total_price BIGINT NOT NULL,
        CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
END
GO
