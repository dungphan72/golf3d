# Bảo mật: trạng thái và việc cần làm trên VPS (2026-11-11)

## Đã sửa trong code
| Mục | Nội dung |
|---|---|
| P0 | `clientIp` không tin `cf-connecting-ip` khi `TRUST_PROXY=1`; `CRON_SECRET` ≥ 16 ký tự cho cả 2 cron |
| P1 | Zalo từ chối timestamp lệch > 10 phút; `sameOrigin` chặn cross-site không có Origin; rate-limit chuông gọi, tra cứu/hủy đặt lịch, webhook SePay (sai khóa) |
| P1 | Đăng nhập nhân viên: khóa theo **IP + tài khoản** (5 lần/15 phút); khóa toàn tài khoản chỉ sau 25 lần sai |
| P2 | Mật khẩu nhân viên ≥ 10 ký tự; phiên nhân viên 7 ngày; audit log khi xuất dữ liệu; CI `security.yml` + Dependabot + gitleaks (`.gitleaks.toml` bỏ qua khóa giả của test) |
| P2 | `scripts/backup-db.sh`: umask 077, kiểm tra tar, mã hóa tùy chọn, sha256; `scripts/restore-check.sh` diễn tập restore không đụng production |

## Việc làm trên VPS (đúng theo `docs/DEPLOY-VPS.md`: systemd `app-golf3d`, SSH cổng 7878)
**Không chạy `scripts/setup-vps.sh`** (xem cảnh báo trong DEPLOY-VPS.md; nó chỉ dành cho máy trống).

1. Đổi mật khẩu root; tắt đăng nhập mật khẩu (`PasswordAuthentication no`, `PermitRootLogin prohibit-password`), giữ một phiên SSH mở khi reload.
2. Đặt `CRON_SECRET` ≥ 32 ký tự (`openssl rand -hex 32`) và `TRUST_PROXY=1` trong môi trường của `app-golf3d.service`.
3. Nginx của site: thêm `proxy_set_header CF-Connecting-IP "";` và `client_max_body_size 12M;`, rồi `nginx -t && systemctl reload nginx`.
4. Snapshot theo DEPLOY-VPS.md, `git pull`, `pnpm build`, thay `dist`, `systemctl restart app-golf3d`.
5. Kiểm tra: `node scripts/verify-ratelimit.mjs https://golfhub.cloud` (phải PASS; IP của máy chạy sẽ bị chặn 15 phút).
6. Backup: `BACKUP_PASSPHRASE_FILE=/root/.golf3d-backup-pass` (chmod 600) cho cron; chạy `scripts/restore-check.sh` trên 1 bản backup.

## Quyết định cố ý chưa làm
- **`active` theo membership:** `createStaff` từ chối email đã tồn tại nên một user không thuộc nhiều cơ sở; rủi ro chỉ lý thuyết, còn migration trên VPS đang chạy có rủi ro thật. Làm khi thật sự có nhiều cơ sở.
- **Bỏ `wrangler dev` ở production:** `scripts/serve-node.mjs` (vinext prod-server) là hướng thay thế nhưng cần shim D1 `cloudflare:workers`; phải thử trên staging, không đổi trực tiếp.
- **CSP bỏ `'unsafe-inline'`:** script khởi động nội tuyến của framework cần nonce do framework cấp; chưa hỗ trợ nên giữ. CSP vẫn giới hạn nguồn, `object-src 'none'`, `frame-ancestors 'none'`.
- **Isolation tenant:** quét toàn bộ câu SQL SELECT/UPDATE/DELETE: mọi câu đều có `tenant` hoặc đi qua id đã lọc theo tenant. Không thấy lỗi. Webhook ngân hàng chỉ ghi nhận giao dịch, nhân viên xác nhận thủ công nên không có tự động cộng tiền.
