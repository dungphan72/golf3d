# Báo cáo kiểm toán trước khi vận hành (08/11/2026)

Phạm vi: toàn bộ mã nguồn hiện tại (kể cả phần chưa commit: giao diện quản trị mới, Landing CMS, CRM nhân sự, tải ảnh). Môi trường kiểm tra: máy Windows, bản build production chạy local trên D1 trống (`scripts/e2e-server.mjs`), dữ liệu thử, tài khoản thử. **Không** đụng dữ liệu thật, không gửi tin thật, không triển khai production.

## 1. Kết luận

**Chỉ nên chạy thử (pilot có người giám sát), chưa nên coi là sẵn sàng vận hành chính thức.** Đợt rà soát thứ hai tìm thêm lỗi nghiêm trọng (đặc biệt lỗi 14: rò dữ liệu hội viên) nên cần một vòng kiểm thử tay trên điện thoại thật trước khi mở cho khách.

Lý do:
- Lõi nghiệp vụ (đặt lịch chống trùng, tính tiền, thu tiền không trùng, sổ ca, báo cáo) chạy đúng trong mọi kiểm tra tự động và kiểm tra tay đồng thời đã làm.
- Nhưng bản chưa commit có nhiều lỗi nghiêm trọng đã phát hiện và sửa trong đợt này (xem mục 2); các lỗi cùng loại có thể còn ở những màn hình chưa duyệt hết.
- Bộ E2E đã được cập nhật theo giao diện mới: 113/113 bài đạt (2 bỏ qua có chủ đích).
- Tích hợp thật (SePay, Zalo, Facebook, email, Turnstile) chưa xác minh được ở đây.
- Cách chạy production hiện tại trên VPS là `wrangler dev --local` (chế độ phát triển của Wrangler), chưa phải cách chạy production chính thống.

## 2. Lỗi phát hiện và đã sửa

