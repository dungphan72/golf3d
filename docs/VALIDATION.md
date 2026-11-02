# Kiểm tra v0.4

- 109 checks: 55 TypeScript, 13 booking SQL, 21 finance SQL, 19 F&B SQL, 1 migration-splitter regression. Strict TypeScript and production build pass.
- F&B SQL tests use all migrations and actual server SQL. Cover serving before/after golf finish, concurrent finish/serve, 8 simultaneous serve attempts, tenant isolation, retry keys, stale menu, pending-order payment blocking, cancellation, immutable snapshots and audit-failure rollback.
- Mutation check disabling the pending-food payment guard failed the corresponding test as expected; source restored before local migration.
- Existing financial and pricing tests retained; cash collection now requires expectedAmount as a comparison, never as the trusted amount posted.
- Native audit rerun on unchanged dependency lockfile still reports 3 critical, 35 high, 36 moderate and 11 low. Keep owner-private/test data; remediation still required before production.
- Browser authenticated E2E, physical-device mobile/PWA, customer QR/OTP, stock, print-device and station routing acceptance are pending.

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

## Migration parser regression v0.4
Wrangler 4.92.0 did not recognize CASE after `amount=CASE` as a compound block, split the trigger before its audit INSERT and returned incomplete input. SQLite executescript alone did not reveal this. No 0002 tables/triggers were applied after the failed local batch (verified in sqlite_master). The unapplied 0002 was repaired with `amount= CASE`; the added test uses Wrangler's actual splitter and executes every resulting statement against SQLite. It failed before the fix and passed after; the local D1 migration was then retried. Do not rewrite this migration once applied.

## v0.5

125 tests: 60 TypeScript, 13 booking SQL, 21 finance SQL, 19 F&B SQL, 11 stock SQL, 1 migration splitter. TypeScript strict và build Vinext thành công. Stock tests gồm tranh chấp tồn cuối, giữ/nhả hàng, không xuất phần đã giữ, chống ghi trùng, khóa đơn vị và audit failure rollback cả tiền/kho/đơn. Migration 0003 chạy thành công bằng Wrangler local (17 statements); 0000–0002 giữ nguyên.

Chưa kiểm thử end-to-end sau đăng nhập thực tế vì browser preview không có identity. Audit dependency còn cảnh báo như REVIEW-v03; không thêm dependency trong v0.5.

## v0.5.1

Sau cập nhật Next 16.4.1 và sharp 0.35.5, strict typecheck, 125 regression tests và production build đã qua. Frozen lockfile install dùng --ignore-scripts; không thêm quyền chạy lifecycle script. Native audit: 0 critical / 32 high / 31 moderate / 10 low. Vẫn chưa kiểm thử nghiệp vụ end-to-end bằng identity đăng nhập thật.

## v0.5.2

126 tests (60 TypeScript, 1 Flight transport thật, 65 SQLite/migration). Chạy `pnpm test:rsc` để kiểm tra server/client Flight truyền giá trị booking, Unicode và nhiều typed arrays. Typecheck/build qua; lockfile chỉ đổi react, react-dom, react-server-dom-webpack và peer identifiers. Audit 0 critical / 31 high / 31 moderate / 10 low; xem REVIEW-v052.md về giới hạn scanner và nguồn advisory ngoài feed. Chưa nghiệm thu authenticated E2E.

## v0.5.3

127 tests: 60 TypeScript, 1 Flight, 1 Worker HTTP/JSON/D1, 65 SQLite/migration. Test mới chạy `pnpm test:runtime`; không gọi Internet hay dữ liệu nghiệp vụ. Miniflare thực tế resolve undici 7.30.1, strict typecheck và build qua. Audit 0/21/17/5; chỉ là kết quả scanner. Authenticated E2E vẫn chưa nghiệm thu.

## v0.5.4

130 tests: 60 TypeScript + 1 Flight + 1 Worker HTTP/D1 + 3 tooling parsers + 65 SQLite/migration. `pnpm test:tooling` kiểm tra cả hai major brace và YAML thực tế của ESLint, gồm các trường hợp tài nguyên bị khai thác trong advisory. Strict typecheck/build qua. Native audit 0/8/16/5; authenticated E2E vẫn chờ.
