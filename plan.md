# Kế hoạch triển khai website GORISE

## Mục tiêu

Xây dựng một website multi-page tiếng Việt cho board game giáo dục GORISE với trải nghiệm như một thế giới board game hiện đại. Website truyền tải hành trình **VUI VẺ → SUY NGHĨ → AN TOÀN → TIẾN BƯỚC**, giới thiệu sản phẩm, gameplay, thử thách, liên hệ, mô phỏng trải nghiệm mua hàng và có mascot đồng hành ở các route.

## Kiến trúc

- Frontend tĩnh giữ nguyên bảy route `/`, `/ve-gorise`, `/kham-pha-tro-choi`, `/thu-thach`, `/lien-he`, `/gio-hang` bằng HTML/CSS/JavaScript; thêm Node API server cho AI và dữ liệu sản phẩm, không chuyển thành SPA hoặc thay mascot.
- `index.html` và các thư mục route: HTML có nội dung đầy đủ ngay trong initial response, semantic sections, metadata SEO và liên kết trang thật.
- `styles.css`: design tokens, responsive grid, card primitives, illustrations, responsive behavior, reduced-motion.
- `script.js`: mobile navigation, scroll reveal, localStorage cart, quantity controls, checkout step transitions, QR copy actions, toast/form behavior và floating mascot assistant với lời chào theo route. Chỉ đổi hành động nút “❓ Hỏi mình +” sang mở chat, không đổi vị trí/kích thước Tigori.
- `ai-chat.js`: chat được lazy-load khi mở từ mascot; hiển thị avatar Tigori, greeting, quick questions, lịch sử trong cùng tab, trạng thái tải, nội dung/CTA/nguồn an toàn; gửi duy nhất `POST /api/ai/chat`.
- `server/index.js`: Node HTTP server cho `/api/ai/chat`, `/api/products`, `/api/health`; dev phục vụ file tĩnh tại cùng origin/port 3000. Giới hạn kích cỡ đầu vào, lượt hỏi/IP và timeout upstream; không trả credential ra browser.
- `server/knowledge.json` và `server/assistant.js`: fact/FAQ được đối chiếu với 7 trang GORISE; ưu tiên dữ liệu chính thức, dùng intent+ngữ cảnh và câu trả lời có kiểm soát; sản phẩm/giá lấy DB ở mỗi lượt hỏi, giá trị chưa được xác nhận để NULL. LLM server-side phân loại/diễn đạt ngắn gọn, không được bịa thông tin chính thức.
- `server/db.js`, `server/migrate.js`, `server/product-seed.json`: MySQL managed, migration/seed idempotent theo `id`; không ghi đè các chỉnh sửa sau khi khởi tạo. Không mở endpoint quản trị công khai; backend đọc dữ liệu sản phẩm mới ngay khi DB được cập nhật.
- `server/search.js`: chỉ chạy cho câu hỏi bên ngoài hoặc cần thông tin mới; Tavily Web Search bằng `TAVILY_API_KEY` trong protected runtime environment, lọc 3–5 nguồn, hạn chế spam/trùng, tổng hợp thành câu trả lời kèm link và nhãn nguồn. Nếu chưa có key hoặc upstream lỗi, trả lời rõ Web Search không sẵn sàng và vẫn hỗ trợ bằng KB.
- `Dockerfile`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`: runtime Node 22 và dependency mysql2 được pin, cài đặt trong container từ checkpoint sạch.
- `manus-routes.json`: route manifest bắt buộc, được phục vụ tại origin root.
- `gorise-official.png`: logo chính thức do người dùng cung cấp, dùng cho header, footer, favicon và metadata branding.
- `tigori-mascot.png`: mascot Tigori được tách nền trong suốt từ ảnh người dùng cung cấp, dùng cho floating assistant.
- `og-gorise.svg`: social preview nhẹ, không phụ thuộc URL ngoài.
- `ideas.md`: brief thiết kế đã duyệt.
- `app.config.ts`: metadata logoUrl theo quy ước Webdev sau khi có asset logo durable.
- `DESIGN_SYSTEM.md`: chuẩn sử dụng color/typography/button/card/input/navigation/spacing/radius/shadow/icon và responsive rules cho các trang tương lai.
- `hero-safe-home.webp`: ảnh Safe Home người dùng cung cấp, tối ưu WebP làm fallback local cho hero trang chủ; bản storage tương ứng đã active ở slot `hero`.
- Hero trang chủ dùng `herobanner.mp4` do người dùng cung cấp làm banner video nền toàn chiều rộng với autoplay/muted/loop/playsinline; poster `hero-safe-home.webp` làm fallback khi video chưa tải; overlay gradient sáng giữ hero thoáng và dễ đọc. Video tình huống trong kho không còn ghi đè hero; IntersectionObserver tự phát khi hero vào viewport và pause khi người dùng lướt khỏi hero.
- Hero có nút nổi `Âm thanh tắt`/`Âm thanh bật` ở góc dưới, mặc định muted để autoplay hoạt động; nút hỗ trợ keyboard, aria-label và cập nhật icon theo trạng thái video.
- Hero homepage được redesign theo bố cục cinematic kiểu Ghé Làng: logo GORISE tách nền từ ảnh người dùng (`gorise-hero-logo.png`) đặt lớn bên trái, tagline `MỖI THỬ THÁCH LÀ MỘT BƯỚC TIẾN`, mô tả ngắn và CTA `Khám phá GORISE`/`Khám phá Safe Home`; overlay sáng, bên phải ưu tiên video và không thêm floating badge.
- Tigori ở góc phải hỗ trợ kéo-thả bằng Pointer Events trên chuột/touch, luôn bị giới hạn trong viewport, không kích hoạt nhầm panel sau thao tác kéo và lưu vị trí bằng localStorage cho các lần truy cập sau.
- Section 2 `about` được thiết kế lại theo hướng cinematic storytelling: nhãn `01 / CÂU CHUYỆN GORISE`, tiêu đề trung tâm `Mỗi hành trình / đều bắt đầu từ một bước nhỏ.`, khung minh họa Tigori tỷ lệ 4:5, nội dung ngắn và duy nhất một liên kết `Khám phá câu chuyện` tới `/ve-gorise/`; các section khác giữ nguyên.
- Section 2 có scroll reveal theo thứ tự: nhãn và tiêu đề xuất hiện trước, khung Tigori trượt lên và phóng nhẹ, nội dung xuất hiện tiếp theo; mặt trời và đường đi trong khung có animation một lần, đồng thời tắt chuyển động khi người dùng bật `prefers-reduced-motion`.
- Section 2 dùng `section2-tigori-reading.webp` do người dùng cung cấp trong khung 4:5; ảnh hiện phủ kín khung bằng `object-fit: cover`; dùng `section2-story-bg.webp` làm nền cover toàn section với opacity thấp và blur nhẹ để không lấn át nội dung.
- Ảnh Tigori trong Section 2 hiện phủ kín toàn bộ khung bằng `object-fit: cover`, bỏ các hình trang trí mặt trời/đường đi; thêm 8 lá CSS rơi nhẹ theo chiều dọc, tự giảm/tắt khi người dùng bật `prefers-reduced-motion`.
- Section 3 `kit` được thay bằng trải nghiệm cinematic scroll-driven `CÁNH CỬA MỞ RA THẾ GIỚI SAFE HOME`: nền kem sạch, nhãn `02 / KHÁM PHÁ SAFE HOME`, tiêu đề mở đầu `Mỗi cánh cửa / mở ra một thử thách.`, hai cánh cửa dùng `safe-home-door.webp` mở theo tiến độ cuộn, `safe-home-interior.webp` hé lộ phía sau rồi mở rộng, sau cùng hiện `Ngôi nhà quen thuộc. / Thử thách bất ngờ!`, mô tả ngắn và link duy nhất `Bước vào Safe Home` tới route Shop hiện có. Có sticky scene, hỗ trợ cuộn ngược, responsive mobile và `prefers-reduced-motion`; các section khác không thay đổi.
- Section 3 dùng khung cửa lớn hơn (`360×500px` desktop, tối đa `320×440px` mobile); khi tiến độ mở đạt khoảng 72%, `safe-home-interior` chuyển lên lớp hiển thị trước cửa để ảnh ngôi nhà hiện rõ hoàn toàn sau chuyển cảnh.
- Khi cửa Safe Home mở hoàn toàn, ảnh `safe-home-interior.webp` mở rộng thành `100vw × 100vh`, `clip-path: inset(0)`, không bo góc và đặt trên lớp cửa (`z-index: 6`) để phủ kín toàn bộ Section 3; phần thông điệp cuối vẫn hiển thị trên ảnh.
- Section 3 giữ `position: sticky` hoạt động bằng `overflow-x: clip` trên `.site-shell` thay cho `overflow: hidden`, tránh ancestor tạo scroll container khiến scene trượt khỏi viewport ở cuối quá trình cuộn.
- Section 5 được hoàn thiện với asset riêng `section5-safehome-house.webp`: tiêu đề trái, mô tả phải, ngôi nhà ngang hiển thị đầy đủ, 5 card màu so le quanh nhà, pin hover/focus, CTA trung tâm và carousel card trên mobile; Sections 1–4 cùng chức năng hiện có được giữ nguyên.
- Section 5 dùng visual Safe Home trung tâm được tách từ hình mẫu thành asset WebP riêng, không lấy phần chữ/card/CTA in sẵn làm tương tác; HTML/CSS/JS giữ 5 card clickable, 5 pin highlight theo hover/focus, entrance animation, reduced-motion và responsive desktop/mobile.
- Homepage đã xóa hoàn toàn Section `play-section` / `02 — CÁCH CHƠI` theo yêu cầu; giữ nguyên Section 4, Section 5 bản đồ tình huống và các section còn lại.
- Section 5 `Interactive Adventure Map` thay thế khu thử thách cũ bằng nền pastel xanh kem/xanh trời/trắng, đường board-game uốn lượn và 5 trạm tương tác: nhà bếp, điện, phòng tắm, người lạ, ứng phó khẩn cấp; trạm có hover scale/glow, link chi tiết theo topic, route draw-on-scroll, station reveal tuần tự, CTA tổng hợp và layout dọc trên mobile không tràn ngang.
- Background Section 4 dùng gradient pastel `#EAF7FF → #F8FCFF`, mây mềm, sao/hạt sáng, hai tuyến đường board-game uốn cong với ô tròn/token, sân khấu elip và parallax con trỏ tối đa 12px; họa tiết giảm opacity/mật độ trên mobile và không dùng background nội thất.
- Section 4 được nâng cấp thành `GORISE Adventure Character Arena`: bệ oval navy/xanh với viền vàng và glow accent, họa tiết board-game nhẹ ở vùng trống, nameplate có tên/biệt danh/icon tính cách, carousel giữ nguyên 6 artwork và điều hướng, animation chuyển thẻ `580ms`, thanh chọn nhanh, swipe mobile và không âm thanh tự động/không chỉ số chiến đấu.
- Section 4 nâng cấp theo hướng màn hình chọn nhân vật: giữ carousel xếp lớp và ảnh gốc; bổ sung thông tin active (tên, biệt danh, mô tả ngắn) có fade/translateY, counter `01 / 06`, dải chân dung chọn nhanh theo thứ tự Minh–Lan–Nam–Khang–Vy–An, màu accent/glow theo nhân vật, CTA `Khám phá các nhân vật ↗`, swipe trên mobile và dải thumbnail cuộn ngang; không autoplay và không thay đổi các section khác.
- Kích thước carousel Section 4 được tăng lên tối đa `300×450px` cho thẻ trung tâm desktop, vùng scene cao `690px`; mobile tối đa `320px` chiều rộng và vùng scene `600px`, giúp đọc chữ trên thẻ rõ hơn mà vẫn giữ trọn ảnh 2:3.
- Section 4 `characters` giới thiệu 6 thẻ nhân vật Safe Home (`An`, `Khang`, `Lan`, `Minh`, `Nam`, `Vy`) bằng carousel: một thẻ active lớn nhất ở giữa, hai thẻ lân cận thu nhỏ ở hai bên, các thẻ còn lại lùi sâu hơn; có nút mũi tên trái/phải, dots, vòng chuyển thẻ, phím mũi tên và responsive desktop/mobile. Ảnh gốc tỷ lệ 2:3 dùng `object-fit: contain`, không crop, giữ nguyên mã, tên và toàn bộ vùng thông tin trên thẻ; backend allowlist và build contract phục vụ đủ 6 asset.
- Thứ tự trang chủ hiện tại sau Section 2 là **Khám phá Safe Home → Cách chơi → Các thử thách**, giữ nguyên nội dung và thiết kế của từng section.
- `quan-ly-anh/`, `admin-media.js`, `server/auth.js`: khu quản trị ảnh noindex dùng Manus OAuth, chỉ cấp quyền cho `chinguyen313x@gmail.com`; upload qua presigned storage URL ở server, lưu chỉ mục và trạng thái active trong `media_assets`, hỗ trợ ẩn mềm.
- `video-tinh-huong/`, `video-page.js`: trang công khai đọc danh sách video active từ `/api/videos`; mỗi video mở bằng `?v=<id>`, có trình phát HTML5, link chia sẻ và phù hợp làm đích QR trên thẻ tình huống.
- `quan-ly-video/`, `admin-video.js`, `server/db-video.js`: Studio noindex để quản trị viên upload MP4/WebM/MOV/AVI tối đa 250MB qua endpoint server cùng origin (tránh CORS/Failed to fetch), chọn thêm thumbnail PNG/JPG/WEBP tối đa 8MB cho từng video, nhập/chỉnh sửa tiêu đề và mô tả, xem thumbnail, link riêng, mở QR SVG, copy link và xóa mềm video khỏi kho công khai. File nằm trong project Storage; metadata video và `thumbnail_url` nằm trong bảng `situation_videos`.
- Header public có icon Facebook và TikTok mở tab mới, dùng lần lượt link `facebook.com/profile.php?id=61594921829509` và `tiktok.com/@goriseproperty?_r=1&_t=ZS-9AOsh9NnjSH`; link footer cũng dùng đúng hai URL này. Mục điều hướng và liên kết footer tới `/kham-pha-tro-choi/` hiển thị nhãn `Shop`.
- Trang `video-tinh-huong/` hiển thị tên tình huống từ metadata video, tự bỏ đuôi `.mp4/.webm/.mov/.avi`, không đưa dung lượng lên giao diện public; danh sách dùng thumbnail thẻ theo tình huống (hiện có `situation-electric.webp` cho nội dung điện và `situation-danger.webp` cho nội dung nuốt vật lạ), có fallback logo GORISE.
- `data-media-slot` + `/api/media/active`: ảnh active trong kho tự hydrate vào hero/product trên website; nếu API không sẵn sàng, ảnh authored hiện tại vẫn là fallback.
- Homepage hỗ trợ slot ảnh tùy chọn cho `hero`, `about`, `gameplay`, `kit`, `challenge`, `values`, `product` và `cta`; section chỉ hiện khung ảnh sau khi người quản trị upload ảnh active, nên layout cũ không bị trống khi chưa cập nhật.
- Slot `situation` trên card Thẻ tình huống dùng ảnh Danger người dùng cung cấp, tối ưu đúng tỷ lệ gần 1.87:1; CSS `object-fit: cover` cho ảnh fill toàn bộ ô, không crop đáng kể.
- Slot `item` trên card Thẻ vật phẩm dùng ảnh item người dùng cung cấp, tối ưu đúng tỷ lệ gần 1.87:1 và fill toàn bộ ô bằng `object-fit: cover`.
- Slot `board` trên card Bàn chơi dùng ảnh Map người dùng cung cấp, crop theo tỷ lệ card gần 1.87:1 và fill toàn bộ ô bằng `object-fit: cover`.
- `fonts/`: webfont WOFF2 Baloo 2 và Be Vietnam Pro (Latin + Vietnamese) cùng giấy phép OFL; build tĩnh sao chép nguyên thư mục vào `dist` để typography không phụ thuộc request Google Fonts ở phía người dùng.
- Bộ `gorise-figma-typography.zip` bàn giao riêng ngoài repository website: plugin nhập 15 Figma Text Styles và 37 typography variables theo 3 mode Desktop/Tablet/Mobile vào file Figma do người dùng mở. Chỉ xem là đã cập nhật Figma sau khi plugin chạy thành công trong file mục tiêu.

