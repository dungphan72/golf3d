# SAIGON INDOOR GOLF CLUB — hướng dẫn cho AI (Claude Code, Antigravity, Copilot)

## NEVER REVERT APPROVED UI DESIGN.

Giao diện đã được người dùng phê duyệt là nguồn tham chiếu chính thức. Đọc `docs/UI_DESIGN_BASELINE.md` trước khi sửa bất kỳ file giao diện nào.

## Trước khi bắt đầu mọi nhiệm vụ
1. `git branch --show-current`, `git status`, `git log -5`. Không làm việc trên `main`.
2. Đọc `docs/UI_DESIGN_BASELINE.md` (danh sách màn hình/file đã duyệt) và mục mới nhất của `docs/UI_CHANGELOG.md`.
3. Có thay đổi chưa commit mà không phải của bạn thì **không ghi đè**: hỏi người dùng hoặc làm trên branch riêng.
4. Nhiệm vụ có khả năng xung đột (nhiều AI cùng sửa) phải có branch riêng. Không tự merge, không triển khai production.
5. Đọc `.github/copilot-instructions.md`, `docs/REQUIREMENTS.md`, `docs/PROGRESS.md` cho quy tắc nghiệp vụ và bảo mật.

## Quy tắc UI bắt buộc
Không được tự ý: đổi layout, màu thương hiệu, font **Be Vietnam Pro**, sidebar, navigation, component đã duyệt; quay lại giao diện cũ; dựng lại toàn bộ frontend; thay ảnh thiết kế bằng template khác.

Phong cách: Google Workspace / Material Design; xanh lá `#0a5c1e` và vàng logo `#fcb000`; nền trắng/xám nhạt; icon phẳng nhiều màu (lucide); card bo góc 12–20px; responsive Desktop và Mobile (mobile hoạt động như app, không phải desktop thu nhỏ).

Khi sửa logic nghiệp vụ chỉ sửa phần liên quan và **giữ nguyên giao diện** nếu không được yêu cầu đổi UI.

## Khi được yêu cầu đổi giao diện
Mỗi thay đổi UI phải có: (1) lý do, (2) ảnh tham chiếu trong `hinh-anh/thiet-ke`, (3) danh sách file thay đổi, (4) screenshot trước/sau, (5) kết quả kiểm thử. Ghi vào `docs/UI_CHANGELOG.md` và cập nhật `docs/UI_DESIGN_BASELINE.md`.

## Quy tắc dữ liệu (không nới lỏng để "cho đẹp")
Không dữ liệu giả hay số liệu minh họa trên giao diện; không tin tenant/user/giá/tổng tiền từ client; tiền là số nguyên VND; thanh toán đi qua sổ ca server (`/api/finance`) với `requestId` và `expectedAmount`. Khối nào chưa có dữ liệu thật thì ẩn hoặc hiện trạng thái rỗng.

## Tài liệu cũ đã bị thay thế
`docs/DESIGN.md` (sidebar xanh rừng, vàng `#e4c17b`, nền giấy) và `docs/UI-REDESIGN-PLAN.md` mô tả thiết kế **cũ**, chỉ để tham khảo lịch sử. Khi mâu thuẫn, `docs/UI_DESIGN_BASELINE.md` thắng.

## Lệnh kiểm tra
`pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm build` · e2e: `pnpm test:e2e` (một số bài e2e cũ còn trỏ vào giao diện POS trước đây).
