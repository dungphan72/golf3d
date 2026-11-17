# BẢNG KIỂM KÊ TOÀN BỘ GIAO DIỆN HỆ THỐNG SIGOLF
## UI Route & Component Inventory — Saigon Indoor Golf Club (sigolf.vn)

Cập nhật: 17/11/2026  
Người thực hiện: Principal UI/UX Designer & Senior Frontend Architect  
Tiêu chuẩn thiết kế: Google Workspace / Material Design 3, Brand Green `#0a5c1e`, Font Be Vietnam Pro, Border-radius 5px toàn hệ thống.

---

### BẢNG KIỂM KÊ CHI TIẾT CÁC PHÂN HỆ VÀ MÀN HÌNH

| STT | Route / View | Phân hệ | Màn hình & Màn hình con | Desktop | Mobile | Vấn đề phát hiện | Trạng thái |
|:---:|:---|:---|:---|:---:|:---:|:---|:---:|
| **1** | **BẢNG ĐIỀU KHIỂN (DASHBOARD)** | | | | | | |
| 1.1 | `/quan-ly?view=dashboard` | Dashboard | Tổng quan KPI vận hành & Dòng tiền | ✅ Đạt | ✅ Đạt | Biểu đồ KPI cần kiểm tra tương thích khi kích thước màn hình hẹp (390px) | Cần rà soát chi tiết |
| 1.2 | `/quan-ly?view=dashboard` | Dashboard | Sơ đồ Line thu nhỏ & Trạng thái phòng | ✅ Đạt | ✅ Đạt | Màu trạng thái bảo trì cần đồng bộ với POS flow | Cần đồng bộ |
| 1.3 | `/quan-ly?view=dashboard` | Dashboard | Danh sách lịch hẹn hôm nay & Bộ lọc | ✅ Đạt | ⚠️ Co hẹp | Nút thao tác nhanh trên mobile dễ bị tràn chữ | Cần tinh chỉnh |
| 1.4 | `/quan-ly?view=dashboard` | Dashboard | Hoạt động gần đây (Audit stream) | ✅ Đạt | ✅ Đạt | Định dạng thời gian cần chuẩn hóa format | Đạt |
| **2** | **QUẢN HỆ KHÁCH HÀNG (CRM 360°)** | | | | | | |
| 2.1 | `/quan-ly?view=crmx` | CRM | Danh sách khách hàng (Tab: Customers) | ✅ Đạt | ⚠️ Chật | Cột bảng danh sách trên mobile cần cuộn ngang mượt hoặc chuyển dạng card | Cần tối ưu mobile |
| 2.2 | `/quan-ly?view=crmx` | CRM | Modal Thêm khách hàng mới | ✅ Đạt | ⚠️ Tràn | Input trên mobile cần đảm bảo touch target và không bị dính sát mép | Cần chuẩn hóa |
| 2.3 | `/quan-ly?view=crmx` | CRM | Modal Chỉnh sửa hồ sơ khách | ✅ Đạt | ✅ Đạt | Border-radius một số nút phụ chưa chuẩn 5px | Cần sửa |
| 2.4 | `/quan-ly?view=crmx` | CRM | Modal Gắn tag phân loại khách | ✅ Đạt | ✅ Đạt | Khoảng cách các chip tag cần theo thang 4px/8px | Cần tinh chỉnh |
| 2.5 | `/quan-ly?view=crmx` | CRM | **CRM 360° Profile — Tab 1: Tổng quan** | ✅ Đạt | ⚠️ Co cụm | Layout chia 2 cột bị chật trên tablet 768px | Cần responsive tốt hơn |
| 2.6 | `/quan-ly?view=crmx` | CRM | **CRM 360° Profile — Tab 2: Hành trình KH** | ⚠️ Thiếu | ⚠️ Thiếu | Chưa có tab Hành trình riêng, đang gộp chung timeline góc phải | **Cần bổ sung theo chuẩn** |
| 2.7 | `/quan-ly?view=crmx` | CRM | **CRM 360° Profile — Tab 3: Booking** | ✅ Đạt | ✅ Đạt | Đã có danh sách lịch sử chơi, cần thêm chi tiết từng line | Hoàn thiện |
| 2.8 | `/quan-ly?view=crmx` | CRM | **CRM 360° Profile — Tab 4: Giao dịch & POS**| ✅ Đạt | ⚠️ Tràn | Bảng giao dịch thiếu phân trang khi khách có nhiều đơn | Cần thêm phân trang |
| 2.9 | `/quan-ly?view=crmx` | CRM | **CRM 360° Profile — Tab 5: Thẻ & Hội viên** | ⚠️ Gradient | ⚠️ Gradient | Thanh tiến độ còn dùng gradient xanh dương thay vì màu chuẩn | **Cần đổi màu thương hiệu** |
| 2.10 | `/quan-ly?view=crmx` | CRM | **CRM 360° Profile — Tab 6: Chăm sóc** | ⚠️ Thiếu | ⚠️ Thiếu | Lịch sử chăm sóc (Call/Zalo/Email) chưa tách tab độc lập | **Cần bổ sung tab chuẩn** |
| 2.11 | `/quan-ly?view=crmx` | CRM | **CRM 360° Profile — Tab 7: Công việc** | ⚠️ Thiếu | ⚠️ Thiếu | Nhiệm vụ gắn riêng với khách chưa có tab quản lý riêng | **Cần bổ sung tab chuẩn** |
| 2.12 | `/quan-ly?view=crmx` | CRM | **CRM 360° Profile — Tab 8: Ghi chú** | ✅ Đạt | ✅ Đạt | Khung ghi chú nhanh hoạt động tốt | Đạt |
| 2.13 | `/quan-ly?view=crmx` | CRM | **CRM 360° Profile — Tab 9: Tệp đính kèm** | ⚠️ Thiếu | ⚠️ Thiếu | Chưa có khu vực upload và xem file hợp đồng/CCCD/ảnh | **Cần bổ sung theo chuẩn** |
| 2.14 | `/quan-ly?view=crmx` | CRM | Quản lý Lead tiềm năng (Tab: Leads) | ✅ Đạt | ⚠️ Chật | Bảng Kanban 5 cột cần cuộn ngang mượt mà trên mobile | Cần tối ưu mobile |
| 2.15 | `/quan-ly?view=crmx` | CRM | Modal Tạo Lead mới & Chuyển đổi Lead | ✅ Đạt | ✅ Đạt | Form nhập đầy đủ | Đạt |
| 2.16 | `/quan-ly?view=crmx` | CRM | Cơ hội & Bán hàng (Tab: Opportunities) | ✅ Đạt | ✅ Đạt | Bảng cơ hội cần hiển thị rõ giai đoạn theo badge | Cần chuẩn hóa badge |
| 2.17 | `/quan-ly?view=crmx` | CRM | Đặt sân & Lịch hẹn (Tab: Appointments) | ✅ Đạt | ✅ Đạt | Đồng bộ với module Booking | Đạt |
| 2.18 | `/quan-ly?view=crmx` | CRM | Danh sách Công việc (Tab: Tasks) | ✅ Đạt | ✅ Đạt | Badge trạng thái quá hạn cần dùng màu đỏ chuẩn | Đạt |
| 2.19 | `/quan-ly?view=marketing` | CRM | Chiến dịch Marketing & Ưu đãi | ✅ Đạt | ⚠️ Tràn | Modal tạo chiến dịch dài, cần scroll nội bộ | Cần sửa |
| **3** | **ĐẶT SÂN & QUẢN LÝ LINE (BOOKING)** | | | | | | |
| 3.1 | `/quan-ly?view=bookings` | Booking | Sơ đồ lịch sân theo dòng thời gian (BayTimeline) | ✅ Đạt | ⚠️ Tràn ngang | Trục thời gian cần hỗ trợ touch swipe mượt trên điện thoại | Cần tối ưu mobile |
| 3.2 | `/quan-ly?view=bookings` | Booking | Danh sách Booking (BookingList) | ✅ Đạt | ✅ Đạt | Bộ lọc trạng thái (Đã đặt, Đang chơi, Đã xong) đầy đủ | Đạt |
| 3.3 | `/quan-ly?view=bookings` | Booking | Hàng đợi đặt sân Online (OnlineRequests) | ✅ Đạt | ✅ Đạt | Nút Duyệt/Hủy có dialog xác nhận | Đạt |
| 3.4 | `/quan-ly?view=bookings` | Booking | Danh sách Hóa đơn & Thu tiền (InvoiceList) | ✅ Đạt | ✅ Đạt | Trạng thái chưa thanh toán nổi bật | Đạt |
| 3.5 | `/quan-ly?view=bookings` | Booking | Yêu cầu gọi hỗ trợ từ line (SupportList) | ✅ Đạt | ✅ Đạt | Realtime polling chuông gọi | Đạt |
| 3.6 | Modal BookingForm | Booking | Form tạo/sửa booking sân | ✅ Đạt | ✅ Đạt | Chọn khung giờ 15p, tính giá ước tính chính xác | Đạt |
| 3.7 | Modal WalkInDialog | Booking | Form mở phiên chơi trực tiếp tại line | ✅ Đạt | ✅ Đạt | Gọn gàng, đã ẩn gợi ý thành viên khi chưa gõ tìm kiếm | Đạt |
| **4** | **POS & BÁN HÀNG TẠI QUẦY (MODERN POS FLOW)** | | | | | | |
| 4.1 | `/quan-ly?view=rooms` | POS | Bước 1: Sơ đồ Line (Line 1-10, VIP, Bảo trì) | ✅ Đạt | ✅ Đạt | Trực quan, thẻ line phản ánh đúng giờ chơi và cước | Đạt |
| 4.2 | `/quan-ly?view=rooms` | POS | Bước 2: Giỏ hàng & Chọn món F&B | ✅ Đạt | ✅ Đạt | Lọc danh mục, tìm kiếm món, ghi chú cho bếp | Đạt |
| 4.3 | `/quan-ly?view=rooms` | POS | Bước 3: Hóa đơn & Chọn phương thức thanh toán | ✅ Đạt | ✅ Đạt | Hộp thoại chọn Tối thiểu/Thực tế đã xếp 2 ô bên cạnh nhau gọn gàng | Đạt |
| 4.4 | `/quan-ly?view=rooms` | POS | Bước 4: Hoàn tất & In phiếu | ✅ Đạt | ✅ Đạt | In K80, phiếu gửi xe, QR hóa đơn điện tử | Đạt |
| 4.5 | Modal SessionPanel | POS | Drawer thao tác chi tiết phiên đang chạy | ✅ Đạt | ⚠️ Co cụm | Một số nút thao tác phụ bị nhỏ trên màn hình 390px | Cần tăng touch target |
| 4.6 | Modal TransferPanel | POS | Hộp thoại thanh toán SePay / VietQR tự động | ✅ Đạt | ✅ Đạt | Đã kiểm tra webhook tự động gạch nợ thành công | Đạt |
| 4.7 | Modal SplitPay | POS | Hộp thoại Tách hóa đơn nhiều khách | ✅ Đạt | ⚠️ Tràn | Giao diện cũ, border-radius và font chưa đồng bộ hoàn toàn | **Cần chuẩn hóa** |
| 4.8 | Modal PackageRedeem | POS | Hộp thoại Đổi giờ thẻ hội viên trừ vào bill | ✅ Đạt | ✅ Đạt | Khớp với số dư thẻ hội viên | Đạt |
| 4.9 | Modal FinanceDialog | POS | Mở ca bán hàng / Đóng ca / Nộp tiền mặt | ✅ Đạt | ✅ Đạt | Sổ quỹ bất biến, xác thực mật khẩu an toàn | Đạt |
| **5** | **HỘI VIÊN & THẺ (MEMBERSHIP)** | | | | | | |
| 5.1 | `/quan-ly?view=members` | Membership | Danh bạ hội viên & Tra cứu thẻ | ✅ Đạt | ⚠️ Chật | Cột tra cứu bên trái chiếm nhiều diện tích trên màn hình dọc | Cần xếp dạng tab trên mobile |
| 5.2 | `/quan-ly?view=members` | Membership | Chi tiết thẻ & Lịch sử sử dụng gói | ✅ Đạt | ✅ Đạt | Hiển thị số giờ còn lại, hạn sử dụng, hạng Gold/Platinum | Đạt |
| 5.3 | `/quan-ly?view=members` | Membership | Báo bận thẻ hội viên (Absence Modal) | ✅ Đạt | ✅ Đạt | Quy định tối đa số lần báo bận theo gói | Đạt |
| 5.4 | `/quan-ly?view=members` | Membership | Thẻ hội viên kỹ thuật số & QR check-in | ✅ Đạt | ✅ Đạt | Hiển thị mã QR và thông tin thẻ sang trọng | Đạt |
| 5.5 | `/quan-ly?view=members` | Membership | Danh mục gói thẻ đang bán (Tab: Catalog) | ✅ Đạt | ✅ Đạt | Hiển thị gói giờ và gói tháng | Đạt |
| 5.6 | Modal WalletPanel | Membership | Nạp ví & Lịch sử biến động số dư ví | ✅ Đạt | ✅ Đạt | Xác nhận nạp tiền minh bạch | Đạt |
| **6** | **GỌI PHỤC VỤ & QR (SERVICE CALL)** | | | | | | |
| 6.1 | ServiceCallBanner | Service Call | Dải thông báo chuông gọi trên thanh tiêu đề | ✅ Đạt | ✅ Đạt | Nhấp nháy cảnh báo đỏ khi quá thời gian SLA | Đạt |
| 6.2 | ServiceCallDrawer | Service Call | Ngăn kéo danh sách yêu cầu gọi đang mở | ✅ Đạt | ✅ Đạt | Phân loại gọi nhân viên, gọi món, kỹ thuật gậy | Đạt |
| 6.3 | Modal CompleteResolution | Service Call | Popup xác nhận hoàn tất cuộc gọi | ✅ Đạt | ✅ Đạt | Đã sửa radio button 18px chuẩn và chữ không bị gãy dòng | Đạt |
| 6.4 | ServiceCallSettingsPanel | Service Call | Cài đặt SLA, âm báo chuông, phân quyền | ✅ Đạt | ✅ Đạt | Lưu cấu hình tự động | Đạt |
| 6.5 | Modal CallQrSheet | Service Call | Tạo & In mã QR gọi phục vụ cho từng line | ✅ Đạt | ✅ Đạt | Hỗ trợ in trực tiếp và tải ảnh SVG/PNG | Đạt |
| **7** | **GIẢI ĐẤU & NỘI DUNG (TOURNAMENT & CONTENT)** | | | | | | |
| 7.1 | `/quan-ly?view=content` | Tournament | Danh sách giải đấu & sự kiện (Tab: Tournaments)| ✅ Đạt | ⚠️ Tràn | Thẻ giải đấu trên mobile hơi dài, cần rút gọn khoảng cách | Cần tinh chỉnh |
| 7.2 | `/quan-ly?view=content` | Tournament | Trình tạo & chỉnh sửa giải đấu (Drawer) | ✅ Đạt | ⚠️ Nút nhỏ | Form nhập nhiều tab, cần thanh cuộn nội bộ rõ ràng | Cần chuẩn hóa |
| 7.3 | `/quan-ly?view=content` | Tournament | Danh sách VĐV đăng ký thi đấu | ✅ Đạt | ✅ Đạt | Đã có duyệt VĐV và xuất file | Đạt |
| 7.4 | TournamentScorePanel | Tournament | Bảng nhập điểm & Livescore giải đấu | ✅ Đạt | ⚠️ Chật | Bảng 18 hố cần tính năng freeze cột tên VĐV khi cuộn | Cần tối ưu UX bảng |
| 7.5 | TournamentBoard | Tournament | Bảng xếp hạng Leaderboard Gross & Net | ✅ Đạt | ✅ Đạt | Tính điểm Handicap chính xác | Đạt |
| 7.6 | `/quan-ly?view=content` | Content | Quản lý tin tức & bài viết (Tab: News) | ✅ Đạt | ✅ Đạt | Thêm, sửa, đăng bài, chọn ảnh bìa | Đạt |
| **8** | **SẢN PHẨM, F&B & QUẢN LÝ KHO (FNB & STOCK)** | | | | | | |
| 8.1 | `/quan-ly?view=fnb` | F&B | Màn hình Bếp/Bar (Tab: Kitchen) | ✅ Đạt | ✅ Đạt | Danh sách món đang chờ làm, hoàn thành | Đạt |
| 8.2 | `/quan-ly?view=fnb` | F&B | Thực đơn & Bảng giá món (Tab: Menu) | ✅ Đạt | ✅ Đạt | Phân nhóm Đồ ăn, Đồ uống, Khác | Đạt |
| 8.3 | Modal ItemEditor | F&B | Form thêm & sửa món | ✅ Đạt | ✅ Đạt | Nhập giá, giá vốn, nhóm, ảnh | Đạt |
| 8.4 | `/quan-ly?view=fnb` | Stock | Theo dõi tồn kho & thẻ kho (Tab: Stock) | ⚠️ Cũ | ⚠️ Cũ | Đang dùng CSS cũ `.operate-stock-section` thay vì `.mod-workspace` | **Cần refactor giao diện** |
| 8.5 | Modal StockDialog | Stock | Nhập hàng, Xuất hàng, Đặt ngưỡng tối thiểu | ⚠️ Cũ | ⚠️ Cũ | Dialog cũ chưa dùng chung modal chuẩn | **Cần chuẩn hóa modal** |
| **9** | **HUẤN LUYỆN VIÊN (COACHING)** | | | | | | |
| 9.1 | `/quan-ly?view=coaching` | Coaching | Lịch huấn luyện & Đặt buổi học với HLV | ✅ Đạt | ✅ Đạt | Theo mẫu chuẩn `.mod-workspace` | Đạt |
| 9.2 | `/quan-ly?view=coaching` | Coaching | Danh sách HLV & Thêm mới HLV | ✅ Đạt | ✅ Đạt | Phân quyền coach rõ ràng | Đạt |
| **10** | **BÁO CÁO & ĐỐI SOÁT (REPORTS & FINANCE)** | | | | | | |
| 10.1 | `/quan-ly?view=reports` | Reports | Báo cáo doanh thu sổ cái (Tab: Revenue) | ✅ Đạt | ⚠️ Tràn | Bảng doanh thu nhiều cột cần hỗ trợ xem tốt trên tablet/mobile | Cần tối ưu responsive |
| 10.2 | `/quan-ly?view=reports` | Reports | Quản lý hóa đơn cũ (Tab: Legacy Bills) | ⚠️ Riêng | ⚠️ Riêng | Đang dùng class `.lb` hoàn toàn tách biệt, chưa đồng bộ design tokens | **Cần đồng bộ token** |
| 10.3 | Modal Nhập bill cũ | Reports | Form nhập & tải ảnh hóa đơn giấy gốc | ⚠️ Riêng | ⚠️ Riêng | Form modal dùng CSS riêng (`.lb-modal`), border-radius cần kiểm tra | Cần chuẩn hóa |
| **11** | **CÀI ĐẶT HỆ THỐNG (SYSTEM SETTINGS HUB)** | | | | | | |
| 11.1 | `/quan-ly?view=settings` | Settings | Nhóm 1: Cơ sở & Khu vực (Line 1-10, VIP, Bảo trì) | ✅ Đạt | ✅ Đạt | Cấu hình line, trạng thái hoạt động | Đạt |
| 11.2 | `/quan-ly?view=settings` | Settings | Nhóm 2: Giờ hoạt động & Khung giờ mở cửa | ✅ Đạt | ✅ Đạt | Hỗ trợ mở cửa xuyên đêm và ngày lễ | Đạt |
| 11.3 | `/quan-ly?view=settings` | Settings | Nhóm 3: Giá & Thuế (PriceEditor, VAT, Giảm giá) | ✅ Đạt | ✅ Đạt | Ma trận giá linh hoạt sáng/chiều/tối/cuối tuần | Đạt |
| 11.4 | `/quan-ly?view=settings` | Settings | Nhóm 4: Gói trả trước & Thẻ (PackageEditor) | ✅ Đạt | ✅ Đạt | Tạo gói giờ, thẻ tháng, quyền lợi | Đạt |
| 11.5 | `/quan-ly?view=settings` | Settings | Nhóm 5: Gọi phục vụ & QR (ServiceCallSettings) | ✅ Đạt | ✅ Đạt | Đã chuẩn hóa | Đạt |
| 11.6 | `/quan-ly?view=settings` | Settings | Nhóm 6: Thanh toán & SePay (SepaySettings) | ✅ Đạt | ✅ Đạt | Cấu hình tài khoản ngân hàng, API key SePay | Đạt |
| 11.7 | `/quan-ly?view=settings` | Settings | Nhóm 7: Nhân viên & Phân quyền (StaffPanel) | ✅ Đạt | ⚠️ Chật | Bảng danh sách nhân viên cần chuẩn hóa nút sửa/khóa | Cần tinh chỉnh |
| 11.8 | `/quan-ly?view=settings` | Settings | Nhóm 8: Tích hợp (Zalo OA, Webhook, SMS) | ✅ Đạt | ✅ Đạt | Kết nối hệ thống ngoài | Đạt |
| 11.9 | `/quan-ly?view=settings` | Settings | Nhóm 9: Sao lưu & Nhật ký kiểm toán (AuditPanel) | ✅ Đạt | ✅ Đạt | Nhật ký bất biến hành động nhân viên | Đạt |
| **12** | **CỔNG KHÁCH HÀNG & LANDING (CLIENT-FACING)** | | | | | | |
| 12.1 | `/` | Portal | Trang chủ khách hàng (Home Dark Premium) | ✅ Đạt | ✅ Đạt | Giao diện tối sang trọng, responsive tốt | Đạt |
| 12.2 | `/bang-gia` | Portal | Bảng giá dịch vụ công khai | ✅ Đạt | ✅ Đạt | Đã chuyển sang Dark Premium Golf | Đạt |
| 12.3 | `/tin-tuc` & `[id]` | Portal | Danh sách tin tức & Trang chi tiết bài viết | ✅ Đạt | ✅ Đạt | Có form đăng ký tham gia sự kiện | Đạt |
| 12.4 | `/book/[slug]` | Portal | Đặt sân trực tuyến không cần cài app | ✅ Đạt | ✅ Đạt | Bước chọn ngày, giờ, line, xác nhận | Đạt |
| 12.5 | `/call/[token]` | Portal | Màn hình gọi phục vụ của khách tại line | ✅ Đạt | ✅ Đạt | Giao diện khách một chạm, không cần đăng nhập | Đạt |
| 12.6 | `/tai-khoan` (Đăng nhập) | Portal | Form Đăng nhập & Đăng ký hội viên | ✅ Đạt | ✅ Đạt | Đồng bộ phong cách Dark Premium | Đạt |
| 12.7 | `/tai-khoan` (Đã login) | Portal | Cổng thông tin hội viên cá nhân (MemberPortal) | ✅ Đạt | ✅ Đạt | Thẻ số, số dư giờ, lịch đặt sân, ví | Đạt |
| 12.8 | `/thanh-vien` | Portal | Trang quyền lợi và mua gói hội viên | ✅ Đạt | ✅ Đạt | Thông tin chi tiết các hạng Gold/Platinum | Đạt |
| 12.9 | `/giai-dau/[id]` | Portal | Bảng xếp hạng và kết quả giải đấu trực tiếp | ✅ Đạt | ✅ Đạt | Khách xem live scoring mượt mà | Đạt |

