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

## v0.6.1 — chuyển khoản QR + SePay (migration 0008)
- Cài đặt: BIN, số tài khoản, tên chủ tài khoản; khóa webhook SePay (chỉ lưu bản băm). Webhook: `POST /api/webhooks/sepay` với `Authorization: Apikey <khóa>`.
- Hộp thanh toán hiện mã VietQR đúng số tiền + nội dung `SGG<mã>`; tiền báo có tự hiện, nhân viên bấm xác nhận để ghi sổ ca (không tự ghi sổ). Mỗi giao dịch chỉ dùng một lần, đúng số tiền, đúng phiếu.
- Chưa thử với SePay thật (cần tài khoản/khóa của anh): kiểm thử dùng webhook mô phỏng theo tài liệu SePay.

## v0.7 — Chống bot & báo cáo doanh thu

- Turnstile tùy chọn cho `/book/<mã>`: bật khi có `TURNSTILE_SITE_KEY` + secret `TURNSTILE_SECRET` (xem DEPLOY-CLOUDFLARE).
- Tab **Báo cáo** (quyền `finance.view`): tổng thu theo ngày và hình thức thanh toán, bán gói, chi tiền mặt, doanh thu theo dịch vụ; chọn khoảng ngày tối đa 366 ngày. Chỉ đọc sổ tiền, không ghi gì.

## v0.7.1 — Thanh toán chia nhiều hình thức

- Một phiếu có thể thu bằng 2–3 hình thức (ví dụ một phần tiền mặt, một phần chuyển khoản/thẻ): nút "Chia nhiều hình thức thanh toán" trong hộp thanh toán. Các phần phải cộng đúng số phải thu; mỗi hình thức chỉ dùng một lần.
- Migration 0009: cột `finance_entries.part` (1 = một phần của thanh toán chia). Trigger chỉ chuyển phiếu sang "đã thanh toán" khi các phần cộng đủ, `payment='mixed'`; vượt số tiền hoặc trùng hình thức bị chặn ở tầng database. Thanh toán một lần (part=0) giữ nguyên quy tắc cũ.
- Phần chuyển khoản trùng khớp với báo có SePay thì tự gắn và đánh dấu giao dịch đã dùng trong cùng một batch.
- Ca/sổ tiền và báo cáo tính từng hình thức riêng nên đối soát không đổi.

## v0.7.2 — Nhật ký hoạt động

- Tab **Nhật ký** (quyền `staff.manage`: chủ, quản lý): danh sách hoạt động mới nhất trước (ghi sổ tiền, ca, xác nhận…), tìm theo từ khóa, xem thêm từng trang 200 dòng. Chỉ đọc bảng `audit`.

## v0.8 — Giao diện kiểu KiotViet

- Khung quản lý đổi sang thanh menu ngang phía trên (xanh lá đậm + vàng, hài hòa logo) (8 mục chính + "Quản lý khác" cho thực đơn, kho, huấn luyện, hỗ trợ, cài đặt, nhân viên, nhật ký, tài khoản); bảng dày có tiêu đề nền xanh nhạt, nút và ô nhập vuông gọn, nền xám nhạt.
- Điện thoại/máy tính bảng giữ menu dạng ngăn kéo và thanh dưới, cùng bảng màu. Trang đặt lịch công khai và đăng nhập vẫn giữ nhận diện xanh lá–vàng của Saigon Golf 3D Club.
- Toàn bộ giao diện nằm ở `app/kiotviet.css` (ghi đè có phạm vi `.app-shell`), có thể chỉnh màu ở các biến `--kv-*`.
- Nút nhiều chữ (Tải lại, Thu / chi tiền mặt, Đối soát & đóng ca, Tạm dừng, In phiếu, Chia thanh toán, Tải CSV…) chuyển thành biểu tượng kèm tooltip (`data-tip`); màn hình cảm ứng/điện thoại vẫn hiện chữ.

## v0.9 — Trang giới thiệu công khai (landing page)

