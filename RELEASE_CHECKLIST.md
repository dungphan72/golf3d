# BẢNG NGHIỆM THU PHÁT HÀNH & KẾ HOẠCH ROLLBACK (RELEASE_CHECKLIST.md)
**Dự án:** SAIGON INDOOR GOLF CLUB (https://sigolf.vn)  
**Phiên bản:** Production Release v1.0.0-rc  
**Ngày phát hành:** 17/11/2026  

---

## 1. CHECKLIST NGHIỆM THU TRƯỚC TRIỂN KHAI (PRE-FLIGHT ACCEPTANCE)

| STT | Hạng mục kiểm tra | Tiêu chuẩn nghiệm thu | Kết quả | Người xác nhận |
|---|---|---|---|---|
| 1 | **Codebase Health** | TypeScript typecheck 0 lỗi, lint đạt chuẩn | **ĐẠT (0 errors)** | CTO / Lead Eng |
| 2 | **Automated Tests** | 274/274 test suites pass, bao phủ toàn bộ modules | **ĐẠT (100% Pass)** | CTO / Lead Eng |
| 3 | **Production Build** | `vinext build` thành công, bundle tối ưu không lỗi | **ĐẠT (Built in 11s)** | Lead Eng |
| 4 | **Single Source of Truth** | Bảng giá, giờ hoạt động, hội viên đồng bộ từ Cài đặt | **ĐẠT (Không hardcode)** | Product Owner |
| 5 | **Double Booking Prevention** | Xử lý concurrency đè lịch bằng atomic SQL | **ĐẠT (Verified)** | Backend Architect |
| 6 | **Financial Immutability** | Trigger SQL bảo vệ sổ cái không bị sửa/xóa | **ĐẠT (Trigger Active)** | DBA / Financial Auditor |
| 7 | **Payment Webhook** | Idempotency SePay chống nhân đôi giao dịch | **ĐẠT (Verified)** | Lead Eng |
| 8 | **Wallet Low Balance** | Cảnh báo khi ví còn ≤ 200.000đ tại POS và Member | **ĐẠT (Verified)** | UI/UX Designer |
| 9 | **Typo Safeguard** | Tự động sửa "Lượng Định Của" thành "Lương Định Của" | **ĐẠT (Verified)** | QA Lead |
| 10 | **Booking Second Area UI** | Timeout 8s, Spinner loading, Empty state, Retry button | **ĐẠT (Verified)** | Frontend Lead |
| 11 | **Mobile POS Navigation** | Nút bấm tối thiểu 44px, bottom nav cố định, dễ bấm | **ĐẠT (Verified)** | Mobile UX Designer |
| 12 | **Role-Based Permissions** | Phân quyền 6 vai trò rõ ràng, chặn cashier tự giảm giá | **ĐẠT (Strict RBAC)** | Security Officer |

---

## 2. QUY TRÌNH TRIỂN KHAI LÊN PRODUCTION (DEPLOYMENT STEPS)

1. **Bước 1 — Sao lưu cơ sở dữ liệu hiện tại (Backup Cloudflare D1):**
   ```bash
   npx wrangler d1 export sigolf-db --remote --output=./backups/sigolf-db-backup-$(date +%Y%m%d%H%M%S).sql
   ```
2. **Bước 2 — Merge branch audit vào main/production:**
   - Tạo Pull Request từ branch `audit/production-hardening` vào `main`.
   - Kiểm tra CI/CD pipeline (chạy `pnpm typecheck` và `pnpm test`).
   - Merge với chiến lược `Squash and merge` hoặc `Rebase`.
3. **Bước 3 — Deploy Cloudflare Pages / Workers:**
   ```bash
   pnpm run deploy # hoặc tự động qua GitHub Actions
   ```
4. **Bước 4 — Kiểm tra khói sau triển khai (Post-deployment Smoke Test):**
   - Truy cập https://sigolf.vn kiểm tra trang chủ tải bình thường, không lỗi JS.
   - Kiểm tra khu vực booking tại trang chủ và `/book/:slug`.
   - Đăng nhập tài khoản quản trị `/quan-ly` kiểm tra màn hình sơ đồ 10 Line + 2 VIP.
   - Thử nghiệm tạo đơn Walk-in và kiểm tra giao diện POS.

---

## 3. KẾ HOẠCH HOÀN NGUYÊN KHẨN CẤP (ROLLBACK PLAN)

Trong trường hợp phát sinh sự cố bất ngờ ngoài dự kiến:
1. **Rollback Ứng Dụng (Cloudflare Pages Instant Rollback):**
   - Truy cập Cloudflare Dashboard -> **Pages** -> Dự án `sigolf` -> **Deployments**.
   - Chọn bản build thành công liền trước (commit `cf0bf94` hoặc bản stable trước đó).
   - Bấm nút **"Rollback to this deployment"**. Thời gian hoàn nguyên: **< 15 giây**, không downtime.
2. **Khôi phục Cơ sở dữ liệu (Nếu có lỗi dữ liệu):**
   - Chạy lệnh import từ file backup đã tạo ở Bước 1:
   ```bash
   npx wrangler d1 execute sigolf-db --remote --file=./backups/sigolf-db-backup-YYYYMMDDHHMMSS.sql
   ```
3. **Kênh thông báo khẩn cấp:**
   - Báo cáo ngay cho ban quản trị CLB qua hotline kỹ thuật hoặc nhóm Zalo vận hành nội bộ.