## Nội dung và component

1. Header sticky, logo, navigation và CTA dùng thống nhất trên tất cả route.
2. Trang chủ tổng quan, các section giới thiệu ngắn và link “XEM CHI TIẾT”.
3. Trang Về GORISE với câu chuyện, bốn giá trị và ba nhóm đối tượng.
4. Trang Cách chơi với chuẩn bị, năm bước gameplay và sơ đồ hành trình.
5. Trang Khám phá trò chơi với featured product, sáu thành phần, gallery và thông tin sản phẩm.
6. Trang Thử thách với bốn nhóm tình huống và mini interaction ba lựa chọn.
7. Trang Liên hệ với thông tin đội ngũ, contact form và sign-off thương hiệu.
8. Trang Giỏ hàng với sản phẩm, số lượng, xóa sản phẩm, tóm tắt đơn hàng và CTA thanh toán.
9. Checkout flow trong `/gio-hang`: thông tin nhận hàng, QR payment, trạng thái chờ thanh toán và xác nhận thành công.
10. Mascot hổ Tigori fixed bên phải gần góc dưới trên mọi route, dùng ảnh nền trong suốt, có speech bubble theo trang, CTA context-aware, helper panel nhỏ khi click và animation nhẹ.
11. Footer bốn cột dùng thống nhất trên tất cả route.

