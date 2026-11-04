# Bảng giá chủ cơ sở cung cấp (250 Lương Định Của)

| Khung | GDR / 1 giờ | 9 hố | 18 hố |
|---|---|---|---|
| T2–T6, 08:00–11:00 (giờ vàng) | 100.000đ | 300.000đ | 400.000đ |
| T2–T6, 11:01–23:00 | 250.000đ | 500.000đ | 650.000đ |
| T7, CN & ngày lễ, 08:00–23:00 | 250.000đ | 500.000đ | 650.000đ |
| Nhóm 4 người (cả ngày) | — | 900.000đ | 1.000.000đ |

## Cách map vào mô hình `priceRules` (chưa áp vào dữ liệu thật)
- GDR: theo phòng/giờ, `people = null` (3 dòng: weekday vàng, weekday thường, weekend+holiday).
- 9/18 hố: `people = 1..3` = đơn giá/người × số người (đã chốt: thu trên đầu người).
- Nhóm 4 người: `people = 4`, 900.000đ (9 hố) / 1.000.000đ (18 hố), áp mọi khung giờ và mọi loại ngày.
- 11:00–11:01 coi là 11:00 (giờ vàng kết thúc 11:00, khung thường bắt đầu 11:00).

## Bổ sung từ tài liệu Chiến lược Kinh doanh & Marketing (09/2026)
- Giờ vàng chỉ T2–T6, **không** áp cuối tuần/lễ; giờ vàng được **miễn phí đồ ăn & thức uống**.
- 9/18 hố tính theo **lượt** (không theo giờ); giá nhóm 4 người áp **cả ngày**, không phân biệt giờ vàng.
- Phòng VIP: bảng giá **không có giá riêng** (tài liệu giả định dùng chung; Bên A chưa xác nhận phụ phí phòng).
- Giờ hoạt động 08:00–23:00. Giả định thời lượng: 9 hố ≈ 1,25 giờ, 18 hố ≈ 2,5 giờ (cần đo lại).
- 10 line = 8 tiêu chuẩn + 2 VIP (thiết bị Foresight GC3).
- Tích điểm: mỗi lượt 9 hố hoặc 18 hố = 1 điểm; 10 điểm = 1 lượt miễn phí.
- Combo 9/18 hố: 10 lượt 3tr/5tr (hạn 3 tháng, +1 lượt), 20 lượt 6tr/10tr (hạn 6 tháng, +5 lượt).
- Combo GDR (90 phút/buổi): 10 buổi giờ vàng 1tr (2 tháng); 10 buổi 2tr (3 tháng); 20 buổi 4tr (6 tháng); tháng 3tr; 3 tháng 7,5tr; 6 tháng 13,5tr (giảm 30% → 9,45tr); 12 tháng 25tr (giảm 30% → 17,5tr). Kèm tủ đồ/đỗ xe/lượt 18 hố tùy gói.
- Thẻ VIP: Platinum 20tr/6 tháng (10 lượt 18 hố + 10 GDR, phòng chờ VIP, giảm 20% F&B); Diamond 50tr/12 tháng (20 + 20, phòng chờ VVIP, giảm 30% F&B). Cả hai tặng 1 bia/nước, miễn phí đỗ xe.
- Thanh toán bằng thẻ: giảm 20% F&B.
- Yêu cầu hợp đồng Bên A/Bên B: sổ doanh thu/chi phí thời gian thực và báo cáo chia doanh thu theo kỳ; gói trả trước còn hiệu lực phải truy vết được (điều khoản thoát vốn). Cơ chế chia (MG + bậc thang, hoặc 70/30, 65/35, Corporate/Event thưởng riêng) chưa chốt.
- Mục tiêu chiến lược: CRM tự động sau buổi chơi (Zalo/SMS ngày 1/2/3/5/7, gửi dữ liệu GC3), Happy Hour 13–16h ngày thường giảm 20–25%, Member/Student Hour, Corporate theo block giờ.

## Đã xác nhận (chủ dự án)
- 9/18 hố tính **mỗi người** cho 1–3 người; 4 người dùng giá nhóm.
- Phòng VIP **dùng chung** bảng giá.
- Triển khai: `lib/official-pricing.ts` (mặc định cho cơ sở mới).

## Còn thiếu / cần xác nhận
1. Giá đã gồm VAT/phí dịch vụ hay cộng thêm?
2. Combo/thẻ VIP: dùng được cho cả VIP room? Lượt tặng và "10 tặng 110 + 1 free" (chữ gốc bị lỗi) hiểu là tặng 1 lượt khi mua 10?
