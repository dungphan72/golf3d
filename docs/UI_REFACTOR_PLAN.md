# KẾ HOẠCH NÂNG CẤP VÀ ĐỒNG BỘ GIAO DIỆN (UI REFACTOR PLAN)
## Saigon Indoor Golf Club — sigolf.vn

Cập nhật: 17/11/2026  
Mục tiêu: Đưa toàn bộ hệ thống SIGOLF về chung một Design System duy nhất, loại bỏ triệt để tình trạng màn hình ngoài mới nhưng màn hình con cũ.

---

## 1. NGUYÊN TẮC THI CÔNG & BẢO VỆ DỮ LIỆU

1. **Tuyệt đối không đụng vào Logic Nghiệp vụ**: Không sửa đổi backend API, database schema, cách tính cước giờ chơi, chiết khấu, VAT, phân quyền tài khoản và cổng thanh toán SePay.
2. **Triển khai cuốn chiếu từng phân hệ**: Hoàn thiện dứt điểm từng phân hệ, chạy `pnpm typecheck` và `pnpm test`, xác nhận không có lỗi phát sinh trước khi chuyển sang phân hệ tiếp theo.
3. **Giữ an toàn Git**: Mỗi nhóm thay đổi nhỏ đều được commit riêng biệt với thông điệp rõ ràng, có khả năng rollback ngay lập tức nếu cần.
4. **Không deploy Production nếu chưa kiểm tra đầy đủ**: Mọi build đều được kiểm thử trên môi trường local trước khi cập nhật lên server VPS `sigolf.vn`.

---

## 2. LỘ TRÌNH THỰC HIỆN THEO PHÂN HỆ

### Đợt 1: Chuẩn hóa Shared Components & Khung Layout Chung
- **Mục tiêu**: Đảm bảo các khung bao, thanh điều hướng, nút bấm, input và modal overlay đều dùng chung chuẩn tokens.
- **Phạm vi file**:
  - `app/ds-global.css`: Rà soát rule toàn cục cho input, button, scrollbar, touch targets.
  - `app/admin-reference.css`: Chuẩn hóa bộ class `.mod-*` (`.mod-workspace`, `.mod-page-header`, `.mod-btn-primary`, `.mod-kpi-card`).
  - `app/ui/AdminReferenceShell.tsx`: Đảm bảo sidebar và topbar trên Desktop/Mobile đồng bộ icon và nhãn phân hệ.

### Đợt 2: Chuẩn hóa toàn diện Phân hệ CRM 360° (Trọng tâm)
- **Mục tiêu**: Đồng bộ màn hình chi tiết khách hàng 360° đủ 9 tab theo quy chuẩn thiết kế đã duyệt.
- **Phạm vi file**:
  - `modules/crm/ui/CrmApp.tsx`, `app/crm-flow.css`.
- **Nội dung công việc**:
  1. Mở rộng `ProfileSubTab` thành 9 tab:
     - Tab 1: **Tổng quan** (`info`) — Thông tin cơ bản, sở thích, nguồn khách.
     - Tab 2: **Hành trình KH** (`journey`) — Lịch sử toàn diện từ khi là lead đến khách quen.
     - Tab 3: **Booking** (`bookings`) — Lịch sử các lần chơi, line đã đặt, giờ chơi.
     - Tab 4: **Giao dịch & POS** (`transactions`) — Hóa đơn, chi tiêu, nạp ví.
     - Tab 5: **Thẻ & Hội viên** (`membership`) — Xóa bỏ dải gradient xanh dương ngoại lai, thay bằng xanh lá thương hiệu chuẩn.
     - Tab 6: **Chăm sóc** (`care`) — Nhật ký cuộc gọi, tương tác Zalo, email, mức hài lòng.
     - Tab 7: **Công việc** (`tasks`) — Đầu việc nhân viên gắn với khách hàng này.
     - Tab 8: **Ghi chú** (`notes`) — Ghi chú nội bộ của nhân viên.
     - Tab 9: **Tệp đính kèm** (`attachments`) — Hồ sơ hợp đồng, ảnh CCCD.
  2. Chuẩn hóa modal tạo/sửa lead, cơ hội, chiến dịch: bo góc 5px, padding hợp lý, không tràn lề trên mobile.

### Đợt 3: Chuẩn hóa Module Đặt sân & Lịch Line (Booking)
- **Mục tiêu**: Hoàn thiện `BayTimeline`, `BookingsHub`, `BookingForm` và `WalkInDialog`.
- **Phạm vi file**:
  - `app/ui/BookingsHub.tsx`, `app/ui/BayTimeline.tsx`, `app/ui/Forms.tsx`.
- **Nội dung công việc**:
  1. Căn chỉnh trục thời gian `BayTimeline` cho phép vuốt chạm mượt mà trên mobile.
  2. Đảm bảo form tạo booking `BookingForm` hiển thị rõ ràng trên cả tablet và điện thoại, không che nút Lưu.