| # | Mức | Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|---|---|
| 1 | **Cao (dữ liệu sai)** | Màn hình Tổng quan hiển thị **số liệu giả** như thật: thời tiết 28°C, "+12,5% so với tuần trước", "74/96 tee time", "128 khách check-in / 36 đang trên sân", "+8 lead từ MKT, FB 12, Web 8", doanh thu mẫu "186,4 triệu" khi chưa có, lịch mẫu (Lexus Golf Club, Nguyễn Minh Tuấn...), giá mẫu 4,2/6,3 triệu, tên giả trong chồng avatar, và 3 nhân sự trực ca bịa (HLV Tuấn Anh, Thuỳ Trang, Hoàng Nam) | Dữ liệu mẫu/fallback viết cứng trong `DashboardView.tsx` và `RightInsightPanel.tsx` | Bỏ toàn bộ số giả. Hiển thị số thật (doanh thu đã thu, số lượt đặt hôm nay, line đang chơi/tổng line, lead chưa xử lý), trạng thái rỗng "Chưa có lịch đặt", thẻ "Lối tắt" thay cho danh sách nhân sự bịa. Đã kiểm tra lại bằng trình duyệt: khớp với dữ liệu thật |
| 2 | **Cao (mất dữ liệu)** | Hành động `clean-test-data` xóa **toàn bộ booking, yêu cầu, ca, sổ tiền, đơn món, lượt dùng gói** của cơ sở; quyền chỉ cần `settings.manage` (quản lý cũng gọi được), máy chủ không kiểm tra xác nhận (chỉ ô nhập ở giao diện) | Thêm vội để dọn dữ liệu thử | Chỉ Chủ cơ sở được gọi; máy chủ bắt buộc `confirm = "XACNHAN"`; có nhật ký. Có test E2E |
| 3 | **Cao (chức năng hỏng)** | Thêm / sửa / xóa / cấp lại mật khẩu nhân sự bán hàng trong CRM luôn báo lỗi (`/api/crm2/config`) | Mã đọc `res.ok`, `res.error`, `res.data` nhưng dịch vụ trả `{status, body}`; luôn rơi vào nhánh lỗi, kể cả khi thành công | Đọc đúng `status`/`body`. Có test E2E (tạo, trùng email, cấp lại mật khẩu, xóa, xóa lại) |
| 4 | **Cao (bảo mật)** | Đặt mật khẩu tùy chọn khi tạo nhân sự bỏ qua chính sách mật khẩu (chỉ cần ≥ 6 ký tự, chấp nhận `12345678`) | Gọi thẳng `hashPassword` | Dùng `passwordProblem()` như đăng ký thường |
| 5 | **Cao (mất nội dung)** | Lưu **Cài đặt cơ sở** xóa mất nội dung Landing CMS đã soạn | Schema cấu hình (zod) bỏ khóa `landing` khi ghi lại toàn bộ dòng cài đặt | Giữ lại khóa `landing` khi lưu cài đặt. Có test E2E |
| 6 | **Cao (bảo mật)** | `/api/upload` nhận SVG (XSS lưu trữ khi phục vụ cùng tên miền) và nhận tệp bất kỳ miễn đuôi `.png`; lộ nội dung lỗi hệ thống | Chỉ kiểm tra đuôi tên tệp | Xác định loại tệp bằng byte đầu (JPG/PNG/WebP), bỏ SVG, trả 415 nếu sai; lỗi chung chung; chỉ chạy được khi có ổ đĩa ghi (VPS), nếu không trả 501 rõ ràng. Có test E2E |
| 7 | Trung bình | `/api/landing` nhận nội dung không giới hạn kích thước, lộ lỗi nội bộ | Không kiểm tra | Giới hạn 200 KB, chỉ nhận object, lỗi chung chung |
| 8 | Trung bình | POST chưa đăng nhập vào `/api/club`, `/api/landing`, `/api/upload` trả 503/500 và làm runtime tạm thời hỏng cho yêu cầu kế tiếp (ví dụ đăng nhập ngay sau trả 503) | Trả lời sớm mà chưa đọc hết thân yêu cầu (`Cannot reconstruct a Request with a used body`) | Đọc thân yêu cầu trước mọi phản hồi sớm (đúng quy ước của `crmRoute`) |
| 9 | Trung bình | Dải 7 ngày ở Tổng quan chọn sai ngày nếu múi giờ trình duyệt khác Việt Nam | Dùng giờ cục bộ của trình duyệt | Tính ranh giới ngày theo UTC+7 |
| 10 | Thấp | 37 lỗi `tsc` (kiểu `StaffUser.active` không tồn tại, `json` kiểu unknown, `title` trên icon, kiểu bảng giá `null`, ...) | Code mới chưa typecheck | Đã sửa; `tsc` sạch |
| 11 | Thấp | ESLint: 26 lỗi → 13 lỗi | Dấu `"` trần trong JSX, `any`, hàm không thuần khi render | Sửa các lỗi thật; còn 13 lỗi quy tắc React Compiler (xem mục 5) |
| 12 | Thấp | Vòng tiến độ "ca trực" luôn ≥ 35% dù chưa có tiến độ | Hằng số `Math.max(35, ...)` | Bỏ sàn 35% và ghi đúng ý nghĩa (thời gian đã qua trong giờ mở cửa) |
| 13 | Thấp | Test E2E đăng nhập chờ tiêu đề "Sơ đồ phòng", nay mặc định là "Tổng quan" | Giao diện đổi | Cập nhật test |
| 14 | **Cao (bảo mật, rò dữ liệu)** | Bản chưa commit **gỡ 3 chốt xác nhận hội viên ở máy chủ**: tài khoản vừa đăng ký (chưa được lễ tân xác nhận số điện thoại) xem được thẻ, gói, lịch sử, đơn hàng gắn với số điện thoại đó, đồng thời đặt lịch và mua gói được. Ai đăng ký bằng số điện thoại của khách khác sẽ thấy dữ liệu của khách ấy | Xóa `if (!user.verified)` trong `memberOverview`, `orderPackage`, `bookAsMember` khi viết lại cổng hội viên | Khôi phục cả 3 chốt; cổng hội viên hiện màn "Đang chờ câu lạc bộ xác nhận", không hiện thẻ/mã. Test E2E đạt |
| 15 | **Cao (chức năng mất)** | Menu quản trị mới **bỏ mất "Thực đơn & kho" (bếp, kho) và "Huấn luyện"**: nhân viên bếp và HLV không vào được màn của mình | Sidebar mới không có hai mục | Thêm lại hai mục vào menu (kể cả thanh "Thêm" trên điện thoại). Test E2E vai trò HLV đạt |
| 16 | **Cao (báo cáo hỏng)** | Báo cáo tư vấn CRM (`/api/crm2/report`) luôn lỗi 500 | Truy vấn dùng cột `crm2_orders.paid_amount` không tồn tại (tiền nằm ở `crm2_order_payments`) và truyền thiếu một tham số `?` | Tính tiền đã thu từ bảng thanh toán; sửa số tham số. Test E2E đạt |
| 17 | **Cao (an toàn CSRF)** | Kiểm tra `Origin` được nới: cho phép mọi cổng của `localhost`/`127.0.0.1` | Danh sách trắng thêm khi triển khai sau proxy | Bỏ localhost/127.0.0.1 khỏi danh sách trắng (giữ so khớp Host/X-Forwarded-Host và tên miền của câu lạc bộ) |
| 18 | Trung bình | Màn Chăm sóc khách (thẻ việc chăm sóc có tin mẫu, "Đã liên hệ", "Lưu kết quả") **không còn lối vào** trong CRM (component còn nhưng không được dùng) | Bị bỏ khi tái cấu trúc CRM | Thêm tab "Chăm sóc khách" vào CRM. Test E2E đạt |
| 19 | Trung bình | Nút thao tác trên thẻ line (Vào chơi, Đặt trước, POS) cao 32 px trên điện thoại, dưới mức 44 px của thiết bị cảm ứng | CSS mới | `min-height/min-width: 44px` dưới 900 px. Test E2E đạt |
| 20 | Thấp | Cổng hội viên: ô nhập không gắn nhãn (`label` không có `for`), hai tab Đăng nhập/Đăng ký không có vai trò `tab` (người dùng đọc màn hình không dùng được) | Viết lại giao diện | Gắn `htmlFor/id`, `role="tab"`, `aria-selected`; vùng "Việc cần làm ngay" có `role="region"` |
| 21 | Thấp | Test cũ sai dữ liệu Facebook (`adId`/`formId` thay vì `ad_id`/`form_id` mà Facebook gửi thật); đường lead mặc định đã chuyển sang CRM mới nhưng test cũ vẫn tìm ở CRM cũ; SLA mặc định 5 phút chứ không phải 15 | Test lỗi thời | Sửa test (không sửa mã nghiệp vụ) |

