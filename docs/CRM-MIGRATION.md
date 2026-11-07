# Chuyển lead từ CRM cũ sang module CRM mới

Nhập **một lần** các lead của màn "Chăm sóc KH" (bảng `crm_*`) vào module CRM (bảng `crm2_*`), để xem và làm việc với lịch sử lead cũ ở màn **CRM** mới. Đây là hướng 1 trong kế hoạch: chỉ chuyển lịch sử, **chưa** chuyển các cổng nhận lead.

> Chưa bỏ được tab "Chăm sóc KH (cũ)". Các cổng `/api/leads/website`, `/facebook`, `/zalo`, `/ads` vẫn ghi lead mới vào bảng cũ, và module mới chưa có màn cấu hình kênh, thông báo Zalo/email cho nhân viên. Xem `docs/CRM-MODULE.md`, mục "Chưa làm".

## Nhập những gì

| Bảng cũ | Thành | Ghi chú |
|---|---|---|
| `crm_leads` | `crm2_leads` | Mã mới là `mig-` + mã cũ. Nhãn **CRM cũ** được thêm vào lead để lọc và nhận biết. |
| `crm_lead_contacts` | `crm2_activities` (loại `INQUIRY`) | Mỗi tin khách gửi (liên hệ đầu và các lần gửi lại). Số lần gửi lại vào `inquiry_count`. |
| `crm_lead_events` | `crm2_activities` | Cuộc gọi, đổi giai đoạn, giao việc... thành câu tiếng Việt kèm "(CRM cũ)". Sự kiện `received` và `contact` bỏ qua vì đã có ở dòng liên hệ. Chi tiết gốc giữ trong cột `meta`. |
| (mỗi lead) | `crm2_activities` (loại `SYSTEM`) | Một dòng "Nhập từ CRM cũ. Mã cũ: …". |

**Không nhập:** `crm_tasks` và `crm_interactions` (gắn với khách hàng, không gắn với lead), `crm_agents` (nhân sự nhận lead), `crm_outbox` (hàng chờ gửi tin), bảng `customers` (dùng chung với hội viên và thanh toán). Các bảng cũ **không bị sửa hay xóa**; màn cũ vẫn chạy như trước.

### Quy tắc chuyển

- **Giai đoạn:** `new, contacted, qualified, trial, visited, deposit, won, lost` thành `NEW, CONTACTED, QUALIFIED, VISIT_SCHEDULED, VISITED, DEPOSITED, WON, LOST`, kèm trạng thái mặc định của giai đoạn đó. Lead thất bại với lý do "Không liên lạc được" có trạng thái riêng.
- **Người phụ trách:** giữ nguyên. Lead cũ đang "chờ nhân viên trực" (chưa có người) vào **Kho số** của module mới.
- **Việc tiếp theo:** lead mở chờ gọi giữ hạn gọi cũ; lead đã liên hệ giữ ngày hẹn tiếp; lead chốt hoặc thất bại không có việc tiếp.
- **Nguồn:** `facebook, zalo, website, ads, manual` thành `Facebook, Zalo OA, Website, Quảng cáo, Nhập tay`. **Nhu cầu:** `swing, 9, 18, group` thành `Luyện swing, Game 9 hố, Game 18 hố, Nhóm / sự kiện`.
- **Số điện thoại:** bảng cũ chỉ cho phép chữ số ở dạng `0…`, nên dùng nguyên. Lead Zalo không có số vẫn nhập được (tên "Khách chưa có tên" nếu cũng thiếu tên).
- **Ghi chú:** lời nhắn đầu, ghi chú, và "Việc tiếp theo: …" gộp lại.
- **Giờ hẹn** đổi sang giờ Việt Nam (ngày và giờ riêng).

## Chạy trên cơ sở dữ liệu thật

Trong thư mục dự án, sau `pnpm build`. Các lệnh dùng cấu hình triển khai (đổi `<D1_ID>` thành ID cơ sở dữ liệu của bạn):