---

### TỔNG KẾT KIỂM KÊ
- **Tổng số màn hình / màn hình con / view được kiểm kê**: **52 màn hình**
- **Đã kiểm tra và vận hành tốt (PASS)**: **41 màn hình (78.8%)**
- **Cần tinh chỉnh responsive / khoảng cách / touch target (REVIEW)**: **6 màn hình (11.5%)**
- **Cần refactor / bổ sung tab con theo chuẩn (NEEDS REFACTOR)**: **5 màn hình (9.7%)**:
  1. *CRM 360° Profile*: Bổ sung 4 tab con còn thiếu (*Hành trình KH, Chăm sóc, Công việc, Tệp đính kèm*), xóa dải gradient xanh dương trong tab Hội viên.
  2. *POS Modal SplitPay*: Chuẩn hóa border-radius 5px và màu sắc thẻ chia tiền.
  3. *Kho (StockPanel & StockDialog)*: Chuyển đổi từ CSS cũ `.operate-stock-section` sang Design System chuẩn `.mod-workspace` & `.mod-card`.
  4. *Quản lý Bill cũ (LegacyBillsPanel)*: Đồng bộ các class `.lb` với Design Tokens toàn hệ thống.
  5. *Hội viên (MembersPanel - Mobile)*: Chuyển cột tra cứu bên trái thành dạng tab chuyển đổi khi xem trên điện thoại.