## 3. Luồng đã kiểm tra và kết quả thực tế

**Đạt (bằng test tự động hoặc kiểm tra tay trên bản build thật):**
- Đặt lịch đồng thời: 6 yêu cầu cùng line, cùng giờ → đúng 1 thành công, 5 bị 409.
- Bắt đầu / kết thúc phiên gửi 3 lần song song → 1 thành công, 2 bị từ chối, không tạo phiên đôi.
- Thu tiền: 4 yêu cầu cùng `requestId` → cùng một kết quả, sổ tiền chỉ có **1 bút toán**; thu lại bằng `requestId` khác → 409 (phiếu đã thanh toán), không ghi thêm; báo cáo doanh thu tính đúng 1 lần (340.200đ cho 9 hố, VAT 8%, phí 5%).
- Chống CSRF (Origin lạ bị chặn), API quản lý khi chưa đăng nhập trả 401, header danh tính giả bị bỏ qua.
- Phân quyền: thu ngân, HLV, sale theo vai trò (test E2E `flow`, `zzzz-crm-channels`, `zzzzz-security`); quản lý không tạo/sửa được quản lý khác hoặc chủ; chủ không tự khóa mình.
- Gói giờ / hội viên / khuyến mãi / thanh toán chia nhiều hình thức / giảm giá phiếu / hoàn tiền / chuyển khoản SePay (giả lập webhook) / chuông gọi / đặt online / nhóm 9 người / CRM lead (website, Facebook, Zalo, quảng cáo) / nhắc việc / báo cáo: các bộ test E2E tương ứng (xem mục 4).
- Giao diện điện thoại 375 px: trang chủ, Tổng quan, Phòng, Lịch đặt, Chuông, Thu tiền: không tràn ngang, thanh điều hướng dưới dùng được.