```bash
D1_DATABASE_ID=<D1_ID> node scripts/deploy-cloudflare.mjs --dry-run   # chỉ tạo dist/server/wrangler.deploy.json
```

### 1. Sao lưu (bắt buộc)

```bash
pnpm exec wrangler d1 export golf3d --remote --config dist/server/wrangler.deploy.json --output backup-AAAAMMDD.sql
```

File này chứa tên và số điện thoại khách: cất nơi an toàn, **không đưa vào Git** (`backup-*.sql` đã nằm trong `.gitignore`). D1 còn có Time Travel 30 ngày làm lớp bảo vệ thứ hai.

### 2. Thử trên bản sao (nên làm)

```bash
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.deploy.json --persist-to .migrate-test --file backup-AAAAMMDD.sql
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.deploy.json --persist-to .migrate-test --file scripts/crm-legacy-to-crm2.sql
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.deploy.json --persist-to .migrate-test --file scripts/crm-legacy-verify.sql
```

Xem kết quả kiểm tra (mục "Kiểm tra" bên dưới) rồi xóa thư mục `.migrate-test`.

### 3. Nhập

```bash
pnpm exec wrangler d1 execute golf3d --remote --config dist/server/wrangler.deploy.json --file scripts/crm-legacy-to-crm2.sql
```

Tệp này **chạy lại được an toàn**: lead đã nhập bị bỏ qua, lead cũ mới phát sinh được nhặt thêm. Nhưng nó **không cập nhật** lead đã nhập. Một lead sửa ở màn cũ sau khi nhập sẽ không đổi ở màn mới.

### 4. Kiểm tra

```bash
pnpm exec wrangler d1 execute golf3d --remote --config dist/server/wrangler.deploy.json --file scripts/crm-legacy-verify.sql
```

| Truy vấn | Kết quả đúng |
|---|---|
| 1. Lead cũ và lead đã nhập theo từng cơ sở | hai số bằng nhau |
| 2. Lead cũ chưa được nhập | không có dòng nào |
| 3. Tin khách gửi, cũ và đã nhập | hai số bằng nhau |
| 4. Hoạt động trỏ tới lead không tồn tại | không có dòng nào |
| 5. Giai đoạn cũ đã rơi vào giai đoạn mới nào | xem bằng mắt, tổng bằng số lead cũ |
| 6. Lead mở không có chủ cũng không nằm trong kho số | không có dòng nào |
| 7. Lead thiếu tên hoặc nguồn lạ | xem bằng mắt (lead Zalo chưa có tên là bình thường) |

Rồi mở **CRM → Danh sách lead** trên trang thật: các lead nhập có nhãn "CRM cũ" trong hồ sơ, và hồ sơ có "Lịch sử hoạt động".

### Hoàn tác

```bash
pnpm exec wrangler d1 execute golf3d --remote --config dist/server/wrangler.deploy.json --file scripts/crm-legacy-undo.sql
```

Xóa **đúng** các dòng có mã bắt đầu bằng `mig-`; lead và hoạt động tạo trực tiếp trong CRM mới không bị đụng. Lưu ý: mọi thao tác nhân viên đã làm trên lead đã nhập (ghi kết quả gọi, đổi người phụ trách, ghi chú) bị xóa cùng. Bảng cũ vẫn nguyên nên có thể nhập lại.

## Cách đã kiểm chứng

- `tests/crm_migrate_sql_test.py` (12 test, chạy trong CI): mọi lead đến đúng một lần và đúng cơ sở; quy tắc giai đoạn, kho số, giờ hẹn, nhãn; lịch sử thành hoạt động; chạy hai lần không đổi gì; lead thêm giữa hai lần chạy được nhặt và sửa đổi của nhân viên không bị ghi đè; bảng cũ không đổi; hoàn tác chỉ xóa dòng `mig-`; cơ sở dữ liệu cũ rỗng thì không nhập gì; bảy truy vấn kiểm tra.
- Chạy qua `wrangler d1 execute --local` trên cơ sở dữ liệu cục bộ do bộ e2e tạo ra (29 lead, 31 tin khách gửi, 190 sự kiện): 29 lead và 219 hoạt động được nhập, 8 lead tạo trực tiếp trong CRM mới giữ nguyên, bảy truy vấn kiểm tra đạt, chạy lần hai không đổi, hoàn tác rồi nhập lại cho cùng kết quả, và màn CRM mới đọc, hiển thị và mở được hồ sơ lead đã nhập.
- **Chưa chạy trên cơ sở dữ liệu thật.**