## GORISE AI Bot — hành vi và ranh giới sự thật

- Nút hiện có `❓ Hỏi mình +` mở chat nổi phía trên mascot, căn phải, desktop 340–380×480–560px, bo 20px; mobile `min(380px,100vw - 24px)`, chiều cao tối đa 68dvh, nội dung scroll trong chat, input ở cuối; có đóng/Escape và tự thu gọn khi cuộn đến CTA/input quan trọng hoặc QR/payment controls mà chat đang che. Không đổi ảnh/vị trí/kích thước mascot và không dùng robot/gradient AI.
- Header dùng avatar Tigori, “GORISE AI”, “Trợ lý đồng hành của bạn”; lời chào/6 câu hỏi nhanh đúng brief, placeholder “Bạn muốn hỏi mình điều gì?”, Enter/nút ➤, trạng thái “Để mình xem nhé... 👀” hoặc trạng thái tìm Web, thông báo lỗi tương ứng.
- Bot nói tiếng Việt gần gũi, gọi “bạn”; câu thường 2–5 câu, gợi ý câu tiếp theo, lưu ngữ cảnh trong tab và chỉ trả CTA đến 7 route thật. Hiển thị “Thông tin từ GORISE” / “Thông tin tham khảo từ Web” / “Thông tin GORISE + nguồn tham khảo”; khi có Web, link nguồn click được và hiển thị nhãn ngắn.
- Dữ liệu chính thức lấy từ trang hiện tại. Trang sản phẩm ghi giá **299.000₫**, không phải ví dụ 450.000₫ trong brief. Trang sản phẩm nói miễn phí giao hàng nhưng giỏ hàng tính 30.000₫; phần này là **chưa xác thực** trong DB/chat. Bank/QR/mã đơn hàng hiện là demo/placeholder, không xác nhận thanh toán thật hoặc tự bịa thông tin chuyển khoản/chính sách/tồn kho.
- Đối với câu hỏi GORISE: trả lời từ DB/KB, không tra Web để thay giá hay chính sách; biến thể như “GORISE hiện nay là gì?” vẫn dùng dữ liệu chính thức. Với câu hỏi về board game nói chung hoặc thông tin mới: chỉ tóm tắt khi đã lọc được **ít nhất 3 và tối đa 5** nguồn đáng tin cậy, không trích dài; nếu thiếu nguồn đủ tin cậy hoặc API không có key, thông báo giới hạn thay vì tưởng tượng.

