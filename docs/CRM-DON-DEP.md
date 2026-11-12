# Kế hoạch dọn dẹp và đưa CRM về đúng luồng nghiệp vụ (11/11/2026)

Chuẩn đối chiếu: CRM của `D:/Claude/TAG-website` (`src/app/admin/crm`, `CrmShell`, `CrmSidebar`, `crm-nav.ts`, `design.md`: xanh #005A36, pill #E6F2EC, đường kẻ #E3E7E4, chữ phụ #55605A, thẻ bo 16px, nhãn trên tiêu đề "CRM bán hàng").
Chưa sửa mã nào. Đây là kết quả rà soát và đề xuất, chờ duyệt từng pha.

## 1. Luồng nghiệp vụ đúng (golf, bám đặc tả TAG)

Khách để lại số (website, Zalo, Facebook, quảng cáo, nhập tay) -> chặn rác, chống trùng, chia người hoặc vào **Kho số** -> **Bàn làm việc** (gọi trong 5 phút, ghi kết quả) -> **Lịch hẹn** trải nghiệm -> **Giữ chỗ** dịch vụ/gói -> **Đơn bán** (thu từng đợt, công nợ) -> **Khách hàng** (hạng, chăm sóc sau bán, ticket) -> **Báo cáo / Phản hồi**.
Mỗi bước chỉ có **một** màn hình chính. Cấu hình chỉ chứa thông số, không chứa lại danh sách làm việc.

## 2. Đã giống TAG (giữ nguyên)

- Khung: sidebar nhóm, thu gọn, ngăn kéo điện thoại, Ctrl+K tìm khách, tiêu đề trang (`CrmShell.tsx`, `app/crm-shell.css`).
- Màn dùng đúng bộ thẻ/bảng chung (`kit`): Báo cáo, Phản hồi, Nhật ký xem số, Số bị chặn, Việc của tôi, Khách hàng (Care).
- Tổng quan tùy biến theo người (tương đương Dashboard TAG).

## 3. Trùng lặp và thừa: đề xuất xóa

### 3.1. Mã chết (xóa không ảnh hưởng người dùng)
| Mục | Vị trí | Lý do |
|---|---|---|
| `TasksScreen`, `CustomersScreen`, `HoldsScreen` | `Screens.tsx` (~600 dòng) | Không còn nơi nào gọi; đã thay bằng CareTasks, CareCustomers, Đơn bán & Giữ chỗ |
| `lib/crm.ts` (`CRM_RULES`, 255 dòng) | `lib/crm.ts` | CRM cũ đã gỡ, không còn import |
| `/api/crm/channels` | `app/api/crm/channels/route.ts` | Trùng `/api/crm2/channels`; chỉ 1 test cũ gọi, đổi test sang crm2 |
| Bảng cũ `crm_tasks, crm_interactions, crm_agents, crm_leads, crm_lead_contacts, crm_lead_events` | `db/schema.ts` + migration DROP | Rỗng, không ai đọc. **Giữ `crm_outbox`** (hàng gửi tin vẫn dùng) |
| Chú thích/nhãn "SandboxVN" | LeadDistribution, Marketing, Screens | Mô hình ngoài, không phải TAG |
| URL cố định `golfhub.cloud` | `MarketingScreen.tsx` ~dòng 300 | Phải lấy từ domain đang chạy |

### 3.2. Trùng chức năng giữa các màn
| Việc | Đang nằm ở | Giữ ở | Xóa/chuyển |
|---|---|---|---|
| Khóa & địa chỉ webhook, xoay khóa | Marketing > Landing/Webhook **và** Kênh & tích hợp | Kênh & tích hợp | Bỏ tab Landing/Webhook khỏi Marketing |
| "Chiến dịch" hai nghĩa: quảng cáo (chi phí) và gửi tin hàng loạt | Marketing > Chiến dịch & Chi phí, màn Chiến dịch | Marketing giữ "Chi phí & nguồn quảng cáo"; màn **Chiến dịch** chỉ là gửi tin | Đổi tên cho khỏi nhầm: "Chiến dịch tin nhắn" |
| Chia lead (5 tab lead lại) | màn Chia lead, Kho số, Danh sách lead | **Kho số** (nhận số, giao tay, thu hồi) | Xóa màn Chia lead; quy tắc chia nằm ở Cấu hình |
| Quy tắc chia lead, Định tuyến kênh | Cấu hình **và** Chia lead/Kênh | Cấu hình (một nơi) | Bỏ bản trong màn khác |
| Danh mục dịch vụ & gói (`crm2_products`) | Cấu hình CRM, song song bảng giá/gói của câu lạc bộ (`official-packages`) | Một nguồn: lấy từ gói/bảng giá của club | Bỏ form nhập tay thứ hai, CRM chỉ đọc |
| Phễu, nguồn | Tổng quan **và** Báo cáo | Báo cáo | Tổng quan chỉ giữ thẻ việc hôm nay + KPI |
| Nhân sự (`SalesStaffManager`, 2042 dòng) | Chôn trong Cấu hình | Màn riêng "Nhân sự" (TAG có sẵn) | Tách ra, viết lại gọn |
| Số bị chặn | Màn riêng + tab Marketing | Marketing (như TAG) | Gộp, bỏ mục menu riêng |

## 4. Màn chưa giống TAG: xóa và thiết kế lại

Tiêu chí: dùng style inline thay vì bộ `kit`, tiêu đề đánh số/tiếng Anh, tab nút tự vẽ, không theo nhãn + thẻ bo 16px của TAG.

| Màn | Số dòng / style inline | Nhận xét | Việc |
|---|---|---|---|
| Marketing | 1352 / 125 | Tab nút tự vẽ, tiêu đề "1. Hiệu quả theo Nguồn (Source)", "(#mkt-landing)" | **Xóa, viết lại** theo TAG `marketing/page.tsx`: nguồn, chi tiêu theo ngày, CPL/ROAS, seeding, số chặn |
| Nhân sự (trong Cấu hình) | 2042 / 212 | Tệp lớn nhất, toàn style inline | **Xóa, viết lại** thành màn "Nhân sự" |
| Chia lead | 542 / 36 | Mô hình SandboxVN, 5 tab | **Xóa** (gộp vào Kho số) |
| Bàn làm việc | phần của 2425 / 109 | KPI "Telesales" kiểu SandboxVN | **Viết lại** theo TAG `work/page.tsx`: mỗi dòng 1 khách, đồng hồ đếm ngược, ghi kết quả tại dòng |
| Cấu hình | 39 inline | Gom 6 mục dài, trộn nghiệp vụ | **Viết lại**: chỉ thông số (SLA, giờ làm việc, giữ chỗ, hạng, trạng thái hai cấp, nhãn) |
| Ticket hỗ trợ | 318 / 21 | Hợp lý nhưng style inline | Chỉnh nhẹ theo kit |
| Hồ sơ lead (`LeadDetail`) | 569 / 15 | Gần TAG | Chỉnh nhẹ |
| Kênh & tích hợp | 359 / 10 | Gần TAG | Chỉnh nhẹ, thành nơi duy nhất cho webhook |
| Báo cáo, Phản hồi, Nhật ký, Việc của tôi, Khách hàng | sạch | Đã giống | Giữ |

Thành phần dùng chung cần dựng một lần (theo `shared.tsx`/`widgets.tsx` của TAG): `PageCard`, `Tabs` (pill), `StatCard`, `PhoneCell`, `Countdown`, `ResultSelect`, `DateTimeDialog`, `LabelChips`. Mọi màn viết lại dùng các thành phần này, cấm style inline.

## 5. Menu đích

- **Làm việc**: Tổng quan, Bàn làm việc, Kho số, Danh sách lead, Pipeline, Việc của tôi, Lịch hẹn
- **Khách hàng**: Khách hàng, Ticket hỗ trợ, Đơn bán & Giữ chỗ
- **Marketing**: Marketing, Chiến dịch tin nhắn, Kênh & tích hợp
- **Báo cáo**: Báo cáo, Phản hồi
- **Hệ thống**: Nhân sự, Cấu hình, Nhật ký xem số

Từ 19 mục còn 17; bỏ Chia lead và Số bị chặn (gộp), thêm Nhân sự (tách). Không đụng các tính năng TAG có mà Golf chưa làm (CTV, hội thoại, tổng đài): ghi ở `CRM-GAP-TAG.md`.

## 6. Các pha (mỗi pha chạy `tsc`, vitest và các e2e CRM trước khi sang pha sau)

1. **Dọn mã chết** (an toàn nhất): mục 3.1, đổi test `/api/crm/channels` sang crm2, migration DROP 6 bảng cũ.
2. **Dựng bộ thành phần TAG dùng chung** (mục 4) và bỏ trùng webhook giữa Marketing/Kênh.
3. **Viết lại Marketing** rồi **Bàn làm việc**; gộp Chia lead vào Kho số, xóa màn Chia lead, cập nhật `crm-nav.ts` và test `zzzzzzzzzzzz...`.
4. **Tách Nhân sự, viết lại Cấu hình**, bỏ danh mục dịch vụ nhập tay, lấy từ gói của club.
5. Chỉnh nhẹ Ticket, Hồ sơ lead, Kênh; chụp ảnh từng màn đặt cạnh TAG để duyệt.

## 7. Rủi ro cần biết

- Xóa bảng `crm_*` cũ và gộp danh mục sản phẩm là thay đổi dữ liệu: sao lưu D1 trước (đã có `docs/backups/`).
- Nhiều e2e (`zzzz-*`, `zzzzzzzz*`) bám tên tab/nhãn hiện tại, phải cập nhật cùng lúc.
- Cây làm việc đang có nhiều tệp sửa dở chưa commit (README, app/*, lib/*); nên commit hoặc tách nhánh trước khi bắt đầu pha 1.

## 8. Tiến độ

- **Pha 1 xong**: xóa 3 màn chết, route `/api/crm/channels`, 6 bảng `crm_*` cũ (migration 0027), nhãn Sandbox, URL cứng. `lib/crm.ts` vẫn được `club.ts`/`config.ts` dùng nên giữ.
- **Pha 2 xong**: bỏ tab Landing/Webhook (dữ liệu giả) khỏi Marketing, thêm `Card` vào kit.
- **Pha 3 xong (chưa chạy e2e)**: xóa màn Chia lead, Kho số có thêm "Đã chia" + thu hồi hàng loạt kèm lý do; viết lại Bàn làm việc (tab Cần gọi/Quá hạn/Hôm nay/Lịch hẹn/Chăm sóc, đếm ngược hạn, ghi kết quả, kịch bản tin); viết lại Marketing (4 tab: Hiệu quả nguồn, Chiến dịch & chi phí, Số seeding, Số bị chặn), **bỏ tab Insight vì toàn số liệu bịa cố định (52%, 24%...)**; mục menu "Chia lead" và "Số bị chặn" đã bỏ (link cũ tự chuyển sang Kho số / Marketing).
- **Pha 4 xong (chưa chạy e2e)**: tách màn **Nhân sự** (`StaffScreen.tsx`, 350 dòng, thay `SalesStaffManager` 2042 dòng); Cấu hình chỉ còn thông số (Tiếp nhận & SLA, Định tuyến kênh, Bán hàng & Giờ làm, Chăm sóc tự động) và danh mục dịch vụ & gói chỉ xem (bỏ form thêm gói tay). Menu Hệ thống: Nhân sự, Cấu hình, Nhật ký xem số.
- **Pha 5 xong**: Ticket đổi sang KpiTile/FilterBar, Cấu hình bỏ tiêu đề lặp, Nhân sự thêm cột Zalo và nhãn Chủ cơ sở. Hồ sơ lead giữ nguyên (đã gần TAG, 15 style inline). **e2e CRM: 48/48 đạt** (build mới nhất). Còn lỗi ngoài CRM: `flow.spec` (giá gói) và hai spec Zalo/Facebook (publicTenant), thuộc phần giá/hội viên đang sửa dở.
- **Chưa làm**: dựng lại Cấu hình theo kit hoàn toàn; áp migration 0027 lên DB thật (sao lưu D1 trước); commit.
