# GORISE STUDIO 2.0 — Phase 1

- [ ] **Dashboard và Page Manager hoạt động thực tế** — Sidebar có Dashboard, Website Builder và Pages Manager; Dashboard hiển thị tổng số trang, sản phẩm, bài viết, video, lượt xem nếu có analytics, nội dung chỉnh sửa gần đây, bản nháp và hoạt động quản trị; quản trị viên có thể chọn các trang Trang chủ, Về GORISE, Safe Home, Tình huống, Tin tức, Shop, Liên hệ để chỉnh sửa, xem trước, lưu nháp, xuất bản và khôi phục phiên bản cũ; không xóa dữ liệu website hiện tại.
- [ ] **Visual Builder ba vùng và chỉnh sửa trực tiếp** — Khi chọn Chỉnh sửa trang, có Component Library bên trái, Live Canvas ở giữa và Properties Panel bên phải; quản trị viên có thể click text để sửa, click ảnh để thay URL/asset, click button để sửa nhãn/màu/liên kết, click section để đổi background, kéo thả section đổi thứ tự, điều chỉnh kích thước/căn chỉnh/padding/margin/bo góc/viền/màu/độ trong suốt/bóng đổ, sao chép/ẩn/khóa/xóa component, Undo và Redo; thay đổi hiển thị ngay trong Live Preview.
- [ ] **Section và component library** — Có Add Section giữa các section và các mẫu Blank Section, Hero Banner, Image Gallery, Product Showcase, Video Section, Text & Image, Character Showcase, Carousel, FAQ, Contact Section, Call To Action, Custom Layout; section lưu được chiều cao, chiều rộng, background, bố cục, responsive và có thể lưu thành mẫu hoặc tái sử dụng khi tính năng mẫu được bật.
- [ ] **Button & Interaction Builder** — Properties Panel của button có Action gồm Scroll to Section, Open Internal Page, Open External URL, Open Popup, Play Video, Open Product Details, Download File, Submit Form, Switch Tab và Open Image Gallery; kiểm tra section đích tồn tại, cảnh báo target lỗi và không cho publish action có target lỗi mà không cảnh báo.
- [ ] **Lưu trữ database, Draft/Preview/Publish và version history** — Lưu cấu trúc trang JSON, nội dung component, thứ tự section, design properties, responsive config, interaction config, đường dẫn media, trạng thái Draft/Published và lịch sử phiên bản trong database; Save Draft không đổi public; Preview đọc draft; Publish ghi actor/thời gian và snapshot; Rollback khôi phục đúng phiên bản trước; đăng xuất/đăng nhập lại vẫn giữ dữ liệu.
- [ ] **Bảo mật Builder** — Yêu cầu đăng nhập Admin; người dùng public không mở editor; kiểm tra quyền ở backend; validate schema, target và file/media; làm sạch text HTML chống XSS; bảo vệ API quản trị; ghi log các thao tác quan trọng; không để Viewer/Editor vượt quyền Admin.
- [ ] **Independent review Phase 1** — Review read-only về kết nối frontend/backend/database, public runtime, route manifest, fallback dữ liệu và các tiêu chí còn mở trước khi giao Phase 1.

## Phase 2–3 — chưa triển khai trong checkpoint này

- [ ] Media Library nâng cao, upload nhiều ảnh/video, crop/resize/alt text và vị trí sử dụng.
- [ ] Video/Product/News Manager nâng cao, Theme Manager và Responsive Visual Editor chuyên sâu.
- [ ] Template Library, Global Components, Animation Editor, Image Hotspot Editor, SEO Manager, Form Builder, AI Design Assistant.


## Phase 1 bug-fix status — 2026-10-29

- Đã sửa layout dashboard: toolbar 64px, ba cột độc lập, sidebar cuộn riêng, viewport Desktop/Tablet/Mobile, search Component Library, Add Section giữa các section và live iframe theo route thật.
- Đã sửa root cause danh sách trang: migration tạo `cms_pages`/`cms_page_versions`, startup tự chạy migration và `ensureBuilderPages()`, seed 8 route thật gồm Trang chủ, Về GORISE, Shop, Tình huống, Tin tức, Liên hệ, Thử thách và Giỏ hàng.
- Đã gắn `data-builder-section` và `builder-runtime.js` vào các route public để schema Published có thể thay đổi các section thật, giữ nguyên fallback content khi chưa có override.
- Đã kiểm tra syntax, `git diff --check`, health endpoint, 8 public schema endpoint và screenshot các route public.
- Chưa đánh dấu các mục tổng quát ở trên hoàn thành vì click-to-edit trực tiếp trong iframe, media picker, advanced responsive properties và independent review vẫn cần triển khai/kiểm chứng thêm.


