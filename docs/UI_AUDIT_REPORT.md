# BÁO CÁO TOÀN DIỆN VỀ GIAO DIỆN HỆ THỐNG SIGOLF
## Comprehensive UI/UX System-Wide Audit Report

- **Dự án**: Saigon Indoor Golf Club (sigolf.vn)
- **Ngày lập**: 17/11/2026
- **Người thực hiện**: Principal UI/UX Designer, Senior Frontend Architect & QA Engineer
- **Phiên bản codebase**: Git branch `main`

---

## 1. TỔNG QUAN HIỆN TRẠNG KIẾN TRÚC UI

Hệ thống Saigon Indoor Golf Club (`sigolf.vn`) là một nền tảng quản lý CLB Golf 3D đa phân hệ (SaaS & On-premise hybrid), bao gồm:
1. **Quản trị vận hành nội bộ (Back-office & Admin)**: Dashboard, POS Bán hàng, Booking Line, CRM 360°, Hội viên & Thẻ, Bếp/Bar & Kho, Huấn luyện viên, Báo cáo sổ cái, Cài đặt hệ thống.
2. **Cổng dịch vụ khách hàng (Customer-facing Portal)**: Trang chủ Dark Premium Golf, Đặt sân trực tuyến (`/book`), Xem bảng giá công khai (`/bang-gia`), Tin tức & Sự kiện (`/tin-tuc`), Bảng xếp hạng giải đấu live (`/giai-dau`), Gọi phục vụ một chạm (`/call`), Cổng hội viên cá nhân (`/tai-khoan`).

### Thành quả đã đạt được từ các đợt chuẩn hóa trước:
- **Font chữ toàn hệ thống**: 100% phần tử đều kế thừa font **Be Vietnam Pro** thông qua `app/ds-global.css`.
- **Màu sắc nhận diện**: Màu xanh lá chủ đạo `#0a5c1e` (và `#16a34a` cho các hành động POS/nút chính), màu vàng logo `#fcb000` được định nghĩa tập trung trong `app/tokens.css`.
- **Bo góc 5px thống nhất**: Phần lớn card, button, input, select đã tuân thủ bo góc `--radius: 5px`.
- **Đã khắc phục lỗi hiển thị radio/checkbox trên mobile**: Đã loại trừ thẻ radio/checkbox khỏi rule `.app-shell input` có `min-height: 46px`.
- **Tối ưu hóa POS**: Hộp thoại chọn cước tối thiểu 60p vs cước thực tế đã được thu gọn và bố trí song song 2 cột cạnh nhau; thanh tra cứu thành viên tại bước nhận khách đã được ẩn mặc định, chỉ hiển thị danh sách khi người dùng bắt đầu gõ tìm kiếm.

---

## 2. CHI TIẾT CÁC VẤN ĐỀ VÀ KHIẾM KHUYẾT PHÁT HIỆN

Qua đợt audit chi tiết từng component, CSS và cấu trúc DOM thực tế, phát hiện các nhóm vấn đề cần xử lý triệt để:

### Vấn đề 1: CRM 360° Profile chưa đủ 9 Tab chuẩn và còn sót Gradient
- **Vị trí**: `modules/crm/ui/CrmApp.tsx` (dòng 62 và dòng 1735), `app/crm-flow.css` (dòng 1012).
- **Hiện trạng**:
  - `ProfileSubTab` hiện chỉ khai báo 6 tab: `info`, `membership`, `bookings`, `transactions`, `opportunities`, `notes`.
  - Thiếu 4 tab con độc lập theo tiêu chuẩn CRM 360° hoàn chỉnh:
    1. **Hành trình khách hàng (Customer Journey / Timeline)**: Hiện bị dồn chung sang thanh timeline cố định ở cột bên phải, khiến không gian hiển thị bị hẹp và không thể lọc chi tiết theo từng mốc quan trọng.
    2. **Chăm sóc (Care History)**: Chưa có tab quản lý nhật ký tương tác (cuộc gọi, Zalo, gặp mặt trực tiếp, mức độ hài lòng).
    3. **Công việc (Tasks)**: Chưa có tab liệt kê các đầu việc giao cho nhân viên phụ trách gắn riêng với khách hàng này.
    4. **Tệp đính kèm (Attachments)**: Chưa có tab quản lý file tài liệu (hợp đồng hội viên, ảnh CCCD/hộ chiếu, phiếu đăng ký).
  - Trong tab Hội viên (`membership`), thanh tiến độ chi tiêu hạng thẻ còn dùng dải gradient xanh dương ngoại lai: `background: linear-gradient(90deg, #3b82f6 0%, #1d64f2 100%);` — vi phạm nguyên tắc *"Không lạm dụng gradient, sử dụng màu xanh lá thương hiệu SIGOLF"*.

