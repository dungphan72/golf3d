# Tiến độ thiết kế lại UI

Cập nhật lần cuối: 14/11/2026. Nhánh `ui-redesign`. Chưa triển khai production.
Phân tích ảnh và các điểm cần quyết định: `docs/UI_REFERENCE_AUDIT.md`.

| Màn hình | Desktop | Mobile | Đúng thiết kế | Chức năng | Kiểm thử |
|---|---|---|---|---|---|
| Design system (màu, font, icon) | Xong: Be Vietnam Pro xuyên suốt, vàng logo `#fcb000`, icon Material/Lucide | Xong | Gần đúng | Không đổi | Typecheck, lint |
| Trang chủ | Xong phần chính: hero, đặt line nhanh, dải điểm nổi bật, dịch vụ nổi bật, bảng giá, banner hội viên (quyền lợi lấy từ cấu hình), ảnh không gian, liên hệ, FAQ | Xong bố cục responsive; chưa có lưới 8 lối tắt và "Lịch đặt của tôi" (cần đăng nhập) | Gần đúng | Giữ nguyên đặt chỗ, bảng giá, JSON-LD | e2e: a-landing, zx-landing-booking, zy-membership-page đạt |
| Giải đấu & Sự kiện, Tin tức | Không hiển thị | Không hiển thị | Chưa | Chưa có dữ liệu | Cần quyết định (audit mục 4) |
| POS desktop | Xong: line "Trống" chỉ còn một chạm, không nút thừa; panel hóa đơn riêng từng phiên | Dùng chung bố cục co lại | Gần đúng | Giữ nguyên thanh toán, giảm giá, hoàn tiền | e2e: walk-in, thu tiền, giảm giá, hoàn tiền đạt |
| POS mobile | — | Mới có ô line gọn, bottom nav theo mẫu, hóa đơn toàn màn hình. Chưa có lưới sản phẩm F&B | Một phần | Giữ nguyên | e2e: nút ≥ 44 px đạt |
| Trạng thái Bảo trì | Chưa | Chưa | — | Hệ thống chưa có trạng thái này | Cần quyết định |
| CRM | Chưa | Chưa | Chưa | Giữ nguyên | Chưa |
| Hội viên | Chưa (cổng `/tai-khoan` đã đổi màu, `/thanh-vien` đã làm lại) | Chưa | Chưa | Giữ nguyên | e2e: zy-membership-page đạt |
| Trang con (bảng giá, thẻ, đăng nhập, đặt riêng, 404) | Xong | Đã xem | Theo bản sáng | Giữ nguyên | Xem trình duyệt |

## Việc còn lại theo thứ tự đề xuất
1. POS mobile: bố cục riêng, lưới sản phẩm F&B (cần chốt cách xử lý luồng bếp/bar).
2. Hội viên: thẻ có QR thật, thanh tiến độ giờ, lịch sử, quyền lợi.
3. CRM desktop và mobile.
4. Trang chủ mobile dạng ứng dụng: lưới lối tắt, lịch đặt của tôi.
5. Giải đấu, tin tức: chỉ sau khi có nguồn dữ liệu.
6. Chạy toàn bộ bộ test e2e; hiện đã sửa các bài trỏ vào giao diện cũ, riêng `flow.spec` (bán gói) vẫn lỗi từ trước.
