# UI Changelog

Mỗi mục phải có: lý do · ảnh tham chiếu · file thay đổi · screenshot trước/sau · kết quả kiểm thử.

## 2026-11-16 — Sơ đồ line, form đặt lịch, bo góc 5px toàn hệ thống (nhánh `fix/p0-data-integrity`)
- **Lý do:** (1) form "Tạo lịch đặt" không chặn điều kiện, layout lộn xộn; (2) đặt 9 hố báo "Chưa có giá line tiêu chuẩn" vì bảng giá không có giá 9 hố cho 2 và 3 người; (3) thẻ line nhồi nhiều thông tin trên một dòng, chữ thừa. Chủ hệ thống yêu cầu bo góc 5px thống nhất (thay quy ước 12–20px trước đây).
- **Ảnh tham chiếu:** ảnh chụp lỗi do chủ hệ thống gửi trong phiên; chưa có ảnh thiết kế riêng cho hai màn này.
- **File:** `app/ui/ModernPosFlow.tsx` (thẻ line dùng chung `renderDeskRoom`, nhãn "Line trống"/"Phòng trống", bỏ "Nhấn để nhận khách / Mở phiên", đơn giá lấy từ khung giá đang áp dụng thay vì trường `rate` cũ), `app/pos-flow.css`, `app/ui/Forms.tsx` (BookingForm), `app/admin.css`, `app/ui/SystemSettingsHub.tsx`, toàn bộ `app/**/*.css` và `borderRadius` nội tuyến (575 khai báo CSS, 77 viên thuốc, 40 nội tuyến → 5px; giữ hình tròn, công tắc, thanh tiến độ).
- **Hành vi form đặt lịch:** số người chưa có giá bị khóa (không đoán giá); danh sách điều kiện còn thiếu (tên, số điện thoại hợp lệ, giờ trong khoảng cho phép, có báo giá); nút xác nhận chỉ mở khi đủ điều kiện. Không còn đặt với tên mặc định "Khách đặt lịch".
- **Dữ liệu:** chưa nạp giá nào vào cấu hình thật. Cần chủ hệ thống bổ sung giá 9/18 hố cho 2–3 người trong Cài đặt › Giá (hoặc xác nhận dùng bảng giá chính thức 11/2026).
- **Screenshot:** chụp trong phiên bằng Playwright (sơ đồ line, form đặt lịch 9 hố); chưa lưu thành file trong repo.
- **Kiểm thử:** `tsc`, `eslint` (0 lỗi), `pnpm test` 222/222, build đạt. Kiểm tra bằng mắt trên bản build với dữ liệu thử có thiếu giá 9 hố 2–3 người. E2E cũ chưa cập nhật theo sidebar mới.
- **Chưa làm:** thẻ line trên mobile (`pos-m3-room-ready` "Sẵn sàng đón khách") và bố cục mobile chưa đổi.

## 2026-11-15 — POS 4 bước nối dữ liệu thật (nhánh `pos-flow-redesign`)
- **Lý do:** bản `ModernPosFlow` trước đó dùng khách, món, hóa đơn giả; thanh toán gọi sai API; có 6 lỗi typecheck.
- **Ảnh tham chiếu:** `Luồng POS Saigon Indoor Golf Club.png`.
- **File:** `app/ui/ModernPosFlow.tsx`, `app/ui/ClubApp.tsx` (thêm `onOpenSession`), `app/pos-flow.css`. Commit `68d4ae9`, `01b554b`, `a8723d6`.
- **Screenshot:** chụp trong phiên làm việc (sơ đồ line, bán hàng L01 mobile/desktop, thanh toán, hoàn tất); chưa lưu thành file. Không có ảnh "trước" vì bản cũ lỗi typecheck.
- **Kiểm thử:** `tsc`, `eslint`, `pnpm test` đạt. Thủ công trên trình duyệt: vào chơi L03 → chốt giờ → thanh toán tiền mặt 752 ₫ → hoàn tất đạt. Chưa kiểm thử: thẻ, chuyển khoản, in, Zalo, thêm món, gia hạn.

## 2026-11-15 — Khôi phục và bảo vệ UI đã duyệt
- **Lý do:** giao diện mới chỉ nằm trong working tree chưa commit, có nguy cơ mất hoặc bị ghi đè.
- **Ảnh tham chiếu:** toàn bộ `hinh-anh/thiet-ke/`.
- **File:** 64 file (admin, POS, cài đặt, hội viên, đăng nhập, trang chủ, CRM home, ảnh thiết kế). Commit `7e513a6`, tag `ui-approved-2026-11-15`.
- **Screenshot:** có sẵn ở `.admin-check/` (admin desktop/tablet/mobile).
- **Kiểm thử:** không đổi code; sao lưu `D:\Backup\app-golf3d-2026-11-15`.
