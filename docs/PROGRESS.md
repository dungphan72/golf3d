# Tiến độ Golf3D

## v0.4 — thực đơn, gọi món theo phiên và bếp/bar
- Quản lý món theo nhóm, đơn vị, giá trước thuế/phí, VAT và phí F&B riêng; tạo/sửa/tạm ngưng, giữ lịch sử giá đơn đã gửi.
- Nhân viên/chủ cơ sở gọi tối đa 10 loại món/đơn trong phiên đang chơi; xem giá đầy đủ trước gửi; không giả lập OTP hay quyền khách hàng.
- Hàng đợi bếp/bar chung theo đơn, chờ → chuẩn bị → sẵn sàng → phục vụ; hủy trước phục vụ có lý do, trạng thái có version guard.
- Đơn chỉ cộng tiền khi phục vụ. Golf và món có phần thuế/phí riêng, không tính trùng. Kết thúc phiên và phục vụ đồng thời không mất tiền món.
- Chặn thu khi còn đơn chờ, khi số tiền nhân viên đã xem khác số hiện tại hoặc khi giá món vừa đổi. Retry không tạo đơn/ghi tiền lần hai.
- Migration 0002 thêm menu_items, food_orders, food_total (default 0) và golf_amount (nullable); giữ nguyên migration cũ và dữ liệu đã thanh toán.
- 55 tests TypeScript + 13 booking SQL + 21 finance SQL + 19 F&B SQL + 1 migration-splitter regression = 109. Build/strict typecheck đạt; kiểm thử E2E sau đăng nhập và thiết bị thật vẫn chưa hoàn tất.
- Migration 0002 đã chạy trên D1 local sau khi sửa tương thích bộ tách SQL của Wrangler; thêm test chạy từng câu lệnh do Wrangler thực sự tạo.
- Không thêm dependency; audit kiểm tra lại vẫn 3 critical/35 high/36 moderate/11 low. Giữ bản thử owner-private, không dùng thu tiền thật.


## v0.3 — ca làm việc và sổ tiền
- Mở ca với tiền mặt đầu ca; một ca mở/tenant, lưu người và thời điểm mở.
- Thanh toán phiếu đi qua sổ mới; yêu cầu ca mở, lấy tiền từ backend, chống thu trùng và chống retry khác nội dung.
- Ghi nộp/chi tiền mặt có lý do; không chi vượt quỹ. Chuyển khoản/thẻ không làm tăng tiền mặt.
- Đối soát ba phương thức, bắt buộc lý do khi chênh; chặn đóng bằng version cũ và khóa ca đã đóng.
- Migration 0001 thêm shifts/finance_entries, unique constraints và triggers; ghi sổ, booking, version và audit trong cùng transaction. Không sửa migration 0000, không backfill phiếu cũ.
- Dashboard thực thu dùng thời điểm nhận tiền từ ledger; xem 30 ca và 100 dòng gần nhất nhưng tổng không cắt theo trang.
- Mobile có tab Ca & quỹ; chốt/thu/chi qua native dialog.
- 48 tests TypeScript + 13 tests SQL booking + 21 tests SQL tài chính. Migration đã chạy trên D1 local.
- Native dependency audit có 3 critical/35 high từ nền starter; xem docs/security/REVIEW-v03.md. Giữ owner-private/test data, không đánh dấu production-ready.


