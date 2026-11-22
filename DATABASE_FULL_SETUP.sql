-- ============================================================================
-- SCRIPT TẠO TOÀN BỘ CƠ SỞ DỮ LIỆU GORISE (FULL DATABASE SETUP)
-- Hệ quản trị CSDL: Microsoft SQL Server (T-SQL)
-- Hướng dẫn: Mở file này trong SSMS (SQL Server Management Studio) và bấm F5 (Execute)
-- ============================================================================

-- BƯỚC 1: TẠO DATABASE
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'GORISE_DB')
BEGIN
    CREATE DATABASE GORISE_DB;
    PRINT N'-> Đã tạo database GORISE_DB thành công!';
END
ELSE
BEGIN
    PRINT N'-> Database GORISE_DB đã tồn tại, tiếp tục sử dụng.';
END
GO

USE GORISE_DB;
GO

-- ============================================================================
-- BƯỚC 2: TẠO TOÀN BỘ CÁC BẢNG (TABLES)
-- ============================================================================

-- 1. Bảng Quản lý Phiên bản Schema Migration
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'schema_migrations')
BEGIN
    CREATE TABLE schema_migrations (
        version INT PRIMARY KEY,
        applied_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    PRINT N'-> Đã tạo bảng schema_migrations';
END
GO

-- 2. Bảng Sản phẩm (Products)
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
        stock_quantity INT NULL DEFAULT 100,
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
    PRINT N'-> Đã tạo bảng products';
END
GO

-- 3. Bảng Bài viết Tin tức (CMS Articles)
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
        status NVARCHAR(32) NOT NULL DEFAULT 'published',
        published_at DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        created_by NVARCHAR(255) NOT NULL DEFAULT 'admin@gorise.vn',
        deleted_at DATETIME2 NULL
    );
    CREATE INDEX idx_articles_status ON cms_articles (status, deleted_at, published_at);
    PRINT N'-> Đã tạo bảng cms_articles';
END
GO

-- 4. Bảng Đơn hàng (Orders)
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
        shipping_fee BIGINT NOT NULL DEFAULT 30000,
        payment_method NVARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
        payment_status NVARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, paid, failed, refunded
        order_status NVARCHAR(50) NOT NULL DEFAULT 'new',      -- new, processing, shipping, completed, cancelled
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX idx_orders_status ON orders (order_status, payment_status, created_at);
    PRINT N'-> Đã tạo bảng orders';
END
ELSE
BEGIN
    IF COL_LENGTH('orders', 'shipping_fee') IS NULL
    BEGIN
        ALTER TABLE orders ADD shipping_fee BIGINT NOT NULL DEFAULT 30000;
        PRINT N'-> Đã thêm cột shipping_fee vào orders';
    END
END
GO

-- 5. Bảng Chi tiết Đơn hàng (Order Items)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'order_items')
BEGIN
    CREATE TABLE order_items (
        id NVARCHAR(64) PRIMARY KEY,
        order_id NVARCHAR(64) NOT NULL,
        product_id NVARCHAR(64) NOT NULL,
        product_name NVARCHAR(255) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        unit_price BIGINT NOT NULL,
        total_price BIGINT NOT NULL,
        CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
    PRINT N'-> Đã tạo bảng order_items';
END
GO

-- 6. Bảng Quản lý Hình ảnh (Media Assets)
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
    PRINT N'-> Đã tạo bảng media_assets';
END
GO

-- 7. Bảng Quản lý Video Tình huống (Situation Videos)
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
    PRINT N'-> Đã tạo bảng situation_videos';
END
GO

-- 8. Bảng Thống kê Tương tác Video (Video Analytics)
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
    PRINT N'-> Đã tạo bảng video_analytics';
END
GO

-- 9. Bảng Các Trang Website Builder (CMS Pages)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'cms_pages')
BEGIN
    CREATE TABLE cms_pages (
        id NVARCHAR(64) PRIMARY KEY,
        slug NVARCHAR(120) NOT NULL UNIQUE,
        route NVARCHAR(255) NOT NULL,
        title NVARCHAR(255) NOT NULL,
        status NVARCHAR(32) NOT NULL DEFAULT 'published',
        draft_schema NVARCHAR(MAX) NOT NULL,
        published_schema NVARCHAR(MAX) NOT NULL,
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        published_at DATETIME2 NULL,
        updated_by NVARCHAR(255) NULL,
        published_by NVARCHAR(255) NULL
    );
    CREATE INDEX idx_cms_pages_route ON cms_pages (route);
    PRINT N'-> Đã tạo bảng cms_pages';
END
GO

-- 10. Bảng Lịch sử Phiên bản Trang (CMS Page Versions)
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
    PRINT N'-> Đã tạo bảng cms_page_versions';
END
GO

-- 11. Bảng Mẫu Giao diện (Builder Templates)
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
    PRINT N'-> Đã tạo bảng builder_templates';
END
GO

