# Ý tưởng thiết kế GORISE

## Định hướng đã chọn

**Board-game editorial / tiến về phía trước** — một thế giới board game hiện đại, sáng và giàu năng lượng; biến nội dung giáo dục an toàn thành một hành trình trực quan, có nhịp điệu và cảm giác khám phá.

## Chuyển hóa thiết kế

- **Design movement:** hình khối phẳng, editorial card layout, nhiều khoảng trắng, đường đi và các mốc tiến bước.
- **Core principles:** vui vẻ nhưng không trẻ con; rõ ràng trước, trang trí sau; mỗi section là một chặng của hành trình; sản phẩm là nhân vật chính.
- **Color philosophy:** xanh dương đậm tạo niềm tin; xanh sáng là hành động; xanh ngọc là chuyển động và trưởng thành; vàng là điểm nhấn tích cực; nền trắng/xanh rất nhạt giúp giao diện sạch.
- **Layout paradigm:** container rộng, lưới 12 cột trên desktop, chuyển thành một cột trên mobile; section xen kẽ nền sáng và nền xanh nhạt; card bo 22px.
- **Signature elements:** ô cờ, thẻ bài, xúc xắc, quân cờ, đường chấm dẫn hướng, mũi tên cong, vòng tròn số thứ tự và các ngôi sao nhỏ.
- **Interaction philosophy:** CTA rõ ràng, hover nâng nhẹ card, navigation anchor mượt, menu mobile mở/đóng đơn giản, card sản phẩm có trạng thái focus dễ thấy.
- **Animation:** reveal nhẹ khi cuộn, floating shape chậm ở hero, không lạm dụng; tôn trọng `prefers-reduced-motion`.
- **Typography system:** sans-serif hiện đại với tiêu đề đậm, chữ hoa có tracking vừa phải; body 16–18px, line-height thoáng.
- **Brand essence:** Move Forward Through Every Challenge.
- **Brand voice:** khích lệ, sáng rõ, tích cực, đồng hành cùng trẻ và gia đình.
- **Wordmark/logo:** giữ wordmark GORISE nổi bật; biểu tượng mark là một đường tiến lên qua các ô cờ, dùng cho favicon và điểm nhấn.
- **Signature brand color:** `#123B72` xanh dương đậm.

## Asset plan

- Hero: một illustration board game góc nhìn top-down, gồm bàn chơi, thẻ tình huống, xúc xắc, quân cờ; palette xanh dương/xanh ngọc/vàng trên nền sáng.
- Branding: icon vuông nền xanh dương đậm với đường đi hình học tối giản, dùng cho favicon và nhận diện project.
- Các illustration section còn lại ưu tiên CSS/SVG hình học để nhẹ, đồng nhất và dễ chuyển sang Figma.