### Đợt 4: Chuẩn hóa POS & Các Dialog Phụ
- **Mục tiêu**: Giữ vững Modern POS Flow 4 bước, đồng bộ các dialog phụ.
- **Phạm vi file**:
  - `app/ui/ModernPosFlow.tsx`, `app/ui/session/SplitPay.tsx`, `app/ui/session/PackageRedeem.tsx`, `app/pos-flow.css`.
- **Nội dung công việc**:
  1. Đồng bộ giao diện `SplitPay.tsx` (Tách hóa đơn) về chuẩn bo góc 5px, phân cấp màu tiền rõ ràng.
  2. Kiểm tra `PackageRedeem.tsx` và `SessionPanel.tsx`.

### Đợt 5: Chuẩn hóa Hội viên & Thẻ (Membership)
- **Mục tiêu**: Tối ưu hiển thị danh bạ hội viên trên mobile và popup thẻ số.
- **Phạm vi file**:
  - `app/ui/MembersPanel.tsx`, `app/ui/MemberCard.tsx`, `app/ui/WalletPanel.tsx`.
- **Nội dung công việc**:
  1. Bổ sung chế độ xem chuyển đổi tab (Danh bạ ⇄ Thẻ chi tiết) trên màn hình hẹp (< 768px).
  2. Chuẩn hóa các nút điều chỉnh số dư, báo bận thẻ, nạp ví.

### Đợt 6: Chuẩn hóa Gọi phục vụ (Service Call)
- **Mục tiêu**: Hoàn thiện toàn bộ các modal và cấu hình chuông gọi.
- **Phạm vi file**:
  - `app/ui/ServiceCallDrawer.tsx`, `app/ui/ServiceCallSettingsPanel.tsx`, `app/ui/CallQrSheet.tsx`.
- **Nội dung công việc**:
  1. Đã sửa radio button 18px và text không bị gãy dòng; kiểm tra tiếp form in QR và cài đặt chuông.

### Đợt 7: Chuẩn hóa Giải đấu & Sự kiện (Tournament)
- **Mục tiêu**: Tối ưu bảng nhập điểm và Leaderboard.
- **Phạm vi file**:
  - `app/ui/ContentPanel.tsx`, `app/ui/TournamentScorePanel.tsx`, `app/ui/TournamentBoard.tsx`.
- **Nội dung công việc**:
  1. Bổ sung cố định cột tên VĐV khi cuộn ngang trên bảng 18 hố `TournamentScorePanel`.
  2. Chuẩn hóa drawer tạo và sửa giải đấu trong `ContentPanel`.

### Đợt 8: Chuẩn hóa F&B và Quản lý Kho (StockPanel)
- **Mục tiêu**: Refactor `StockPanel` từ CSS cũ sang chuẩn `.mod-workspace` và `.mod-card`.
- **Phạm vi file**:
  - `app/ui/StockPanel.tsx`, `app/ui/FnbPanel.tsx`.
- **Nội dung công việc**:
  1. Chuyển đổi `.operate-stock-section` sang `.mod-workspace`.
  2. Chuẩn hóa dải KPI kho và modal nhập/xuất kho.

### Đợt 9: Chuẩn hóa Báo cáo & Quản lý Bill cũ
- **Mục tiêu**: Đồng bộ `LegacyBillsPanel` và bảng doanh thu.
- **Phạm vi file**:
  - `app/ui/ReportsPanel.tsx`, `app/ui/LegacyBillsPanel.tsx`.
- **Nội dung công việc**:
  1. Thay thế các class riêng `.lb-*` bằng Design Tokens chuẩn.
  2. Tối ưu bảng báo cáo doanh thu có cuộn ngang rõ ràng trên thiết bị di động.

### Đợt 10: Chuẩn hóa Cài đặt hệ thống (System Settings Hub)
- **Mục tiêu**: Rà soát 10 nhóm cấu hình con.
- **Phạm vi file**:
  - `app/ui/SystemSettingsHub.tsx`, `app/ui/StaffPanel.tsx`, `app/system-settings.css`.
- **Nội dung công việc**:
  1. Rà soát bảng phân quyền nhân viên `StaffPanel`.
  2. Chuẩn hóa các form nhập giá và khung giờ.

### Đợt 11: Rà soát Cổng khách hàng (Customer Portal)
- **Mục tiêu**: Đồng bộ phong cách Dark Premium trên toàn bộ các trang công khai.
- **Phạm vi file**:
  - `app/page.tsx`, `app/bang-gia/`, `app/tai-khoan/`, `app/book/`.

---

## 3. CHECKPOINT & KIỂM THỬ MỖI BƯỚC
- Chạy `pnpm typecheck` (TypeScript 0 errors).
- Chạy `pnpm test` (Toàn bộ 280 unit/integration tests passed).
- Chạy `pnpm build` (Xác nhận build production thành công).
- Báo cáo tiến độ và nghiệm thu với người dùng trước khi chuyển phân hệ.
