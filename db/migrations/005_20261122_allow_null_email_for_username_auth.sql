-- ============================================================================
-- MIGRATION: 005_20261122_allow_null_email_for_username_auth.sql
-- Mô tả: Xóa ràng buộc UNIQUE cứng trên email và phone của bảng customers
--        Chuyển sang Filtered Unique Index (chỉ kiểm tra trùng khi có dữ liệu)
--        Giúp khách hàng đăng ký bằng Username + Password (không cần Email)
--        mà không bị lỗi trùng lặp giá trị NULL trong SQL Server.
-- ============================================================================

USE GORISE_DB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- 1. Xóa ràng buộc UNIQUE mặc định trên cột email nếu đang tồn tại
DECLARE @EmailConstraint NVARCHAR(200);
SELECT TOP 1 @EmailConstraint = c.CONSTRAINT_NAME
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS c
JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE cu ON c.CONSTRAINT_NAME = cu.CONSTRAINT_NAME
WHERE c.TABLE_NAME = 'customers' AND cu.COLUMN_NAME = 'email' AND c.CONSTRAINT_TYPE = 'UNIQUE';

IF @EmailConstraint IS NOT NULL
BEGIN
    EXEC('ALTER TABLE customers DROP CONSTRAINT ' + @EmailConstraint);
    PRINT N'-> Đã gỡ bỏ UNIQUE constraint cứng trên cột email: ' + @EmailConstraint;
END
GO

-- 2. Xóa ràng buộc UNIQUE mặc định trên cột phone nếu đang tồn tại
DECLARE @PhoneConstraint NVARCHAR(200);
SELECT TOP 1 @PhoneConstraint = c.CONSTRAINT_NAME
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS c
JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE cu ON c.CONSTRAINT_NAME = cu.CONSTRAINT_NAME
WHERE c.TABLE_NAME = 'customers' AND cu.COLUMN_NAME = 'phone' AND c.CONSTRAINT_TYPE = 'UNIQUE';

IF @PhoneConstraint IS NOT NULL
BEGIN
    EXEC('ALTER TABLE customers DROP CONSTRAINT ' + @PhoneConstraint);
    PRINT N'-> Đã gỡ bỏ UNIQUE constraint cứng trên cột phone: ' + @PhoneConstraint;
END
GO

-- 3. Tạo lại Index dạng FILTERED UNIQUE (chỉ kiểm tra trùng khi giá trị NOT NULL)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_customers_email_filtered' AND object_id = OBJECT_ID('customers'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX idx_customers_email_filtered 
    ON customers(email) 
    WHERE email IS NOT NULL;
    PRINT N'-> Đã tạo Filtered Unique Index cho email!';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_customers_phone_filtered' AND object_id = OBJECT_ID('customers'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX idx_customers_phone_filtered 
    ON customers(phone) 
    WHERE phone IS NOT NULL;
    PRINT N'-> Đã tạo Filtered Unique Index cho phone!';
END
GO

-- 4. Ghi nhận schema_migrations lên version 5
IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 5)
BEGIN
    INSERT INTO schema_migrations (version, applied_at) VALUES (5, GETDATE());
    PRINT N'-> Đã ghi nhận migration version 5.';
END
GO
