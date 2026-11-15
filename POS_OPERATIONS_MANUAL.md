# HƯỚNG DẪN VẬN HÀNH QUẦY THU NGÂN POS
**Saigon Indoor Golf Club** — Hệ thống Quản trị & Bán hàng 3D Golf

---

## 1. TỔNG QUAN PHÍM TẮT & THIẾT BỊ NGOẠI VI
| Phím tắt / Thao tác | Chức năng | Mô tả chi tiết |
|---|---|---|
| **F4** / Nút `[ Két tiền (F4) ]` | Kích mở két đựng tiền | Kích xung điện tử mở ngăn kéo tiền mặt quầy thu ngân. |
| **F9** / Nút `[ Thanh toán (F9) ]` | Chuyển sang màn hình thanh toán | Kết thúc tính giờ hoặc tạm tính đơn hàng để thu tiền. |
| **Quét Barcode (USB / Bluetooth)** | Tự động thêm món F&B / Phụ kiện | Tự động phát hiện mã vạch SKU, phát tiếng bíp và tăng số lượng vào hóa đơn. |
| **[ 📺 Màn hình khách ]** | Bật màn hình phụ (Dual Screen) | Hiển thị chi tiết đơn hàng và mã VietQR động lớn cho khách hàng quét thanh toán. |
| **[ 🍳 In phiếu Bếp / Bar ]** | In lệnh chế biến máy in K80 | Tách riêng các món F&B / nước uống / đồ ăn nhẹ để gửi bộ phận pha chế/bếp. |
| **[ 🖨️ In hóa đơn ]** | In phiếu thanh toán K80 | In phiếu tính tiền đầy đủ giờ chơi, phụ phí, giảm giá và VAT cho khách. |

---

## 2. QUY TRÌNH VẬN HÀNH HÀNG NGÀY

### Bước 1: Mở ca thu ngân đầu ngày (Shift Opening)
1. Khi đăng nhập vào màn hình **POS Bán hàng**, nếu chưa có ca làm việc, hệ thống sẽ hiện thanh cảnh báo màu vàng: `⚠️ Chưa có ca thu ngân đang mở`.
2. Bấm nút **[ Mở ca thu ngân ngay ]**.
3. Chọn hoặc đặt tên ca (Ví dụ: `Ca sáng (06:00 - 14:00)` hoặc `Ca chiều (14:00 - 22:00)`).
4. Kiểm đếm và nhập số tiền lẻ ban đầu trong két đựng tiền (mặc định: `1.000.000 đ`).
5. Bấm **[ Xác nhận Mở ca ]**. Thanh trạng thái chuyển sang màu xanh lá với tên ca và giờ mở.

---

### Bước 2: Tiếp nhận khách & Khởi tạo lượt chơi (Check-in & Walk-in)
1. Trên **Sơ đồ Line / Phòng (Màn hình 1)**:
   - Các line màu xanh lá `🟢 Đang chơi` (hiển thị thời gian đã chơi).
   - Các line màu xám `⚪ Trống` (sẵn sàng đón khách mới).
   - Các line màu vàng cam `🟡 Đặt trước` (có khách book trước).
   - Các line màu đỏ `🔴 Bảo trì` (đang hiệu chuẩn/sửa chữa).
2. Khi khách đến, bấm vào Line còn trống (ví dụ: `L2`, `L3`):
   - Nhập tên khách hàng và số điện thoại (hệ thống tự động tra cứu hạng thẻ Hội viên: Standard, Silver, Gold, Platinum).
   - Bấm **[ Bắt đầu chơi ]** để bắt đầu bấm giờ tự động.

---

### Bước 3: Thêm dịch vụ, F&B & Quản lý order (Màn hình 2)
1. **Gọi món F&B / Thuê gậy / Mua bóng**:
   - Sử dụng máy quét mã vạch quét trực tiếp lên bao bì sản phẩm (Nước suối, cafe, găng tay, bóng golf...).
   - Hoặc tìm kiếm theo tên/SKU tại thanh tìm kiếm.
   - Hoặc bấm chọn nhanh từ danh mục 4 cột: `F&B`, `Dịch vụ`, `Phụ kiện`, `Combo`.
2. **In phiếu chế biến Bếp / Bar**:
   - Bấm nút **[ 🍳 In phiếu Bếp / Bar ]**.
   - Máy in nhiệt K80 sẽ in ngay phiếu ra món với số phòng, tên món và số lượng để nhân viên phục vụ chuyển sang quầy bar.
3. **Chuyển đổi hình thức chơi**:
   - Khách có thể đổi linh hoạt giữa: `Chơi golf (giờ) GDR` ⇄ `Game 9 hố` ⇄ `Game 18 hố`.
   - Giá tiền được backend tính toán tự động theo bảng giá hiện hành.
4. **Áp dụng Mã giảm giá / Voucher**:
   - Bấm nút **[ + Thêm giảm giá / Voucher ]**.
   - Có thể chọn % giảm nhanh (5%, 10%, 15%, 20%), số tiền giảm trực tiếp (50k, 100k, 200k) hoặc nhập mã voucher (như `VIPGOLF`, `GOLF10`, `KHAI_TRUONG`).

---

### Bước 4: Thanh toán & In hóa đơn (Màn hình 3 & 4)
1. Bấm **[ Thanh toán (F9) ]** để chuyển sang màn hình thu tiền.
2. Chọn hình thức thanh toán của khách:
   - **Tiền mặt**:
     - Chọn mệnh giá khách đưa (500k, 1M, 2M...).
     - Hệ thống tự động tính tiền thừa/thối lại.
     - Bấm **[ Xác nhận thanh toán ]** -> Két tiền tự động bật mở và hóa đơn K80 tự động in ra.
   - **Chuyển khoản VietQR**:
     - Bật **[ 📺 Màn hình khách ]** để khách quét mã VietQR tự động điền đúng số tiền và nội dung đơn hàng.
     - Hệ thống SePay tự động lắng nghe và xác nhận giao dịch trong 3-5 giây.
   - **Thẻ ngân hàng**:
     - Quẹt thẻ tại máy POS ngân hàng. Bấm xác nhận sau khi máy POS in bill thành công.
3. **Hoàn tất**:
   - Bấm **[ In hóa đơn ]** nếu khách cần bản in giấy nhiệt K80.
   - Bấm **[ Gửi hóa đơn (Zalo/Email) ]** để copy nội dung bill chuẩn bị sẵn gửi khách qua Zalo OA.

---

### Bước 5: Chốt ca & Bàn giao cuối ngày (Shift Closing & Z-Report)
1. Tại thanh trạng thái ca thu ngân ở đầu trang, bấm **[ Đóng & Bàn giao ca ]**.
2. Kiểm đếm thực tế:
   - Tổng tiền mặt thực tế trong két.
   - Tổng tiền chuyển khoản VietQR theo sao kê.
   - Tổng tiền quẹt thẻ ngân hàng theo bill tổng kết POS.
   - Nhập ghi chú bàn giao (nếu có tiền thừa/thiếu hoặc chênh lệch).
3. Bấm **[ Xác nhận Đóng & Bàn giao ca ]**:
   - Hệ thống tự động kết toán sổ quỹ tài chính.
   - **Tự động in Phiếu Báo cáo Kết ca (Z-Report) K80** bao gồm: Quỹ đầu ca, Doanh thu trong ca theo từng kênh, Chênh lệch tiền mặt, và khu vực ký tên giữa người giao ca và người nhận ca.
