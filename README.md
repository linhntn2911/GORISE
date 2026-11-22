# GORISE Web Project

Website giới thiệu và trải nghiệm hệ sinh thái board game giáo dục **GORISE — Safe Home** (Học kỹ năng an toàn qua từng lượt chơi).

---

## 📁 Cấu trúc Mã nguồn (Project Architecture)

Mã nguồn được tổ chức theo mô hình **Modular Multi-Page Architecture (MPA) with Layered Backend**:

```
gorise/
├── docs/                       # Tài liệu hướng dẫn, design system, plan & checklist
│   ├── DESIGN_SYSTEM.md        # Quy chuẩn thiết kế (màu sắc, typography, components)
│   ├── ideas.md                # Brief thiết kế ban đầu
│   ├── plan.md                 # Kế hoạch & tiến độ triển khai
│   └── TODO.md                 # Checklist tính năng
│
├── public/                     # Thư mục tài nguyên tĩnh (Static Assets)
│   ├── assets/
│   │   ├── branding/           # Logo, mascot Tigori, OpenGraph SVG
│   │   ├── images/             # Toàn bộ hình ảnh WebP (nhân vật, Safe Home, bản đồ, shop)
│   │   ├── thumbnails/         # Ảnh đại diện các video tình huống
│   │   └── videos/             # Video nền hero, mascot animation WebM
│   └── fonts/                  # Webfonts WOFF2 (Baloo 2, Be Vietnam Pro)
│
├── src/                        # Mã nguồn phát triển
│   ├── client/                 # JavaScript phía Client (Front-end)
│   │   ├── common/             # Script dùng chung (script.js, ai-chat.js, builder-runtime.js)
│   │   ├── pages/              # Script theo trang (news.js, video-page.js)
│   │   └── admin/              # Script quản trị CMS & Studio (dashboard, builder, media, video, phase3)
│   └── styles/                 # Stylesheet của hệ thống (styles.css)
│
├── server/                     # Backend Node.js phân tầng rõ ràng
│   ├── index.js                # Server entrypoint chính (khởi chạy HTTP server & điều hướng)
│   ├── start.js                # Bootstrap server (chạy database migration trước khi khởi động)
│   ├── static-resolver.js      # Bộ phân giải đường dẫn tĩnh thông minh (tương thích 100% URL cũ & mới)
│   ├── utils/
│   │   └── http.js             # Helper JSON, rate limit, upload validation, OAuth guard
│   ├── middleware/
│   │   └── static.middleware.js # Phục vụ file tĩnh, gzip compression, caching headers
│   ├── controllers/            # Các controller xử lý API chuyên biệt:
│   │   ├── auth.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── builder.controller.js
│   │   ├── phase3.controller.js
│   │   ├── articles.controller.js
│   │   ├── products.controller.js
│   │   ├── media.controller.js
│   │   ├── videos.controller.js
│   │   └── assistant.controller.js
│   ├── db.js, db-*.js          # Kết nối và truy vấn cơ sở dữ liệu MySQL
│   ├── assistant.js, llm.js    # Logic RAG trợ lý ảo Tigori & tích hợp LLM
│   └── knowledge.json          # Cơ sở tri thức của Tigori
│
├── [route-folders]/            # Các trang HTML theo chuẩn Web Đa Trang (MPA)
│   ├── index.html              # Trang chủ
│   ├── ve-gorise/              # Về GORISE
│   ├── kham-pha-tro-choi/      # Khám phá trò chơi / Shop
│   ├── gio-hang/               # Giỏ hàng & Thanh toán QR
│   ├── tin-tuc/                # Tin tức & cẩm nang an toàn
│   ├── video-tinh-huong/       # Video tình huống an toàn (đích quét QR từ thẻ bài)
│   ├── gorise-play/            # Mini-game tương tác web (Vite/React build)
│   ├── thu-thach/              # Thử thách
│   ├── lien-he/                # Liên hệ, FAQ, chính sách
│   └── quan-ly*/               # Hệ thống quản trị GORISE Studio
│
├── tools/                      # Các công cụ hỗ trợ build & tối ưu
│   ├── build-routes.js         # Build static routes cho bài viết tin tức
│   └── split-css.mjs           # Script phân tích và tách nhỏ CSS
│
├── Dockerfile                  # Container deployment
├── manus-routes.json           # Khai báo route manifest
└── package.json                # Dependencies & scripts
```

---

## 🚀 Khởi chạy Dự án

```bash
# 1. Cài đặt thư viện
npm install

# 2. Khởi chạy server phát triển
npm run dev

# 3. Chạy migration database (khi có cấu hình DATABASE_URL)
npm run db:migrate

# 4. Khởi chạy production (tự động chạy migration trước khi bật server)
npm start
```