## Responsive và design system dùng chung

- Giữ nguyên logo chính thức, Tigori, bảng màu navy/blue/teal/yellow, card bo tròn 20–24px, button bo tròn 12–16px và ngôn ngữ hình học board game. Typography thống nhất: **Baloo 2** cho heading/CTA lớn (hero 800, heading 700, subheading 600), **Be Vietnam Pro** cho body/UI/giá/form/mascot (400/500/600/700); không dùng Poppins. Đây là các token thương hiệu dùng lại cho mọi trang tương lai.
- Desktop ≥1024px giữ hero hai cột và navigation hiện tại; tablet ~768px chuyển grid sang 1–2 cột và menu gọn; mobile 375–430px ưu tiên flow một cột, hero text trên/hình dưới, CTA rộng và vùng chạm tối thiểu 44px.
- Header mobile xếp logo / giỏ hàng / hamburger; drawer có đủ navigation và CTA nổi bật. Card sản phẩm, challenge, checkout, timeline năm bước, QR, footer và Tigori có responsive rules riêng; không dùng scale toàn bộ trang desktop.
- Body text mobile tối thiểu 15px ở phần đọc chính, heading dùng `clamp` theo viewport, grid con có `min-width:0`, hình ảnh giữ `object-fit:contain`; visual bên dưới fold dùng `loading="lazy"`, visual đầu trang ưu tiên tải.
- Animation vẫn nhẹ; giữ hỗ trợ `prefers-reduced-motion`; không dùng hover làm cách duy nhất để kích hoạt điều hướng hay thao tác. Design system này là chuẩn cho các route GORISE mới.

## Deployment và SEO

- Bật `features.server` và `features.database` một chiều cho chatbot/product DB; Preview chạy Node trên `0.0.0.0:3000`, static pages và `/api/*` cùng origin. Không thêm login/payment integration; form/checkout hiện tại vẫn là trải nghiệm demo.
- Hybrid Publish **chỉ khi được người dùng phê duyệt sau này**: build command sao chép bảy trang, fonts, ảnh và `ai-chat.js` vào `dist`; Dockerfile cài server Node và phục vụ `/api/health`; published routes tách `/api/*` → server (`no-cache`), `/*` → static (HTML revalidate, versioned assets cache nếu hỗ trợ). Không bật auto-publish.
- LLM dùng `MANUS_API_URL`/`MANUS_API_KEY` chỉ phía server, Tavily chỉ dùng protected `TAVILY_API_KEY` nếu được cấp; không có secret trong mã client, build static hoặc Docker image.
- Trang có title, description, keywords, Open Graph, Twitter card, canonical placeholder chỉ khi có public origin thật; sitemap/robots để gateway xử lý mặc định.

