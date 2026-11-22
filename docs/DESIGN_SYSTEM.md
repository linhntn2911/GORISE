# GORISE Design System

Chuẩn thiết kế cho website GORISE trên Desktop / Tablet / Mobile. Giữ nguyên logo chính thức, Tigori, bảng màu và ngôn ngữ hình ảnh board game khi tạo trang mới. Typography mới dùng **Baloo 2 + Be Vietnam Pro** thống nhất trên mọi trang.

## Nhận diện

- **Tinh thần:** trẻ trung, vui vẻ, phiêu lưu, hiện đại, thân thiện nhưng chuyên nghiệp; phù hợp gia đình và trẻ em.
- **Logo:** `/gorise-official.png`; giữ nguyên tỷ lệ và màu.
- **Mascot:** `/tigori-mascot.png`; floating góc dưới bên phải, mobile thu nhỏ và mở menu trợ giúp khi chạm.
- **Motif:** hành trình `↗`, ô bàn cờ, thẻ và xúc xắc; animation nhẹ.

## Tokens chung

| Nhóm | Giá trị | Vai trò |
| --- | --- | --- |
| Navy | `#123b72`, `#0b2b57` | Chữ, vùng nền và nội dung trọng tâm |
| Blue | `#2c9bf0` | CTA, điểm nhấn điều hướng |
| Teal | `#15b7a1` | Tình trạng tích cực, tương tác |
| Yellow | `#ffd35a` | Điểm nhấn trò chơi |
| Nền | `#f8fbfd`, `#eef7fb`, trắng | Vùng đọc và card |
| Display | **Baloo 2**, 600–800 | Heading và một số điểm nhấn board game |
| Body/UI | **Be Vietnam Pro**, 400–700 | Mọi nội dung, điều hướng, nút và dữ liệu chính xác |
| Card radius | `22px` mặc định | Cards bo mềm; checkout `24px` |
| Button radius | `12–16px` | Nút rõ và dễ chạm |
| Shadow | `0 18px 48px rgba(19,59,114,.10)` | Độ nổi nhẹ |

Font được self-host tại `/fonts/` dưới giấy phép OFL, chia subset Latin và Vietnamese để hiển thị dấu đúng. Các token thực thi tại `:root` trong `styles.css`; không dùng Poppins, DM Sans hay Space Grotesk.

## Typography Styles cho website và Figma

**Quy ước:** kích thước và line-height tính bằng px. Figma nên tạo bộ text style với đúng tên ở cột đầu; bộ số là ba mode **Desktop ≥1000 / Tablet 601–999 / Mobile ≤600**. Website dùng `clamp()` nội suy giữa kích thước phù hợp, không cố định trên từng thiết bị. Letter spacing của heading khoảng `-0.02em`, body và dữ liệu `0`; text style Figma có thể dùng `-2%` và `0%` tương ứng.

| Text style / Figma name | Font, weight | Desktop size/line | Tablet size/line | Mobile size/line | Áp dụng |
| --- | --- | --- | --- | --- | --- |
| `Display / Hero` | Baloo 2 800 | 64/70 | 52/58 | 40/43 | Hero của trang chủ |
| `Heading / H1` | Baloo 2 800 | 52/58 | 44/50 | 40/44 | Tiêu đề page và checkout |
| `Heading / H2` | Baloo 2 700 | 40/48 | 36/43 | 32/38 | Section, product hero, CTA lớn |
| `Heading / H3` | Baloo 2 700 | 24/29 | 22/27 | 22/27 | Challenge, card quan trọng |
| `Body / Large` | Be Vietnam Pro 400 | 18/29 | 16/26 | 15/25 | Hero lead, nội dung mở đầu |
| `Body / Regular` | Be Vietnam Pro 400 | 16/26 | 16/26 | 15/25 | Paragraph và thông tin chung |
| `Body / Small` | Be Vietnam Pro 400 | 14/22 | 14/22 | 15/24 | Mô tả card trên mobile vẫn dễ đọc |
| `Button / Large` | Be Vietnam Pro 600 | 16/22 | 15/21 | 15/21 | CTA chính ở hero/cuối section |
| `Button / Medium` | Be Vietnam Pro 600 | 14/19 | 14/19 | 14/19 | Nút thông thường, checkout |
| `Navigation` | Be Vietnam Pro 500 | 14/20 | 15/21 | 15/21 | Header và menu mobile |
| `Label` | Be Vietnam Pro 500 | 12/17 | 12/17 | 12/17 | Tên trường, thông tin phụ |
| `Caption` | Be Vietnam Pro 400 | 11/16 | 11/16 | 11/16 | Chú thích rất ngắn |
| `Price` | Be Vietnam Pro 700 | 34/43 | 30/38 | 28/35 | Giá sản phẩm/tổng tiền |
| `Badge` | Be Vietnam Pro 600 | 12/16 | 12/16 | 12/16 | Trạng thái, huy hiệu |
| `Speech Bubble` | Be Vietnam Pro 400 | 14/21 | 14/21 | 13/19 | Nội dung Tigori |

