# UI Changelog

Mỗi mục phải có: lý do · ảnh tham chiếu · file thay đổi · screenshot trước/sau · kết quả kiểm thử.

## 2026-11-16 — Bảng giá: thêm khung giá trong từng nhóm, lưu không báo thành công giả (nhánh `fix/p0-data-integrity`)
- **Lý do:** nút "Thêm khung giá mới" tưởng như không chạy (dòng mới nằm ngoài tầm nhìn, chỉ có dải lỗi ở trên); bấm Lưu khi dữ liệu sai vẫn báo "Đã lưu cấu hình thành công!" rồi đóng cửa sổ và mất thay đổi.
- **File:** `app/ui/PriceEditor.tsx` (nút "Thêm khung giá" ở từng khu vực và "Thêm" ở từng dịch vụ, dòng mới tự mở rộng nhóm và cuộn vào giữa màn hình), `app/ui/SystemSettingsHub.tsx` (`handleSaveConfig` không báo thành công và không đóng khi máy chủ từ chối; thẻ Bảng giá kiểm tra hợp lệ trước khi lưu, hiện lỗi ngay trong cửa sổ và ở lại sau khi lưu thành công).
- **Hành vi:** Lưu bảng giá thành công thì giữ nguyên cửa sổ và hiện "Đã lưu bảng giá"; các thẻ khác vẫn đóng sau khi lưu thành công.
- **Kiểm thử:** `tsc`, `eslint` (0 lỗi), `pnpm test`; trình duyệt: thêm khung trong nhóm 18 hố, lưu khi chưa hợp lệ (cửa sổ giữ nguyên, báo lỗi), điền khung 23:00–23:30 và lưu (73 khung, cửa sổ ở lại).

## 2026-11-16 — Bảng giá chính thức duy nhất, thêm/sửa/xóa khung giá (nhánh `fix/p0-data-integrity`)
- **Lý do:** bảng giá đang chạy thật là bảng cũ, thiếu giá 9 hố cho 2–4 người và lệch bảng chính thức 11/2026; Cài đặt hệ thống mới không còn nơi sửa bảng khung giá chi tiết (chỉ 4 ô giá theo giờ). Chủ hệ thống yêu cầu dùng bảng chính thức cho toàn hệ thống, bỏ các bảng giá không liên quan, cho phép thêm, sửa, xóa.
- **Ảnh tham chiếu:** `docs/PRICING.md` (bảng giá chính thức 11/2026); giao diện theo `caidat.png`.
- **File:** `app/ui/SystemSettingsHub.tsx` (thẻ "Bảng giá" dùng `PriceEditor`, nút "Nạp bảng giá chính thức 11/2026" có bước xác nhận; bỏ form 4 ô giá và đồng bộ phía client), `app/system-settings.css`, `lib/pricing.ts` (`upgradeConfig` luôn dùng bảng chính thức khi chưa lưu bảng riêng), `app/ui/ClubApp.tsx`, `tests/booking-plan.test.ts`, `tests/official-pricing.test.ts`.
- **Sửa lỗi kèm theo:** nút Lưu trong Cài đặt hệ thống trước đây không gửi `pricingRevision` nên máy chủ trả 409 cho mọi lần lưu; nay gửi kèm.
- **Cách áp dụng trên hệ thống thật:** Cài đặt hệ thống › Giá, gói & hội viên › Bảng giá › Nạp bảng giá chính thức 11/2026 › Thay thế › Lưu thay đổi. Chưa nạp tự động vào dữ liệu thật.
- **Screenshot:** chụp trong phiên (thẻ Bảng giá); chưa lưu thành file trong repo.
- **Kiểm thử:** `tsc`, `eslint` (0 lỗi), `pnpm test`; kiểm tra bằng trình duyệt: nạp bảng chính thức, xóa một khung, lưu, đọc lại từ server (72 → 71).
- **Chưa làm:** các trường giá cũ (`rate`, `happy`, `hole9`…) còn trong cấu hình và mã nhưng không còn nơi nào chỉnh sửa; `SettingsForm` trong `Forms.tsx` là mã không dùng.

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