## Kiểm tra

- Kiểm tra file và JSON route manifest bằng shell.
- Chạy diagnostics host-managed theo Webdev config.
- Khởi động Node dev server trên port 3000 và kiểm tra HTTP 200 cho bảy route, CSS/JS/ảnh/font, `/manus-routes.json`, health/products/chat API; kiểm chứng dữ liệu DB thực, câu hỏi giá chính thức, ngữ cảnh, nguồn Web/fallback, không lộ secret.
- Kiểm tra syntax/diagnostics JS/CSS/JSON và một lượt review độc lập read-only về kết nối frontend→API→DB/LLM/Web, mascot nguyên trạng; không publish trong lượt này.

- Section 5 bản đồ tương tác được tinh chỉnh theo asset nhà Safe Home: nhà rộng 84% desktop, mini floating cards 180px, marker clickable đúng khu bếp/phòng khách/phòng tắm/cửa chính/lối thoát, 5 connector SVG cong theo tỷ lệ, hover hai chiều card–marker–connector và carousel mobile.

- Section 4 carousel đồng bộ chọn nhân vật: click/keyboard trên thẻ lớn cập nhật đúng thumbnail nhỏ, click thumbnail đưa đúng thẻ lên trung tâm; active state dùng `data-characterThumb` để tránh lệch thứ tự hiển thị.

- Section 2 caption `GORISE · BẮT ĐẦU TỪ NHỮNG ĐIỀU NHỎ BÉ` được tách khỏi khung ảnh bằng khoảng đệm riêng, có line-height và wrapping responsive để không mất chữ.

- Section 3 được tinh chỉnh: bỏ dòng hướng dẫn `Cuộn xuống để khám phá`, khung cửa ban đầu dùng tỷ lệ 430×420 desktop và 350×360 mobile, animation giữ bo góc bằng pixel để artwork hai cánh cửa khớp frame; khi mở hoàn toàn vẫn chuyển sang nội thất phủ viewport.

- Section 3 phần chữ cuối sau khi mở cửa có panel nền trắng-xanh bán trong suốt, bo góc, blur và shadow để tạo tương phản rõ với ảnh nội thất toàn màn hình; responsive riêng cho mobile.

- Section 6 `how-to-play` được bổ sung ngay sau Section 5: nền pastel không dùng ảnh căn nhà, hành trình 4 trạm Quan sát–Lựa chọn–Kết quả–Bài học, đường SVG vẽ dần, quân cờ GORISE di chuyển, popup giải thích ngắn khi click, CTA tới `/kham-pha-tro-choi/`, responsive desktop/tablet/mobile và hỗ trợ reduced-motion; Section Giá trị GORISE được đánh số 07.

- Section 6 được nâng cấp riêng theo artwork Safe Home: nền phòng khách pastel bằng CSS, 4 card gameplay giữ nguyên nội dung và tương tác, showcase bàn chơi/box/card stack/6 nhân vật bằng asset hiện có, Tigori nổi bật bên phải với speech bubble, chuyển động nhẹ, responsive và reduced-motion; không thay đổi Sections 1–5, navigation hoặc footer.

- Section 6 được tinh chỉnh full-width theo tỷ lệ cinematic: tăng kích thước 4 khung gameplay, làm nổi bật card minh họa, mở rộng mặt bàn sản phẩm và loại bỏ dòng CTA lặp để speech bubble của Tigori là điểm dẫn chuyện chính.

- Section 7 `values-section` đã được gỡ hoàn toàn khỏi homepage theo yêu cầu; các section khác, navigation, footer và chức năng mua hàng được giữ nguyên.

- Section 8 `buy-section` (khu vực Sản phẩm GORISE/giỏ hàng trên homepage) đã được gỡ theo yêu cầu; Section 6, CTA cuối trang, footer và các trang/chức năng khác được giữ nguyên.

- Section 4 được đổi sang nền fantasy navy tối với điểm sáng xanh/cyan và vàng, chữ tiêu đề được tăng tương phản để tạo chuyển tiếp rõ ràng sang Section 5 pastel sáng; carousel và các tương tác giữ nguyên.

- Background Section 4 được bổ sung bầu trời sao tinh tế với các điểm sáng trắng/cyan/vàng và hiệu ứng lấp lánh chậm, không ảnh hưởng đến carousel hoặc khả năng đọc nội dung.

- Thứ tự nhãn section trên homepage được điều chỉnh: Nhân vật Safe Home `03`, Khám phá tình huống `04`, Cách chơi Safe Home `05`; nội dung và chức năng giữ nguyên.

