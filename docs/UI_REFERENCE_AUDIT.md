# Kiểm kê ảnh thiết kế tham chiếu

Thư mục: `hinh-anh/thiet-ke` (8 ảnh, tất cả đọc được). Ngày kiểm kê: 14/11/2026.
Nhánh làm việc: `ui-redesign` (checkpoint `a26d93a` trước khi bắt đầu đợt này).

## 1. Bảng ảnh tham chiếu

| Ảnh tham chiếu | Màn hình | Thiết bị | Component cần xây dựng | Trạng thái hiện tại |
|---|---|---|---|---|
| `home-desk.png` | Trang chủ sigolf.vn | Desktop | Header + menu, Hero (3 điểm nổi bật + chấm trang), thanh Đặt sân nhanh, dải điểm mạnh, Dịch vụ nổi bật (4 thẻ), Bảng giá, khối Hội viên, Không gian & Tiện ích, Giải đấu & Sự kiện, Tin tức, Footer | Đã có bản sáng, tối giản (hero chữ + ảnh, bảng giá, form đặt chỗ). Chưa có thanh đặt nhanh, dịch vụ nổi bật, khối hội viên, giải đấu, tin tức. |
| `home-mobile.png` | Trang chủ PWA | Mobile | Header thương hiệu + chuông + tài khoản, Hero, lưới 8 lối tắt (Đặt sân, Mua gói giờ, Hội viên, Giải đấu, Huấn luyện, Tìm bạn chơi, Cửa hàng, Khác), banner hội viên, Lịch đặt sân của tôi, Dịch vụ nổi bật, Bottom Navigation | Chưa có. Trang chủ mobile là bản desktop thu nhỏ; thanh dưới `mnav` chỉ có chữ. |
| `POS.png` | POS | Desktop | Sidebar + topbar, lời chào, 4 thẻ chỉ số, sơ đồ Line/Phòng, panel hóa đơn bên phải | Đã làm (đợt trước). Còn lệch: nút thừa trên line "Trống". |
| `POS-mobile.png` | POS | Mobile | Header xanh, tab POS/Line/Đơn hàng/Lịch đặt/Thêm, lưới L1–L10 + VIP, hóa đơn, lưới sản phẩm F&B có ảnh và tìm kiếm, Tạm tính / Thanh toán, bottom nav | Chưa làm riêng; hiện là bản desktop co lại (panel POS thành màn hình đầy). |
| `CRM.png` | CRM | Desktop | Sidebar xanh navy, 5 thẻ chỉ số, Pipeline 5 cột, biểu đồ hiệu quả, Hoạt động gần đây, Khách hàng gần đây (bảng + bộ lọc), Công việc hôm nay | Chưa làm. CRM hiện có đủ chức năng nhưng giao diện cũ (`modules/crm/ui`, ~6.500 dòng). |
| `CRM-mobile.png` | CRM | Mobile | Header xanh dương, tab, thẻ chỉ số, Pipeline dạng mũi tên, Khách hàng gần đây, Hoạt động, Công việc, nút Tạo Lead nổi, bottom nav | Chưa làm. |
| `hoi-vien.png` | Hội viên | Desktop | Sidebar riêng, thẻ hội viên có QR, banner, lối tắt, Lịch đặt sắp tới, Gói giờ (thanh tiến độ), Quyền lợi, Điểm thưởng, Hoạt động, Ưu đãi | Chưa làm. Hiện có `/tai-khoan` (cổng khách hàng, đã đổi màu) và `/thanh-vien` (bảng gói). |
| `hoi-vien-mobile.png` | Hội viên | Mobile | Thẻ hội viên + QR, ví / giờ còn lại / điểm, Quyền lợi, Gói hội viên (cuộn ngang), Lịch sử & giao dịch, bottom nav | Chưa làm. |

Ảnh mới nhất theo từng màn hình: mỗi màn hình có đúng một ảnh desktop và một ảnh mobile, không bị trùng phiên bản. `POS.png` (22:28) cũ hơn `POS-mobile.png` (22:45) nhưng hai ảnh khác thiết bị nên không thay thế nhau.

## 2. Thành phần dùng chung rút ra từ ảnh

- Màu: xanh lá thương hiệu (đậm `#0a5c1e`, nền nhạt `#e8f3ea`), vàng logo `#fcb000` cho hành động chính và biểu tượng nhấn. CRM dùng xanh navy/xanh dương cho khung riêng của CRM (sidebar, header mobile).
- Chữ: Be Vietnam Pro xuyên suốt, tiêu đề đậm, giá tiền/giờ/trạng thái in đậm.
- Thẻ: nền trắng, viền xám nhạt, bo 16–20px, bóng rất nhẹ. Chỉ số có icon tròn pastel.
- Chip trạng thái: chấm màu + chữ (Trống xanh nhạt, Đang chơi xanh đậm, Đặt trước vàng, Bảo trì đỏ).
- Điều hướng: sidebar (desktop), bottom navigation 5 mục với mục hiện tại là viên thuốc (mobile).

