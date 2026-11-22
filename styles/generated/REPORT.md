# CSS split review report

Source: `styles.css`
Output: `styles\generated`

> These are candidate files. Do not remove the monolithic stylesheet until each route is visually and functionally verified.

## review.css
- Lines 1-158 (33394 bytes): Preamble / unlabelled CSS
- Lines 159-197 (26710 bytes): Multi-page extension
- Lines 198-202 (296 bytes): Official logo asset
- Lines 472-495 (1326 bytes): Shared tap targets and collision-safe Tigori (not just narrow-phone overrides).
- Lines 617-645 (1965 bytes): Readable secondary UI: keep compact labels distinct without 8–10px microcopy.
- Lines 723-736 (1192 bytes): User-managed section artwork: remains hidden until a slot has an active image.
- Lines 741-750 (657 bytes): Danger artwork matches the component tile ratio, so it can fill the frame edge-to-edge.
- Lines 893-933 (3690 bytes): GORISE cinematic hero redesign: Ghé Làng-inspired composition with the supplied logo.
- Lines 1020-1024 (299 bytes): Absolute fill removes the intrinsic image-height gap inside the 4:5 frame.
- Lines 1409-1425 (545 bytes): Neo dải card theo toàn bộ sân khấu, tránh rơi lên vùng tiêu đề.
- Lines 1881-1889 (729 bytes): TIGORI chuyển động thật: ưu tiên WebM nền trong suốt, PNG chỉ là fallback.
- Lines 2021-2090 (1936 bytes): Trang Tình huống — card gọn hơn để dễ nhìn và chọn nhanh.
- Lines 2268-2297 (4183 bytes): Section giá trị từ mỗi tình huống — thay thế banner TIGORI trùng nội dung.
- Lines 2298-2334 (7069 bytes): Nâng cấp trực quan Section Giá trị — board game pastel nhiều lớp.
- Lines 2335-2340 (486 bytes): Section Giá trị dùng ảnh thiết kế tham chiếu nguyên bản.
- Lines 2341-2350 (633 bytes): Ảnh tham chiếu phủ kín toàn bộ khung Section Giá trị.
- Lines 2351-2376 (5850 bytes): Section Cách chơi — hai phân cảnh ảnh gốc, nối liền bằng hiệu ứng cinematic.
- Lines 2377-2400 (6525 bytes): Interactive How-to-play — hotspot, popup, nhân vật và hành trình.
- Lines 2401-2419 (2477 bytes): Tối ưu Section Cách chơi: ảnh có khoảng thở, giữ nguyên tỷ lệ và hotspot theo ảnh.
- Lines 2420-2442 (3877 bytes): BoardTileAssets: tách từ asset sheet 3D, đồng bộ với các hotspot theo cùng hệ tọa độ phần trăm.
- Lines 2443-2454 (1092 bytes): Ảnh bàn cờ giữ nguyên trạng thái tĩnh, không phủ hiệu ứng lên artwork gốc.
- Lines 2455-2460 (417 bytes): Hai artwork mới có tỷ lệ khác nhau: luôn hiển thị nguyên vẹn, không ép khung 2048/768.
- Lines 2461-2464 (448 bytes): Section Cách chơi dùng artwork full-bleed, giữ nguyên tỷ lệ và không tạo dải trắng hai bên.
- Lines 2465-2477 (2727 bytes): Điều hướng nhanh giữa các section trên trang chủ.
- Lines 2478-2490 (1537 bytes): Màu active thay đổi theo section để người dùng nhận biết vị trí hiện tại.
- Lines 2542-2549 (899 bytes): Keep the settled page visible and make direct page selection explicit.
- Lines 2550-2572 (1723 bytes): Smoother book-like page turn
- Lines 2850-2903 (1267 bytes): Trang Tình huống — Hero banner tĩnh theo artwork GORISE mới.
- Lines 2918-2966 (1903 bytes): Trang Tình huống — announcement marquee nằm sát phía trên Hero.
- Lines 3668-3696 (948 bytes): V2 typography hook — nội dung thật của hai card dùng cùng vùng copy full-width.
- Lines 3862-3869 (196 bytes): Neo artwork theo card thay vì theo khối copy bên trong.
- Lines 3914-4125 (6321 bytes): Section 05 — HTML/CSS responsive, full viewport width, không dùng ảnh chụp toàn section.
- Lines 4126-4150 (571 bytes): Section 05 — banner chính thức duy nhất, full viewport và giữ nguyên tỷ lệ.
- Lines 4151-4186 (919 bytes): Section 05 — nền xanh mờ phía sau, banner chính căn giữa.
- Lines 4320-4483 (5302 bytes): Section 02 reference layout — left 40%, component cards 60%.
- Lines 4827-4852 (5407 bytes): GORISE Play — future game hub landing page
- Lines 4853-4878 (5407 bytes): GORISE Play — future game hub landing page
- Lines 4879-4889 (1276 bytes): Embedded Safe Home Digital game
- Lines 4890-4928 (1029 bytes): Full-bleed game section: Safe Home Digital owns the entire play area

