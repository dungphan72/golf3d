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
Sau khi build thành công, chỉ với **database local mới, rỗng**, áp dụng toàn bộ migration theo thứ tự tên tệp. Trong PowerShell, tại thư mục gốc:
```powershell
Get-ChildItem .\drizzle -Filter '*.sql' | Sort-Object Name | ForEach-Object {
  pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler\state --file $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "Migration failed: $($_.Name)" }
}
pnpm dev
```
Lệnh này chạy lại từ đầu nên **không dùng cho database đã có dữ liệu hoặc đã áp migration**. Với database đang tồn tại, kiểm tra trạng thái trước và chỉ áp dụng migration còn thiếu đúng một lần; không sửa hay chạy lại migration đã áp. Local D1 và D1 trên Site là hai môi trường riêng.
Mở URL terminal hiển thị (profile portable mặc định dùng http://localhost:5173).
Bấm Đăng nhập trong giao diện để kích hoạt tài khoản thử cục bộ do starter cung cấp. Chỉ có ở dev loopback localhost/127.0.0.1, không phải OTP thật hay đăng nhập production. Database local không có dữ liệu từ bản Sites.

## 3. Kiểm tra
```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
$env:PYTHONUTF8 = '1'
Get-ChildItem .\tests -Filter '*_test.py' | Sort-Object Name | ForEach-Object {
  python $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "Test failed: $($_.Name)" }
}
```
Có thể dùng `py` thay `python` nếu đó là lệnh Python đã cài. Playwright dùng D1 cục bộ riêng cho E2E; các bài kiểm thử phụ thuộc thứ tự và chia sẻ dữ liệu trong cùng lần chạy.

## 4. Lệnh bắt đầu cho Copilot hoặc Codex

> Đọc docs/REQUIREMENTS.md và docs/PROGRESS.md trước. Kiểm tra hiện trạng trước khi sửa. Đây là pilot riêng tư, chưa sẵn sàng thu tiền thật. Tiếp tục theo thứ tự trong PROGRESS, làm từng lát cắt hoàn chỉnh có kiểm tra. Không tự dựng lại dự án, không bỏ yêu cầu đã chốt, không giả OTP/thanh toán/tích hợp. Báo rõ phần đã chạy, chưa chạy và cập nhật PROGRESS sau mỗi đợt. Giao diện mobile phải có cách dùng như app.

## 5. Quan hệ với bản đã triển khai
- URL riêng tư hiện tại: https://golf3d-club-dung.balmydune24.chatgpt.site
- Repo GitHub là bản sao mã nguồn để sở hữu và phát triển trong VS Code/Codex.
- GitHub Actions kiểm tra mã trên push/pull request; CI không triển khai hay thay đổi Site.
- Giữ .openai/hosting.json project_id khi cập nhật Site hiện có, không tạo Site mới ngoài ý muốn.
- Không dùng riêng các header identity của Sites trên host công khai khác. Nếu đổi nhà cung cấp hosting, phải thay bằng xác thực đáng tin cậy; không tin header khách tự gửi.
- Không đưa .env, .dev.vars, dữ liệu .wrangler, node_modules hoặc dist lên GitHub.

## 6. Các bước thử
Vào Cài đặt: nhập giờ mở/đóng, sức chứa và VAT/phí (nhập 0 khi chính sách thực sự không thu). Cấu hình giá VIP và thời lượng gói trước khi thử dịch vụ đó. Tạo lịch thử gần giờ hiện tại, bắt đầu/tạm dừng/kết thúc, xem phiếu và chỉ xác nhận thanh toán trên dữ liệu thử.

## Sao lưu dữ liệu thật
Đăng nhập app đang chạy rồi mở `/api/export` (trình duyệt tải về `golf3d-backup-YYYY-MM-DD.json`). File gồm toàn bộ bảng của cơ sở (booking, ca, sổ tiền, món, kho, nhật ký, cài đặt). Làm trước mỗi lần nâng cấp hoặc chuyển hạ tầng; lưu file ở nơi an toàn, không đưa vào Git (có tên/SĐT khách).

## Đăng nhập bằng mật khẩu và phân quyền
Chi tiết schema và quyền hiện hành nằm trong mã nguồn và migrations; không áp dụng riêng migration cũ `0004` trên database đã nâng cấp.

- Chủ cơ sở hiện đăng nhập qua nền tảng Sites: vào **Tài khoản** → "Tạo đăng nhập bằng mật khẩu" để gắn email + mật khẩu vào đúng cơ sở hiện tại (dữ liệu cũ giữ nguyên). Sau đó thêm nhân viên ở **Nhân viên**; mật khẩu tạm hiển thị một lần và buộc đổi khi đăng nhập lần đầu.
- Vai trò: Chủ, Quản lý, Thu ngân, HLV, CSKH, Sale (ma trận quyền ở `lib/auth/permissions.ts`). Sai mật khẩu 5 lần khóa tài khoản 15 phút.
- Nếu chạy ngoài môi trường Sites có danh tính đáng tin cậy, bắt buộc đặt `DISABLE_SITES_IDENTITY=1`. Không tin header `oai-authenticated-user-*` do client tự gửi và không đổi nhà cung cấp xác thực nếu chưa có phương án thay thế an toàn.

## Đặt lịch online

Khách gửi yêu cầu đặt lịch; nhân viên xử lý và xác nhận trong ứng dụng. Site hiện owner-private. Không đổi audience hay mở truy cập công khai nếu chưa có chỉ đạo và kế hoạch xác thực/vận hành được duyệt.