## 3. Đối chiếu giao diện hiện tại và ảnh thiết kế

| Module | Giao diện hiện tại | Ảnh thiết kế | Chênh lệch | Ưu tiên |
|---|---|---|---|---|
| Trang chủ desktop | Sáng, tối giản, hero chữ + ảnh phòng, bảng giá, form đặt | `home-desk.png` | Thiếu thanh đặt nhanh, dải điểm mạnh, 4 dịch vụ nổi bật, khối hội viên, Không gian & Tiện ích; hero chưa có 3 điểm nổi bật | Cao |
| Trang chủ mobile | Bản desktop co lại, `mnav` chữ thuần | `home-mobile.png` | Chưa có lưới lối tắt, lịch đặt của tôi, banner hội viên, icon bottom nav | Cao |
| POS desktop | Panel POS docked, sơ đồ line | `POS.png` | Line "Trống" còn nút Vào chơi/Đặt trước; chưa có trạng thái Bảo trì | Cao |
| POS mobile | Bản desktop co lại | `POS-mobile.png` | Cần bố cục riêng: lưới line + hóa đơn + lưới sản phẩm | Cao |
| CRM desktop/mobile | Giao diện cũ, đầy đủ chức năng | `CRM.png`, `CRM-mobile.png` | Toàn bộ khung và dashboard | Trung bình |
| Hội viên | `/tai-khoan`: đăng nhập + thẻ; `/thanh-vien`: bảng gói | `hoi-vien*.png` | Thẻ có QR, thanh tiến độ giờ, lịch sử, quyền lợi | Trung bình |

## 4. Mâu thuẫn và khoảng trống dữ liệu (cần quyết định, chưa tự xử lý)

1. **Giải đấu & Sự kiện, Tin tức, Tìm bạn chơi, Cửa hàng:** hệ thống chưa có bảng dữ liệu hay API cho các mục này. Theo quy tắc "không dùng số liệu minh họa", các khối này **không hiển thị** cho tới khi có nguồn dữ liệu thật. Cần quyết định: thêm module nội dung (tin, sự kiện) hay giữ ẩn.
2. **Bãi đậu xe 1.500 m², tủ đồ, phòng nghỉ:** không có trong dữ liệu; không đưa vào dải điểm mạnh.
3. **Trạng thái Bảo trì của line:** hệ thống chưa có trạng thái này. Thêm cần đổi mô hình dữ liệu và luồng đặt line, nên chưa làm.
4. **F&B trên POS:** hiện đơn món đi qua luồng bếp/bar (mới → đang làm → sẵn sàng → đã phục vụ) và chỉ cộng vào phiếu khi đã phục vụ. Ảnh POS mobile có lưới sản phẩm bấm là thêm thẳng vào hóa đơn. Hai cách khác nhau về nghiệp vụ. Phương án an toàn: dùng lưới sản phẩm làm giao diện chọn món nhưng vẫn gửi đơn qua luồng hiện có.
5. **Hạng hội viên (Gold/Platinum/Diamond):** hiện `lib/member-card.ts` suy hạng từ tên gói, chưa có cấu hình Admin riêng. Yêu cầu "lấy từ cấu hình Admin" cần thêm cấu hình hạng; trước mắt giao diện chỉ hiển thị hạng nếu khách có gói tương ứng, không hardcode.
6. **QR thẻ hội viên:** thẻ hiện có mã dạng `HV-XXXXXXXX` dùng cho quét tại quầy. Chỉ hiển thị QR của mã thật này, không dùng QR giả.
7. **Chỉ số tăng/giảm (+12%, +28%…) trong CRM/POS:** cần số liệu kỳ trước; chỉ hiển thị khi tính được từ dữ liệu thật.
8. **Ảnh người, huấn luyện viên, giải đấu trong ảnh mẫu:** là ảnh minh họa, không dùng làm nội dung chính thức; dùng ảnh thật trong `hinh-anh/` hoặc trạng thái rỗng.
9. **Chữ in hoa toàn bộ và font:** đợt trước dùng Archivo/Barlow Condensed cho tiêu đề; yêu cầu mới là Be Vietnam Pro xuyên suốt, nên đã thống nhất lại.
