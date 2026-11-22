-- ============================================================================
-- MIGRATION: 009_20261122_remove_demo_orders_and_customers.sql
-- Mô tả: Xóa toàn bộ dữ liệu đơn hàng mẫu lỗi font (ORD-2026-DEMO) và tài khoản
--        khách hàng thử nghiệm, đảm bảo database chỉ chứa dữ liệu thật.
-- ============================================================================

USE GORISE_DB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- 1. Xóa chi tiết đơn hàng mẫu trong order_items
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'order_items')
BEGIN
    DELETE FROM order_items 
    WHERE order_id IN (SELECT id FROM orders WHERE order_code LIKE '%DEMO%' OR order_code = 'ORD-2026-DEMO');
    PRINT N'-> Đã dọn dẹp các mục chi tiết của đơn hàng mẫu trong order_items.';
END
GO

-- 2. Xóa đơn hàng mẫu trong orders
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'orders')
BEGIN
    DELETE FROM orders 
    WHERE order_code LIKE '%DEMO%' OR order_code = 'ORD-2026-DEMO';
    PRINT N'-> Đã xóa đơn hàng mẫu khỏi bảng orders.';
END
GO

-- 3. Xóa các tài khoản khách hàng mẫu và tài khoản thử nghiệm
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'customers')
BEGIN
    DELETE FROM customers 
    WHERE username = 'user_1795333461493' 
       OR full_name = N'Khách Hàng Mẫu' 
       OR full_name = N'Khách Hàng Thử Nghiệm'
       OR email LIKE 'test%@gmail.com';
    PRINT N'-> Đã xóa tài khoản khách hàng mẫu, chỉ giữ lại người dùng thật.';
END
GO

-- 4. Ghi nhận migration version 9 vào schema_migrations
IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 9)
BEGIN
    INSERT INTO schema_migrations (version, applied_at) VALUES (9, GETDATE());
    PRINT N'-> Đã ghi nhận migration version 9 vào schema_migrations.';
END
GO
