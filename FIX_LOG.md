# NHẬT KÝ SỬA ĐỔI HỆ THỐNG (FIX_LOG.md)
**Dự án:** SAIGON INDOOR GOLF CLUB (https://sigolf.vn)  
**Branch:** `audit/production-hardening`  
**Ngày cập nhật:** 17/11/2026  

---

## 1. TỔNG QUAN CÁC SỬA ĐỔI GIA CỐ SẢN XUẤT

Trong đợt audit và hardening lần này, đội ngũ kỹ thuật tập trung xử lý các điểm nghẽn trải nghiệm người dùng, đảm bảo tính nhất quán dữ liệu và tuân thủ các quy tắc nghiệp vụ đã phê duyệt mà không làm thay đổi thiết kế hay gây gián đoạn hệ thống.

---

## 2. CHI TIẾT CÁC BẢN SỬA ĐỔI (PATCHES)

### Bản sửa 1: Khu vực Booking thứ hai trên Website (Loading Timeout, Error & Retry)
- **Vấn đề:** Khi mạng yếu hoặc server xử lý chậm, khu vực booking tại trang chủ (`#dat-cho`) và trang đặt sân (`/book/:slug`) hiển thị text tĩnh "Đang tải…" vĩnh viễn, không có cơ chế timeout, không có nút thử lại.
- **File thay đổi:** `app/ui/BookingPage.tsx`
- **Nội dung thay đổi:**
  - Tích hợp `AbortController` với thời gian chờ tối đa 8.000ms (8 giây). Nếu quá 8s, tự động ngắt và báo lỗi rõ ràng.
  - Thêm state `retryCount` cho phép bấm nút "Thử lại" để tải lại dữ liệu mà không cần F5 toàn bộ trang.
  - Thiết kế loading state với spinner xoay hiện đại theo phong cách dark theme của hệ thống.
  - Thêm trạng thái rỗng (Empty state) thân thiện khi chi nhánh tạm thời chưa mở dịch vụ đặt trước trực tuyến, kèm nút hotline gọi trực tiếp.
  - Thêm nút gọi hotline nhanh bên cạnh nút "Thử lại" khi gặp lỗi.
- **Kiểm thử trước/sau:**
  - *Trước:* Mất kết nối dẫn đến treo màn hình trắng với chữ "Đang tải…".
  - *Sau:* Sau 8s tự động hiển thị thông báo lỗi, có nút "Thử lại" và nút gọi hotline hoạt động mượt mà.

---

### Bản sửa 2: Chuẩn hóa chính tả địa chỉ giải đấu & sự kiện
- **Vấn đề:** Khách hàng hoặc quản trị viên có thể nhập sai tên đường thành "Lượng Định Của" thay vì "Lương Định Của".
- **File thay đổi:** `lib/server/content-service.ts`, `app/page.tsx`, `tests/tournament.test.ts`
- **Nội dung thay đổi:**
  - Thêm hàm `sanitizePlace(place)` tự động chuẩn hóa regex `/Lượng\s*Định\s*Của/gi` thành `Lương Định Của` tại schema validate `postInput`.
  - Thêm hàm `cleanPost(p)` tự động lọc trường `place` trước khi trả dữ liệu về public API (`publicContent`, `publicPost`).
  - Thêm bộ lọc hiển thị tại `app/page.tsx:403`.
  - Bổ sung unit test kiểm tra tự động trong `tests/tournament.test.ts`.
- **Kiểm thử trước/sau:**
  - *Trước:* Chuỗi có chứa "Lượng Định Của" sẽ hiển thị nguyên văn lỗi chính tả lên website.
  - *Sau:* Mọi chuỗi chứa "Lượng Định Của" đều được tự động chuẩn hóa thành "Lương Định Của".

---

### Bản sửa 3: Cảnh báo số dư ví hội viên thấp (≤ 200.000đ)
- **Vấn đề:** Theo chính sách hội viên, ví nạp tiền cần có cảnh báo trực quan khi số dư giảm về mức ≤ 200.000đ để nhắc nhở nạp thêm.
- **File thay đổi:** `lib/wallet.ts`, `app/ui/WalletPanel.tsx`, `app/ui/MemberHome.tsx`, `tests/money.test.ts`
- **Nội dung thay đổi:**
  - Khai báo hằng số `WALLET_LOW_BALANCE_THRESHOLD = 200_000` và hàm `isWalletLow(balance)` tại `lib/wallet.ts`.
  - Hiển thị badge cảnh báo `⚠️ Số dư ví thấp (≤ 200.000đ)` tại quầy POS (`WalletPanel.tsx`) khi số dư ví ≤ 200.000đ.
  - Hiển thị chú thích cảnh báo `(thấp)` tại widget số dư ví trên màn hình trang chủ hội viên (`MemberHome.tsx`).
  - Bổ sung unit test trong `tests/money.test.ts`.
- **Kiểm thử trước/sau:**
  - *Trước:* Số dư ví dù còn dưới 200.000đ vẫn chỉ hiển thị số tiền mà không có cảnh báo.
  - *Sau:* Khi số dư ≤ 200.000đ, huy hiệu cảnh báo màu đỏ/cam nổi bật xuất hiện lập tức.

---

## 3. KIỂM TRA ĐỐI CHIẾU BUILD & TYPE CHECK
- `pnpm typecheck`: **0 lỗi** (TypeScript kiểm tra nghiêm ngặt toàn bộ codebase).
- `pnpm test`: **274/274 bài test ĐẠT** (100% pass, tăng 2 test mới so với ban đầu).
- `pnpm build`: **Build production thành công** với Vite 8 / Rolldown, 0 lỗi cú pháp hay import.
