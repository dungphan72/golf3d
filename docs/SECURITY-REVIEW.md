# Rà soát bảo mật (góc nhìn kẻ tấn công và người phòng thủ)

Phạm vi: toàn bộ 31 API, đăng nhập nhân viên và hội viên, phân quyền, webhook, trang công khai, giao diện quản lý, cấu hình triển khai Cloudflare.

## Đã kiểm tra và đạt

| Hạng mục | Kết quả |
|---|---|
| Mọi API quản lý khi chưa đăng nhập, kể cả gửi header giả `oai-authenticated-user-*` | 401 (kiểm tra trên bản chạy thật và trong test) |
| Phân quyền theo hành động (club, tài chính, giảm giá/hoàn tiền, thực đơn, hội viên, CRM) | Mỗi hành động có quyền riêng, hành động lạ bị từ chối |
| Cô lập cơ sở (tenant) | Mọi truy vấn đều ràng buộc `tenant`; sửa/khóa nhân viên kiểm tra thành viên cùng cơ sở |
| SQL injection | Toàn bộ dùng tham số; chỗ nối chuỗi chỉ dùng tên cột cố định |
| CSRF | Mọi yêu cầu ghi kiểm tra `Origin`; cookie `HttpOnly`, `SameSite=Lax`, `Secure` |
| Phiên | Mã phiên băm trong CSDL, hết hạn 14 ngày, khóa tài khoản xóa phiên, đổi mật khẩu đăng xuất thiết bị khác |
| Mật khẩu | PBKDF2 100.000 vòng + muối riêng, so sánh hằng thời gian, kiểm tra giả khi sai email |
| Webhook | SePay và lead dùng khóa băm; Facebook/Zalo kiểm tra chữ ký; mã yêu cầu khách 256-bit |
| CSV xuất | Chặn công thức (`=`, `+`, `-`, `@`) |
| Xuất dữ liệu | Chỉ chủ cơ sở; không chứa mật khẩu, phiên, khóa |
| Thư viện | `pnpm audit --prod`: không có lỗ hổng đã biết |

## Lỗi tìm thấy và đã sửa

| Mức | Lỗi | Cách sửa |
|---|---|---|
| Cao | Không có tiêu đề bảo mật: trang có thể bị nhúng khung (clickjacking), không có CSP, không HSTS | Mọi phản hồi có `X-Frame-Options: DENY`, `Content-Security-Policy` (chỉ cho phép chính trang, Google Fonts, Turnstile, bản đồ Google, VietQR; `frame-ancestors 'none'`, `object-src 'none'`), `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `nosniff`; `/quan-ly` và `/api` thêm `noindex` |
| Cao | Header danh tính nền tảng được tin theo mặc định: nếu quên đặt biến `DISABLE_SITES_IDENTITY` thì ai cũng thành chủ cơ sở | Đảo mặc định: chỉ tin khi đặt rõ `ENABLE_SITES_IDENTITY=1` (an toàn khi quên cấu hình) |
| Trung bình | Đăng nhập nhân viên chỉ khóa theo tài khoản, thử mật khẩu hàng loạt trên nhiều tài khoản không bị chặn | Giới hạn 20 lần sai / 15 phút cho mỗi địa chỉ; vượt thì chặn cả khi đúng mật khẩu |
| Trung bình | Quản lý có thể tạo, sửa, khóa, đặt lại mật khẩu của quản lý khác (chiếm quyền ngang hàng) | Chỉ chủ cơ sở được thao tác với quản lý và chủ; quản lý chỉ quản nhân viên cấp dưới |
| Trung bình | Webhook lead (form website, quảng cáo) không giới hạn tần suất: có khóa là làm ngập lead | Giới hạn theo địa chỉ (website 20 lần/10 phút, quảng cáo 300 lần/10 phút) |
| Thấp | Mật khẩu yếu được chấp nhận (`12345678`, `password123`, chính tên email…) | Từ chối mật khẩu phổ biến, lặp ký tự, hoặc chỉ là phần tên trong email |
| Thấp | So sánh khóa cron và mã xác minh Facebook không hằng thời gian | Dùng so sánh hằng thời gian |
| Thấp | Lỗi nội bộ (nội dung lỗi CSDL) trả nguyên văn cho nhân viên ở API đặt lịch | Trả thông báo chung, chi tiết chỉ ghi nhật ký máy chủ |
| Thấp | `x-forwarded-for` được dùng khi thiếu `cf-connecting-ip` (giả mạo địa chỉ) | Chỉ tin ở máy chủ kiểm thử; Cloudflare luôn có `cf-connecting-ip` |
| Thấp | JSON-LD trên trang chủ chưa thoát `<` | Thoát `<` thành `<` |

Test tự động mới: `tests/e2e/zzzzz-security.spec.ts` (18 API chưa đăng nhập + giả danh tính, tiêu đề bảo mật, CSRF, dò mật khẩu bị chặn, mật khẩu yếu, cron/webhook sai khóa) và các ca mới trong `tests/auth.test.ts`.

## Rủi ro còn lại (chấp nhận hoặc cần quyết định)

- **Khóa tài khoản 5 lần sai** vẫn cho kẻ tấn công cố ý khóa chủ cơ sở 15 phút (đổi lấy chống đoán mật khẩu). Giảm thiểu: giới hạn theo địa chỉ ở trên; nếu cần có thể thêm Cloudflare Turnstile cho đăng nhập.
- **Đăng ký hội viên** báo "số điện thoại đã có tài khoản", cho phép dò số điện thoại khách; đã giới hạn 5 lần/giờ/địa chỉ và có Turnstile nếu bật `TURNSTILE_SITE_KEY`. Khuyến nghị bật Turnstile trên bản chạy thật.
- **Thu ngân bấm "Chuyển khoản đã đối soát" mà không gắn giao dịch ngân hàng** vẫn được phép (đối soát thủ công); có ghi nhật ký. Nếu muốn chặt hơn, bắt buộc gắn giao dịch SePay.
- **Quản lý có quyền Cài đặt** nên đổi được tài khoản nhận tiền của mã QR; có ghi nhật ký nhưng chưa có cảnh báo. Có thể giới hạn riêng cho chủ cơ sở.
- **CSP** còn `'unsafe-inline'` cho script và style vì khung Next/vinext chèn script khởi động; muốn bỏ cần chuyển sang nonce.
- **Mật khẩu PBKDF2 100.000 vòng** là mức tối đa của Cloudflare Workers; mật khẩu dài và không phổ biến vẫn là biện pháp chính.
- Chưa có xác thực hai bước cho nhân viên.
