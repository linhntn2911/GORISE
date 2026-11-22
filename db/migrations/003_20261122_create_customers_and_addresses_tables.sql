-- ============================================================================
-- MIGRATION: 003_20261122_create_customers_and_addresses_tables.sql
-- Mô tả: Tạo bảng customers (khách hàng), customer_addresses (sổ địa chỉ)
--        và liên kết customer_id vào bảng orders
-- ============================================================================

USE GORISE_DB;
GO

-- 1. Bảng Khách hàng (Customers)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'customers')
BEGIN
    CREATE TABLE customers (
        id NVARCHAR(64) PRIMARY KEY,
        email NVARCHAR(255) NULL UNIQUE,
        phone NVARCHAR(32) NULL UNIQUE,
        password_hash NVARCHAR(255) NULL,       -- Cho phép NULL nếu đăng nhập qua Google OAuth
        password_salt NVARCHAR(64) NULL,
        full_name NVARCHAR(255) NOT NULL,
        avatar_url NVARCHAR(500) NULL,
        auth_provider NVARCHAR(50) NOT NULL DEFAULT 'local', -- 'local', 'google', 'facebook'
        provider_id NVARCHAR(255) NULL,
        is_verified BIT NOT NULL DEFAULT 0,
        is_active BIT NOT NULL DEFAULT 1,
        loyalty_points INT NOT NULL DEFAULT 0,
        last_login_at DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX idx_customers_login ON customers (email, phone, is_active);
    CREATE INDEX idx_customers_provider ON customers (auth_provider, provider_id);
    PRINT N'-> Đã tạo bảng customers thành công!';
END
GO

-- 2. Bảng Sổ địa chỉ giao hàng của khách (Customer Addresses)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'customer_addresses')
BEGIN
    CREATE TABLE customer_addresses (
        id NVARCHAR(64) PRIMARY KEY,
        customer_id NVARCHAR(64) NOT NULL,
        recipient_name NVARCHAR(255) NOT NULL,
        recipient_phone NVARCHAR(32) NOT NULL,
        province NVARCHAR(100) NULL,
        district NVARCHAR(100) NULL,
        ward NVARCHAR(100) NULL,
        street_address NVARCHAR(500) NOT NULL,
        is_default BIT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT fk_customer_addresses_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_customer_addresses_user ON customer_addresses (customer_id, is_default);
    PRINT N'-> Đã tạo bảng customer_addresses thành công!';
END
GO

-- 3. Liên kết customer_id vào bảng orders (nếu chưa có)
IF COL_LENGTH('orders', 'customer_id') IS NULL
BEGIN
    ALTER TABLE orders ADD customer_id NVARCHAR(64) NULL;
    ALTER TABLE orders ADD CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
    CREATE INDEX idx_orders_customer ON orders (customer_id);
    PRINT N'-> Đã thêm cột customer_id và khóa ngoại vào bảng orders!';
END
GO

-- 4. Cập nhật schema_migrations lên version 3
IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 3)
BEGIN
    INSERT INTO schema_migrations (version, applied_at) VALUES (3, GETDATE());
    PRINT N'-> Đã ghi nhận migration version 3.';
END
GO
