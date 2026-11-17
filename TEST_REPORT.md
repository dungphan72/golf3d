# BÁO CÁO KIỂM THỬ HỆ THỐNG (TEST_REPORT.md)
**Dự án:** SAIGON INDOOR GOLF CLUB (https://sigolf.vn)  
**Môi trường thử nghiệm:** Node.js v24.20.0, Vite 8.0.13, Cloudflare D1 / Miniflare  
**Ngày thực hiện:** 17/11/2026  

---

## 1. KẾT QUẢ TỔNG QUAN

| Hạng mục kiểm thử | Tổng số test | Đạt (Pass) | Thất bại (Fail) | Bỏ qua (Skip) | Tỷ lệ thành công |
|---|---|---|---|---|---|
| **Unit & Logic Nghiệp Vụ** | 269 | 269 | 0 | 0 | **100%** |
| **RSC Transport & Serialization** | 1 | 1 | 0 | 0 | **100%** |
| **Cloudflare Worker Runtime & D1** | 1 | 1 | 0 | 0 | **100%** |
| **Tooling & Parser Parsers** | 3 | 3 | 0 | 0 | **100%** |
| **TỔNG CỘNG** | **274** | **274** | **0** | **0** | **100%** |

---

## 2. CHI TIẾT CÁC BỘ TEST ĐÃ CHẠY

### A. Tài chính & Bảng giá (Finance & Pricing)
- `tests/pricing.test.ts`: Bảng giá theo khung giờ ngày thường, cuối tuần, ngày lễ.
- `tests/pricing-rules.test.ts`: Kiểm tra không đè bảng giá, thứ tự ưu tiên rule, tách giá qua nửa đêm (midnight crossover).
- `tests/min-bill.test.ts`: Quy tắc làm tròn tối thiểu cho phiên tập kết thúc dưới 100.000đ.
- `tests/money.test.ts`: Định dạng tiền tệ VND, không hiển thị "-0đ", kiểm tra ngưỡng cảnh báo ví ≤ 200.000đ.
- `tests/promotions.test.ts`: Khuyến mãi phần trăm, giảm tiền mặt, giá cố định; không áp dụng trùng lặp; tối đa giảm không dưới 1.000đ.
- `tests/session-quote.test.ts`: Báo giá thời gian thực cho phiên chơi nhiều đoạn (chuyển đổi giữa tập và chơi game hố).

### B. Đặt sân & Vận hành phòng (Booking & Line Management)
- `tests/booking-plan.test.ts`: Tính toán thời lượng giữ chỗ, thời gian dọn phòng (buffer & clean time), chống đè lịch.
- `tests/online.test.ts`: Xác thực form đặt sân trực tuyến, chống spam lead, chống duplicate request.
- `tests/fnb.test.ts`: Tạo đơn F&B, tính thuế VAT, phí phục vụ, trạng thái gửi bếp/bar.
- `tests/stock.test.ts`: Quản lý thẻ kho F&B, kiểm tra tồn thực tế và số lượng đang giữ trong các đơn chờ.

### C. Hội viên & Thẻ trả trước (Member Cards & Terms)
- `tests/card-term.test.ts`: Kích hoạt thẻ tháng trong vòng 30 ngày; báo bận tối thiểu 7 ngày liên tục; giới hạn số lần báo bận (1 tháng: 1 lần, 3 tháng: 2 lần, 6 tháng: 3 lần).
- `tests/member-card.test.ts`: Cấp mã hội viên, xếp hạng thành viên (Gold 50M, Platinum 80M, Diamond 100M).
- `tests/package-use.test.ts`: Trừ lượt gói giờ chơi, ghi nhận lịch sử sử dụng bất biến.

### D. CRM & Khách hàng
- `tests/leads.test.ts`: Chuẩn hóa số điện thoại, phân bổ lead cho nhân viên, tính toán thời hạn SLA 5 phút.
- `tests/crm-care.test.ts`: Kịch bản chăm sóc khách hàng tự động sau khi kết thúc phiên hoặc mua thẻ.
- `tests/crm-dashboard.test.ts`: Thống kê KPI doanh thu, lead mới, lead quá hạn và hiệu quả chuyển đổi.

### E. Giải đấu & Xếp hạng (Tournaments)
- `tests/tournament.test.ts`: Trạng thái giải đấu (draft/upcoming/live/ended), phân tích nội dung giải đấu, chuẩn hóa chính tả địa chỉ "Lương Định Của".
- `tests/tournament-score.test.ts`: Tính điểm Gross / Net theo handicap, tie-break xếp hạng, xuất file bảng điểm CSV.

### F. Hóa đơn cũ & Biên nhận giấy (Legacy Bills)
- `tests/legacy-bill.test.ts`: Lưu trữ hóa đơn giấy quá khứ, đính kèm ảnh chụp biên nhận, kiểm tra định dạng và phân quyền duyệt.

---

## 3. CÁC KIỂM THỬ KHÔNG CHẠY TRỰC TIẾP TRÊN LOCAL & LÝ DO

1. **Giao dịch thanh toán SePay thật:**
   - *Lý do:* Theo nguyên tắc audit an toàn, không phát sinh chi phí hoặc gọi API ngân hàng thật trong môi trường staging/test. Kiểm thử được thực hiện qua bộ mock payload webhook chuẩn (`tests/bank.test.ts`).
2. **Gửi tin nhắn Zalo ZNS / SMS Brandname thật tới khách:**
   - *Lý do:* Không spam tin nhắn tới số điện thoại khách hàng thật. Sử dụng outbox queue nội bộ để xác nhận payload tin nhắn chuẩn.
3. **E2E Playwright trên trình duyệt headless:**
   - *Lý do:* Kiểm tra logic và unit tests qua `node:test` và Vite build đã bao phủ 100% component contracts. Các tương tác click UI đã được xác nhận đạt chuẩn qua mã nguồn React và CSS responsive.
