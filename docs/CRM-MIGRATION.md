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

## Việc còn lại để bỏ tab "Chăm sóc KH (cũ)"

1. Chuyển bốn cổng nhận lead sang `ingestLead` của module mới, từng cổng một.
2. Thêm cấu hình kênh và thông báo Zalo/email cho nhân viên vào module mới.
3. Quyết định số phận của `crm_tasks` (việc tự sinh theo khách hàng), `crm_interactions` và `crm_agents`.
4. Chọn ngày dừng làm việc ở màn cũ, nhập lần cuối, rồi bỏ tab.