-- 12. Bảng Cấu hình SEO Meta (CMS Page Meta)
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
    PRINT N'-> Đã tạo bảng cms_page_meta';
END
GO

-- 13. Bảng Nhật ký Hoạt động Quản trị (Admin Activity Log)
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
    PRINT N'-> Đã tạo bảng admin_activity_log';
END
GO

-- ============================================================================
-- BƯỚC 3: NẠP DỮ LIỆU BAN ĐẦU (SEED DATA)
-- ============================================================================

-- 1. Thêm sản phẩm GORISE Board Game
IF NOT EXISTS (SELECT 1 FROM products WHERE id = 'gorise-board-game')
BEGIN
    INSERT INTO products (
        id, product_name, sku, description, short_description, price_vnd, 
        category, age_range, components_json, stock_quantity, status, 
        images_json, product_url
    ) VALUES (
        'gorise-board-game', 
        N'GORISE Board Game — Safe Home', 
        'GORISE-SH-01',
        N'Bộ trò chơi giáo dục giúp trẻ và gia đình cùng quan sát, suy nghĩ, lựa chọn và học cách nhận biết tình huống nguy hiểm trong ngôi nhà.',
        N'Học kỹ năng an toàn qua từng lượt chơi cùng bạn đồng hành TIGORI.',
        299000,
        N'Board game giáo dục kỹ năng',
        N'8+ (Phù hợp gia đình & trẻ nhỏ)',
        N'["Bàn chơi bản đồ 5 trạm","Thẻ tình huống nguy hiểm","Thẻ vật phẩm cứu trợ","Quân cờ nhân vật","Xúc xắc","Sách hướng dẫn luật chơi"]',
        100,
        'selling',
        N'["/assets/images/product-safe-home.webp"]',
        '/kham-pha-tro-choi/'
    );
    PRINT N'-> Đã nạp sản phẩm GORISE Board Game';
END
GO

-- 2. Thêm danh sách bài viết cẩm nang an toàn
IF NOT EXISTS (SELECT 1 FROM cms_articles WHERE slug = 'checklist-an-toan-trong-nha-cho-tre-em')
BEGIN
    INSERT INTO cms_articles (id, slug, title, summary, content, category, thumbnail_url, seo_title, seo_description, status, published_at, created_by)
    VALUES 
    (NEWID(), 'checklist-an-toan-trong-nha-cho-tre-em', N'CHECKLIST AN TOÀN TRONG NHÀ CHO TRẺ EM: BẮT ĐẦU TỪ ĐÂU?', N'Một checklist đơn giản giúp gia đình quan sát lại ngôi nhà, nhận diện rủi ro và cùng trẻ hình thành thói quen an toàn.', N'Nội dung chi tiết checklist an toàn cho trẻ em trong gia đình...', N'Kỹ năng an toàn', '/manus-storage/async-images/z4C0SAnMXYinXKsLOIQdoW/image-1.webp', N'Checklist an toàn trong nhà cho trẻ em', N'Checklist an toàn cho trẻ em', 'published', GETDATE(), 'admin@gorise.vn'),
    (NEWID(), 'phong-tranh-bong-va-tai-nan-trong-nha-bep', N'PHÒNG TRÁNH BỎNG CHO TRẺ TRONG NHÀ BẾP: 7 THÓI QUEN DỄ ÁP DỤNG', N'Cách sắp xếp và thói quen giúp gia đình giảm nguy cơ bỏng quanh bếp, nước nóng và đồ ăn vừa nấu.', N'Nội dung hướng dẫn phòng tránh bỏng trong gian bếp...', N'Kỹ năng an toàn', '/manus-storage/async-images/z4C0SAnMXYinXKsLOIQdoW/image-2.webp', N'Phòng tránh bỏng trong nhà bếp', N'Kỹ năng an toàn nhà bếp', 'published', GETDATE(), 'admin@gorise.vn'),
    (NEWID(), 'an-toan-dien-cho-tre-em', N'AN TOÀN ĐIỆN CHO TRẺ EM: 5 NGUYÊN TẮC CẦN LUYỆN TỪ SỚM', N'Giúp trẻ biết dừng lại khi thấy ổ cắm, dây điện hoặc thiết bị điện gần nước.', N'Nội dung 5 nguyên tắc an toàn điện...', N'Kỹ năng an toàn', '/manus-storage/async-images/z4C0SAnMXYinXKsLOIQdoW/image-3.webp', N'An toàn điện cho trẻ em', N'Quy tắc an toàn điện', 'published', GETDATE(), 'admin@gorise.vn'),
    (NEWID(), 'an-toan-phong-tam-cho-tre', N'AN TOÀN PHÒNG TẮM CHO TRẺ: GIẢM TRƯỢT NGÃ VÀ RỦI RO VỚI NƯỚC', N'Những điểm gia đình nên kiểm tra để trẻ biết đi chậm, giữ sàn khô và tìm người lớn khi cần.', N'Nội dung an toàn trong phòng tắm...', N'Kỹ năng an toàn', '/manus-storage/async-images/z4C0SAnMXYinXKsLOIQdoW/image-4.webp', N'An toàn phòng tắm', N'Chống trơn trượt phòng tắm', 'published', GETDATE(), 'admin@gorise.vn'),
    (NEWID(), 'day-tre-an-toan-khi-co-nguoi-la-go-cua', N'DẠY TRẺ AN TOÀN KHI CÓ NGƯỜI LẠ GÕ CỬA: NÊN NÓI GÌ?', N'Cách tiếp cận bình tĩnh giúp trẻ không tự mở cửa, không nhận đồ và tìm người lớn đáng tin cậy.', N'Nội dung xử lý khi người lạ gõ cửa...', N'Kỹ năng an toàn', '/manus-storage/async-images/z4C0SAnMXYinXKsLOIQdoW/image-5.webp', N'Người lạ gõ cửa', N'Kỹ năng ứng phó người lạ', 'published', GETDATE(), 'admin@gorise.vn');
    PRINT N'-> Đã nạp 5 bài viết cẩm nang an toàn mẫu';