### Vấn đề 2: Module Kho (`StockPanel`) vẫn dùng hệ CSS cũ
- **Vị trí**: `app/ui/StockPanel.tsx`, `app/admin.css`.
- **Hiện trạng**:
  - `StockPanel` sử dụng hệ class cũ từ thời kỳ đầu: `.operate-stock-section`, `.operate-ribbon`, `.operate-kpi-card`, `.info-strip`, `.stock-dialog-inner`.
  - Không đồng bộ với các module mới khác (như `BookingsHub`, `FnbPanel`, `ReportsPanel`, `CoachingPanel`) đang sử dụng chuẩn `.mod-workspace`, `.mod-page-header`, `.mod-kpi-strip`, `.mod-btn-primary`.
  - Hộp thoại nhập xuất kho (`StockDialog`) có kiểu dáng thô, form nhập liệu chưa đồng bộ với chuẩn dialog của hệ thống.

### Vấn đề 3: Phân hệ Quản lý Bill cũ (`LegacyBillsPanel`) dùng CSS riêng biệt
- **Vị trí**: `app/ui/LegacyBillsPanel.tsx`, `app/legacy-bills.css`.
- **Hiện trạng**:
  - Sử dụng toàn bộ tiền tố `.lb-*` độc lập (`.lb-head`, `.lb-card`, `.lb-modal`, `.lb-primary`, `.lb-ghost`).
  - Các nút bấm định nghĩa màu nền cứng `#0a5c1e` thay vì dùng biến token `--clr-primary` hoặc class `.mod-btn-primary`.
  - Modal nhập bill cũ (`.lb-modal`) có kích thước cố định, khi mở trên màn hình điện thoại có nguy cơ tràn lề.

### Vấn đề 4: Modal Tách hóa đơn POS (`SplitPay`) chưa được chuẩn hóa
- **Vị trí**: `app/ui/session/SplitPay.tsx`, `app/pos-flow.css`.
- **Hiện trạng**:
  - Giao diện tách hóa đơn theo từng người chơi còn giữ cấu trúc bảng cũ.
  - Border-radius của các ô nhập số tiền và nút gán món chưa được ép về chuẩn 5px.
  - Nút xác nhận thanh toán từng phần thiếu trạng thái loading rõ ràng khi mạng chậm.

### Vấn đề 5: Module Hội viên (`MembersPanel`) trên Mobile bị chật
- **Vị trí**: `app/ui/MembersPanel.tsx`.
- **Hiện trạng**:
  - Giao diện chia 2 cột (`.members-grid.members-dual-view`): cột trái danh sách tìm kiếm thành viên, cột phải hiển thị hồ sơ chi tiết và thẻ số.
  - Khi xem trên màn hình điện thoại (< 768px), 2 cột xếp đè lên nhau khiến người dùng phải cuộn rất dài mới tới được phần thông tin chi tiết. Cần cơ chế chuyển đổi tab linh hoạt: "Danh sách hội viên" ⇄ "Chi tiết thẻ".

### Vấn đề 6: Bảng nhập điểm giải đấu (`TournamentScorePanel`) trên màn hình nhỏ
- **Vị trí**: `app/ui/TournamentScorePanel.tsx`, `app/tournament-score-admin.css`.
- **Hiện trạng**:
  - Bảng nhập điểm 18 hố có chiều ngang rất lớn (18 cột điểm + tổng + handicap). Khi cuộn ngang trên tablet hoặc iPad tại quầy, cột tên VĐV bị trôi mất, gây khó khăn cho nhân viên nhập điểm trực tiếp.

---

## 3. ĐÁNH GIÁ MỨC ĐỘ RỦI RO & BẢO VỆ HỆ THỐNG

| Hạng mục | Rủi ro | Giải pháp an toàn |
|---|---|---|
| Nghiệp vụ tính tiền POS & Bill | Cực kỳ cao | **Không chạm vào logic tính cước** (`lib/pricing.ts`, `lib/billing.ts`, `lib/club.ts`). Chỉ nâng cấp class CSS và bố cục hiển thị. |
| Dữ liệu Khách hàng & CRM | Cực kỳ cao | **Không thay đổi schema database**; các tab mới (Hành trình, Chăm sóc, Công việc) kết nối trực tiếp với dữ liệu đã có sẵn trong `activeCustomer` (`timeline`, `tasks`, `careHistory`). |
| Phân quyền & Session nhân viên | Cao | Giữ nguyên toàn bộ logic `permissions` và `allowed()` trong `ClubApp.tsx` và `AdminReferenceShell.tsx`. |
| Cổng thanh toán SePay | Cao | Giữ nguyên logic xử lý webhook và polling tự động vừa kiểm thử thành công. |

---

## 4. KẾT LUẬN AUDIT
Hệ thống SIGOLF có nền tảng cốt lõi rất vững chắc và logic nghiệp vụ hoạt động ổn định. Việc cần làm ngay là **chuẩn hóa và đồng bộ các màn hình con cấp 2 và cấp 3** (đặc biệt là 9 tab CRM 360°, StockPanel, SplitPay, và hiển thị mobile) theo đúng Design System thống nhất để mang lại trải nghiệm chuyên nghiệp, đẳng cấp cho thương hiệu Saigon Indoor Golf Club.