- Trang `/ve-gorise/` được thiết kế lại thành hành trình thương hiệu 10 section bằng tiếng Việt, có hero TIGORI, câu chuyện, ý tưởng, triết lý, tầm nhìn, sứ mệnh, giá trị cốt lõi, Safe Home, định hướng phát triển và CTA đồng hành; Section Câu chuyện trên homepage đã liên kết trực tiếp đến trang này.
- Trang Shop `/kham-pha-tro-choi/` được thiết kế lại theo hướng Premium Educational Board Game Store: hero Safe Home, hai card phiên bản (phiên bản mở rộng hiển thị trạng thái đang cập nhật theo dữ liệu hiện có), khu khám phá thành phần tương tác, bảng so sánh, trải nghiệm, gallery lightbox, FAQ, CTA và responsive mobile; giữ nguyên nút thêm giỏ hàng và các route công khai.
- Trang `video-tinh-huong/` được nâng cấp thành thư viện video chuyên nghiệp: hero Safe Home, tìm kiếm, bộ lọc chủ đề có số lượng, sắp xếp mới/cũ/A–Z/Z–A, chế độ lưới/danh sách, card chọn nhanh, chia sẻ/copy link; giữ nguyên `/api/videos`, Storage, thumbnail, link QR và URL `?v=<id>`.
- Trang `video-tinh-huong/` được redesign theo prompt Safety Video Library: hero tiếng Việt, lọc 5 khu vực theo dữ liệu thực tế, card 16:9 có thumbnail/play/xem tình huống/QR, vùng xem chi tiết giữ nguyên URL `?v=<id>` và QR endpoint hiện có, banner Tigori, CTA Safe Home, responsive; không thay đổi video, ID, Storage, dữ liệu hay đường dẫn QR.
- Trang `lien-he/` được redesign theo concept `GORISE – LET'S CONNECT & GROW TOGETHER`: hero tiếng Việt với TIGORI chính thức, 4 thẻ kết nối dùng thông tin thật, form liên hệ có trường chủ đề và nút hợp tác tự chọn `Hợp tác`, CTA/FAQ giữ nguyên điều hướng; header/footer, thông tin mạng xã hội, chức năng form và dữ liệu hiện có không bị xóa.
- Stability audit: asset sản phẩm được lưu nội bộ tại `product-safe-home.webp`; các ảnh quản trị vẫn ưu tiên URL storage và có fallback authored để Preview không bị ảnh hỏng khi storage chưa sẵn sàng.
- Trang `video-tinh-huong/` tự trích một frame đại diện khoảng 35% thời lượng mỗi video để làm thumbnail ở phía trình duyệt; giữ nguyên `stableUrl`, video gốc, QR và link chia sẻ, đồng thời vẫn ưu tiên thumbnail đã lưu nếu có.
- Trang Tình huống có 20 thumbnail tĩnh được trích trực tiếp từ frame khoảng 35% của từng video theo ID; build phục vụ các ảnh này, còn video gốc, QR và link riêng được giữ nguyên.
- Trang Tình huống dùng lưới card gọn hơn: 4 cột trên desktop, 3 cột tablet, 2 cột mobile; thumbnail, tiêu đề, nút xem và QR vẫn giữ nguyên.
- Trang Tình huống bổ sung animation nhẹ: hero fade-up, bảng Safe Home chuyển động nổi, card reveal lần lượt khi vào viewport, hover play button, animation khu vực và hỗ trợ prefers-reduced-motion.
- Trang Tin tức được bổ sung 10 bài SEO mới về an toàn trẻ em, học qua chơi và Safe Home; mỗi bài có slug chi tiết, nội dung HTML, nguồn tham khảo UNICEF/AAP/NAEYC và một số nguồn báo chí Việt Nam; danh sách tự sinh card và build route đã mở rộng đủ 16 bài.
- Trang Tin tức bổ sung 10 bài SEO mới với ảnh minh họa riêng từ kho ảnh quản lý, metadata title/description/canonical, Open Graph, Twitter Card và JSON-LD theo từng route; các bài viết, video và QR hiện có được giữ nguyên.
- Trang `video-tinh-huong/` dùng video tình huống thật từ kho lưu trữ làm hero, tự phát không tiếng, lặp và scale đầy khung; kho video, QR và link riêng được giữ nguyên.
- Hero trang `video-tinh-huong/` được đồng bộ kiểu banner trang chủ: video kho lưu trữ phủ toàn nền, lớp gradient bảo vệ chữ, tự phát không tiếng và nút bật/tắt âm thanh.
- Hero trang Tình huống dùng video `Phát hiện khói trong nhà` và sân khấu 16:9 tương đương 1920×1080; video dọc giữ nguyên nội dung với nền phóng mờ cinematic, không ảnh hưởng kho video hoặc QR.
- Hero trang Tình huống được căn lại thành bố cục hai cột 45/55: nội dung bên trái, video dọc 9:16 bên phải trong khung 380×650px; responsive chuyển một cột trên mobile, giữ nguyên video, âm thanh, QR và các section khác.
- Hero trang Tình huống chọn ngẫu nhiên một video từ kho mỗi lần tải trang; kho video, thumbnail, QR, link và video đang chọn vẫn giữ nguyên.
- Trang Tình huống thay banner TIGORI trùng nội dung bằng section `video-values-section` gồm 3 thẻ: Nhận biết nguy hiểm, Tự tin lựa chọn và Ghi nhớ bài học; giữ nguyên 5 thẻ khu vực, 20 video và QR.
- Section giá trị trang Tình huống được redesign theo board game pastel nhiều lớp: background đường đi, thẻ trang trí, minh họa lớn kính lúp/cảnh báo, não/bong bóng hội thoại và checklist/ngôi sao; responsive và giữ nguyên dữ liệu video/QR.
- Section giá trị trang Tình huống sử dụng ảnh thiết kế tham chiếu nguyên bản `video-values-reference.webp` phủ toàn chiều rộng; giữ nguyên kho video, QR, link và các section khác.
- Ảnh tham chiếu Section giá trị được đặt `object-fit: cover` để phủ kín toàn bộ section trên desktop và giữ tỷ lệ tự nhiên trên mobile.
- Homepage Section Cách chơi Safe Home sử dụng hai ảnh gốc `gameplay-scene-1.webp` và `gameplay-scene-2.webp`, hiển thị liền mạch theo hai phân cảnh dọc với lớp hiệu ứng reveal, glow, parallax nhẹ và vùng tương tác phủ theo vị trí nội dung ảnh.

