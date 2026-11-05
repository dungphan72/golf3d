# Chuyển Golf3D khỏi OpenAI Sites sang Cloudflare của anh (Workers + D1)

Mục tiêu: chạy trên tài khoản Cloudflare riêng, có địa chỉ công khai cho khách đặt lịch (`/book/<mã>`), giữ nguyên dữ liệu thật. **Không đổi nghiệp vụ hay cơ sở dữ liệu** (vẫn SQLite/D1 với toàn bộ trigger sổ tiền). Postgres/Supabase để dành cho giai đoạn SaaS.

> Làm theo đúng thứ tự. Bước 1 và 7 là cách quay lại nếu có sự cố: bản Sites cũ không bị đụng tới cho đến khi anh tự tắt.

## 0. Chuẩn bị (một lần)
- Tài khoản Cloudflare (gói Free đủ để chạy thử; Workers Paid ~5 USD/tháng khi chạy thật).
- Máy có Node ≥ 24 và pnpm (xem `docs/LOCAL_SETUP.md`), đã `pnpm install --frozen-lockfile`.
- Đăng nhập wrangler: `pnpm exec wrangler login` (mở trình duyệt, anh tự cấp quyền).

## 1. Backup dữ liệu hiện tại
Trên bản đang chạy, đăng nhập rồi mở `/api/export` để tải `golf3d-backup-YYYY-MM-DD.json`. Cất file ở nơi an toàn, **không đưa vào Git** (có tên/SĐT khách). Mở file, tìm giá trị `tenant` (ví dụ `user-abc...`) — cần ở bước 5.

> Bản đang chạy phải có bản code mới nhất (có `/api/export`). Nếu chưa, deploy bản code hiện tại lên Sites rồi mới xuất.

## 2. Tạo cơ sở dữ liệu D1
```bash
pnpm exec wrangler d1 create golf3d
```
Ghi lại `database_id` (dạng UUID) trong kết quả.

## 3. Build và áp migration
```bash
pnpm build
node scripts/deploy-cloudflare.mjs --dry-run      # tạo dist/server/wrangler.deploy.json (không cần ID thật)
pnpm exec wrangler d1 migrations apply golf3d --remote --config dist/server/wrangler.deploy.json
```
Lệnh cuối áp dụng migration 0000 → 0006 lên D1 mới (đã thử trên D1 trống).

## 4. Triển khai Worker
```bash
D1_DATABASE_ID=<uuid> node scripts/deploy-cloudflare.mjs
```
Script luôn đặt `DISABLE_SITES_IDENTITY=1`. **Không bỏ biến này**: ngoài Sites, header danh tính do client tự gửi được, nếu bật thì ai cũng giả mạo được chủ cơ sở. (Đã kiểm chứng: header giả nhận 401.)

Tên miền riêng (khi anh đã mua và thêm vào Cloudflare): thêm `CUSTOM_DOMAIN=app.ten-mien-cua-anh.vn` vào lệnh trên. Không có tên miền thì dùng địa chỉ `*.workers.dev` mà wrangler in ra.

## 5. Nhập dữ liệu cũ và tạo tài khoản chủ
Chỉ làm trên D1 **trống** (vừa migrate, chưa có dữ liệu):
```bash
node scripts/import-backup.mjs golf3d-backup-YYYY-MM-DD.json > import.sql
pnpm exec wrangler d1 execute golf3d --remote --file import.sql

OWNER_PASSWORD='mat-khau-manh-cua-anh' node scripts/create-owner.mjs --tenant <tenant-o-buoc-1> --email anh@vidu.vn --name "Tên chủ" > owner.sql
pnpm exec wrangler d1 execute golf3d --remote --file owner.sql
```
- `import.sql` tạm gỡ trigger, nạp nguyên văn các dòng, rồi tạo lại đúng trigger từ migration (đã kiểm tra khôi phục đủ 60 trigger và các ràng buộc sổ tiền hoạt động lại).
- Chưa có dữ liệu cũ thì bỏ bước nhập và dùng `--tenant <tên-tùy-ý> --generate` (không cần `OWNER_PASSWORD`): script in một mật khẩu tạm thời một lần, buộc đổi khi đăng nhập lần đầu.
- `--tenant` phải đúng giá trị trong backup, nếu không dữ liệu cũ sẽ không hiện cho tài khoản mới.
- Xóa `import.sql`, `owner.sql` và lịch sử lệnh có mật khẩu sau khi xong.

> Khóa SePay và tài khoản đăng nhập không nằm trong backup (chỉ lưu bản băm). Sau khi nhập dữ liệu, tạo lại tài khoản chủ và nhập lại khóa SePay trong Cài đặt.

## 6. Kiểm tra trước khi cho nhân viên dùng
1. Mở địa chỉ Worker → đăng nhập bằng tài khoản chủ vừa tạo.
2. Đối chiếu: số booking, ca, sổ tiền, thực đơn, kho khớp với bản Sites (so với cột đếm in ra ở bước 5).
3. Cài đặt → bật "Nhận yêu cầu đặt lịch online", đặt mã đường dẫn; thử mở `/book/<mã>` bằng điện thoại không đăng nhập.
4. Thêm nhân viên ở mục **Nhân viên**, đăng nhập thử từng vai trò.
5. Trong 1–2 ngày đầu chạy song song; chốt ca bên nào thì nhập bên đó, tránh ghi hai nơi.

## 7. Quay lại / chuyển hẳn
- Quay lại: giữ nguyên bản Sites (chưa bị sửa). Dữ liệu ghi trên Cloudflare sau thời điểm backup sẽ không có ở Sites, nên chỉ quay lại khi chưa nhập liệu thật.
- Chuyển hẳn: sau khi chốt, tải backup mới từ Cloudflare (`/api/export`) định kỳ và cất giữ.

## Việc còn lại
- Sao lưu tự động hằng ngày (D1 có Time Travel 30 ngày; vẫn nên tải `/api/export` hằng tuần).
- CAPTCHA (Turnstile) cho `/book` khi mở rộng; thông báo Zalo/SMS.
- Giai đoạn SaaS: chuyển sang Postgres/Supabase (cần dịch lại trigger sang plpgsql; dùng cùng bộ test để đối chiếu).

## Chống bot cho trang đặt lịch (Cloudflare Turnstile, tùy chọn)

1. Cloudflare Dashboard → Turnstile → Add widget (hostname: domain của app). Lấy **Site key** và **Secret key**.
2. Site key: thêm biến `TURNSTILE_SITE_KEY` cho Worker `golf3d` (Settings → Variables). Secret key:
   `pnpm exec wrangler secret put TURNSTILE_SECRET`.
3. Khi có cả hai, form `/book/<mã>` hiện ô xác minh và máy chủ kiểm tra lại với Cloudflare. Thiếu một trong hai thì tắt.
   Lưu ý: `scripts/deploy-cloudflare.mjs` có thể ghi đè biến; đặt biến trong Dashboard hoặc thêm vào cấu hình deploy.