## v0.2 — bảng giá và báo giá trước đặt
- Quy tắc giá theo dịch vụ, loại phòng, ngày thường/cuối tuần/ngày lễ, khung giờ và nhóm 1–4 người. Thêm/sửa/tắt/xóa trong Admin, có bộ lọc.
- GDR chia theo từng khung giá và ngày lịch Việt Nam; gói 9/18 khóa đơn giá theo giờ bắt đầu đã đặt.
- Phí cố định hoặc phần trăm, chọn dịch vụ chịu phí, VAT; báo giá gồm từng dòng và tổng dự kiến ngay trong form đặt.
- Chặn khung giá trùng, thời gian thiếu đơn giá, ngày lễ sai, cấu hình sai, sức chứa sai và phiên ngoài giờ mở cửa.
- Dùng số nguyên BigInt cho phần tiền theo thời gian; phân bổ làm tròn để tổng các dòng đúng bằng tiền dịch vụ.
- Lưu revision và snapshot mỗi booking; chặn xác nhận khi báo giá vừa thay đổi. Cập nhật cấu hình dùng compare-and-swap chống ghi đè từ thiết bị khác.
- Snapshot v0.1 tiếp tục dùng công thức cũ; cấu hình flat cũ chuyển thành các khung giá tương đương, không tự tăng giá khách đã đặt.
- Nếu chơi vượt sang giờ chưa có giá: vẫn được kết thúc/ghi thời gian, nhưng chưa xác nhận tiền hoặc in phiếu cho đến khi xử lý giá. Quy trình duyệt điều chỉnh giá đang chờ triển khai.
- Không thêm migration; giá/cấu hình nằm trong JSON hiện có. Dữ liệu cũ không bị xóa.


## v0.1 — bản thử nội bộ
Đã có source và kiểm tra:
- Dashboard xanh lá/vàng, sơ đồ 10 line + 2 VIP; mobile bottom navigation; PWA manifest.
- D1 schema, migrations; tenant namespace lấy từ danh tính Sites, mọi truy vấn có scope.
- Booking nội bộ có kiểm tra đầu vào, giờ mở/qua đêm, sức chứa, bước giờ, giá đã cấu hình; INSERT kiểm tra trùng một câu SQL.
- Bắt đầu, tạm dừng do sự cố, tiếp tục, kết thúc; trạng thái cập nhật có optimistic guard chống hai thiết bị thao tác lặp.
- Snapshot cấu hình/giá; giá GDR tách Happy Hour; 9/18 trọn lượt; VAT/phí %; tiền lưu VND nguyên.
- Xác nhận tiền mặt/chuyển khoản đã kiểm tra/thẻ tại quầy; phiếu in qua browser.
- Yêu cầu hỗ trợ cơ bản, tiếp nhận/hoàn thành, refresh 15 giây.
- Cài đặt thời gian, giá, sức chứa và khoảng đệm; nhật ký hành động.

## Giới hạn phải biết
- KHÔNG sẵn sàng dùng làm hệ thống thu ngân chính thức.
- Chỉ Sites owner-private; chưa có OTP golfer, tổ chức/nhân viên RBAC hay SaaS tự đăng ký.
- Chưa có thay phòng, giảm giá/duyệt tài chính, mixed payment, hoàn tiền, bàn giao giữa nhân viên có phân quyền và duyệt xử lý phiên thiếu giá.
- Các khung giá tham khảo cần chủ cơ sở kiểm tra trước mở bán. Giá nhóm/VIP chưa rõ phải nhập, không suy đoán. Snapshot booking v0.1 vẫn giữ hành vi giá flat lịch sử.
- F&B theo phiên và bếp/bar đã có v0.4; còn kho/công thức/size/topping, khách gọi qua QR, CRM, HLV, gói/hội viên, giải, báo cáo lợi nhuận, backup và import Excel.
- Chưa có kết nối bên ngoài, notification âm thanh/push/escalation hoặc kết nối thiết bị.
- PWA manifest/standalone cơ bản; chưa có service worker/offline, đúng phạm vi cần Internet.
- UI tiếng Việt trước; EN/KO và CMS giai đoạn sau.

## Thứ tự tiếp tục (không bỏ yêu cầu)
1. Tách service/api, hoàn thiện auth golfer + organization memberships/RBAC, bảo vệ tenant và kiểm thử truy cập chéo.
2. Hoàn thiện policy booking/late/cancel/deposit, chuyển phòng, adjustment approvals. Bảng giá/revision/báo giá đã hoàn thành trong v0.2, chưa gồm lịch tự hiệu lực trong tương lai.
3. Ledger và ca cơ bản đã có v0.3. Tiếp tục split/mixed tender, hoàn tiền/duyệt điều chỉnh, bàn giao nhân viên, xuất/lọc lịch sử và idempotency cho các mutation ngoài tài chính.
4. F&B và hàng đợi bếp/bar đã có v0.4. Tiếp tục customer-session binding/QR, thông báo realtime, phân quyền, kho/công thức/mua hàng và chia station/hủy từng món.
5. Gói/loyalty/HLV/CRM/giải/reporting và connectors thật.
6. Tenant onboarding, billing thuê bao, branded website, 3 ngôn ngữ/CMS, domain, backup/restore, load/security/accessibility QA trước mở công khai.

