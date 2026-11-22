-- ============================================================================
-- MIGRATION: 004_20261122_add_username_to_customers.sql
-- Mô tả: Thêm cột username vào bảng customers để hỗ trợ đăng ký/đăng nhập
--        chỉ bằng Tên đăng nhập và Mật khẩu (không bắt buộc email)
-- ============================================================================

USE GORISE_DB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('customers', 'username') IS NULL
BEGIN
    ALTER TABLE customers ADD username NVARCHAR(100) NULL;
    PRINT N'-> Đã thêm cột username vào bảng customers!';
END
GO

-- Đánh index UNIQUE cho username
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_customers_username' AND object_id = OBJECT_ID('customers'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX idx_customers_username ON customers(username) WHERE username IS NOT NULL;
    PRINT N'-> Đã tạo index UNIQUE cho username khách hàng!';
END
GO

-- Cập nhật version migration
IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 4)
BEGIN
    INSERT INTO schema_migrations (version, applied_at) VALUES (4, GETDATE());
    PRINT N'-> Đã ghi nhận migration version 4.';
END
GO
