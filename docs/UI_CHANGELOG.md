# UI Changelog

Mỗi mục phải có: lý do · ảnh tham chiếu · file thay đổi · screenshot trước/sau · kết quả kiểm thử.

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
