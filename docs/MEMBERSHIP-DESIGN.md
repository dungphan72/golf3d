# Thiết kế: khách hàng, gói trả trước, thẻ VIP, tích điểm

Nguồn: [PRICING.md](PRICING.md) (bảng giá + combo + thẻ VIP đã chốt). Đây là phần **chạm vào sổ tiền đang chạy dữ liệu thật**, nên cần duyệt trước khi viết migration.

## 1. Dữ liệu mới (chỉ thêm bảng, không sửa bảng cũ)
- `customers(id, tenant, name, phone, note, points, created)` — SĐT duy nhất theo cơ sở. Booking cũ vẫn giữ tên/SĐT dạng chữ; khớp theo SĐT khi gắn khách.
- `package_types(id, tenant, kind, name, price, uses, bonus_uses, valid_days, perks, active)` — danh mục: combo 9/18 hố, combo GDR (theo buổi 90 phút hoặc theo tháng), thẻ VIP Platinum/Diamond. `kind`: `holes9`, `holes18`, `gdr_sessions`, `gdr_period`, `vip_card`.
- `customer_packages(id, tenant, customer_id, type_id, price_paid, expires, status)` — một lần mua; snapshot giá/quyền lợi tại thời điểm bán.
- `package_balances(package_id, kind, remaining)` — số dư theo loại lượt (một thẻ VIP có cả lượt 18 hố lẫn buổi GDR).
- `package_ledger(id, tenant, package_id, kind, delta, booking_id, actor, note, created)` — **bất biến** (trigger chặn sửa/xóa như `finance_entries`); số dư = tổng ledger.
- `loyalty_ledger(...)` — +1 điểm mỗi lượt 9/18 hố đã thanh toán; 10 điểm đổi 1 lượt miễn phí (ghi âm điểm khi đổi).

## 2. Hai điểm chạm vào sổ tiền — cần anh duyệt
**a) Bán gói = tiền vào quầy.** Hiện `finance_entries.kind` chỉ cho `payment | cash_in | cash_out` và `payment` bắt buộc gắn booking. Cần migration mới:
- thêm `kind = 'package_sale'` (gắn `package_id`, phương thức cash/transfer/card), tính vào đối soát ca giống `payment`;
- viết lại các trigger `finance_validate_entry`, `shifts_validate_close` (tổng kỳ vọng chuyển khoản/thẻ phải cộng cả `package_sale`);
- giữ nguyên bất biến sổ cái và các test hiện có; thêm test SQL cho đối soát có bán gói.
Phương án thay thế "ghi bán gói riêng, không vào sổ ca" sẽ làm tiền mặt quầy không khớp → **không đề xuất**.

**b) Dùng lượt gói để thanh toán booking.** Booking `finished` có tiền golf > 0 nhưng khách trả bằng lượt: ghi `package_ledger` âm 1 lượt, booking chuyển `paid` với `payment='package'`, **không** tạo dòng tiền (tiền đã thu lúc bán gói). Phần F&B/VAT/phí vẫn thu bình thường, nên cần tách `golf_amount` khỏi `food_total` (đã có cột). Quy tắc: lượt 9/18 hố chỉ trừ cho đúng loại; GDR trừ theo buổi hoặc không giới hạn trong kỳ.

## 3. Quy tắc nghiệp vụ đã có trong tài liệu chiến lược
- Combo 10 lượt: tặng 1; 20 lượt: tặng 5. Hạn 3/6 tháng. Hết hạn thì không dùng được (không hoàn tiền) — cần anh xác nhận.
- Giảm 20% F&B khi thanh toán thẻ; thẻ VIP Platinum 20% / Diamond 30% F&B, tặng 1 bia/nước, miễn phí đỗ xe. (F&B giảm là bước sau.)
- Giảm 30% GDR 6/12 tháng (giá niêm yết sau giảm 9,45tr / 17,5tr).
- Dùng được cho cả phòng VIP (đã xác nhận).

## 4. Câu hỏi cần anh trả lời
1. Duyệt phương án 2a (thêm `package_sale` vào sổ ca) và 2b (dùng lượt → booking `paid`, không phát sinh tiền golf)?
2. Gói hết hạn: mất lượt còn lại, hay gia hạn/hoàn theo tay quản lý?
3. Một khách mua nhiều gói cùng loại: dùng gói sắp hết hạn trước (đề xuất)?
4. Có cho chuyển nhượng lượt giữa khách không (mặc định: không)?
5. Điểm thưởng: tính trên lượt đã trả bằng tiền, bằng gói, hay cả hai? (đề xuất: cả hai).

## 5. Kế hoạch triển khai sau khi duyệt
1. Migration 0005 (bảng mới + trigger sổ cái, không sửa dữ liệu cũ) + test SQL.
2. Service: khách hàng, danh mục gói, bán gói (vào sổ ca), dùng lượt, điểm.
3. Quyền: `member.view`, `member.sell`, `member.adjust` (cashier bán/dùng; chỉ manager điều chỉnh).
4. Giao diện: tab Hội viên (tìm khách theo SĐT, bán gói, số dư, lịch sử), nút "Trả bằng gói" ở phiếu thanh toán.
5. Backup trước khi áp migration lên dữ liệu thật.

## 6. Trạng thái triển khai (đã làm)
- Migration `0005_ancient_bloodstrike.sql` (bảng mới + `finance_entries.package_id` + trigger). Áp dụng lên D1 **sau khi backup**; chỉ thêm bảng/cột/trigger, không sửa dữ liệu cũ.
- Sổ ca: bán gói là dòng `payment` có `package_id` (tính vào chuyển khoản/thẻ/tiền mặt và đối soát ca); thu booking trừ phần golf đã trả bằng gói.
- API `/api/members`; quyền `member.view`/`member.sell`/`member.adjust` (thu ngân, CSKH, sale bán gói; chỉ quản lý/chủ điều chỉnh, sửa danh mục gói).
- Giao diện: mục **Hội viên** (nạp danh mục theo bảng giá chính thức một lần, bán gói, đổi điểm, điều chỉnh) và nút **Trả bằng gói** trong hộp thanh toán.
- Giá GDR 6/12 tháng dùng giá sau giảm 30% (9,45tr / 17,5tr) và tặng 6/12 lượt 18 hố; gói theo tháng/kỳ dùng "không giới hạn" (99.999 lượt) trong hạn.
- Chưa làm: giảm F&B theo thẻ/gói, tặng bia/nước, hết hạn tự gia hạn, chuyển nhượng lượt, đặt online gắn khách.
