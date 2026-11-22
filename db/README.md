# Quản lý Database & Migrations — GORISE

Thư mục này quản lý toàn bộ các script SQL khởi tạo và các bản cập nhật schema cơ sở dữ liệu của dự án GORISE trên **Microsoft SQL Server**.

---

## 📁 Cấu trúc thư mục

```
db/
├── init/
│   └── DATABASE_FULL_SETUP.sql       # Script khởi tạo database và toàn bộ 13 bảng từ đầu (chạy lần đầu)
│
├── migrations/                        # Các bản cập nhật DB theo thời gian
│   └── 001_20261122_baseline_verification.sql
│
└── README.md                          # Tài liệu hướng dẫn quy ước đặt tên và thực thi
```

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