## Phase 2 — Advanced Visual Website Builder

- [ ] **Advanced drag-and-drop editor** — Admin có thể kéo component từ library vào Canvas, di chuyển giữa section, reorder section, duplicate, delete, copy/paste, undo/redo, lock và hide/show; hover có blue outline + component name; selection có border, Properties Panel và floating actions; Canvas cập nhật ngay sau mỗi edit; các phần còn thiếu là resize handles, nested container movement và multi-select.
- [ ] **Expanded component library và templates** — Library được chia Layout, Content và Advanced, có preview/name/description/drag support/default responsive styling; có GORISE Hero Banner, Safe Home Product, Character Showcase và CTA template entry; cần hoàn thiện đủ 10 template insertion/save-to-template.
- [ ] **Direct text editing** — Double-click text trong iframe preview cho phép sửa trực tiếp, hỗ trợ Unicode tiếng Việt và cập nhật Draft ngay; Properties hiện có heading/text/button; các formatting controls font family, size, weight, color, alignment, line-height, letter-spacing, bold/italic/underline, links, lists và text shadow còn mở rộng.
- [ ] **Media Library Manager** — Dùng persistent storage và media_assets hiện có, admin-only; cần nối picker upload/replace/delete/folder/search/crop/resize/object-fit/object-position/alt/opacity/radius/shadow cùng video poster/autoplay/loop/muted/controls.
- [ ] **Advanced style editor** — Inspector đã có width, min-height, margin, padding, background/color, radius, opacity, shadow, responsive padding/columns/font size và animation; cần bổ sung gradient/background image/video, position/z-index/overflow/flex/grid, hover/transition controls.
- [ ] **Button/navigation editor** — Action select đã có internal, scroll, external, modal, video, product và gallery; target được validate backend và runtime hỗ trợ internal/scroll/external; cần hoàn thiện product/modal/media viewer và validation target tồn tại.
- [ ] **Responsive editor** — Desktop 1440px, Tablet 768px, Mobile 390px preview giữ nguyên; responsive config tách theo breakpoint và không ghi đè desktop; cần hoàn thiện toàn bộ font/grid/image/visibility/alignment/spacing/navigation overrides.
- [ ] **Animation, layers và workflow hardening** — Runtime có fade/slide/zoom foundation, reduced-motion, layers sync, Draft bridge và public fallback; cần hoàn thiện duration/delay/easing/trigger/repeat, nested layers, published Shop Hero acceptance flow, media replace, refresh persistence, publish/public verification, rollback và independent review.


## Phase 3 — Advanced Admin Foundation (2026-10-29)

- [ ] **Template Library thực tế** — Admin Phase 3 có thể tạo, sửa, xóa và lưu schema template vào bảng `builder_templates`; cần hoàn thiện nút Insert vào Builder và thư viện template mặc định GORISE.
- [ ] **Animation Editor** — Admin có khu vực preset fade/slide/zoom/hover/parallax, reduced-motion và hướng dẫn lưu vào Draft; cần nối trực tiếp inspector animation với từng component và lưu đầy đủ duration/delay/easing/trigger/repeat.
- [ ] **Image Hotspot Editor** — Admin có workspace chọn ảnh và nhập hotspot theo tọa độ %, nhãn và target; cần nối trực tiếp với component hotspot trong Builder, preview ảnh thật và responsive overlay.
- [ ] **SEO Manager thực tế** — Admin có thể lưu meta title, meta description, Open Graph image, canonical URL và robots theo page slug vào bảng `cms_page_meta`; cần nối metadata đã publish vào HTML public sau khi có approval riêng, không tự động thay đổi public ở Phase này.
- [ ] **Analytics Overview** — Admin đọc thống kê video và số bài viết từ endpoint/database hiện có; cần mở rộng page views, event timeline và bộ lọc theo khoảng thời gian khi nguồn dữ liệu được xác định.
- [ ] **AI Design Assistant an toàn** — Admin có các prompt gợi ý responsive/layout/action/color; AI chỉ trả đề xuất và không tự áp dụng hoặc publish; cần thêm flow review/confirm tạo Draft patch, log hoạt động và rollback patch.
- [ ] **Activity log và security** — Template/SEO thao tác được ghi vào `admin_activity_log`, API đều yêu cầu Admin; cần bổ sung role Admin/Editor/Viewer, export/audit view và backup/restore.