## v0.5 — Kho thành phẩm F&B

Đã thêm menu Kho F&B, bật theo dõi từng món, nhập/điều chỉnh có lý do, ngưỡng cảnh báo, ledger bất biến. Đơn giữ số lượng ngay khi gửi, phục vụ mới trừ tồn; hủy trả phần giữ. Chặn vượt khả dụng, tenant khác, ghi trùng và đổi đơn vị đã theo dõi. Chi tiết: STOCK.md.

Chưa có công thức nguyên liệu, giá vốn/nhà cung cấp, OTP/QR khách tự gọi món, RBAC nhân viên. Vẫn thử nội bộ; vấn đề audit dependency chưa giải quyết.

## v0.5.1 — Vá bảo mật dependency

Next.js/eslint-config-next 16.4.1 và sharp 0.35.5. Native audit: 0 critical, 32 high, 31 moderate, 10 low; trước đó 3/35/36/11. Không sửa dữ liệu, migration hay nghiệp vụ. 125 regression tests, strict typecheck và build đã qua. Chi tiết REVIEW-v051.md; chưa sẵn sàng công khai và vẫn chờ authenticated E2E.

## v0.5.2 — React Server Components

Đồng bộ 3 gói React lên 19.2.9 theo advisory chính thức; không dừng ở 19.2.8 chỉ sửa DoS cũ. 126 tests và build/typecheck qua, có Flight round-trip với nhiều typed arrays và tiếng Việt. Native audit: 0/31/31/10. Audit feed không liệt kê RCE RSC mới, nên zero critical của v0.5.1 không phải xác nhận không có rủi ro; REVIEW-v052.md ghi rõ đối chiếu nguồn chính thức và các blocker còn lại.

## v0.5.3 — Mạng của môi trường Worker

Scoped override Miniflare → undici 7.30.1, chỉ đổi một package family. 127 tests và build/typecheck qua; kiểm tra mới chạy Workerd thật với JSON HTTP + D1 tạm thời. Native audit 0 critical / 21 high / 17 moderate / 5 low. Xem REVIEW-v053.md về phạm vi local tooling, chính sách script và các blocker còn lại. Không thay đổi dữ liệu, auth hay quyền truy cập.

## v0.5.4 — Bộ đọc cấu hình và mẫu tên tệp

Vá brace-expansion hai major riêng biệt và js-yaml 4; chỉ ba package records thay đổi. Thêm 3 kiểm tra: mở rộng mẫu thông thường, lồng sâu 4.000 cấp và merge YAML rỗng vượt budget. Tổng 130 tests, typecheck/build qua. Native audit: 0 critical / 8 high / 16 moderate / 5 low. REVIEW-v054.md ghi giới hạn và blocker còn lại; chưa mở công khai.

## v0.6 — hội viên, đặt online, HLV, hạ tầng riêng
- Đăng nhập mật khẩu + 6 vai trò (migration 0004); hội viên, gói trả trước, thẻ VIP, tích điểm, trả phiên bằng lượt gói (0005, xem MEMBERSHIP-DESIGN.md); yêu cầu đặt online khách gửi / nhân viên xác nhận (0006); HLV và lịch dạy chống trùng lịch (0007).
- Chạy trên Cloudflare riêng (Workers + D1) — xem DEPLOY-CLOUDFLARE.md. Có Playwright E2E và CI GitHub Actions.
- Chưa có: thu học phí HLV vào sổ ca, giảm F&B theo thẻ, thông báo Zalo/SMS, CAPTCHA, hóa đơn MISA, SePay, GC3, giao diện mới, Postgres/Supabase.