**Trọng lượng bổ sung:** heading phụ Baloo 2 600; important text và lời chào Tigori Be Vietnam Pro 500; product name và CTA Tigori 600; price 700; body và copyright 400. Navigation không dùng bold trên toàn menu. Nút dùng sentence case khi HTML cho phép, chỉ giữ uppercase ở CTA cần nhấn mạnh. Không áp Baloo 2 vào tên/giá/số tiền sản phẩm, email, số điện thoại, địa chỉ, mã đơn, QR/chuyển khoản hay form.

### Figma Variables đề xuất

Tạo collection `GORISE / Typography` với modes **Desktop**, **Tablet**, **Mobile**. Các biến kiểu `NUMBER` có đơn vị px; tên đầy đủ theo cấu trúc `type/size/*` và `type/line/*` với giá trị lấy từ bảng trên, ví dụ `type/size/hero = 64 / 52 / 40` và `type/line/hero = 70 / 58 / 43`. Tạo biến `type/weight/regular = 400`, `medium = 500`, `semibold = 600`, `bold = 700`, `extrabold = 800` dùng chung cả ba mode. Các tên role nên là `hero`, `h1`, `h2`, `h3`, `body-large`, `body-regular`, `body-small`, `button-large`, `button-medium`, `navigation`, `label`, `caption`, `price`, `badge`, `speech-bubble`. Font family trong Text Styles chọn trực tiếp `Baloo 2` hoặc `Be Vietnam Pro` theo bảng; nếu file hỗ trợ STRING variables cho family thì tạo `type/family/display` và `type/family/body` tương ứng. Gắn variables vào text styles nếu môi trường Figma hỗ trợ, nếu không lưu values đúng bảng.

**Tình trạng đồng bộ:** bảng trên là đặc tả sẵn để đưa vào Figma. Việc tạo styles trực tiếp trong một file Figma cần quyền truy cập Figma và file mục tiêu; không coi bảng này là bằng chứng file Figma đã được chỉnh sửa.

## Responsive và component

| Kích thước tham chiếu | Quy tắc |
| --- | --- |
| Desktop `1440px` và `1024px` | Header đầy đủ, hero hai cột, sản phẩm/challenge grid nhiều cột, footer nhiều cột |
| Tablet `768px` | Menu hamburger, hero một cột, card 1–2 cột và CTA rõ ràng |
| Mobile `430px`, `390px`, `375px` | Header cao ~64px, menu dropdown; hero text trên/hình dưới; card một cột, timeline dọc, checkout và footer xếp dọc |

