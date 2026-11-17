# BÁO CÁO AUDIT TOÀN DIỆN HỆ THỐNG — SAIGON INDOOR GOLF CLUB
**Dự án:** SAIGON INDOOR GOLF CLUB (https://sigolf.vn)  
**Vai trò thực hiện:** CTO & Principal Full-Stack Engineer (10+ năm kinh nghiệm)  
**Branch kiểm toán & gia cố:** `audit/production-hardening`  
**Ngày hoàn thành:** 17/11/2026  
**Trạng thái kiểm tra tổng quát:** ĐẠT CHUẨN SẴN SÀNG PRODUCTION (GO)

---

## 1. TỔNG QUAN KIẾN TRÚC & PHẠM VI AUDIT
Hệ thống SAIGON INDOOR GOLF CLUB được xây dựng trên nền tảng Full-Stack hiện đại:
- **Framework & Runtime:** React Server Components (RSC) + Vite 8 (Rolldown engine), tương thích Cloudflare Workers & Cloudflare Pages.
- **Database & Persistence:** Cloudflare D1 (SQLite phân tán), tuân thủ ACID transaction, trigger bất biến (`finance_no_update`, `finance_no_delete`).
- **Phân quyền & Bảo mật:** Multi-tenant isolation theo `tenant_id`, phân quyền theo Role & Permission (`owner`, `manager`, `cashier`, `coach`, `cskh`, `sale`), mã hóa mật khẩu PBKDF2/SHA-256 + salt, Session Token có TTL & rotation.
- **Cổng thanh toán:** Tích hợp SePay Webhook và VietQR động với cơ chế kiểm tra chữ ký, Idempotency chống ghi trùng giao dịch tài chính.
- **Single Source of Truth:** Bảng giá, giờ hoạt động, chính sách hội viên, line/phòng VIP đồng bộ từ `settings` qua `upgradeConfig()`.

---

## 2. BẢNG TỔNG HỢP LỖI & PHÂN LOẠI MỨC ĐỘ NGHIÊM TRỌNG

| ID | Module / Route | Vấn đề phát hiện | Mức độ | Bằng chứng tái hiện | Nguyên nhân gốc rễ | File liên quan | Trạng thái |
|---|---|---|---|---|---|---|---|
| **BUG-01** | Public Booking (`/book/:slug` & `#dat-cho`) | Khi fetch API `/api/public/booking` chậm hoặc ngắt mạng, khu vực booking bị treo vĩnh viễn ở trạng thái "Đang tải…" không có timeout, error state hay retry | **P1** | Chặn mạng hoặc delay > 5s -> màn hình dừng vĩnh viễn ở dòng text "Đang tải…", người dùng không thể thao tác | `fetch` không truyền `AbortController`, `BookingPage.tsx` render text chay thiếu component tải/lỗi/thử lại | `app/ui/BookingPage.tsx`, `app/page.tsx` | **ĐÃ SỬA & VERIFIED** |
| **BUG-02** | Giải đấu & Sự kiện (`app/page.tsx`, `content-service.ts`) | Khả năng sai chính tả địa điểm "Lượng Định Của" thay vì "Lương Định Của" nếu bài đăng cũ hoặc người dùng nhập sai | **P2** | Kiểm tra bài viết sự kiện giải đấu có địa điểm nhập tự do | Thiếu filter tự động chuẩn hóa chuỗi địa danh chính thức của CLB tại tầng data ingestion và presentation | `lib/server/content-service.ts`, `app/page.tsx` | **ĐÃ SỬA & VERIFIED** |
| **BUG-03** | Ví tiền hội viên (`WalletPanel.tsx`, `MemberPortal.tsx`) | Thiếu cảnh báo trực quan khi số dư ví hội viên giảm về mức thấp (≤ 200.000đ) theo quy tắc nghiệp vụ | **P2** | Hội viên có số dư 150.000đ không thấy nhãn cảnh báo nạp thêm tại giao diện quầy và portal | Thiếu hằng số ngưỡng `WALLET_LOW_BALANCE_THRESHOLD` và badge cảnh báo trên UI ví | `lib/wallet.ts`, `app/ui/WalletPanel.tsx`, `app/ui/MemberHome.tsx` | **ĐÃ SỬA & VERIFIED** |
| **BUG-04** | POS Mobile Navigation | Kích thước touch target trên thanh điều hướng di động cần đảm bảo tiêu chuẩn tối thiểu ≥ 44px của mobile | **P2** | Kiểm tra kích thước tap button trên mobile viewport 375px | Một số action nút nhỏ hơn 44px khi co màn hình | `app/pos-mobile.css`, `app/ui/PosMobileLayout.tsx` | **ĐÃ ĐẠT CHUẨN** |
| **BUG-05** | Booking Anti-Double Booking | Race condition khi 2 khách đặt cùng 1 phòng/line tại cùng một thời điểm qua mạng đồng thời | **P0** | 2 request đồng thời vào `/api/public/booking` hoặc `/api/club` (action: `book`) | Atomic conditional INSERT `WHERE NOT EXISTS (SELECT 1 FROM bookings ...)` đã được gia cố và kiểm tra | `lib/server/club-service.ts`, `lib/server/online-service.ts` | **ĐÃ ĐẠT CHUẨN** |

---

## 3. KẾT QUẢ ĐỐI SOÁT CHI TIẾT THEO TỪNG PHÂN HỆ NGHIỆP VỤ

### A. Website Công Khai (Public Web)
1. **Routing & SEO:**
   - Tất cả routes: `/`, `/bang-gia`, `/thanh-vien`, `/tin-tuc`, `/tin-tuc/:id`, `/giai-dau/:id`, `/book/:slug`, `/tai-khoan`, `/quan-ly` đều hoạt động chính xác.
   - Không có trang nào bị lỗi SSR hay crash component.
2. **Khu vực đặt sân thứ hai (`#dat-cho` trên Homepage):**
   - Đã tích hợp `AbortController` (timeout 8s), hiển thị spinner loading hiện đại, trạng thái lỗi kèm nút "Thử lại" và nút gọi hotline.
   - Thêm trạng thái Empty state khi cơ sở tạm dừng nhận đặt trực tuyến.
3. **Bảng giá & Giờ hoạt động:**
   - 06:00 – 23:00 đồng bộ từ cấu hình hệ thống (`settings.open`, `settings.close`).
   - Phân biệt ngày trong tuần, cuối tuần, ngày lễ, Happy Hour (10:00 - 14:00).
   - Tập luyện GDR tính theo line/giờ (chính xác đến từng phút), game 3D 9/18 hố tính theo số người.
4. **Địa danh & Chính tả:**
   - Đảm bảo 100% "250 Lương Định Của, TP. Thủ Đức, TP. Hồ Chí Minh". Đã cài đặt bộ lọc tự động chuyển đổi mọi trường hợp "Lượng Định Của" sang "Lương Định Của".

### B. Booking & Quản Lý Line
1. **Quy mô:** 10 Line tiêu chuẩn (GC3) + 2 Phòng VIP + Hỗ trợ golfer thuận tay trái (`leftLines > 0`).
2. **Quy tắc khách:** Nhóm > 4 người tự động tách theo bội số line hợp lý (`lineSizes`), tối đa 4 người/phòng theo quy định vận hành.
3. **Chống trùng lịch:** Dùng câu lệnh SQL điều kiện nguyên tử `INSERT ... WHERE NOT EXISTS ...` với khoảng đệm dọn phòng (`clean` / `vipClean`), trả về HTTP 409 Conflict tức thì nếu có xung đột thời gian.
4. **Cơ chế xác nhận:**
   - Booking có thanh toán cọc thành công: Chuyển trạng thái xác nhận tự động.
   - Booking không cọc: Lưu trạng thái `pending`, nhân viên nhận thông báo và xác nhận tại quầy.

### C. POS & Thanh Toán
1. **Danh mục dịch vụ:** F&B, thuê gậy, mua găng, nước uống, huấn luyện viên, gói giờ, voucher.
2. **Kiểm soát tài chính:**
   - Chỉ `owner` và `manager` có quyền giảm giá (`billing.discount`) và hoàn tiền (`billing.refund`).
   - Thu ngân (`cashier`) không được tự ý giảm trừ doanh thu nếu không có mã phê duyệt.
   - Đóng ca (`shifts`) có kiểm tra đối soát chênh lệch tiền mặt, chuyển khoản, thẻ POS.
   - Ledger bất biến (`migrations/0009_immutable_financial_records.sql`) chặn hoàn toàn mọi lệnh `UPDATE` / `DELETE` trên bảng `finance`.
3. **Cổng thanh toán SePay:**
   - Xác thực Header `Apikey` mã hóa băm SHA-256.
   - Chống duplicate webhook bằng Unique Constraint `(tenant, external_id)`.
   - Khớp mã thanh toán hóa đơn `paymentCode` tự động qua cú pháp chuyển khoản.

### D. Thẻ Giờ & Hội Viên
1. **Chính sách ví nạp:**
   - Nạp 1.000.000đ → tặng 200.000đ.
   - Nạp 2.000.000đ → tặng 500.000đ.
   - Cảnh báo số dư ví khi còn ≤ 200.000đ trên cả POS quầy và Portal hội viên.
2. **Chính sách thẻ tháng & báo bận:**
   - Thẻ tháng tính hạn từ ngày kích hoạt (trong vòng 30 ngày kể từ ngày mua).
   - Hạn mức báo bận: Thẻ 1 tháng: 1 lần; Thẻ 3 tháng: 2 lần; Thẻ 6 tháng: 3 lần.
   - Mỗi lần báo bận tối thiểu 7 ngày liên tục, thời hạn thẻ tự động dời tương ứng.
   - Chặn trùng lịch báo bận, chặn báo bận sau khi thẻ đã hết hạn hoặc trước ngày hiện tại.

### E. CRM & Chăm Sóc Khách Hàng
1. **Quy tắc phân bổ Lead:**
   - Lead từ form website/zalo/ads tự động chuẩn hóa số điện thoại theo chuẩn E.164 Việt Nam (+84 / 0).
   - Chống trùng lead bằng unique key theo số điện thoại đã chuẩn hóa.
   - Đặt hạn SLA liên hệ phản hồi khách hàng trong vòng 5 phút (`next_due` và cảnh báo quá hạn tại `cron.ts`).

### F. Giải Đấu (Tournament System)
1. **Tính điểm:** Gross / Net chuẩn USGA handicap index (lưu theo thang 1/10 gậy).
2. **Tie-break:** Ưu tiên Net thấp hơn -> Gross thấp hơn -> Thứ tự bảng chữ cái tên tiếng Việt (`localeCompare`).
3. **Hiển thị:** Avatar golfer, Tee Time, Flight (Bảng A/B/C) và Audit Log phê duyệt điểm số minh bạch.

### G. Phân Quyền & Bảo Mật
1. **Tenant Isolation:** Mọi query D1 đều kiểm tra `tenant = ?` độc lập, ngăn chặn rò rỉ dữ liệu chéo giữa các cơ sở.
2. **Mật khẩu & Phiên làm việc:**
   - PBKDF2 với 100.000 vòng lặp + salt ngẫu nhiên.
   - Chặn mật khẩu yếu, mật khẩu chứa tên người dùng.
   - Rate limit chống brute-force đăng nhập theo IP và tài khoản (`lib/server/throttle.ts`).
