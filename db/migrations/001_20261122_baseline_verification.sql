-- ============================================================================
-- MIGRATION: 001_20261122_baseline_verification.sql
-- Mô tả: Kiểm tra và đồng bộ cấu trúc cơ sở dữ liệu ban đầu
-- ============================================================================

USE GORISE_DB;
GO

-- Kiểm tra và ghi nhận version migration 1 vào bảng schema_migrations
IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 1)
BEGIN
    INSERT INTO schema_migrations (version, applied_at)
    VALUES (1, GETDATE());
    PRINT N'-> Đã ghi nhận migration version 1 (Baseline setup).';
END
ELSE
BEGIN
    PRINT N'-> Migration version 1 đã được áp dụng trước đó.';
END
GO
