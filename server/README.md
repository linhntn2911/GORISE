# GORISE AI backend

## Nguồn dữ liệu

Dữ liệu sản phẩm ban đầu được đối chiếu với trang [Khám phá trò chơi](/kham-pha-tro-choi): **299.000₫**, sáu thành phần và độ tuổi **8+ (thông số dự kiến)**. Con số **450.000₫** trong brief là ví dụ, không phải giá chính thức. Trang sản phẩm ghi miễn phí vận chuyển, trong khi giỏ hàng demo tính **30.000₫**; vì chưa được xác nhận, `shipping`, `payment` và `availability` được lưu là `NULL`. QR, ngân hàng và mã đơn trong giỏ hàng chỉ minh họa. Bot không được bảo người dùng chuyển tiền theo bản demo.

`node server/migrate.js` tạo schema và nhập seed lần đầu; lần chạy sau không ghi đè bản ghi. Người vận hành có quyền DB có thể cập nhật `products.price_vnd`, `availability`, `shipping_json` hoặc các trường khác sau khi xác minh. Mỗi câu hỏi sản phẩm gọi truy vấn DB mới nên giá trả lời cập nhật theo DB. Không có endpoint chỉnh sửa dữ liệu công khai.

## Dịch vụ và bảo mật

[Đặc tả Tavily Search](https://docs.tavily.com/documentation/api-reference/endpoint/search) xác nhận `POST https://api.tavily.com/search`, header `Authorization: Bearer <TAVILY_API_KEY>`, các trường `query`, `search_depth`, `max_results`, `include_answer`, `include_raw_content`; kết quả có `title`, `url`, `content`, `score` và đôi khi `published_date`. `TAVILY_API_KEY`, `MANUS_API_URL` và `MANUS_API_KEY` chỉ được đọc lúc chạy trong server, không vào mã trình duyệt, bản build tĩnh hoặc image.

Model được gọi với `tool_choice: none` để không tự dùng công cụ tìm kiếm tích hợp: backend chỉ gọi Tavily cho intent bên ngoài. Prompt và nguồn Web không được ghi đè giá, thanh toán hay chính sách GORISE. `/api/ai/chat` và `/api/products` trả `Cache-Control: no-store`; `/api/health` báo trạng thái DB mà không tiết lộ credential.

Preview Node chạy port 3000. Build tĩnh sao chép bảy trang và `ai-chat.js` vào `dist`; backend deploy bằng Dockerfile và route `/api/*` → server, `/*` → static. **Chưa được phép Publish** trong lượt cập nhật này.