## cart.css
- Lines 203-232 (15533 bytes): Cart and checkout flow

## public-shell.css
- Lines 233-259 (4333 bytes): Floating GORISE mascot assistant
- Lines 496-536 (5380 bytes): Phase 1 mobile experience: bottom navigation, contextual CTA and quick feedback.
- Lines 646-687 (4676 bytes): Tigori AI: add a chat above the mascot; do not alter mascot-widget/trigger positioning or sizing.
- Lines 796-827 (1021 bytes): Footer brand emphasis
- Lines 828-836 (686 bytes): Header social links
- Lines 934-939 (312 bytes): Draggable Tigori mascot.
- Lines 1821-1834 (8304 bytes): Footer board-game cinematic — chỉ áp dụng cho footer, không ảnh hưởng header hay các section khác.
- Lines 1835-1880 (5483 bytes): TIGORI AI companion — animation nhẹ theo nhịp video tham chiếu, dùng mascot PNG chính thức.
- Lines 2608-2672 (1981 bytes): Mobile TIGORI hardening: keep every AI surface inside the viewport.
- Lines 2673-2686 (380 bytes): Mobile collision fix: lift TIGORI above fixed controls instead of hiding it.
- Lines 3038-3096 (4949 bytes): TIGORI AI Assistant — modern compact chat window; mascot trigger animation remains unchanged.
- Lines 3360-3399 (3337 bytes): Section 5 final rebuild — full-width copy with corner mascot, no vertical art columns.
- Lines 3400-3464 (2302 bytes): Section 5 ultra-wide desktop — tận dụng màn hình lớn, giữ mascot nhỏ đúng tỷ lệ.
- Lines 4791-4826 (5148 bytes): Phase 1 mobile experience: final touch-first overrides.

## core.css
- Lines 260-471 (14832 bytes): GORISE responsive design system: same brand tokens, touch-first composition.
- Lines 537-616 (6585 bytes): GORISE typography system — Baloo 2 for expression, Be Vietnam Pro for reading.
- Lines 3159-3168 (477 bytes): Mobile player transition reset: keep the 9:16 video centered without desktop translate offsets.
- Lines 4187-4213 (605 bytes): Section 05 — reset offset, căn giữa tuyệt đối trong chiều rộng trang.

## admin.css
- Lines 688-722 (3870 bytes): GORISE image studio
- Lines 3003-3037 (2507 bytes): Sidebar Tình huống — visual polish theo layout Safe Home mới, QR chỉ quản lý trong Admin.
- Lines 3211-3223 (6909 bytes): GORISE CMS dashboard
- Lines 4692-4704 (8573 bytes): GORISE STUDIO 2.0 — Phase 1 Website Builder
- Lines 4705-4735 (4028 bytes): GORISE STUDIO Phase 1 rebuild: stable dashboard layout
- Lines 4736-4753 (5699 bytes): GORISE STUDIO Phase 2 — schema editor controls
- Lines 4754-4790 (7056 bytes): GORISE STUDIO Phase 3 — admin-only workspace