## Cổng website: chuyển sang CRM mới bằng công tắc

Cổng `POST /api/leads/website` (form trên 3dgolf.vn) đã chuyển được. Mặc định nó vẫn ghi vào CRM cũ; người quản lý bật trong **CRM → Cấu hình → "Lead từ form website (3dgolf.vn)"** (đổi sang "CRM mới"). Có hiệu lực ngay, tắt lại bất cứ lúc nào, không cần triển khai lại. Lead đã vào bên nào thì ở lại bên đó. Form phía website không phải sửa: câu trả lời vẫn là `{ ok, leadId, duplicate, status }`.

**Trước khi bật, kiểm tra:**
1. Bộ lập lịch đang gọi `POST /api/crm2/cron` (kèm `CRON_SECRET`), nếu không cảnh báo quá hạn và thu hồi lead không chạy.
2. Nhân viên làm lead đã làm quen CRM mới và có vai trò đúng (`crm.work`); chế độ chia lead (CRM → Cấu hình) đã chọn đúng: tự chia hay đưa vào kho số.
3. Đã biết các khác biệt dưới đây.

| Khác biệt khi bật | Chi tiết |
|---|---|
| Chống gửi trùng | Cổng cũ chống trùng theo mã `id` của form. Module mới chống trùng theo số điện thoại (trong 365 ngày): một lần gửi lại thành "khách gửi lại", tăng số lần hỏi và tạo việc gọi cho người phụ trách. |
| Đồng ý nhận tin | Không còn ghi vào hồ sơ khách (`customers.marketing_consent`); chỉ nằm trong ghi chú lead. Các nhắc tự sinh của CRM cũ dựa trên cờ này. |
| Hạn gọi | Theo cài đặt của module mới (mặc định 15 phút, theo giờ làm việc nếu bật), không theo quy tắc 5 phút của bên cũ. |
| Số khách, chiến dịch | Không có ô riêng, được ghi vào ghi chú ("Số khách: …", "Chiến dịch: …"). |
| Lead không có số | Vẫn được nhận, vào kho số với số trống. |
| Thông báo | Email báo nhân viên theo `notifyAssignEmail` của module mới; Zalo và hàng chờ gửi tin của bên cũ không dùng. |

Trang chủ hiện thêm "N lead mới ở CRM chưa liên hệ" và "N việc CRM quá hạn" để lễ tân không bỏ sót.

## Cổng Zalo OA: chuyển sang CRM mới bằng công tắc riêng

`POST /api/leads/zalo` (tin khách nhắn Zalo Official Account) chuyển được theo cách tương tự: **CRM → Cấu hình → "Tin nhắn Zalo OA"**, mặc định vẫn vào CRM cũ, độc lập với công tắc website. Chữ ký Zalo vẫn kiểm như trước.

**Cần áp migration `0020` trước khi bật** (chỉ thêm, không đổi dữ liệu có sẵn; bản đang chạy không dùng):

```bash
pnpm exec wrangler d1 migrations apply golf3d --remote --config dist/server/wrangler.deploy.json
```

Migration thêm bảng `crm2_inbound` (nhớ mã từng sự kiện, vì Zalo gửi lại sự kiện khi thấy lỗi) và cột `crm2_leads.channel_ref` (Zalo ID của khách). Bật công tắc khi chưa áp migration sẽ lỗi.