END
GO

-- 3. Thêm cấu trúc 8 trang website builder
IF NOT EXISTS (SELECT 1 FROM cms_pages WHERE slug = 'home')
BEGIN
    INSERT INTO cms_pages (id, slug, route, title, status, draft_schema, published_schema, updated_by, published_by)
    VALUES 
    (NEWID(), 'home', '/', N'Trang chủ GORISE', 'published', '{"sections":[]}', '{"sections":[]}', 'admin@gorise.vn', 'admin@gorise.vn'),
    (NEWID(), 've-gorise', '/ve-gorise', N'Về GORISE', 'published', '{"sections":[]}', '{"sections":[]}', 'admin@gorise.vn', 'admin@gorise.vn'),
    (NEWID(), 'shop', '/kham-pha-tro-choi', N'Safe Home Shop', 'published', '{"sections":[]}', '{"sections":[]}', 'admin@gorise.vn', 'admin@gorise.vn'),
    (NEWID(), 'video-tinh-huong', '/video-tinh-huong', N'Video tình huống', 'published', '{"sections":[]}', '{"sections":[]}', 'admin@gorise.vn', 'admin@gorise.vn'),
    (NEWID(), 'tin-tuc', '/tin-tuc', N'Tin tức & Cẩm nang', 'published', '{"sections":[]}', '{"sections":[]}', 'admin@gorise.vn', 'admin@gorise.vn'),
    (NEWID(), 'lien-he', '/lien-he', N'Liên hệ', 'published', '{"sections":[]}', '{"sections":[]}', 'admin@gorise.vn', 'admin@gorise.vn'),
    (NEWID(), 'thu-thach', '/thu-thach', N'Thử thách', 'published', '{"sections":[]}', '{"sections":[]}', 'admin@gorise.vn', 'admin@gorise.vn'),
    (NEWID(), 'gio-hang', '/gio-hang', N'Giỏ hàng & Thanh toán', 'published', '{"sections":[]}', '{"sections":[]}', 'admin@gorise.vn', 'admin@gorise.vn');
    PRINT N'-> Đã nạp 8 trang giao diện mặc định';
END
GO

-- 4. Thêm 1 đơn hàng demo mẫu vào bảng orders
IF NOT EXISTS (SELECT 1 FROM orders WHERE order_code = 'ORD-2026-DEMO')
BEGIN
    DECLARE @orderId NVARCHAR(64) = NEWID();
    INSERT INTO orders (id, order_code, customer_name, customer_phone, customer_email, shipping_address, note, total_amount, shipping_fee, payment_method, payment_status, order_status)
    VALUES (@orderId, 'ORD-2026-DEMO', N'Nguyễn Văn An', '0901234567', 'an.nguyen@example.com', N'Số 123 Đường Cầu Giấy, Hà Nội', N'Giao giờ hành chính', 329000, 30000, 'bank_transfer', 'paid', 'processing');

    INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, total_price)
    VALUES (NEWID(), @orderId, 'gorise-board-game', N'Bộ cờ GORISE Board Game', 1, 299000, 299000);
    PRINT N'-> Đã nạp 1 đơn hàng demo mẫu vào bảng orders';
END
GO

-- ============================================================================
-- BƯỚC 4: HIỂN THỊ KIỂM TRA KẾT QUẢ TẤT CẢ CÁC BẢNG
-- ============================================================================
PRINT N'============================================================================';
PRINT N'TỔNG KẾT DANH SÁCH BẢNG TRONG DATABASE GORISE_DB:';
PRINT N'============================================================================';

SELECT 
    t.NAME AS [Tên Bảng (Table Name)],
    p.rows AS [Số lượng dòng (Row Count)]
FROM sys.tables t
INNER JOIN sys.partitions p ON t.object_id = p.OBJECT_ID
WHERE p.index_id IN (0, 1)
ORDER BY t.NAME;
GO