## video.css
- Lines 737-740 (253 bytes): The situation illustration is intentionally uncropped inside the component tile.
- Lines 751-795 (5267 bytes): Situation video library
- Lines 837-846 (696 bytes): Situation cards replace the generic play button in the public video library.
- Lines 847-852 (487 bytes): Video Studio thumbnail uploader.
- Lines 884-892 (910 bytes): Hero video sound control.
- Lines 1949-1960 (14364 bytes): Situation library — thư viện video chuyên nghiệp, giữ nguyên kho Storage và QR.
- Lines 1961-1996 (7101 bytes): Redesign trang Tình huống — các lớp giao diện mới, không đụng dữ liệu video/QR.
- Lines 2091-2177 (3277 bytes): Animation riêng cho trang Tình huống — nhẹ, rõ và không gây rối khi chọn video.
- Lines 2178-2194 (2503 bytes): Hero trang Tình huống — video thật từ kho lưu trữ.
- Lines 2195-2223 (2769 bytes): Hero Tình huống đồng bộ banner trang chủ: video phủ nền, nội dung nằm trên lớp gradient.
- Lines 2224-2245 (1733 bytes): Hero video 16:9 — sân khấu 1920×1080, giữ trọn video dọc và tạo chiều sâu cinematic.
- Lines 2246-2267 (3979 bytes): Hero Tình huống — bố cục 2 cột 45/55, video dọc nằm riêng bên phải.
- Lines 2790-2849 (1743 bytes): Tình huống — chuyển video mềm, không chớp khung phát khi chọn thẻ mới.
- Lines 2904-2917 (1224 bytes): Tình huống — bấm trực tiếp vào thumbnail để chọn video.
- Lines 2967-2975 (3683 bytes): Safe Home — Collapsible Video Playlist.
- Lines 2976-3002 (3518 bytes): Safe Home — compact desktop player and internally scrollable sidebar.
- Lines 3097-3158 (2972 bytes): Safe Home player — final two-column composition based on the reference layout.
- Lines 3224-3240 (1686 bytes): GORISE CMS — video analytics

## home.css
- Lines 853-883 (2332 bytes): Homepage hero video banner: the supplied video is the only hero visual.
- Lines 940-978 (3700 bytes): Section 2 — GORISE story, cinematic and editorial.
- Lines 979-992 (1146 bytes): Section 2 scroll storytelling motion.
- Lines 993-998 (571 bytes): User-provided Section 2 story artwork.
- Lines 999-1015 (1984 bytes): Section 2 full-frame artwork and falling leaves.
- Lines 1016-1019 (177 bytes): Ensure the Section 2 artwork occupies the entire frame, edge to edge.
- Lines 1025-1060 (3711 bytes): Section 3 — Safe Home cinematic story.
- Lines 1061-1114 (4844 bytes): Section 3 — cinematic Safe Home door reveal.
- Lines 1115-1133 (2031 bytes): Section 4 — character cards: giữ nguyên toàn bộ mặt thẻ 2:3, không crop.
- Lines 1134-1152 (2220 bytes): Carousel Section 4 — thẻ giữa lớn nhất, hai bên thu nhỏ nhưng vẫn giữ nguyên tỷ lệ 2:3.
- Lines 1153-1180 (3149 bytes): Nâng cấp Section 4 — thông tin đồng bộ và lựa chọn nhân vật.
- Lines 1181-1213 (3627 bytes): GORISE Adventure Character Arena — chỉ áp dụng trong Section 4.
- Lines 1214-1249 (3491 bytes): Fantasy Board Game Character Selection Arena — background riêng của Section 4.
- Lines 1250-1322 (7887 bytes): Section 5 — Interactive Adventure Map: năm trạm tình huống an toàn.
- Lines 1323-1361 (3356 bytes): Section 5 visual reference layer — HTML tương tác phủ trên cảnh Safe Home.
- Lines 1362-1408 (3658 bytes): Section 5 final layout — asset nhà riêng, card so le quanh visual trung tâm.
- Lines 1426-1483 (4678 bytes): Section 5 detail map — mini cards, marker đúng khu vực và connector SVG.
- Lines 1484-1487 (293 bytes): Section 4 — thẻ lớn và thumbnail dùng chung một trạng thái chọn.
- Lines 1488-1494 (600 bytes): Section 2 — caption luôn tách khỏi ảnh và hiển thị trọn vẹn.
- Lines 1495-1502 (454 bytes): Section 3 — khung cửa khớp với artwork cửa, không còn lời nhắc cuộn.
- Lines 1503-1513 (998 bytes): Section 3 — bảng nền bảo vệ phần chữ khi nội thất đã phủ toàn viewport.
- Lines 1514-1595 (10371 bytes): Section 6 — Board Game Journey: Cách chơi Safe Home.
- Lines 1596-1625 (9280 bytes): Section 6 nâng cấp — không gian phòng khách và bàn chơi Safe Home.
- Lines 1626-1665 (2887 bytes): Section 6 — bản full-width theo bố cục cinematic 16:9.
- Lines 1666-1699 (1785 bytes): Section 4 — nền tối tạo tương phản rõ với Section 5 sáng màu.
- Lines 1700-1726 (2236 bytes): Section 4 — bầu trời sao nhẹ cho Character Arena.
- Lines 2491-2517 (5444 bytes): Section 3 — GORISE interactive storybook
- Lines 2573-2582 (1247 bytes): Section 4 — cinematic space philosophy banner
- Lines 2583-2607 (2596 bytes): Section 3 — flashcard interaction: one card, one clean 3D turn
- Lines 3257-3268 (8502 bytes): Section 5 — Vision & Mission: Playful Modern / Cinematic Storytelling
- Lines 3269-3318 (3262 bytes): Section 5 compact layout — giữ đủ nội dung nhưng giảm chiều cao tổng thể.
- Lines 3319-3359 (2898 bytes): Section 5 wide desktop composition — card rộng, thấp, cân bằng ngang.
- Lines 3465-3667 (6588 bytes): Section 5 V2 — banner ngang Tầm nhìn & Sứ mệnh, layout độc lập.
- Lines 3697-3743 (1853 bytes): Section 5 V2 — chuyển động trang trí nhẹ và tiết kiệm hiệu năng.
- Lines 3744-3861 (3379 bytes): Section 5 repair — canonical two-card layout; this block intentionally supersedes legacy rules.
- Lines 3870-3894 (598 bytes): Section 5 — artwork tham chiếu nguyên bản, không crop và không chồng lớp chữ.
- Lines 3895-3913 (368 bytes): Section 5 — chỉ hiển thị artwork, phủ full viewport ngang.