- Homepage Section Cách chơi giữ nguyên hai ảnh gốc và bổ sung hotspot tương tác cho 4 bước, 6 ô bàn cờ, 6 nhân vật; popup nội dung tiếng Việt, thanh tiến trình, lật kết quả/bài học minh họa và nút bắt đầu/chơi lại hành trình qua các ô đến GOAL.
- Section Cách chơi được tối ưu kích thước: hai ảnh giữ nguyên tỷ lệ, căn giữa trong khung tối đa 1280px với khoảng thở responsive; các ô bàn cờ phát sáng lần lượt theo chu kỳ và vẫn giữ toàn bộ hotspot, popup, nhân vật và hành trình tương tác.
- Section Cách chơi đã thêm lớp BoardTileAssets tách từ asset sheet: 7 ô phát sáng độc lập, hotspot Khám phá, hành trình tuần tự 0,68 giây/ô, trạng thái đã đi qua, nhân vật được highlight và hiệu ứng GOAL/confetti; asset scale theo ảnh bằng tọa độ phần trăm.

## CMS quản trị nội dung — cập nhật 2026-10-24

- `/quan-ly/` là Dashboard quản trị chung, `noindex,nofollow`, dùng Manus OAuth và chỉ chấp nhận Admin đã cấu hình; các kho `/quan-ly-anh/` và `/quan-ly-video/` hiện có vẫn được giữ nguyên.
- `server/db-cms.js` cung cấp lớp dữ liệu CRUD cho `cms_articles`, sản phẩm Shop và thống kê Dashboard. `server/migrate.js` tạo bảng bài viết và bổ sung các trường SKU, giá khuyến mãi, tồn kho, trạng thái, gallery, video, SEO cho `products` theo migration idempotent.
- Bài viết có bản nháp/xuất bản/ẩn, slug duy nhất, danh mục, tag, mô tả, nội dung HTML, ảnh đại diện và SEO title/description. Bài đã xuất bản được cung cấp qua `/api/articles`; `news-cms.js` đồng bộ lên trang Tin tức và route chi tiết.
- Sản phẩm có thể tạo/sửa/ẩn từ Dashboard; `/api/products` trả thêm giá khuyến mãi, SKU, tồn kho, trạng thái và mô tả ngắn; `shop-cms.js` hydrate sản phẩm active vào Shop mà không thay đổi logic giỏ hàng hiện có.
- Build contract đã bổ sung `quan-ly`, `admin-dashboard.js`, `news-cms.js`, `shop-cms.js` và module CMS; route manifest thêm `/quan-ly` với `noindex,nofollow`.


## GORISE STUDIO 2.0 — Phase 1 Website Builder

### Phạm vi đã chọn
Triển khai trước lõi Website Builder thực tế trên nền Node HTTP + MySQL hiện có, không thay framework và không xóa dữ liệu public. Phase 1 gồm Dashboard tổng quan, Page Manager, Visual Editor, chỉnh text/image/button/section, Component Library tối thiểu, quản lý thứ tự section, cấu hình action cho button, lưu Draft, Preview, Publish và lịch sử phiên bản/rollback. Media Library, Video/Product/News nâng cao, Theme Manager, Responsive Editor chuyên sâu, Templates, Hotspots, SEO nâng cao và AI Design Assistant tiếp tục ở Phase 2–3.

### Kiến trúc triển khai
- `server/migrate.js`: thêm các bảng `cms_pages`, `cms_page_versions` và dữ liệu schema JSON khởi tạo từ các route hiện có; migration idempotent.
- `server/db-builder.js`: đọc/ghi page schema, draft/published status, thứ tự section, thuộc tính responsive/interaction, lịch sử phiên bản và rollback.
- `server/index.js`: thêm API quản trị được bảo vệ bằng `requireAdmin`; validate page schema, action target và HTML text an toàn trước khi lưu.
- `quan-ly/index.html` + `admin-dashboard.js`: thêm tab Website Builder/Pages Manager; giao diện ba vùng Component Library — Live Canvas — Properties Panel, thao tác thêm/xóa/di chuyển section, chỉnh trực tiếp text, image URL, button label/action, background và spacing; Undo/Redo ở cấp editor.
- `builder-runtime.js`: hydrate các override đã publish lên các phần tử public có `data-builder-key`, chỉ áp dụng dữ liệu hợp lệ; authored HTML/CSS vẫn là fallback khi chưa có schema.
- `manus-routes.json`: thêm route quản trị Builder noindex nếu tách màn hình; không đưa API/assets vào manifest.

### Nguyên tắc an toàn
Dữ liệu public hiện có là nguồn fallback; schema mới không được xóa sản phẩm, video, bài viết, asset hay route. Mọi API builder yêu cầu Admin ở backend. Draft không thay đổi website công khai; chỉ Publish mới cập nhật schema published. Mỗi Publish lưu actor, timestamp và snapshot để rollback.

### Kiểm tra Phase 1
Ưu tiên kiểm tra bằng code/API và Preview: migration chạy lặp lại; unauthenticated/editor không có quyền sai bị chặn; schema draft/published tách biệt; action target lỗi bị cảnh báo; save/reload giữ dữ liệu; publish/rollback tạo snapshot; public runtime vẫn render authored fallback và áp dụng override hợp lệ.

## Phase 1 — GORISE STUDIO Website Builder (2026-10-28)