- `/` là trang giới thiệu cho khách: giới thiệu dịch vụ, bảng giá chính thức, 13 gói/combo/thẻ VIP (đọc từ `lib/official-packages.ts`), cách đặt lịch 3 bước, hỏi đáp, liên hệ + chỉ đường, dữ liệu có cấu trúc (JSON-LD) và Open Graph cho tìm kiếm/chia sẻ. Nút đặt lịch trỏ tới `/book/<mã>` khi cơ sở đã bật đặt online; chưa bật thì chuyển thành gọi hotline.
- Ứng dụng quản lý chuyển sang `/quan-ly` (có link "Dành cho nhân viên" ở chân trang); manifest/PWA mở `/quan-ly`.
- `robots.txt` chặn `/quan-ly`, `/api/`, `/book/`; có trang 404 riêng.
- Khi giá/gói thay đổi: sửa `lib/official-packages.ts` (gói) và mảng `PRICES` + câu hỏi trong `app/page.tsx` (bảng giá, FAQ).

## v0.9.1 — Bản điện thoại kiểu ứng dụng

- Điện thoại (≤640px): thanh tiêu đề xanh có tên màn hình + nút menu, nút nổi vàng "+" để tạo lịch đặt, danh sách lịch đặt dạng thẻ chạm được, thanh tab dưới có viên thuốc đánh dấu tab đang chọn, hộp thoại dạng ngăn kéo từ dưới lên (có thanh kéo, hoạt ảnh), ô nhập 16px (không bị zoom trên iOS), hỗ trợ vùng an toàn (tai thỏ/thanh Home). Giao diện nằm ở `app/mobile.css`.

## v0.9.2 — Đặt chỗ online ngay trên trang chủ

- Form đặt chỗ nhúng thẳng vào trang chủ (mục "Đặt chỗ online"), dùng chung API/luật với `/book/<mã>`; nút đặt lịch cuộn tới form, thanh nút cố định ở dưới trên điện thoại. Chưa bật đặt online thì mục này hiện "Đặt chỗ qua hotline".
- Trang chủ bổ sung: băng giờ vàng, "Vì sao chọn", chân trang nhiều cột.
- Cài đặt cơ sở báo rõ còn thiếu gì để mở đặt online (giờ mở/đóng, số line, VIP, **VAT, phí dịch vụ**). Trang đặt lịch chỉ mở khi đủ các mục này vì báo giá cho khách có VAT và phí.

## v0.9.3 — Landing page cuộn trang (scroll-driven)

- Thiết kế lại trang chủ theo hướng cuộn trang có chuyển động, tự viết bằng CSS + một component nhỏ (`app/ui/ScrollFx.tsx`), không dùng thư viện hay skill ngoài: cảnh sân golf nhiều lớp có parallax ở phần đầu, thanh tiến độ cuộn, menu đổi nền khi cuộn, các khối hiện dần, số liệu đếm lên, phần "Một buổi chơi, bốn bước" được ghim lại và bóng golf bay theo thanh cuộn.
- Tôn trọng chế độ giảm chuyển động của hệ điều hành (hiện tĩnh, không chuyển động). Điện thoại có thanh Đặt chỗ cố định ở dưới.
- Skill "ScrollCraft" (bài MindStudio) không có nguồn tải công khai nên không được cài; xem thông tin ở lịch sử trò chuyện.

## v0.9.4 — Trang chủ dựng bằng skill ScrollCraft

