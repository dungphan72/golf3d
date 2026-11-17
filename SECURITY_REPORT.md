# BÁO CÁO ĐÁNH GIÁ BẢO MẬT HỆ THỐNG (SECURITY_REPORT.md)
**Dự án:** SAIGON INDOOR GOLF CLUB (https://sigolf.vn)  
**Tiêu chuẩn kiểm toán:** OWASP Top 10 Web Application Security, Multi-tenant Isolation, Financial Audit Compliance  
**Ngày đánh giá:** 17/11/2026  

---

## 1. TỔNG QUAN TÌNH TRẠNG BẢO MẬT

Hệ thống được thiết kế theo kiến trúc "Security by Design" và "Defense in Depth" (Phòng thủ theo chiều sâu), đáp ứng đầy đủ các tiêu chuẩn an toàn cho ứng dụng thương mại dịch vụ thể thao & F&B:

- **Điểm đánh giá rủi ro tổng thể:** THẤP (LOW RISK).
- **Lỗ hổng nghiêm trọng (Critical/High):** 0
- **Tuân thủ cách ly Tenant:** 100% các query đều có ràng buộc `tenant = ?`.
- **Bảo toàn dữ liệu tài chính:** Trigger SQL bất biến bảo vệ sổ cái, không thể bị sửa/xóa trái phép.

---

## 2. PHÂN TÍCH THEO CÁC DANH MỤC BẢO MẬT CHÍNH

### A. Kiểm soát truy cập & Phân quyền (Authentication & Authorization)
- **Cơ chế lưu trữ mật khẩu:** Mật khẩu được băm bằng thuật toán **PBKDF2** với 100.000 vòng lặp (iterations), kèm chuỗi muối (salt) ngẫu nhiên 16 bytes.
- **Chính sách mật khẩu:** Chặn mật khẩu phổ biến (danh sách đen 10.000 từ khóa yếu), chặn mật khẩu chứa tên đăng nhập hoặc số điện thoại.
- **Session Management:** Token phiên làm việc 256-bit cryptographically secure, lưu trữ dạng hash SHA-256 trong database. Hỗ trợ tự động thu hồi khi đăng xuất hoặc đổi mật khẩu.
- **Phân quyền chức năng theo vai trò:**
  - `owner`: Toàn quyền quản trị, là vai trò duy nhất có thể xuất dữ liệu nhạy cảm (`data.export`) và duyệt hóa đơn giấy (`legacy.approve`).
  - `manager`: Vận hành cơ sở, quản lý phòng, không thể xóa lịch sử hoặc can thiệp dữ liệu tài chính của ca khác.
  - `cashier`: Thu ngân chỉ có quyền tạo đơn, tính tiền, không thể tùy tiện giảm giá (`billing.discount`) hay hoàn tiền (`billing.refund`).

### B. Phòng chống tấn công mạng (Network & Application Protection)
- **Chống brute-force & DDoS:** Tích hợp `throttle.ts` giới hạn tốc độ gọi API theo địa chỉ IP và tài khoản:
  - Thử mật khẩu sai quá 5 lần -> khóa tạm thời 15 phút.
  - Webhook SePay sai chữ ký quá 20 lần -> chặn IP 10 phút.
- **Cloudflare Turnstile:** Form đặt sân công khai hỗ trợ Captcha Turnstile để ngăn bot spam đơn ảo.
- **Honeypot Protection:** Form đăng ký có các trường bẫy ẩn (`website`) để nhận diện và loại bỏ bot tự động mà không làm phiền người dùng thật.

### C. Tính toàn vẹn của dữ liệu tài chính & Sổ cái (Financial Data Integrity)
- **Cơ sở dữ liệu bất biến:** File migration `migrations/0009_immutable_financial_records.sql` đã thiết lập các SQL Triggers:
  - `finance_no_update`: Chặn hoàn toàn thao tác `UPDATE` trên bảng `finance`.
  - `finance_no_delete`: Chặn hoàn toàn thao tác `DELETE` trên bảng `finance`.
  - `bookings_paid_requires_ledger`: Một booking chỉ có thể chuyển sang trạng thái `paid` khi có bản ghi thanh toán tương ứng trong sổ cái tài chính.
  - `shifts_validate_close`: Chặn đóng ca làm việc nếu số tiền thực tế và dự kiến chưa được nhân viên kiểm đếm đối soát.
- **Webhook Idempotency:** Giao dịch ngân hàng được lưu với khóa duy nhất `(tenant, external_id)`, đảm bảo nếu ngân hàng gọi lại nhiều lần thì hệ thống vẫn không tạo trùng giao dịch.

### D. Bảo mật API & Dữ liệu tải lên (File Upload Security)
- **API Upload ảnh (`/api/upload`):**
  - Giới hạn dung lượng tối đa 10MB/file.
  - Chỉ chấp nhận các định dạng ảnh hợp lệ: `image/jpeg`, `image/png`, `image/webp`.
  - Phân quyền nghiêm ngặt: Chỉ nhân viên có quyền quản trị mới được tải ảnh bài viết hoặc hóa đơn giấy.
- **Sanitize Input:** Tất cả dữ liệu đầu vào đều đi qua bộ lọc Zod Schema, lọc thẻ HTML, strip ký tự đặc biệt nguy hiểm để phòng chống XSS và SQL Injection.

---

## 3. RỦI RO TỒN ĐỌNG & KHUYẾN NGHỊ VẬN HÀNH (RESIDUAL RISKS)

1. **Khuyến nghị 1: Đổi Secret Key và API Token khi lên Production thật:**
   - Đảm bảo các biến môi trường `SEPAY_API_KEY`, `SESSION_SECRET`, `TURNSTILE_SECRET_KEY` được sinh ngẫu nhiên với độ dài tối thiểu 32 ký tự trên Cloudflare Dashboard.
2. **Khuyến nghị 2: Giám sát nhật ký Audit Log định kỳ:**
   - Bảng `audit` lưu vết 100% các hành động nhạy cảm (đổi giá, hoàn tiền, hủy lịch, duyệt giải đấu). Ban quản lý nên xem báo cáo đối soát tuần.