| Khác biệt khi bật | Chi tiết |
|---|---|
| Khách không có số điện thoại | Gộp theo Zalo ID: các tin của cùng một khách vào một lead (còn mở) thay vì mỗi tin một lead. Tên lead là "Khách Zalo" kèm 4 ký tự cuối của ID; **ID đầy đủ nằm trong ghi chú** (cách duy nhất để tìm khách trong ứng dụng Zalo OA). |
| Tin gửi lại bởi Zalo | Nhớ theo mã sự kiện, không tạo thêm gì. Mã chỉ ghi sau khi xử lý xong, nên lỗi giữa chừng không làm mất tin. |
| Khách để lại số ở tin sau | Số được điền vào lead (nếu lead chưa có số). |
| Trả lời khách | Nhân viên trả lời ngay trong ứng dụng Zalo OA, như bên cũ. |
| Thông báo cho nhân viên | Email khi được chia lead, theo cài đặt của module mới; không còn tin Zalo/email của hàng chờ gửi bên cũ. |

## Cổng Facebook / Instagram Lead Ads: chuyển bằng công tắc riêng

`POST /api/leads/facebook` chuyển được tương tự: **CRM → Cấu hình → "Lead Facebook / Instagram (Lead Ads)"**, mặc định vẫn vào CRM cũ, độc lập với hai công tắc kia. Không cần migration mới (dùng bảng của cổng Zalo). Chữ ký Facebook, việc lấy chi tiết từ Graph API và xử lý nhiều sự kiện trong một lần gọi giữ nguyên.

| Khác biệt khi bật | Chi tiết |
|---|---|
| Chiến dịch, mã biểu mẫu | Không có ô riêng, ghi trong ghi chú ("Chiến dịch: …", "Facebook lead: …"). Mã biểu mẫu là cách tìm lại lead trong Facebook Lead Center. |
| Facebook gửi lại | Nhớ theo mã sự kiện, không tạo thêm gì; lỗi giữa chừng thì lần gửi lại sau vẫn được xử lý. |
| Cùng số điền thêm biểu mẫu | Gộp vào lead đã có, ghi "Khách gửi lại" với người gửi là Facebook. |
| Thiếu chi tiết biểu mẫu | Chưa có `FB_PAGE_TOKEN` thì lead vẫn đến với lời nhắn "chưa lấy được chi tiết"; nhân viên xem ở Facebook. |

## Cổng quảng cáo (Google, TikTok, Zapier, Make): chuyển bằng công tắc riêng

`POST /api/leads/ads` (mã webhook "Quảng cáo") chuyển tương tự: **CRM → Cấu hình → "Lead từ quảng cáo"**, mặc định vẫn vào CRM cũ, độc lập với ba công tắc kia. Không cần migration mới. Mã webhook, giới hạn tốc độ và kiểm tra dữ liệu giữ nguyên.

| Khác biệt khi bật | Chi tiết |
|---|---|
| Nguồn, chiến dịch | Nguồn của lead là "Quảng cáo". Tên nền tảng bên gửi đặt (tiktok, google, zapier…) ghi thành "Chiến dịch: …" trong ghi chú, trừ khi bên gửi có chiến dịch riêng. |
| Chống gửi lại | Theo `id` của bên gửi; không có `id` thì theo nền tảng cộng liên hệ trong cùng một phút (như cổng cũ). |
| Cùng số từ quảng cáo khác | Gộp vào lead đã có, ghi "Khách gửi lại" với người gửi là "Quảng cáo". |

## Việc còn lại để bỏ tab "Chăm sóc KH (cũ)"

Cả bốn cổng nhận lead (website, Zalo, Facebook, quảng cáo) đã chuyển được sang module mới bằng công tắc. Còn lại:
1. Thêm cấu hình kênh và thông báo Zalo/email cho nhân viên vào module mới.
2. Quyết định số phận của `crm_tasks` (việc tự sinh theo khách hàng), `crm_interactions` và `crm_agents`.
3. Bật từng công tắc trên production, chạy nhập lịch sử lead cũ, chọn ngày dừng làm việc ở màn cũ, nhập lần cuối, rồi bỏ tab.


## Chăm sóc khách hàng: đã làm lại trong module CRM mới