## about.css
- Lines 1727-1800 (22216 bytes): VỀ GORISE — hành trình thương hiệu 10 section.
- Lines 2518-2541 (2517 bytes): Storybook polish: rainbow world behind the book + softer paper curl
- Lines 2687-2726 (1261 bytes): Flashcard transition veil: a soft blurred destination image sits underneath the card.
- Lines 2727-2789 (3797 bytes): About page — unified Vision & Mission section
- Lines 3241-3256 (855 bytes): About — nội dung Tầm nhìn & Sứ mệnh mới, giữ nhịp đọc rõ ràng trên mọi màn hình.

## news.css
- Lines 1801-1820 (12917 bytes): TIN TỨC GORISE
- Lines 3169-3210 (1145 bytes): Tin tức — Hero banner artwork 2.5:1, không chồng lớp nội dung.

## shop.css
- Lines 1890-1948 (21549 bytes): Shop GORISE — Premium Educational Board Game Store.
- Lines 4214-4319 (3009 bytes): Shop Section 02 — 8 thành phần chính thức của Safe Home Standard.
- Lines 4484-4571 (3164 bytes): Shop Hero reference banner — giữ artwork nguyên bản, CTA là HTML thật.
- Lines 4572-4629 (4811 bytes): Shop comparison — Standard vs Premium, data kept as editable HTML fields.
- Lines 4630-4668 (1155 bytes): Shop Hero — khắc phục full viewport và giữ CTA theo tỷ lệ artwork.
- Lines 4669-4691 (917 bytes): Shop Hero: chỉ giữ vùng click trong suốt theo nút đã có sẵn trong artwork.

## contact.css
- Lines 1997-2009 (10368 bytes): Trang Liên hệ — GORISE Let's Connect & Grow Together.
- Lines 2010-2020 (1012 bytes): Banner ảnh Hero Liên hệ — giữ nguyên thiết kế ảnh, không chồng nội dung HTML.