**Thất bại / lỗi còn tồn tại:** xem mục 5.

**Chưa thể kiểm tra:** xem mục 6.

## 4. Kiểm tra tự động

| Kiểm tra | Kết quả |
|---|---|
| `pnpm typecheck` | Đạt (0 lỗi). Ban đầu 37 lỗi |
| `pnpm lint` | **0 lỗi**, 79 cảnh báo (import thừa). Ban đầu 26 lỗi. Các chỗ setState-trong-effect có chú thích `eslint-disable-next-line` kèm lý do (giá trị chỉ biết ở trình duyệt, đúng như mã gốc đã làm) |
| `pnpm test` (unit + runtime + RSC + tooling) | Đạt toàn bộ |
| 17 bộ SQL Python + splitter migration + import backup (cần `PYTHONUTF8=1` trên Windows) | Đạt 19/19 |
| `pnpm build` | Đạt |
| E2E Playwright (xem số liệu cuối báo cáo) | Xem mục 4.1 |
| Test mới `tests/e2e/zzzzzz-prelaunch.spec.ts` (4 bài: dọn dữ liệu, CRM nhân sự, upload, giữ landing) | Đạt 4/4 |

### 4.1 E2E
Lần chạy cuối của toàn bộ bộ E2E (115 bài, D1 trắng): **113 đạt, 0 lỗi, 2 bỏ qua (có chủ đích)**. Lần chạy đầu của đợt này: 48 đạt, 26 lỗi, 39 không chạy.
Các bài giao diện đã được viết lại theo giao diện quản trị mới (menu bên, "POS tính tiền", "Booking", "Khách hàng", cổng hội viên mới, CRM mới). Việc viết lại này tìm ra các lỗi 14, 15, 16, 18, 19 ở trên.

## 5. Lỗi và rủi ro còn tồn tại

1. ~~2 bài E2E lỗi khi chạy cả bộ~~ **Đã sửa:** `zy-split` chọn line trống đầu tiên, trùng line-2/line-8 mà `zzz-leads` dành riêng (phiên đã thu còn "đang dọn" ở line-2). Nay `zy-split` bỏ hai line đó.
2. ~~Lỗi hydration React #418~~ **Đã sửa:** máy chủ dựng màn mặc định "POS tính tiền" còn trình duyệt dựng "Tổng quan". Nay cả hai đều mở "Tổng quan"; đã kiểm tra bản build production, không còn lỗi console. Lỗi `RSC prefetch setup error` của vinext không còn thấy trong lần kiểm tra này.
3. **Testimonial mặc định trên trang chủ** (`lib/landing-config.ts`: "Anh Lê Hoàng Nam HDC 18", "Chị Nguyễn Phương Thảo"...) trông như đánh giá khách thật. Nếu là nội dung mẫu, **cần thay bằng đánh giá thật hoặc ẩn** trước khi công khai (rủi ro pháp lý quảng cáo). Đây là quyết định của chủ nên tôi không tự xóa.
4. **Dữ liệu giá gói mâu thuẫn bảng giá** (đã ghi từ trước trong `docs/BUG-PLAN.md`): cần chủ quyết định.
5. **Khóa tài khoản / đăng ký hội viên bị lạm dụng** (đã ghi trong `docs/BUG-PLAN.md`): cần Turnstile.
6. **Landing public chọn "cơ sở đầu tiên"** (`LIMIT 1`) khi có nhiều cơ sở; chỉ ổn khi chạy một cơ sở.
7. **Cách chạy production trên VPS**: PM2 chạy `wrangler dev --local`; D1 giả lập lưu ở `.wrangler/state`. Phù hợp pilot một cơ sở; cần có sao lưu định kỳ (mục 7).
8. Upload ảnh chỉ hoạt động khi có ổ đĩa ghi (VPS); trên Cloudflare Workers trả 501. `deploy_bundle.tar.gz` nay đã được ignore.
9. `actualPaidTotal` trong báo cáo CRM cộng tiền thanh toán đơn CRM với booking đã thu. Đã sửa phép nối làm nhân đôi booking khi có nhiều lead cùng số điện thoại (nay dùng `EXISTS`). Một khoản vừa là đơn CRM vừa là booking vẫn có thể bị tính hai lần; cần chủ xác nhận cách đối soát với dữ liệu thật.
10. Bảng màu/độ tương phản và các màn không nêu ở mục 3 (Cài đặt, Nhân viên, Landing CMS trên điện thoại) chưa duyệt thị giác đầy đủ.
11. Các hạn chế đã biết: chưa có 2FA nhân viên, CSP còn `unsafe-inline`, khách đặt nhóm >4 người chỉ giữ 1 line khi xác nhận (xem `docs/BUG-PLAN.md`, `docs/SECURITY-REVIEW.md`).

