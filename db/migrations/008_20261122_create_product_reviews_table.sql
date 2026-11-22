-- ============================================================================
-- MIGRATION: 008_20261122_create_product_reviews_table.sql
-- Mô tả: Tạo bảng product_reviews quản lý đánh giá, nhận xét thật của khách hàng
--        về sản phẩm GORISE và phản hồi từ quản trị viên (Không nạp dữ liệu mẫu)
-- ============================================================================

USE GORISE_DB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- 1. Tạo bảng product_reviews nếu chưa tồn tại
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'product_reviews')
BEGIN
    CREATE TABLE product_reviews (
        id NVARCHAR(64) PRIMARY KEY,
        product_id NVARCHAR(64) NOT NULL,
        customer_id NVARCHAR(64) NULL,
        customer_name NVARCHAR(255) NOT NULL,
        customer_phone NVARCHAR(32) NULL,
        rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment NVARCHAR(MAX) NOT NULL,
        status NVARCHAR(32) NOT NULL DEFAULT 'approved', -- 'pending', 'approved', 'hidden'
        admin_reply NVARCHAR(MAX) NULL,
        replied_at DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        CONSTRAINT fk_reviews_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );
    CREATE INDEX idx_reviews_product_status ON product_reviews (product_id, status, created_at);
    CREATE INDEX idx_reviews_customer ON product_reviews (customer_id);
    PRINT N'-> Đã tạo bảng product_reviews thành công!';
END
ELSE
BEGIN
    PRINT N'-> Bảng product_reviews đã tồn tại.';
END
GO

-- 2. Ghi nhận migration version 8 vào schema_migrations
IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 8)
BEGIN
    INSERT INTO schema_migrations (version, applied_at) VALUES (8, GETDATE());
    PRINT N'-> Đã ghi nhận migration version 8.';
END
GO