Các chức năng của tab "Chăm sóc KH (cũ)" đã có bản tương đương trong CRM mới (migration `0022` và `0023`):

| CRM cũ | CRM mới |
|---|---|
| 7 quy tắc việc tự sinh (chào mừng, cảm ơn, quay lại, gói sắp hết hạn, gói sắp hết giờ, sinh nhật, đủ điểm), chạy khi mở màn hình | Tab **Chăm sóc khách**, do cron CRM (mỗi 5 phút) tạo; `modules/crm/server/care.ts`, `core/care.ts`. Mã việc giữ định dạng cũ nên việc nhập từ CRM cũ không bị tạo lại. |
| Nhận việc, hẹn lại, bỏ qua, ghi kênh và kết quả | Cùng bốn thao tác, API `/api/crm2/tasks` (`care-claim`, `care-snooze`, `care-skip`, `care-done`) |
| Hồ sơ khách: gói, lịch sử chơi, điểm, ngày sinh, email, Zalo ID, đồng ý nhận tin, nhật ký liên hệ, phản hồi | Tab **Hồ sơ khách** (`/api/crm2/care-customers`); phản hồi từ 3 sao trở xuống tạo việc "Xử lý phản ánh" và báo quản lý |
| Nhóm khách (Mới, Thân thiết, VIP, Sắp rời bỏ, Ngủ đông, Chưa chơi) | Giữ nguyên cách tính; ngưỡng VIP chỉnh ở CRM → Cấu hình |
| Mẫu tin và công tắc từng quy tắc (lưu ở `settings.crm`) | CRM → Cấu hình → "Chăm sóc khách hàng tự động" (lưu ở `crm2_settings.care`) |
| Nhân sự nhận lead: nhận lead, đang trực, Zalo ID, email báo | CRM → Cấu hình → "Nhân sự nhận lead và thông báo"; nút **Đang trực / Đang nghỉ** ở đầu CRM (mỗi người tự bật tắt); thông báo gửi email và Zalo |
| Báo cáo tư vấn | Tab **Báo cáo** (quản lý): phễu, nguồn, lý do thất bại, theo nhân viên, kết quả việc chăm sóc |

### Nhập dữ liệu chăm sóc cũ

`scripts/crm-care-to-crm2.sql` (chạy lại được, không sửa bảng cũ) nhập `crm_tasks`, `crm_interactions`, cấu hình `settings.crm` và Zalo ID/email/trạng thái nhận lead của `crm_agents`. Hoàn tác phần việc và ghi chú: `scripts/crm-care-undo.sql`. Kiểm thử: `tests/crm_care_migrate_sql_test.py` (10 test; trên Windows chạy với `PYTHONUTF8=1`).

```bash
pnpm exec wrangler d1 migrations apply golf3d --remote --config dist/server/wrangler.deploy.json   # 0022, 0023
pnpm exec wrangler d1 execute golf3d --remote --config dist/server/wrangler.deploy.json --file scripts/crm-care-to-crm2.sql
```

Sau khi nhập, so sánh số việc cũ và mới: `SELECT COUNT(*) FROM crm_tasks` và `SELECT COUNT(*) FROM crm2_tasks WHERE id LIKE 'mig-%'` phải bằng nhau (chỉ tính việc có khách).

### Còn lại để xóa CRM cũ

1. Sao lưu, áp migration `0022` và `0023`, nhập lead (`crm-legacy-to-crm2.sql`) rồi dữ liệu chăm sóc (`crm-care-to-crm2.sql`) trên production.
2. Đổi bốn công tắc kênh (website, Zalo, Facebook, quảng cáo) sang "CRM mới", và đổi webhook ngoài nếu có trỏ vào cổng cũ.
3. Cho nhân viên làm quen một thời gian, rồi bỏ tab "Chăm sóc KH (cũ)", các API `/api/crm`, `/api/leads/*` cũ, `/api/cron/crm`, mã `lead-service`, `crm-service`, test cũ; cuối cùng xóa bảng `crm_*` (giữ `crm_outbox`).
