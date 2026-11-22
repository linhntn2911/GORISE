-- ============================================================================
-- MIGRATION: 007_20261122_fix_vietnamese_encoding.sql
-- Mô tả: Sửa lỗi mã hóa font tiếng Việt (Mojibake) cho tên Quản trị viên
--        trong bảng admin_users và bảng customers
-- ============================================================================

USE GORISE_DB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- 1. Cập nhật tên đầy đủ tiếng Việt chuẩn Unicode có tiền tố N'...'
UPDATE admin_users 
SET full_name = N'Quản trị viên GORISE'
WHERE username = 'admin';

UPDATE customers 
SET full_name = N'Quản trị viên GORISE'
WHERE username = 'admin';

PRINT N'-> Đã sửa lỗi font tiếng Việt cho tài khoản admin trong CSDL!';
GO

-- 2. Ghi nhận version 7 vào schema_migrations
IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 7)
BEGIN
    INSERT INTO schema_migrations (version, applied_at) VALUES (7, GETDATE());
    PRINT N'-> Đã ghi nhận migration version 7.';
END
GO
