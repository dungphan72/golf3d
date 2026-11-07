# Hướng dẫn triển khai Saigon Golf 3D Club lên VPS (Ubuntu / Debian)
Tên miền chính: **`golfhub.cloud`**

---

## 1. Chuẩn bị VPS
- Hệ điều hành: **Ubuntu 22.04 / 24.04 LTS** (hoặc Debian 12).
- Cấu hình đề xuất: tối thiểu 1 vCPU, 2GB RAM, 25GB SSD.
- Trỏ DNS tên miền tại trang quản lý tên miền (nhà đăng ký tên miền):
  - Bản ghi `A`: `@` &rarr; `<IP_CỦA_VPS>`
  - Bản ghi `A`: `www` &rarr; `<IP_CỦA_VPS>`

---

## 2. Triển khai tự động 1 lệnh (Khuyên dùng)
Đăng nhập SSH vào VPS bằng quyền `root`:
```bash
ssh root@<IP_CỦA_VPS>
```

Tải và thực thi script tự động:
```bash
curl -fsSL https://raw.githubusercontent.com/dungphan72/golf3d/main/scripts/setup-vps.sh | bash
```

Script sẽ tự động:
1. Cài đặt Node.js 22 LTS, pnpm, git, build-essential.
2. Cài đặt và cấu hình Nginx Reverse Proxy (chuyển tiếp cổng 80/443 về 8787).
3. Cài đặt PM2 để giữ ứng dụng chạy nền 24/7 và tự khởi động cùng VPS.
4. Clone repo về `/var/www/golf3d`, cài package, chạy database migrations và build app.
5. Cài đặt chứng chỉ SSL HTTPS miễn phí (Let's Encrypt Certbot) cho `golfhub.cloud` và `www.golfhub.cloud`.

---

## 3. Các lệnh quản lý thường dùng trên VPS
- **Xem trạng thái app**: `pm2 status`
- **Xem nhật ký hoạt động (logs)**: `pm2 logs golf3d`
- **Khởi động lại app**: `pm2 restart golf3d`
- **Dừng app**: `pm2 stop golf3d`
- **Cập nhật code mới từ GitHub**:
  ```bash
  cd /var/www/golf3d
  git pull origin main
  pnpm install
  pnpm build
  pm2 restart golf3d
  ```
- **Cấp lại chứng chỉ SSL (khi vừa trỏ xong DNS)**:
  ```bash
  sudo certbot --nginx -d golfhub.cloud -d www.golfhub.cloud
  ```