- **Typography:** heading theo mode và `clamp`; body copy chính trên mobile 15–16px với line-height 1.5–1.7; label ngắn có thể nhỏ hơn nhưng không giảm cỡ nội dung chính.
- **Spacing:** mobile container chừa 14–20px hai bên, khoảng cách card ~16px, section ~64px. Chỉ chỉnh spacing tối thiểu khi font mới cần để không bị cắt chữ.
- **Buttons / inputs / links:** vùng chạm tối thiểu ~44px; không dùng hover làm cách duy nhất để thao tác; luôn có `:focus-visible`.
- **Cards:** responsive grid một cột trên mobile; không ép chiều rộng desktop; nội dung dài phải bọc dòng, không bị tràn.
- **Navigation:** logo / giỏ hàng / hamburger trên mobile; dropdown có đủ route và CTA “Khám phá GORISE” ở cuối. Phím Escape và click ngoài đóng menu.
- **Cách chơi:** desktop giữ pathway hiện có; mobile hiển thị 01 Quan sát → 02 Suy nghĩ → 03 Lựa chọn → 04 Kết quả → 05 Bài học dưới dạng timeline dọc.
- **Sản phẩm:** hình trên thông tin dưới; gallery scroll-snap ngang cho mobile.
- **Thử thách:** mỗi card có hình, tiêu đề, mô tả và CTA đi đến khu tương tác.
- **Checkout:** mobile giỏ hàng dạng card (ảnh, tên, giá, số lượng, xóa), tóm tắt dưới sản phẩm, progress 4 nhãn, input full-width, QR 250px ở giữa, thông tin ngân hàng dưới mã.
- **Footer:** logo, tagline, nhóm navigation, liên hệ/social, copyright xếp dọc.
- **Tigori:** desktop có bubble; mobile mascot nhỏ, chạm mở panel giới hạn chiều rộng viewport, tránh che CTA cuối trang.
- **Hiệu năng:** logo và hero đầu trang ưu tiên, hình ngoài viewport lazy-load; webfont có `font-display:swap`.
- **Chuyển động:** hỗ trợ `prefers-reduced-motion`, transition ngắn.

## Quy tắc trang mới

Tái sử dụng class và token trong `styles.css`; không tự thêm bộ font/màu/layout khác. Kiểm tra nội dung ở 375 / 390 / 430 / 768 / 1024 / 1440px; trên mobile không để button vượt container, heading cắt dấu tiếng Việt, card tràn chữ hoặc thao tác chỉ hoạt động khi hover.

## Quy tắc UI, Icon & Không lạm dụng Emoji

- **Nghiêm cấm dùng Emoji trong UI:** Tuyệt đối không tự ý chèn các ký tự emoji màu (ví dụ: 📦, 👤, 🔒, ⚡, 🚪, 🌐, 📞, 👑...) vào trong các nút bấm (buttons), tabs, mục dropdown menu, nhãn form hoặc tiêu đề.
- **Phong cách Nút & Dropdown:**
  - Nền trắng chuẩn (`#ffffff`), chữ xanh navy (`#123b72`), viền xám xanh thanh mảnh (`#e2edf4`).
  - Trạng thái hover: nền xanh nhẹ (`#f0f7fc`), chữ xanh brand (`#2c9bf0`), viền `#badcf5`.
  - Tuyệt đối không tạo các khối nút màu hồng hoặc cam pastel tự động (tránh cảm giác giao diện chắp vá do AI sinh ra).
  - Nút cảnh báo / Đăng xuất: nền trắng (`#ffffff`), chữ đỏ (`#dc2626`), viền đỏ nhạt (`#fee2e2`), hover mềm mại (`background: #fef2f2; color: #b91c1c; border-color: #fca5a5;`).
- **Phông chữ & Đảm bảo không lỗi font tiếng Việt:**
  - Sử dụng thống nhất **Baloo 2** (Heading) và **Be Vietnam Pro** (Body/UI).
  - Fallback của `--display` phải luôn là `'Baloo 2', 'Be Vietnam Pro', sans-serif`, tuyệt đối không dùng các font không hỗ trợ tiếng Việt như `Arial Rounded MT Bold` làm fallback, tránh việc các ký tự có dấu tiếng Việt (ă, â, đ, ê, ô, ơ, ư...) bị nhảy font / vỡ glyph.
  - Tích hợp cả font self-hosted và Google Fonts CDN fallback hỗ trợ đầy đủ subset `vietnamese`.
