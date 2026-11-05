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
