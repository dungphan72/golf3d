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
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_overconfident_sphinx.sql
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_loving_machine_man.sql
pnpm dev
```
Mở URL terminal hiển thị (profile portable mặc định dùng http://localhost:5173).
Bấm Đăng nhập trong giao diện để kích hoạt tài khoản thử cục bộ do starter cung cấp. Chỉ có ở dev loopback localhost/127.0.0.1, không phải OTP thật hay đăng nhập production. Database local không có dữ liệu từ bản Sites.

Khi có migration mới, áp dụng migration chưa chạy theo thứ tự; không chạy lại migration cũ. Nếu báo bảng đã tồn tại, đừng xóa dữ liệu hoặc chạy lại mọi migration.

## 3. Kiểm tra
```
pnpm exec tsc --noEmit
pnpm test
python tests/booking_sql_test.py
python tests/finance_sql_test.py
python tests/fnb_sql_test.py
python tests/migration_splitter_test.py
pnpm build
```
Trên Windows có thể dùng `py` thay `python` nếu đó là lệnh Python đã cài. Các lệnh local nêu trên dựa trên starter portable; build/check đã chạy trong Linux, chưa kiểm thử trên Windows thực tế.

## 4. Lệnh bắt đầu cho Copilot hoặc Codex

> Đọc .github/copilot-instructions.md, docs/REQUIREMENTS.md và docs/PROGRESS.md. Kiểm tra hiện trạng trước khi sửa. Đây là pilot v0.4, chưa dùng thu tiền thật. Tiếp tục theo thứ tự trong PROGRESS, làm từng lát cắt hoàn chỉnh có kiểm tra. Không tự dựng lại dự án, không bỏ yêu cầu đã chốt, không giả OTP/thanh toán/tích hợp. Báo rõ phần đã chạy, chưa chạy và cập nhật PROGRESS sau mỗi đợt. Giao diện mobile phải có cách dùng như app.

## 5. Quan hệ với bản đã triển khai
- URL riêng tư hiện tại: https://golf3d-club-dung.balmydune24.chatgpt.site
- Repo GitHub là bản sao mã nguồn để sở hữu và phát triển trong VS Code/Codex.
- Push lên GitHub CHƯA tự động cập nhật bản Sites. Chưa cấu hình GitHub Actions hoặc pipeline triển khai.
- Giữ .openai/hosting.json project_id khi cập nhật Site hiện có, không tạo Site mới ngoài ý muốn.
- Không dùng riêng các header identity của Sites trên host công khai khác. Nếu đổi nhà cung cấp hosting, phải thay bằng xác thực đáng tin cậy; không tin header khách tự gửi.
- Không đưa .env, .dev.vars, dữ liệu .wrangler, node_modules hoặc dist lên GitHub.

## 6. Các bước thử
Vào Cài đặt: nhập giờ mở/đóng, sức chứa và VAT/phí (nhập 0 khi chính sách thực sự không thu). Cấu hình giá VIP và thời lượng gói trước khi thử dịch vụ đó. Tạo lịch thử gần giờ hiện tại, bắt đầu/tạm dừng/kết thúc, xem phiếu và chỉ xác nhận thanh toán trên dữ liệu thử.

## Nâng từ v0.2 lên v0.3
Sau git pull/pnpm install --frozen-lockfile/pnpm build, chỉ áp dụng migration 0001 nếu 0000 đã chạy. Không chạy lại 0000. Phiếu chưa thanh toán phải mở ca rồi ghi thu qua sổ mới. Xem docs/FINANCE.md và docs/security/REVIEW-v03.md trước thử nghiệm; chỉ dùng localhost, không public dev server.

## Nâng từ v0.3 lên v0.4
Sau git pull/pnpm install --frozen-lockfile/pnpm build, chỉ chạy migration 0002 nếu 0000/0001 đã được áp dụng. Không chạy lại migration cũ. Mở Thực đơn & bếp để nhập món/giá/VAT/phí, sau đó gọi món từ phiên đang chơi. Xem docs/FNB.md. Mọi cửa sổ cũ cần tải lại trước khi thu tiền vì API mới yêu cầu xác nhận tổng phiếu đã xem.

### Nâng cấp v0.4 → v0.5

Chỉ áp dụng migration mới `drizzle/0003_minor_lady_deathstrike.sql` qua cùng lệnh D1 ở trên (thay đường dẫn file). Không chạy lại migration cũ đã áp dụng. Kho ban đầu chưa theo dõi món nào; bật từng món rồi nhập tồn thực tế. Chạy thêm `python tests/stock_sql_test.py` khi kiểm tra.

## 4. Sao lưu dữ liệu thật
Đăng nhập app đang chạy rồi mở `/api/export` (trình duyệt tải về `golf3d-backup-YYYY-MM-DD.json`). File gồm toàn bộ bảng của cơ sở (booking, ca, sổ tiền, món, kho, nhật ký, cài đặt). Làm trước mỗi lần nâng cấp hoặc chuyển hạ tầng; lưu file ở nơi an toàn, không đưa vào Git (có tên/SĐT khách).

## 5. Đăng nhập bằng mật khẩu và phân quyền (migration 0004)
Áp dụng `drizzle/0004_sturdy_ultimo.sql` (thêm bảng users, memberships, sessions; không đụng dữ liệu cũ) bằng cùng lệnh D1 ở mục 2.

- Chủ cơ sở hiện đăng nhập qua nền tảng Sites: vào **Tài khoản** → "Tạo đăng nhập bằng mật khẩu" để gắn email + mật khẩu vào đúng cơ sở hiện tại (dữ liệu cũ giữ nguyên). Sau đó thêm nhân viên ở **Nhân viên**; mật khẩu tạm hiển thị một lần và buộc đổi khi đăng nhập lần đầu.
- Vai trò: Chủ, Quản lý, Thu ngân, HLV, CSKH, Sale (ma trận quyền ở `lib/auth/permissions.ts`). Sai mật khẩu 5 lần khóa tài khoản 15 phút.
- **Bắt buộc khi chuyển khỏi Sites (Vercel...):** đặt biến môi trường `DISABLE_SITES_IDENTITY=1`. Ngoài nền tảng Sites, header danh tính `oai-authenticated-user-*` do client tự gửi được, nếu không tắt thì ai cũng giả mạo được chủ cơ sở.
