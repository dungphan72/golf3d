# Triển khai Golf3D trên VPS

Tên miền hiện dùng: **`golfhub.cloud`**. Đây vẫn là pilot owner-private, chưa được nghiệm thu cho thu tiền thật.

## Trạng thái hiện tại (2026-11-10)
- Ứng dụng nằm tại `/var/www/app-golf3d`, chạy bằng `app-golf3d.service` (systemd), lắng nghe `127.0.0.1:8787`; Nginx chuyển HTTPS vào cổng này. Kết nối SSH qua cổng `7878` với khóa `~/.ssh/id_ed25519` (cổng 22 bị đóng/timeout).
- Runtime đang dùng Node.js 22.23.3. Deploy ngày 10/11 (lần cập nhật lúc 15:55) build ID hiện tại là `a7297170-8415-498f-871e-6589dcfc574e`. `app-golf3d.service` hoạt động, `/` và `/quan-ly` trả 200; `/api/auth/me` trả 401 khi chưa có session.
- Không nâng cấp OS, Node, package; không chạy migration. D1 local tại `.wrangler/state` được giữ nguyên.
- Bản `dist` trước deploy (build `5b5cf510-432e-4bea-b008-7fccf2cdcb85`) được giữ tại `/var/www/app-golf3d/dist.rollback-predeploy-20261110-1555`; snapshot build + `.wrangler/state` tại `/root/golf3d-predeploy-20261110-1555.tar.gz` (quyền 600).
- Bản snapshot lúc 15:15 (build `aee41d82-6bae-49d9-a3d8-c491a0c604f7`) được giữ tại `/root/golf3d-predeploy-20261110-1515.tar.gz`.
- Bản snapshot sáng ngày 10/11 lúc 06:50 (build `e53f7d1a-fd6d-4180-b932-74b78f9c9dcf`) được giữ tại `/root/golf3d-predeploy-20261110-0650.tar.gz`.

## Cảnh báo về script cài đặt cũ
**Không chạy `scripts/setup-vps.sh` hoặc lệnh `curl | bash` trong hướng dẫn cũ.** Script này thay cấu hình Nginx mặc định, bật UFW, cài package và chạy migrations với `|| true`; không phù hợp để cập nhật VPS đang có nhiều dịch vụ. Không chạy lại migration đã áp dụng.

## Kiểm tra và quản lý dịch vụ
```bash
sudo systemctl status app-golf3d
sudo journalctl -u app-golf3d -n 100 --no-pager
curl -fsSI https://golfhub.cloud
```

Chỉ restart sau khi đã xác minh build và có rollback:
```bash
sudo systemctl restart app-golf3d
```

## Quy trình cập nhật
1. Chạy typecheck, test và `pnpm build` trên máy phát triển.
2. Trên VPS, tạo snapshot có quyền truy cập hạn chế gồm build hiện tại và `.wrangler/state`; xác minh file backup tồn tại trước khi thay đổi.
3. Chuyển build vào thư mục staging, xác minh `dist/server/BUILD_ID`, rồi thay `dist` và restart systemd.
4. Kiểm tra HTTPS, đăng nhập, API và log; giữ bản build trước đó cùng snapshot cho tới khi kiểm tra xong.
5. Không cài package, nâng hệ điều hành hoặc áp migration trong cùng một đợt deploy ứng dụng. Các bước đó cần kế hoạch và backup riêng, được xác minh trước.

VPS có nhiều dịch vụ dùng chung. Không xóa thư mục, backup, cấu hình Nginx/chứng chỉ hoặc dừng dịch vụ khác khi chưa xác minh phạm vi và được chủ duyệt.
