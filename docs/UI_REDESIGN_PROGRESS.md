# Tiến độ thiết kế lại UI

Cập nhật lần cuối: 14/11/2026. Nhánh `ui-redesign`. Chưa triển khai production.
Phân tích ảnh và các điểm cần quyết định: `docs/UI_REFERENCE_AUDIT.md`.

| Màn hình | Desktop | Mobile | Đúng thiết kế | Chức năng | Kiểm thử |
|---|---|---|---|---|---|
| Design system (màu, font, icon) | Xong: Be Vietnam Pro xuyên suốt, vàng logo `#fcb000`, icon Material/Lucide | Xong | Gần đúng | Không đổi | Typecheck, lint |
| Trang chủ | Xong phần chính: hero, đặt line nhanh, dải điểm nổi bật, dịch vụ nổi bật, bảng giá, banner hội viên (quyền lợi lấy từ cấu hình), ảnh không gian, liên hệ, FAQ | Xong bố cục responsive; chưa có lưới 8 lối tắt và "Lịch đặt của tôi" (cần đăng nhập) | Gần đúng | Giữ nguyên đặt chỗ, bảng giá, JSON-LD | e2e: a-landing, zx-landing-booking, zy-membership-page đạt |
| Giải đấu & Sự kiện, Tin tức | Xong: module nội dung (màn "Tin & sự kiện" cho nhân viên, trang `/tin-tuc`, khối trên trang chủ). Chỉ bài đã đăng mới hiện công khai | Responsive | Gần đúng | Bảng `posts` mới (migration 0030) | e2e: zzzzzzzzzzzzzzzzzz-content |
| POS desktop | Xong: line "Trống" chỉ còn một chạm, không nút thừa; panel hóa đơn riêng từng phiên | Dùng chung bố cục co lại | Gần đúng | Giữ nguyên thanh toán, giảm giá, hoàn tiền | e2e: walk-in, thu tiền, giảm giá, hoàn tiền đạt |
| POS mobile | — | Ô line gọn, bottom nav theo mẫu, hóa đơn toàn màn hình, lưới sản phẩm F&B (lọc nhóm, tìm kiếm, tăng giảm số lượng; vẫn gửi đơn qua bếp/bar) | Gần đúng | Luồng bếp/bar giữ nguyên | e2e: nút ≥ 44 px đạt |
| Hạng hội viên theo chi tiêu | Xong: Gold 50 triệu, Platinum 80 triệu, Diamond 100 triệu, sửa được ở Cài đặt; hiện ở thẻ, hồ sơ khách, chọn khách | Xong | — | Tổng chi = mua gói + nạp ví + thanh toán trực tiếp − hoàn tiền | Unit test + e2e zzzzzzzzzzzzzzzzzzz-rank |
| Trạng thái Bảo trì | Xong: nút "Bảo trì line", thẻ đỏ, chú thích; chặn vào chơi và đặt trước | Dùng chung | Gần đúng | Bảng `room_maintenance` mới (migration 0030) | e2e: zzzzzzzzzzzzzzzzz-maintenance |
| CRM | Chưa | Chưa | Chưa | Giữ nguyên | Chưa |
| Hội viên | Chưa (cổng `/tai-khoan` đã đổi màu, `/thanh-vien` đã làm lại) | Chưa | Chưa | Giữ nguyên | e2e: zy-membership-page đạt |
| Trang con (bảng giá, thẻ, đăng nhập, đặt riêng, 404) | Xong | Đã xem | Theo bản sáng | Giữ nguyên | Xem trình duyệt |

## Việc còn lại theo thứ tự đề xuất
1. Hội viên: bố cục theo ảnh (thẻ có QR thật, thanh tiến độ giờ, lịch sử, quyền lợi) trên dữ liệu hạng mới.
2. CRM desktop và mobile.
3. Trang chủ mobile dạng ứng dụng: lưới lối tắt, lịch đặt của tôi.
4. Chạy toàn bộ bộ test e2e; hiện đã sửa các bài trỏ vào giao diện cũ, riêng `flow.spec` (bán gói) vẫn lỗi từ trước.

## Khi triển khai
Có migration mới `drizzle/0030_maintenance_and_content.sql` (hai bảng mới, không đụng bảng cũ). Phải áp lên cơ sở dữ liệu trước khi chạy bản mới.

## Đợt 3 — CRM, đăng ký giải đấu, app hội viên, app khách trên điện thoại

- **CRM Tổng quan (CRM.png / CRM-mobile.png)**: màn mới `modules/crm/ui/CrmHome.tsx` + `GET /api/crm2/home` (`modules/crm/server/home.ts`).
  5 KPI, pipeline 5 cột gom từ 7 giai đoạn (Lead mới / Đang tư vấn = CONTACTED+QUALIFIED / Hẹn trải nghiệm = VISIT_SCHEDULED+VISITED / Chờ thanh toán = DEPOSITED / Đã chốt), giá trị từ `expected_value`,
  doanh thu theo tuần (chỉ quản lý), khách gần đây, hoạt động gần đây, công việc hôm nay. Màn Tổng quan cũ (phễu, nguồn, xếp hạng) vẫn nằm trong mục thu gọn bên dưới.
- Sidebar CRM đổi sang xanh lá thương hiệu (`app/crm-shell.css`), logo vàng `#fcb000`.
- **Đăng ký giải đấu**: bảng `event_signups` (migration 0031), `/api/events`, form trên trang chi tiết tin/sự kiện, quản lý xem số đăng ký trong "Tin & sự kiện".
- **App hội viên** (`/tai-khoan`): khung `MemberShell` (topbar, menu trái, tab dưới trên điện thoại), `MemberHome`, hạng Gold/Platinum/Diamond.
- **Điện thoại = app khách**: lưới 8 lối tắt ở trang chủ, thanh tab dưới (Trang chủ / Đặt line / Giải đấu / Hội viên / Tài khoản), PWA mở `/`.
- Chưa làm: "Tìm bạn chơi", "Cửa hàng" (đã ẩn), biểu đồ đường "Cơ hội" trong Hiệu quả kinh doanh, avatar ảnh khách.
- Triển khai: cần áp migration 0030 và 0031 lên DB VPS trước khi đưa mã mới lên.