## 6. Chưa thể kiểm tra trong môi trường này
- Thanh toán thật SePay / ngân hàng (chỉ kiểm tra webhook giả lập với khóa thử).
- Gửi email, Zalo, Facebook thật; Turnstile (chưa có khóa); web push.
- Quên mật khẩu tự động (chưa có tính năng; đặt lại do quản lý cấp mật khẩu tạm).
- Phiên bản đa ngôn ngữ (giao diện chỉ có tiếng Việt; hiển thị tiếng Việt có dấu đúng trên mọi màn hình đã mở).
- Kiểm tra hồi quy toàn bộ trình duyệt trên iOS/Android thật, bàn phím che nội dung (chỉ giả lập khung nhìn 375 px).
- Chạy trên production thật golfhub.cloud (chưa được phép triển khai).

## 7. Hướng dẫn khởi chạy, sao lưu, khôi phục

**Chạy local / kiểm thử** (Windows, cần Node ≥ 22.13, pnpm):
```bash
pnpm install
pnpm typecheck && pnpm lint && pnpm test
pnpm build
PYTHONUTF8=1 npx playwright test      # dựng D1 trống riêng ở .e2e-state, không đụng dữ liệu thật
```
Test SQL: `PYTHONUTF8=1 python tests/<tên>_sql_test.py`.

**Chạy trên VPS** (xem `docs/DEPLOY-VPS.md`): `git pull && pnpm install && pnpm build && pm2 restart golf3d`. Luôn giữ `DISABLE_SITES_IDENTITY=1`. Áp migration mới đúng một lần (không sửa migration đã áp).

**Sao lưu:**
1. Dữ liệu D1 cục bộ nằm ở `.wrangler/state` trên VPS. Dừng app (`pm2 stop golf3d`) hoặc dùng bản sao tức thời rồi nén thư mục: `tar -czf golf3d-state-$(date +%F).tar.gz .wrangler/state`, chép ra nơi khác máy (ít nhất hằng ngày, giữ 14 ngày).
2. Thêm bản xuất JSON từ giao diện (quyền chủ cơ sở, `/api/export`) hằng ngày; bản này không chứa mật khẩu, phiên, khóa.
3. Sao lưu riêng `.dev.vars`/biến môi trường (khóa SePay, Turnstile) ở nơi an toàn; không nằm trong backup dữ liệu.

**Khôi phục:**
1. `pm2 stop golf3d`; đổi tên `.wrangler/state` hiện tại thành `.wrangler/state.bad`.
2. Giải nén bản sao lưu gần nhất vào `.wrangler/state`; `pm2 start golf3d`.
3. Đối chiếu số booking, ca, sổ tiền với số ghi trước đó (xem `docs/DEPLOY-CLOUDFLARE.md` mục 5–6 để nhập từ bản JSON vào D1 trống: `scripts/import-backup.mjs`, rồi tạo lại tài khoản chủ bằng `scripts/create-owner.mjs`).
4. **Thử khôi phục thật trên máy khác ít nhất một lần trước ngày mở cửa**; chưa làm trong đợt này.

**Trước ngày mở cửa:** dùng "Dọn dẹp dữ liệu thử nghiệm" (chỉ chủ cơ sở, nhập `XACNHAN`) **sau khi sao lưu**; hành động này không hoàn tác.

## 8. Rà soát giao diện tổng thể (09/11/2026)

Duyệt 16 màn quản trị ở 1280 px và 375 px (tràn ngang, tên điều khiển, cỡ nút cảm ứng, lỗi console) và các trang công khai trên điện thoại, với dữ liệu mẫu (booking, ca, lead).