- Skill ScrollCraft (https://github.com/nateherkai/scroll-craft, MIT) đã cài vào `~/.claude/skills/scroll-craft` sau khi đọc mã nguồn (script chỉ gọi kie.ai khi có khóa, máy chủ cục bộ, Chrome ẩn danh và ffmpeg).
- Trang chủ `/` dựng theo ngữ pháp "chaptered editorial" (trang in tạp chí): bìa chữ trên giấy kem, chương I "Một buổi chơi" ghim lại và bóng golf bay theo thanh cuộn (đỉnh cao của trang), chương II giờ vàng (số liệu thật đếm lên), chương III bảng giá và gói trên băng cuộn ngang, chương IV đặt chỗ (form nhúng) kèm hỏi đáp, trang cuối dạng colophon.
- Nét riêng của trang: **thanh quỹ đạo cú đánh** cố định ở đáy; cả trang là một cú đánh, bóng là vị trí cuộn, mỗi chương đi qua cắm một lá cờ, bấm lá cờ để nhảy chương.
- Engine ở `public/scrollcraft/` (không sửa), mã trang ở `app/page.tsx`, `app/landing.css`, `app/ui/ScrollCraftMount.tsx`. Brief, bảng điểm và sổ dấu vân tay ở `scrollcraft/`.
- Kiểm tra bằng harness của skill ở 3 chế độ (máy tính, điện thoại, giảm chuyển động): không có đoạn cuộn chết, mọi dòng chữ đạt tương phản 4.5:1. Chưa kiểm tra trên điện thoại thật. Không có ảnh thật của cơ sở nên không tạo ảnh/video (không có khóa kie.ai).

## v0.9.5 — Trang chủ theo mẫu "Fairway" (Dribbble, NICKELFOX)

- Dựa trên bố cục mẫu Fairway Premium Golf Club: khung hero bo góc lớn, thanh điều hướng trắng khoét góc ở trên trái, tab "Đặt chỗ ↗" khoét góc ở trên phải, tiêu đề chữ mảnh cỡ rất lớn ("Nâng tầm cú đánh"), thẻ nổi bo tròn (giờ vàng, khám phá phòng chơi), bong bóng lời thoại, tab dọc giờ mở cửa. Phối màu xanh trời, xanh cỏ, trắng; điểm nhấn vàng của thương hiệu.
- Chỉ tham khảo bố cục và phong cách, không dùng ảnh hay chữ của tác giả. Cảnh sân golf (người chơi, núi, hồ, cờ) là **hình vẽ SVG** do mình dựng; khi có ảnh thật của cơ sở thì thay vào `CourseScene` trong `app/page.tsx`.
- Các phần dưới dùng cùng ngôn ngữ thẻ trắng bo tròn: bốn bước, giờ vàng (số đếm lên), bảng giá, gói hội viên theo nhóm, đặt chỗ (form nhúng) + hỏi đáp, liên hệ. Menu thu gọn cố định hiện sau khi cuộn qua hero. Engine ScrollCraft chỉ còn dùng cho hiện dần và đếm số.

## v0.9.6 — Ảnh thật của cơ sở trên trang chủ

- Dùng bộ ảnh anh gửi (4 ảnh: banner ngang, banner 16:9, ảnh vuông quả bóng, poster dọc). Nền hero là ảnh phòng chơi **sạch** cắt từ poster dọc (không có chữ), có bản riêng cho điện thoại (`public/img/hero-room*.webp`).
- `public/banner.webp` thay bằng banner ngang mới (dùng ở trang `/book/<mã>`, thẻ "Khám phá phòng chơi" và phần liên hệ). Mục "không gian" dùng banner 16:9 và ảnh vuông (`public/img/space-*.webp`). Ảnh xem trước khi chia sẻ là `public/og.jpg`.
- Các ảnh banner có logo, địa chỉ, hotline in sẵn nên chỉ dùng làm ảnh minh họa, không đặt chữ chồng lên.
- Ảnh gốc nằm ngoài dự án (thư mục tạm của phiên làm việc); các bản đã nén nằm trong `public/`. Nên giữ bản gốc độ phân giải cao ở nơi khác để làm lại khi cần.

## v0.9.7 — Bộ ảnh mới + ảnh thiết bị Foresight GC3

- Thay bộ ảnh theo 4 ảnh mới (banner chỉ có logo, ảnh vuông quả bóng, poster dọc, banner có khu ghế chờ). Nền hero là ảnh phòng chơi (ghế chờ, màn hình, túi gậy) cắt từ banner khu ghế chờ, đã loại phần chữ; banner dùng bản chỉ có logo; ảnh xem trước khi chia sẻ cắt từ banner logo.
- Thêm khối "Foresight GC3 đo từng cú đánh" dùng ảnh thiết bị GC3 (3 góc nhìn) lấy từ https://www.foresightsports.asia, ghi nguồn "Ảnh thiết bị: Foresight Sports". Không dùng ảnh có huy hiệu giải thưởng Golf Monthly. Chủ cơ sở xác nhận (05/11/2026) đã được Foresight Sports Asia cho phép dùng ảnh trên website của cơ sở.
- Poster dọc chưa dùng (có logo lớn, hợp làm ảnh story/áp phích hơn).

## v0.9.8 — Phần đầu trang bám sát mẫu Fairway

- Dựng lại hero theo ảnh mẫu ở độ phân giải cao: khung viền trắng bo góc trên nền cảnh mờ tối, menu nằm thẳng trên ảnh (không có tab), tab trắng khoét góc "Đặt chỗ" kèm nút tròn xanh nhạt, tiêu đề "Nâng tầm" mảnh nhỏ + "cú đánh" cực lớn lệch nhau như mẫu, đoạn mô tả nhỏ bên dưới, bong bóng lời thoại bo vuông, tab dọc giờ mở cửa ở góc dưới trái, thẻ "Giờ vàng" (thay cho thẻ "thành viên mới"), thẻ "Khám phá phòng chơi" có ảnh trên, nút tròn cuộn xuống.
- Khác mẫu có chủ ý: ảnh nền là phòng chơi thật (không có người chơi chụp ngoài trời), chuỗi huy hiệu 9/18/GDR/VIP thay cho ảnh avatar (không dùng ảnh người giả).

## v0.9.9 — Font chữ theo phong cách mẫu Fairway

- Trang chủ đổi sang font **Lexend** (hình học, nét mảnh, chữ "a" một tầng như mẫu; hỗ trợ đầy đủ tiếng Việt). Tiêu đề lớn dùng độ mảnh 250/300, chữ nhỏ 400–500; Be Vietnam Pro làm dự phòng. Font nạp từ Google Fonts trong `app/page.tsx`.
- Mẫu dùng font không có bộ dấu tiếng Việt (nhiều font hình học như Outfit, Urbanist chỉ có Latin) nên em chọn Lexend vì giống nhất mà vẫn đủ dấu.

## v0.9.10 — Thang cỡ chữ thống nhất

- Mọi cỡ chữ của trang chủ dùng một thang biến (`--t-2xs … --t-h1b` đầu `app/landing.css`): chữ nhỏ 12–14px, nội dung 16px, tiêu đề phụ 18–20px, tiêu đề mục tối đa 40px, số liệu tối đa 36px, tiêu đề hero tối đa 72px (trước đó tới ~176px). Muốn đổi cỡ toàn trang chỉ sửa các biến này.

## v0.10 — Trang bảng giá `/bang-gia` đồng bộ với admin

- Trang `/bang-gia` (tiếng Việt): hero kèm giờ mở cửa/VAT/giờ vàng từ…, thẻ giá theo khung giờ (GDR/giờ, 9 hố, 18 hố mỗi người; thẻ giờ vàng nổi bật, kèm đồ ăn miễn phí), thẻ nhóm 4 người, ghi chú phòng VIP dùng chung bảng giá (hoặc bảng riêng nếu VIP có giá riêng), gói hội viên chia nhóm (Combo 9 hố, Combo 18 hố, GDR, Thẻ VIP) với danh sách quyền lợi, lưu ý thuế/giờ vàng/tích điểm, nút đặt chỗ.
- **Không còn giá cứng trong mã**: giá lấy từ cấu hình admin (Cài đặt cơ sở → bảng giá theo khung giờ) và danh mục gói (Hội viên → Danh mục gói), qua `lib/server/pricing-service.ts` + `lib/price-table.ts`. Trang chủ cũng đọc cùng nguồn nên sửa một chỗ là cả hai trang đổi. Khi chưa lưu gì thì dùng bảng giá chính thức làm mặc định.
- Admin: tab Hội viên có nút **Thêm gói** và **Sửa** (tên, giá, hiệu lực, số lượt 9 hố/18 hố/GDR hoặc không giới hạn, quyền lợi, đang bán/ngừng bán). Gói mới tự vào nhóm phù hợp trên trang giá.
- Tham khảo cấu trúc (giá theo giờ, gói trả trước, ưu đãi, hội viên) từ https://saigonswing.com/menu/ nhưng **không sao chép con số**: đó là bảng giá của đơn vị khác; giá hiển thị là giá của Saigon Golf 3D Club trong admin.
- Sửa khoảng cách chữ toàn trang (lề của tiêu đề/đoạn văn bị reset nhầm).

## v0.10.1 — Nhập bảng giá theo mẫu Saigon Swing (05/11/2026)

- Theo yêu cầu của chủ cơ sở, bảng giá và gói của https://saigonswing.com/menu/ được nhập vào cơ sở: giá theo giờ phòng tiêu chuẩn/VIP (Early Bird 07:00–11:00 hằng ngày 180.000/330.000đ; giờ thường 300.000/550.000đ), 4 gói giờ không thời hạn, 12 thẻ tháng/6 tháng/1 năm, 3 dòng "Ưu đãi theo ngày" (Ngày của phụ nữ Thứ Ba, trẻ em dưới 16 tuổi, giảm 40% gói Early Bird/Junior). Giờ mở cửa đổi thành 07:00–23:00.
- Giá 9/18 hố và giá nhóm 4 người **được tắt (không xóa)** trong bảng giá; 13 gói cũ (combo 9/18 hố, GDR, thẻ VIP) chuyển sang "ngừng bán". Bản sao dữ liệu trước khi đổi: `docs/backups/settings-before-saigonswing.json`, `docs/backups/package-types-before-saigonswing.json` (bật lại giá 9/18 trong Cài đặt → bảng giá; bán lại gói cũ trong Hội viên → Bán lại).
- Migration 0010: cột `section` (nhóm hiển thị trên trang giá) cho gói; form đặt chỗ chỉ hiện dịch vụ đang có giá.
- Hạn chế đã biết: (1) gói giờ trừ **1 đơn vị mỗi phiên**, chưa trừ theo số giờ của phiên (nhân viên dùng "điều chỉnh" để trừ thêm giờ nếu phiên dài hơn 1 giờ); (2) gói chưa phân biệt phòng tiêu chuẩn/VIP khi trừ; (3) "Ngày của phụ nữ" và "trẻ em dưới 16" chỉ hiển thị trên trang giá, hệ thống tính tiền chưa tự áp dụng; (4) dòng "TAKE 40% OF ALL PACKAGES" được hiểu là giảm 40%, chưa tạo gói Early Bird/Junior riêng.

## v0.10.2 — Gói trừ theo giờ, gói theo loại phòng, đổi "thường" thành "tiêu chuẩn"

- **Gói giờ trừ theo số giờ chơi thực tế** (làm tròn lên, dung sai 5 phút, tối thiểu 1 giờ): 62 phút = 2 giờ, 64 phút = 1 giờ. Gói 9/18 hố vẫn trừ 1 lượt mỗi phiên. Gói không đủ giờ thì không trả được (báo "còn X giờ, cần Y"); nhân viên thu tiền hoặc chọn gói khác. Ràng buộc nằm ở cơ sở dữ liệu (migration 0011: cột `units` của lượt dùng gói, trigger khớp số giờ với sổ gói).
- **Gói gắn với loại phòng**: `tiêu chuẩn` không trả được phòng VIP; `VIP` trả được cả hai; gói cũ (`tất cả phòng`) dùng mọi nơi. Chọn ở form Thêm/Sửa gói ("Áp dụng cho phòng"); trang giá ghi rõ phòng áp dụng.
- Đổi cách gọi: "phòng/line/gói thường" thành **"tiêu chuẩn"** trên toàn giao diện, tên 16 gói trong dữ liệu thật (Gói tiêu chuẩn 10 giờ (+2 giờ tặng), Gói VIP …, Thẻ tiêu chuẩn …, Thẻ VIP …) và các dòng ưu đãi. "Giờ thường"/"ngày thường" giữ nguyên vì chỉ khung giờ/loại ngày.
- Nhãn lượt GDR đổi thành "Giờ chơi".

## v0.10.3 — Trang thẻ hội viên `/thanh-vien`

- Trang công khai mới: quyền lợi hội viên (chơi mỗi ngày, đặt trước 4 tuần, gửi gậy miễn phí, bảo lưu một lần tối đa 6 tháng, đặt thêm giảm 10%), các thẻ hội viên và gói giờ. Thẻ và gói lấy từ danh mục gói trong admin (nhóm có tên bắt đầu bằng "Thẻ" hiện ở mục thẻ, còn lại ở mục gói giờ), nên sửa giá trong admin là trang đổi theo.
- Quyền lợi sửa trong Cài đặt (ô "Quyền lợi hội viên", mỗi dòng "Tiêu đề | Mô tả", tối đa 12; để trống thì ẩn mục). Chưa lưu gì thì hiện danh sách mặc định trong `lib/member-benefits.ts`.
- Có liên kết từ trang chủ và `/bang-gia`. Kiểm thử: `tests/e2e/zy-membership-page.spec.ts`.

## v0.10.4 — Form đặt chỗ mới và giá Game 9/18 hố

- Form đặt chỗ: 3 hình thức (Luyện tập, Game 9 hố, Game 18 hố), bỏ ô thời lượng (Luyện tập mặc định 1 giờ), "Số người" khách tự điền (nhóm, giải đấu; mỗi line tối đa 4 nên nhóm đông được ghi `guests` trong báo giá và hiện "cần N line" cho nhân viên), họ tên và số điện thoại bắt buộc.
- Giá nhập vào cài đặt (trước đó lưu bản sao `docs/backups/settings-before-holes-prices.json`), tính theo người, nhân theo số người 1–4: Game 18 hố tiêu chuẩn 250k (07–12 T2–T6) / 300k; VIP 350k / 400k. Game 9 hố tiêu chuẩn 150k / 200k; VIP 200k / 250k. Thứ 7, Chủ nhật, ngày lễ: cả ngày theo giá 12:00–23:00. Quy tắc 9/18 hố cũ (đã tắt) được xóa.
- Trang giá không hiện thẻ "Nhóm 4 người" khi giá nhóm chỉ bằng 4 lần giá một người.

- Giá Luyện tập đổi sang đúng 3 khung như 9/18 hố (bản sao trước khi đổi: `docs/backups/settings-before-three-slots.json`): T2–T6 07:00–12:00 giá vàng 180k (tiêu chuẩn) / 330k (VIP); T2–T6 12:00–23:00 300k / 550k; Thứ 7, Chủ nhật, ngày lễ cả ngày 300k / 550k. Bảng giá hiện ba dòng cho mỗi phòng.

- Bảng giá đổi về bảng giá chính thức theo hình anh gửi (bản sao trước đó: `docs/backups/settings-before-official-prices.json`): Luyện tập 100.000đ (T2–T6 08:00–11:00) / 250.000đ; Game 9 hố 300.000đ / 500.000đ; Game 18 hố 400.000đ / 650.000đ; Thứ 7, Chủ nhật, lễ cả ngày giá thường; nhóm 4 người 900.000đ (9 hố) / 1.000.000đ (18 hố). Phòng VIP dùng chung bảng. Giờ mở cửa 08:00. Các dòng ưu đãi theo giá cũ được xóa. Bảng trên trang chủ chỉ tiếng Việt.

## v0.11.0 — Tài khoản hội viên online

- Trang `/tai-khoan`: khách đăng ký (họ tên, số điện thoại, email tùy chọn, mật khẩu) và đăng nhập bằng số điện thoại. Trang cá nhân hiện giờ chơi còn lại, lượt 9/18 hố, điểm, từng thẻ/gói (hạn, phòng áp dụng, số còn lại), lịch sắp tới (yêu cầu đặt online và lịch đã xếp), giờ đã dùng từ gói, lịch sử đến chơi; sửa tên, email, đổi mật khẩu.
- Bảo mật: số điện thoại chưa được chứng minh, nên tài khoản mới ở trạng thái "chờ xác nhận" và chỉ thấy thông báo cho đến khi nhân viên bấm "Xác nhận" ở Hội viên → khách (cần quyền member.sell). Nhân viên có thể "Đặt lại mật khẩu" (member.adjust): mật khẩu tạm hiện một lần, đăng xuất mọi thiết bị. Khóa 15 phút sau 5 lần sai; tối đa 30 đăng ký/giờ.
- Dữ liệu: migration 0012 (`member_accounts`, `member_sessions`, trigger kiểm tra/bất biến), cookie riêng `g3d_member`, tách hẳn khỏi tài khoản nhân viên. Dịch vụ `lib/server/member-account-service.ts`, API `/api/member`.
- Chưa có: quên mật khẩu tự động và xác thực số điện thoại bằng OTP (cần nhà cung cấp SMS/Zalo); mua gói online (thanh toán vẫn tại quầy).
- Kiểm thử: `tests/member_account_sql_test.py`, `tests/e2e/zy-member-account.spec.ts`.

## v0.11.1 — Hội viên mua gói và đặt lịch ngay trong trang cá nhân

- Mua gói online: hội viên đã được xác nhận chọn gói ở mục "Mua thêm gói" (giá lấy đúng từ danh mục gói đang bán) và gửi yêu cầu; tối đa 3 yêu cầu chờ, hủy được. Nhân viên thấy "yêu cầu mua gói" trong danh sách và chi tiết khách (Hội viên), bấm "Bán gói này" rồi thu tiền như bán gói thường: yêu cầu tự chuyển thành "đã xử lý" cùng giao dịch bán (một batch), hoặc "Từ chối". Không thu tiền online. Migration 0013 (`package_orders`, trigger kiểm tra gói/giá, bất biến, không xóa).
- Đặt lịch trong trang cá nhân: điền sẵn tên và số điện thoại của hội viên, chọn hình thức, giờ, số người (tự điền, không bắt buộc), phòng VIP, ghi chú; dùng chung quy trình với form công khai (nhân viên xác nhận). Hội viên xem và hủy yêu cầu đang chờ ngay trong trang.
- Kiểm thử: `tests/member_account_sql_test.py` (thêm bộ package_orders), `tests/e2e/zy-member-account.spec.ts`.

## v0.12.0 — Hoàn thiện tính tiền: giảm giá, tiền thối, hoàn tiền

- **Giảm giá phiếu** (chủ, quản lý): trên phiếu đã kết thúc, chưa thu tiền, chưa trả bằng gói; nhập số tiền hoặc chọn 5/10/20%, bắt buộc có lý do; một lần mỗi phiếu, không sửa được. Giảm trừ vào tiền chơi (đã gồm VAT), nhỏ hơn tiền chơi; tiền cần thu và mọi kiểm tra thu tiền dùng số sau giảm. Phiếu hiện dòng "Giảm giá (lý do)". Bảng `bill_discounts` (migration 0014), trigger tự trừ `golf_amount` và `amount`, ghi nhật ký.
- **Tiền mặt: tiền khách đưa và tiền thối**: bấm "Tiền mặt", nhập hoặc chọn mệnh giá (100k/200k/500k/vừa đủ), thấy ngay tiền thối trước khi xác nhận.
- **Hoàn tiền** (chủ, quản lý): với phiếu đã thu, hoàn một phần hoặc toàn bộ về đúng hình thức đã thu (tối đa số đã thu bằng hình thức đó trừ phần đã hoàn), bắt buộc lý do, cần mở ca; hoàn tiền mặt trừ vào két và không vượt số tiền mặt trong két. Là dòng `refund` trong sổ (không sửa/xóa), nhật ký "Hoàn tiền"; mã yêu cầu chống ghi trùng. Phiếu hiện dòng "Đã hoàn lại".
- **Đối soát ca, báo cáo, tổng quan** đều trừ hoàn tiền: tiền mặt dự kiến = đầu ca + thu − chi − hoàn; chuyển khoản/thẻ dự kiến = thu − hoàn; trigger đóng ca kiểm tra đúng công thức. Báo cáo doanh thu theo ngày trừ hoàn tiền (thêm cột `refunds`); bảng doanh thu theo dịch vụ vẫn tính theo phiếu (chưa trừ hoàn).
- Phân quyền mới: `billing.discount`, `billing.refund` (chủ và quản lý; thu ngân chưa có).
- Chưa có: hoàn về gói trả trước (phiếu trả bằng gói), hoàn tiền sau khi ca đã đóng ngoài ca hiện tại (hoàn được nhưng ghi vào ca đang mở), duyệt hai cấp, xuất hóa đơn điện tử.
- Kiểm thử: `tests/billing_sql_test.py`, `tests/billing.test.ts`, `tests/e2e/zy-billing.spec.ts` (API và giao diện).

## v0.12.1 — Quản trị chỉ nền trắng, rà soát lỗi

- Toàn bộ giao diện quản trị (`/quan-ly`, máy tính và điện thoại) dùng nền trắng: thanh điều hướng, tab, thanh thông báo, tiêu đề bảng, thẻ "Mỗi cú swing"; trạng thái chọn/hover dùng viền và màu chữ thay cho nền tô. Nút bấm và huy hiệu trạng thái giữ màu. Sửa luôn lỗi chữ tối trên nền xanh đậm ở thẻ Tổng quan.
- Kết quả rà soát lỗi và kế hoạch fix theo đợt: `docs/BUG-PLAN.md`.

## v0.12.2 — Fix đợt 1 (xem docs/BUG-PLAN.md)

- Hội viên đăng nhập/đăng ký: giới hạn theo địa chỉ IP thay cho khóa theo số điện thoại. Sai mật khẩu 5 lần cho một số từ một IP thì chặn IP đó 15 phút (chủ tài khoản ở IP khác vẫn đăng nhập được); 30 lần sai từ mọi IP cho một số thì tạm dừng thử; mỗi IP đăng ký tối đa 5 tài khoản/giờ; trần toàn cơ sở nâng từ 30 lên 100/giờ. Bảng `member_attempts` + migration 0015.
- Phụ thuộc: audit production từ 11 lỗ hổng về 0. Nâng `zod` 3 → 4.6.7 (sửa `z.record`), thêm override `browserslist`, `fast-uri (<4)`, `source-map-js`, `baseline-browser-mapping`, `@babel/core` trong `pnpm-workspace.yaml`.
- `/api/member` khi chưa đăng nhập trả 200 `{signedOut:true}` thay cho 401 (hết lỗi đỏ trong console); trang cá nhân tự cập nhật mốc thời gian mỗi phút nên nhãn hết hạn luôn đúng.
- ESLint: 0 cảnh báo (loại bản ScrollCraft chép sẵn khỏi lint, bỏ import thừa, ghi chú lý do cho cảnh báo hook).
- Còn lại của đợt 1: kiểm tra CI trên GitHub (cần xem tab Actions).
