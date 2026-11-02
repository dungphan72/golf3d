# Kiểm tra v0.3

- TypeScript strict + production build pass.
- 48 TypeScript tests, 13 legacy booking SQL tests, 21 financial SQL tests. No tests skipped/deleted.
- Finance SQL tests apply all migrations, use the exact server statement constants and real SQLite triggers. Cover 8 concurrent payment attempts, concurrent cash withdrawals, tenant scope, append-only enforcement, stale closes, audit failure rollback, all-entry aggregates and method separation.
- New migration 0001 executed successfully with Wrangler local D1 (18 SQL commands); migration 0000 unchanged.
- Native dependency audit NOT clean: 3 critical, 35 high, 36 moderate, 11 low. No dependency upgrades or forced fixes in this feature. Triage and private-only mitigation: docs/security/REVIEW-v03.md.
- Authenticated browser end-to-end and physical mobile/PWA QA remain pending; preview lacks visitor identity. Do not interpret build/unit tests as production acceptance.

# Kiểm tra v0.2

- TypeScript strict và production build: pass.
- 38 kiểm tra TypeScript: giữ 8 kiểm tra v0.1, thêm khung giá, ngày lễ, giá gói theo giờ đã đặt, nhóm chưa có giá, phí cố định/phạm vi dịch vụ, snapshot, qua đêm/24h, các dòng làm tròn khớp tổng, dữ liệu sai và giới hạn phiên 31 ngày.
- 13 kiểm tra SQLite: giữ 10 kiểm tra đồng thời/trùng/tenant/thanh toán v0.1, thêm chống ghi đè cấu hình, chuyển đổi cấu hình cũ và cách ly cập nhật settings.
- TDD: 7 test mới về bảng giá thất bại trên mã cũ, rồi đạt sau khi triển khai.
- Browser preview: đã mở bảng giá Admin, thêm/mở rule, sửa đơn giá, đổi sang phí cố định và nhập danh sách ngày lễ. Không lưu dữ liệu qua browser vì preview không có danh tính người dùng. Các kiểm tra lưu thật qua UI, mobile thiết bị thật và OTP chưa hoàn thành.
- Không sửa SQL migration đã áp dụng. Không bỏ/skip test cũ.

## Lịch sử kiểm tra v0.1

- TypeScript strict: pass.
- 8 pricing tests: Happy Hour boundary, 70 minutes without block rounding, weekend, pause exclusion, tax/fee arithmetic, VIP, missing rate, invalid interval.
- 10 SQLite behavior tests against actual API statements: overlap, adjacency including cleanup, tenant scope, separate room, cancellation, paid cleanup, active overrun, future booking during active use, compare-and-swap repeat payment and 8 concurrent booking attempts with one winner.
- Mutation test removing weekend exclusion: pricing test failed as expected; original code restored and suite rerun.
- Supported Sites production build: pass.
- Browser: desktop room map, empty/error states and navigation inspected; preview has no injected visitor identity, so authenticated end-to-end path must be checked on private deployment.
- Mobile CSS: 2-column rooms, bottom nav, native dialogs and mobile forms implemented. Full physical-device/PWA, 3 locale and accessibility audits pending.

These checks cover an internal pilot, not readiness for real-money operation. Required production work remains in PROGRESS.md.