- Đã thêm `/quan-ly-builder/` với Component Library, Live Canvas, Properties Panel, kéo thả đổi thứ tự section, thêm/nhân bản/xóa, undo/redo, lưu Draft, Preview, Publish và rollback.
- Đã thêm `cms_pages`/`cms_page_versions`, module `server/db-builder.js`, API Admin được bảo vệ quyền Admin và public runtime đọc schema Published.
- Đã thêm route manifest noindex và link từ Dashboard quản trị hiện tại.
- Phase 2–3 chưa triển khai: Media Library nâng cao, Template Library, Theme Manager, Responsive Visual Editor chuyên sâu, AI Design Assistant và các manager nâng cao.


## Phase 2 — Advanced Visual Website Builder

### Phạm vi và quyết định triển khai

Phase 2 tiếp tục trên GORISE STUDIO hiện có, không dựng lại website public và không thay thế asset, content hoặc database record hiện hữu. Lát cắt đầu tiên nâng cấp editor từ section-only thành schema-driven component editor: schema có cây `children`, component ID/type/content/style/responsive/interactions, draft preview gửi qua `postMessage` vào iframe cùng origin, và public runtime chỉ đọc `published_schema`. Mọi cập nhật vẫn tách Draft/Published; Save Draft không làm đổi public.

Kiến trúc thực tế gồm `quan-ly-builder/index.html` cho shell ba vùng, `builder-admin.js` cho state/history/library/properties/layers và optimistic canvas updates, `builder-runtime.js` cho public renderer và builder-preview bridge, `server/db-builder.js` cho schema/page/version persistence, và `server/index.js` cho các API authenticated. Media hiện dùng `media_assets` và storage presign hiện có; không thêm credential vào browser. Route manifest tiếp tục là `manus-routes.json` và mọi route public giữ fallback HTML authored nếu schema không tìm thấy marker.

### Thiết kế Phase 2

GORISE STUDIO giữ hướng **Playful Modern Board-Game SaaS**: nền ice-blue sáng, navy cho cấu trúc, blue cho selection/action, vàng cho trạng thái nhấn và teal cho thành công. Core principles là (1) canvas là trung tâm, (2) mọi thao tác có trạng thái rõ ràng và hoàn tác được, (3) component hiển thị như thẻ board game nhưng panel giữ kỷ luật SaaS, (4) không làm dashboard cạnh tranh với nội dung website. Typography dùng Baloo 2 cho heading/label và Be Vietnam Pro cho form/body. Selection dùng outline xanh và floating toolbar nhỏ; reduced-motion được tôn trọng.

### Các module và giai đoạn

- `builder-admin.js`: component registry theo category, tree/layers selection, drag/drop reorder, multi-select foundation, clipboard, lock/visibility, direct text edit event bridge, history và responsive style editing.
- `builder-runtime.js`: áp dụng published/draft schema an toàn, map fields thật, draft preview bridge, selection outline, inline contenteditable cho text, action routing trong Preview/public, và fallback không phá site.
- `server/db-builder.js` và `server/migrate.js`: schema JSON versioned, template records, validation của children/style/responsive/interactions, idempotent seed; không xóa schema đã lưu.
- `quan-ly-builder/index.html` và `styles.css`: categorized library, layers panel, expanded properties tabs, responsive controls, selection/floating toolbar, media picker hooks và version workflow.
- `server/index.js`: giữ Admin authentication cho page/template/media mutations, public endpoint chỉ trả published schema, không cho arbitrary executable code.

### Ưu tiên lát cắt giao hàng

1. Core editor bridge và schema tree: actual route preview, section/field selection, inline heading/text/button editing, floating actions, reorder/duplicate/delete/lock/hide, undo/redo và Draft persistence.
2. Expanded component registry, layers panel và style controls: layout/background/appearance/responsive fields phản ánh ngay trên draft canvas.
3. Interaction/media/template services: button action editor, safe target validation, existing media library selection, GORISE template insertion/save, persistent storage.
4. Acceptance hardening: Shop Hero workflow, mobile preview, reload persistence, publish/public verification, rollback and independent read-only review.

### Ràng buộc kỹ thuật

Canvas preview dùng route thật trong iframe; frame gửi draft schema sau mỗi render và runtime không được dùng `innerHTML` từ user text. Text phải set bằng `textContent`/`contenteditable` rồi gửi patch; style chỉ nhận allowlisted CSS values; action target không được `javascript:`. Public runtime chỉ áp dụng schema published. Các thay đổi cần giữ initial HTML/SEO, performance và reduced-motion của website public.


## Phase 3 — Advanced Admin Foundation (2026-10-29)

Phase 3 được triển khai trong Admin-only route `/quan-ly-phase3/`, không áp dụng schema lên public runtime và không thay đổi ảnh/banner hiện có. Giao diện gồm Template Library, Animation Editor guidance, Image Hotspot Editor foundation, SEO Manager, Analytics và AI Design Assistant.

- `server/migrate.js` tạo các bảng `builder_templates`, `cms_page_meta` và `admin_activity_log` theo kiểu idempotent.
- `server/db-phase3.js` lưu template schema, metadata SEO và log thao tác bằng managed MySQL.
- `server/index.js` bảo vệ toàn bộ API Phase 3 bằng `requireAdmin`; AI chỉ trả đề xuất, không tự động ghi Draft/Publish.
- `quan-ly-phase3/index.html`, `phase3-admin.js` và CSS riêng cung cấp workspace responsive; Template/SEO/Analytics thao tác dữ liệu thật, Animation/Hotspot là công cụ cấu hình theo Draft Builder và chưa thay đổi public.
- `manus-routes.json` khai báo route Admin Phase 3 với `noindex,nofollow`; route public và các asset banner không bị chỉnh sửa.
