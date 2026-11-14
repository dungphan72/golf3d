# Bảng giá chính thức — SaiGon Indoor Golf Club (250 Lương Định Của)

Bảng giá mới nhất (11/2026) thay thế toàn bộ bảng giá cũ. Giờ hoạt động 06:00–23:00.

## Giá theo line

Theo giờ: đ/line/giờ · 9 và 18 hố: đ/người.

| Khung | Loại line | Theo giờ | 9 hố | 18 hố |
|---|---|---|---|---|
| T2–T6 · Giờ vàng 06:00–11:00 | Tiêu chuẩn | 100.000 | 250.000 | 350.000 |
| | VIP | 150.000 | 350.000 | 450.000 |
| T2–T6 · 11:10–23:00 | Tiêu chuẩn | 150.000 | 300.000 | 400.000 |
| | VIP | 200.000 | 400.000 | 500.000 |
| T7, CN & ngày lễ | Tiêu chuẩn | 200.000 | 350.000 | 450.000 |
| | VIP | 250.000 | 450.000 | 550.000 |

## Nạp ví (ưu đãi nạp tiền)
- Nạp 1.000.000đ được tặng 200.000đ (ví +1.200.000đ).
- Nạp 2.000.000đ được tặng 500.000đ (ví +2.500.000đ).
- Số tiền khác (từ 100.000đ) nhận mức tặng của bậc cao nhất đã đạt; dưới 1.000.000đ không có tặng.
- Chỉ tiền thật nạp vào được ghi vào sổ ca; tiền tặng là số dư miễn phí. Ví trả trọn một phiếu đã kết thúc (cả tiền golf và F&B), không trả một phần.
- Triển khai: `lib/wallet.ts`, migration `0026`, thao tác `wallet-topup` / `wallet-pay`.

## Thẻ tháng — không giới hạn giờ chơi
1 tháng 5.000.000đ · 3 tháng 14.000.000đ · 6 tháng 25.000.000đ. Thời hạn tính từ ngày kích hoạt thẻ.

Đặt lịch: golfhub.cloud · Hotline 0877 834 888.

## Cách map vào hệ thống
- `lib/official-pricing.ts`: quy tắc giá (mặc định cho cơ sở mới và bảng giá công khai khi chưa lưu gì).
- `lib/official-packages.ts`: thẻ tháng (thẻ giờ đã bỏ, thay bằng ưu đãi nạp ví).
- 9/18 hố tính theo **người**; nhóm N người trả N × đơn giá (không còn giá nhóm 4 người riêng).
- Phòng VIP có giá riêng.

## Giả định chờ chủ cơ sở xác nhận
1. Bảng giá ghi khung thường bắt đầu 11:10; hệ thống tính 11:00–23:00 là khung thường để không có khoảng trống không có giá.
2. Poster không ghi giá bán thẻ giờ: tạm đặt 150.000đ × số giờ mua (10 giờ = 1.500.000đ, 20 giờ = 3.000.000đ), thẻ không thời hạn.
3. Thẻ tháng áp dụng cho cả phòng VIP (poster không nói khác).
4. VAT và phí dịch vụ cộng thêm trên giá niêm yết (cấu hình trong Cài đặt: `vat`, `fee`).
