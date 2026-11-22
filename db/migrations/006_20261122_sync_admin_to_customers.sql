-- ============================================================================
-- MIGRATION: 006_20261122_sync_admin_to_customers.sql
-- Mô tả: Đồng bộ tài khoản admin vào bảng customers để tài khoản admin
--        có thể đăng nhập ở bất kỳ đâu (cả trang chủ và trang quản trị)
-- ============================================================================

USE GORISE_DB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF NOT EXISTS (SELECT 1 FROM customers WHERE username = 'admin')
BEGIN
    INSERT INTO customers (
        id, username, phone, email, password_hash, password_salt, full_name, is_active, is_verified, loyalty_points
    )
    SELECT 
        id, username, NULL, email, password_hash, password_salt, full_name, 1, 1, 9999
    FROM admin_users
    WHERE username = 'admin';
    PRINT N'-> Đã đồng bộ tài khoản admin vào bảng customers thành công!';
END
GO

-- Ghi nhận version 6 vào schema_migrations
IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 6)
BEGIN
    INSERT INTO schema_migrations (version, applied_at) VALUES (6, GETDATE());
    PRINT N'-> Đã ghi nhận migration version 6.';
END
GO
