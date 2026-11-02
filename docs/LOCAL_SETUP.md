# Mở Golf3D trong VS Code

## 1. Chuẩn bị
- Git, VS Code và Node.js đáp ứng `engines` trong package.json (tối thiểu 22.13).
- pnpm đúng phiên bản trong `packageManager` của package.json (hiện pnpm@11.25.0). Có thể dùng Corepack nếu máy đã hỗ trợ.
- Python 3 nếu muốn chạy kiểm tra SQLite.

Trong terminal của VS Code:
```
git clone https://github.com/dungphan72/golf3d.git
cd golf3d
code .
pnpm install --frozen-lockfile
pnpm build
```
Repo riêng tư: xác thực GitHub qua VS Code hoặc Git Credential Manager; không dán token vào source/chat.

## 2. Tạo database local (chỉ một lần cho database mới)
Sau khi build thành công, chạy tại thư mục gốc:
```
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_amazing_dreadnoughts.sql
pnpm dev
```
Mở URL terminal hiển thị (profile portable mặc định dùng http://localhost:5173).
Bấm Đăng nhập trong giao diện để kích hoạt tài khoản thử cục bộ do starter cung cấp. Chỉ có ở dev loopback localhost/127.0.0.1, không phải OTP thật hay đăng nhập production. Database local không có dữ liệu từ bản Sites.

Khi có migration mới, áp dụng migration chưa chạy theo thứ tự; không chạy lại migration cũ. Nếu báo bảng đã tồn tại, đừng xóa dữ liệu hoặc chạy lại mọi migration.

## 3. Kiểm tra
```
pnpm exec tsc --noEmit
node --experimental-strip-types --test tests/pricing.test.ts
python tests/booking_sql_test.py
pnpm build
```
Trên Windows có thể dùng `py` thay `python` nếu đó là lệnh Python đã cài. Các lệnh local nêu trên dựa trên starter portable; build/check đã chạy trong Linux, chưa kiểm thử trên Windows thực tế.

## 4. Lệnh bắt đầu cho Copilot hoặc Codex

> Đọc .github/copilot-instructions.md, docs/REQUIREMENTS.md và docs/PROGRESS.md. Kiểm tra hiện trạng trước khi sửa. Đây là pilot v0.1, chưa dùng thu tiền thật. Tiếp tục theo thứ tự trong PROGRESS, làm từng lát cắt hoàn chỉnh có kiểm tra. Không tự dựng lại dự án, không bỏ yêu cầu đã chốt, không giả OTP/thanh toán/tích hợp. Báo rõ phần đã chạy, chưa chạy và cập nhật PROGRESS sau mỗi đợt. Giao diện mobile phải có cách dùng như app.

## 5. Quan hệ với bản đã triển khai
- URL riêng tư hiện tại: https://golf3d-club-dung.balmydune24.chatgpt.site
- Repo GitHub là bản sao mã nguồn để sở hữu và phát triển trong VS Code/Codex.
- Push lên GitHub CHƯA tự động cập nhật bản Sites. Chưa cấu hình GitHub Actions hoặc pipeline triển khai.
- Giữ .openai/hosting.json project_id khi cập nhật Site hiện có, không tạo Site mới ngoài ý muốn.
- Không dùng riêng các header identity của Sites trên host công khai khác. Nếu đổi nhà cung cấp hosting, phải thay bằng xác thực đáng tin cậy; không tin header khách tự gửi.
- Không đưa .env, .dev.vars, dữ liệu .wrangler, node_modules hoặc dist lên GitHub.

## 6. Các bước thử
Vào Cài đặt: nhập giờ mở/đóng, sức chứa và VAT/phí (nhập 0 khi chính sách thực sự không thu). Cấu hình giá VIP và thời lượng gói trước khi thử dịch vụ đó. Tạo lịch thử gần giờ hiện tại, bắt đầu/tạm dừng/kết thúc, xem phiếu và chỉ xác nhận thanh toán trên dữ liệu thử.
