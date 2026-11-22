# Quản lý Database & Migrations — GORISE

Thư mục này quản lý toàn bộ các script SQL khởi tạo và các bản cập nhật schema cơ sở dữ liệu của dự án GORISE trên **Microsoft SQL Server**.

---

## 📁 Cấu trúc thư mục

```
db/
├── init/
│   └── DATABASE_FULL_SETUP.sql       # Script khởi tạo database và toàn bộ 13 bảng từ đầu (chạy lần đầu)
│
├── migrations/                        # Các bản cập nhật DB theo thời gian (số tăng dần, không ghi đè)
│   ├── 001_20261122_baseline_verification.sql
│   ├── 002_20261122_create_admin_users_table.sql
│   ├── 003_20261122_create_customers_and_addresses_tables.sql
│   ├── 004_20261122_add_username_to_customers.sql
│   ├── 005_20261122_allow_null_email_for_username_auth.sql
│   ├── 006_20261122_sync_admin_to_customers.sql
│   └── 007_20261122_fix_vietnamese_encoding.sql
│
└── README.md                          # Tài liệu hướng dẫn quy ước đặt tên và thực thi
```

---

## 📋 Danh sách các bản Migration hiện tại

1. **`001_20261122_baseline_verification.sql`**:
   - Tạo bảng `schema_migrations` để theo dõi các phiên bản cập nhật.
   - Kiểm tra baseline 13 bảng ban đầu.
2. **`002_20261122_create_admin_users_table.sql`**:
   - Tạo bảng `admin_users` phục vụ đăng nhập trang quản trị.
   - Tạo tài khoản admin mặc định (`admin` / `Admin@123456`).
3. **`003_20261122_create_customers_and_addresses_tables.sql`**:
   - Tạo bảng `customers` (khách hàng), `customer_addresses` (địa chỉ giao hàng).
   - Thêm khóa ngoại `customer_id` vào bảng `orders`.
4. **`004_20261122_add_username_to_customers.sql`**:
   - Thêm cột `username` vào bảng `customers` để đăng nhập bằng tên tài khoản.
5. **`005_20261122_allow_null_email_for_username_auth.sql`**:
   - Gỡ bỏ ràng buộc `UNIQUE` cứng trên cột `email` và `phone`.
   - Tạo `Filtered Unique Index` (chỉ kiểm tra trùng khi có giá trị).
   - Cho phép nhiều khách hàng đăng ký chỉ bằng `username` + `password` (email để trống NULL) mà không bị lỗi trùng khóa trong SQL Server.
6. **`006_20261122_sync_admin_to_customers.sql`**:
   - Đồng bộ tài khoản `admin` vào bảng `customers` để tài khoản quản trị có thể đăng nhập xuyên suốt ở cả trang chủ và trang quản trị `/quan-ly/`.
7. **`007_20261122_fix_vietnamese_encoding.sql`**:
   - Sửa lỗi mã hóa font tiếng Việt (Mojibake) cho tên Quản trị viên trong `admin_users` và `customers` thành chuẩn Unicode `N'Quản trị viên GORISE'`.

---

## 📝 Quy ước đặt tên file trong thư mục `migrations/`

Mỗi khi cần thay đổi CSDL (thêm cột, sửa kiểu dữ liệu, thêm bảng mới, đánh index...), hãy tạo một file `.sql` mới trong `db/migrations/` theo định dạng:

```
<số-thứ-tự>_<ngày-năm-tháng-ngày>_<tên-chức-năng-sửa>.sql
```

### Ví dụ minh họa:
- `001_20261122_baseline_verification.sql` (Bản kiểm tra baseline đầu tiên)
- `002_20261123_add_discount_code_to_orders.sql` (Thêm mã giảm giá cho bảng orders)
- `003_20261125_create_customer_accounts_table.sql` (Tạo bảng tài khoản khách hàng)
- `004_20261130_add_product_reviews.sql` (Thêm đánh giá sản phẩm)

---

## 🚀 Hướng dẫn thực thi

### 1. Khởi tạo toàn bộ Database lần đầu
- Mở SSMS ➔ Mở file **`db/init/DATABASE_FULL_SETUP.sql`** ➔ Bấm **Execute (`F5`)**.

### 2. Chạy cập nhật (Migration)
- Khi có thay đổi, mở file migration tương ứng trong **`db/migrations/`** ➔ Bấm **Execute (`F5`)** để áp dụng vào `GORISE_DB`.
- Mỗi migration nên có khối kiểm tra `IF NOT EXISTS` hoặc `IF COL_LENGTH(...) IS NULL` để đảm bảo an toàn, không báo lỗi nếu chạy nhiều lần.
