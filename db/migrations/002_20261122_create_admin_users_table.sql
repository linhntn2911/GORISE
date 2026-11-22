-- ============================================================================
-- MIGRATION: 002_20261122_create_admin_users_table.sql
-- Mô tả: Tạo bảng admin_users và nạp tài khoản admin quản trị đầu tiên
-- ============================================================================

USE GORISE_DB;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'admin_users')
BEGIN
    CREATE TABLE admin_users (
        id NVARCHAR(64) PRIMARY KEY,
        username NVARCHAR(100) NOT NULL UNIQUE,
        email NVARCHAR(255) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        password_salt NVARCHAR(64) NOT NULL,
        full_name NVARCHAR(255) NOT NULL,
        role NVARCHAR(50) NOT NULL DEFAULT 'super_admin',
        is_active BIT NOT NULL DEFAULT 1,
        last_login_at DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX idx_admin_users_login ON admin_users (username, email, is_active);
    PRINT N'-> Đã tạo bảng admin_users thành công!';
END
GO

-- Nạp tài khoản Admin mặc định:
-- Username: admin
-- Email: admin@gorise.vn
-- Mật khẩu: Admin@123456
IF NOT EXISTS (SELECT 1 FROM admin_users WHERE username = 'admin')
BEGIN
    INSERT INTO admin_users (
        id, username, email, password_hash, password_salt, full_name, role, is_active
    ) VALUES (
        NEWID(),
        'admin',
        'admin@gorise.vn',
        '5cf173c5bc4135313dd67e0a13684eae8550008cc1d64726580676196f3307615403188c175b55a5ec2efd94cdc08233bc17036ef48ed4fdde0a534e3ab2c0a7',
        '6ba4d13a7848c617dac8f26f084fdf7f',
        N'Quản trị viên GORISE',
        'super_admin',
        1
    );
    PRINT N'-> Đã nạp tài khoản admin mặc định: admin / Admin@123456';
END
GO

-- Cập nhật schema_migrations lên version 2
IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 2)
BEGIN
    INSERT INTO schema_migrations (version, applied_at) VALUES (2, GETDATE());
    PRINT N'-> Đã ghi nhận migration version 2.';
END
GO