| Lỗi | Cách sửa |
|---|---|
| **Khoảng 30 lớp CSS `operate-*` được dùng trong mã nhưng chưa từng được định nghĩa** (thanh lọc, nút, ô chọn, ô nhập, "pill", ô tìm kiếm, dải KPI): Ca & sổ tiền, Báo cáo, Huấn luyện, Thực đơn & bếp, Kho, Bảng giá hiện thành chữ xếp chồng không khung | Thêm kiểu cho toàn bộ nhóm này (`app/admin.css`), có bản điện thoại (ô nhập/nút cao tối thiểu 44 px) |
| CRM tràn ngang trên điện thoại (lưới theo nội dung, thẻ KPI, hai thẻ Phễu/Nguồn rộng 380 px trên màn 375 px) | Cột lưới `minmax(0,1fr)`, `minmax(min(…,100%),1fr)` |
| Báo cáo: ô ngày "Đến" tràn khỏi màn hình điện thoại | Cho hàng ngày xuống dòng |
| Tổng chi/hoàn tiền hiện `-0 ₫` | `money()` đổi -0 thành 0; có test (`tests/money.test.ts`) |
| Landing CMS: 31 ô nhập có nhãn nhưng không liên kết với ô (người đọc màn hình không biết tên ô) | Tự gắn `for`/`id` cho mọi ô |
| Nút nhỏ (chip lọc, "Mở chi tiết", "Xem tất cả", chế độ lưới/bảng) cao 18–32 px trên điện thoại | Tối thiểu 40 px |

Đã xem nhưng không phải lỗi: dải chip lọc và thanh tab cuộn ngang có chủ đích; bảng giá trên trang chủ nằm trong khung cuộn; phần nội dung trang chủ hiện dần khi cuộn (ảnh chụp ngay sau khi nhảy cuộn có thể thấy trống một chút).

Sau khi sửa: `tsc` sạch, lint 0 lỗi, unit đạt, E2E 120/120 đạt, các màn điện thoại không còn tràn ngang. Còn vài nút 30–36 px (ví dụ "Xem Trang Chủ", "Tất cả (0)") chưa nâng lên 44 px.

### 8.1 Menu bên (09/11/2026)
- Đổi menu từ nền xanh đậm sang **nền sáng** đồng bộ với màn hình (chữ xám đậm, mục đang chọn nền xanh nhạt có vạch xanh bên trái, thẻ cơ sở và thẻ người dùng nền sáng, nút đăng xuất đỏ nhạt khi rê chuột). Áp dụng cho cả ngăn kéo trên điện thoại.
- **Menu không đứng yên khi cuộn trang:** `position: sticky` không hoạt động vì `html` và `body` cùng đặt `overflow-x: hidden`, làm `body` thành khung cuộn. Đổi sang `overflow-x: clip` (không tạo khung cuộn); đã đo: cuộn trang 479 px mà đỉnh menu vẫn ở 0.
- Menu tự cuộn để mục đang chọn luôn nằm trong tầm nhìn (trước đó mục như "Nhật ký", "Landing Page" có thể nằm dưới mép).

### 8.2 Menu điện thoại dạng ứng dụng (09/11/2026)
Trên điện thoại/máy tính bảng (≤ 1024 px) menu không còn là ngăn kéo dạng danh sách. Nút **Menu** ở thanh dưới mở một tờ trượt từ dưới lên với **lưới biểu tượng** 4 cột (ô bo tròn nhiều màu, nhãn bên dưới, chấm đỏ số lượng), chia nhóm "Quản lý" và "Hệ thống", mục đang mở có viền, có nút "Xem như khách" và "Đăng xuất". Chạm mục thì chuyển màn và đóng; Esc hoặc chạm nền mờ để đóng. Thanh dưới đổi thành 1 hàng 5 nút (Tổng quan, Phòng, Lịch đặt, Chuông, Menu); số "Thu tiền" chờ hiện trên nút Menu; Menu sáng lên khi đang ở màn không nằm trong 4 nút. Máy tính (> 1024 px) giữ menu bên như cũ. Test: `tests/e2e/zzzzzzzz-appmenu.spec.ts`.
