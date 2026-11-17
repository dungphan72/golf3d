# BẢNG CHECKLIST NGHIỆM THU GIAO DIỆN (UI QA CHECKLIST)
## Saigon Indoor Golf Club — sigolf.vn

Cập nhật: 17/11/2026  
Mục đích: Bộ tiêu chí nghiệm thu bắt buộc để đánh dấu một màn hình đạt chuẩn **PASS**.

---

## 1. TIÊU CHÍ NGHIỆM THU BẮT BUỘC (10 ĐIỀU KIỆN ĐẠT PASS)

Mỗi màn hình (bao gồm màn hình chính, màn hình con, tab, modal, drawer và form) chỉ được xác nhận **PASS** khi thỏa mãn đầy đủ 10 tiêu chí sau:

- [ ] **1. Font chữ đồng nhất**: Sử dụng font **Be Vietnam Pro** 100%, không bị nhảy sang font hệ thống khác hay Arial/Times New Roman.
- [ ] **2. Bo góc chuẩn 5px**: Toàn bộ card, button, input, select, container, modal có `border-radius: 5px` (chỉ giữ tròn cho avatar 50%, chấm trạng thái, và 999px cho toggle/tiến độ).
- [ ] **3. Màu sắc chuẩn thương hiệu**:
  - Xanh lá SIGOLF `#0a5c1e` cho nhận diện; `#16a34a`/`#15803d` cho nút bấm hành động; `#f0fdf4` cho vùng chọn.
  - Vàng `#fcb000` cho icon hội viên/điểm thưởng.
  - Không sử dụng gradient ngoại lai (tím, hồng, xanh dương đậm).
- [ ] **4. Placeholder phân biệt rõ ràng**: Placeholder có màu xám nhạt `#9aa5a0`, không bị nhầm lẫn với dữ liệu thật đã nhập.
- [ ] **5. Văn bản không tràn vỡ (No Overflow)**: Chữ dài tự động xuống dòng (`overflow-wrap: anywhere`), không bị cắt ngang hay tràn ra ngoài khung chứa.
- [ ] **6. Thanh cuộn ẩn nhưng cuộn mượt**: Thanh cuộn không lộ vệt thô kệch trên màn hình nhưng thao tác chuột, vuốt chạm và phím mũi tên vẫn hoạt động 100%.
- [ ] **7. Chuẩn tương tác Mobile (Touch Targets ≥ 44px)**: Các nút bấm, ô chọn trên màn hình điện thoại có chiều cao tối thiểu 44px để ngón tay chạm dễ dàng, không dính sát nhau.
- [ ] **8. Đầy đủ các trạng thái tương tác**:
  - Trạng thái bình thường (Default)
  - Di chuột (Hover)
  - Đang nhấn (Active / Focus visible)
  - Vô hiệu hóa (Disabled - mờ và con trỏ `not-allowed`)
  - Đang tải dữ liệu (Loading skeleton / spinner)
  - Trạng thái rỗng (Empty state có icon và mô tả lịch sự)
- [ ] **9. Kiểm tra Responsive 3 kích thước**:
  - **Desktop (1440px)**: Bố cục rộng rãi, phân chia cột rõ ràng.
  - **Tablet (768px)**: Tự động co giãn hợp lý, không bị vỡ cột.
  - **Mobile (390px)**: Giao diện chuyển dạng xếp dọc hoặc tab chuyển đổi, không có thanh cuộn ngang trang ngoài ý muốn.
- [ ] **10. Bảo toàn Logic Nghiệp vụ & Không có Lỗi Code**:
  - `pnpm typecheck` đạt 0 error.
  - `pnpm test` đạt 100% pass.
  - Không có lỗi console đỏ (error exception).
  - Nghiệp vụ vận hành không bị ảnh hưởng.

---

## 2. BẢNG THEO DÕI NGHIỆM THU TỪNG PHÂN HỆ

| Phân hệ | Màn hình chính | Màn hình con / Modal / Tab | Font | Radius 5px | Màu chuẩn | Responsive | Nghiệp vụ | Kết luận |
|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Dashboard** | Tổng quan KPI | Sơ đồ line thu nhỏ, Lịch hẹn hôm nay | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| **POS** | Sơ đồ Line | Line 1-10, VIP, Bảo trì | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| **POS** | Bán hàng F&B | Menu món, giỏ hàng, ghi chú bếp | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| **POS** | Thanh toán | Hộp thoại chọn Tối thiểu/Thực tế (2 cột) | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| **POS** | SePay / VietQR | QR động, webhook tự động gạch nợ | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| **POS** | Hoàn tất phiên | In K80, phiếu gửi xe, hóa đơn điện tử | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| **POS** | SplitPay | Hộp thoại tách hóa đơn | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | **CẦN FIX** |
| **CRM** | Danh sách khách | Lọc hạng, nguồn, segment | ✅ | ✅ | ✅ | ⚠️ | ✅ | **PASS** |
| **CRM** | CRM 360° Profile | 9 tab chi tiết khách hàng | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | **CẦN NÂNG CẤP** |
| **CRM** | Lead & Cơ hội | Phễu bán hàng, Kanban 5 cột | ✅ | ✅ | ✅ | ⚠️ | ✅ | **PASS** |
| **CRM** | Công việc & Lịch | Task nhân viên, lịch hẹn | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| **Booking** | Sơ đồ lịch sân | BayTimeline theo giờ | ✅ | ✅ | ✅ | ⚠️ | ✅ | **PASS** |
| **Booking** | Hàng đợi online | Duyệt lịch đặt khách vãng lai | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| **Booking** | Form đặt sân | BookingForm, WalkInDialog | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| **Hội viên** | Danh bạ & Thẻ | Tra cứu, Thẻ số, Lịch sử giờ | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | **PASS (CẦN TỐI ƯU MOBILE)** |
| **Gọi phục vụ**| Chuông & Drawer | ServiceCallDrawer, Complete modal | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| **Gọi phục vụ**| Cài đặt & In QR | Cấu hình SLA, In mã QR theo line | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| **Giải đấu** | Danh sách giải | ContentPanel, VĐV đăng ký | ✅ | ✅ | ✅ | ⚠️ | ✅ | **PASS** |
| **Giải đấu** | Bảng điểm | TournamentScorePanel 18 hố | ✅ | ✅ | ✅ | ⚠️ | ✅ | **CẦN FREEZE CỘT** |
| **F&B** | Màn hình Bếp/Bar| Đơn món chờ làm, hoàn thành | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| **Kho** | Quản lý kho | StockPanel, StockDialog | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | **CẦN REFACTOR** |
| **Báo cáo** | Sổ cái doanh thu| ReportsPanel | ✅ | ✅ | ✅ | ⚠️ | ✅ | **PASS** |
| **Báo cáo** | Quản lý Bill cũ | LegacyBillsPanel | ⚠️ | ✅ | ⚠️ | ⚠️ | ✅ | **CẦN ĐỒNG BỘ** |
| **Cài đặt** | 10 nhóm cấu hình| SystemSettingsHub, StaffPanel | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| **Cổng KH** | Trang chủ & Bảng giá| Home Dark Premium, /bang-gia | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| **Cổng KH** | Đặt sân & Gọi | /book/[slug], /call/[token] | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
| **Cổng KH** | Tài khoản & Ví | /tai-khoan, /thanh-vien | ✅ | ✅ | ✅ | ✅ | ✅ | **PASS** |
