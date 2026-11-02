# Changelog

## 0.4.0 — 2026-11-02
- Add configurable food/drink menu with explicit item VAT and service fees, archived availability and versioned prices.
- Create orders from playing sessions; process kitchen/bar states and reasoned cancellation before serving.
- Charge served orders once and include item details in combined receipts, with separate F&B taxes/fees.
- Block payment for unserved orders and require cashier confirmation of the currently reviewed total.
- Add migration 0002 without rewriting existing migrations; cover tenant scope, races, stale prices, audit rollback and snapshot immutability.
- Retain private-pilot status and unresolved dependency-audit release blockers.

## 0.3.0 — 2026-11-02
- Add opening float, cash movements, cash/card/transfer reconciliation and locked shift closing.
- Route new receipts through a tenant-scoped append-only journal; atomically update invoice, shift version and audit.
- Prevent duplicate receipts, negative cash balances, edits to paid totals and stale shift closes.
- Keep old paid receipts unchanged; dashboard new receipts follow actual recording time.
- Add migration 0001, financial input tests and SQLite concurrency/rollback tests.
- Record unresolved starter dependency advisories; retain private-pilot status.

## 0.2.0 — 2026-11-02
- Add configurable tariffs by room type, service, day type, time window and group size.
- Show estimated service, fee, VAT and total before booking; reject stale displayed prices.
- Lock round prices to booked start and preserve historical booking snapshots.
- Add fixed or percentage fee with service scope; precise row rounding.
- Guard concurrent settings updates and reject overlapping or invalid tariffs.
- Record end time even when a session overruns into an unpriced period; block payment/receipt until reviewed.
- Retain private-pilot access and existing data; no database migration in this version.

## 0.1.0 — 2026-11-02
- Initial private room map, booking, session timer, receipts and basic support requests.

## 0.5.0
- Kho thành phẩm: nhập hàng, tăng/giảm có lý do, tồn thực tế/giữ/khả dụng, cảnh báo thấp và lịch sử bất biến.
- Đơn giữ hàng khi gửi, hủy giải phóng, phục vụ xuất kho cùng giao dịch hóa đơn; chống ghi trùng và vượt tồn khi đồng thời.
- 125 tests, migration 0003; chưa hỗ trợ công thức nguyên liệu/giá vốn, giữ bản thử riêng tư.

## 0.5.1 — Security
- Cập nhật Next.js và thư viện ảnh; audit giảm từ 3 xuống 0 cảnh báo critical.
- Giữ bản thử riêng tư: còn 32 high, 31 moderate và 10 low cần xử lý theo từng nhóm.

## 0.5.2 — Security
- Vá React / React DOM / React Server Components lên 19.2.9, thêm kiểm tra Flight transport thực tế.
- 126 kiểm tra qua; native audit còn 0 critical, 31 high, 31 moderate, 10 low. Giữ thử riêng tư, chưa nghiệm thu end-to-end sau đăng nhập.

## 0.5.3 — Security
- Vá thư viện mạng của môi trường Worker, thêm kiểm tra HTTP/JSON/D1 thực tế.
- 127 kiểm tra qua; native audit giảm high 31 → 21, moderate 31 → 17, low 10 → 5; critical vẫn 0. Tiếp tục thử riêng tư.
