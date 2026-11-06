# Module CRM (`modules/crm`)

Viết lại từ `CRM-SPEC-CHO-CLAUDE-CODE.md` (CRM bán hàng bất động sản), chuyển sang **tư vấn dịch vụ golf**. Chạy độc lập với "Chăm sóc KH" cũ: bảng `crm2_*`, API `/api/crm2/*`, menu **CRM**. CRM cũ giữ nguyên cho tới khi chuyển dữ liệu xong.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `modules/crm/core/` | Hàm thuần, không đụng CSDL: `phone`, `stages` (giai đoạn, trạng thái hai cấp), `calls` (`applyCallResult`), `distribution` (`pickAssignee`), `workhours`, `appointments`, `orders` (lịch thanh toán, công nợ, quyền hủy), `customers` (hạng, chăm sóc sau bán), `settings` (làm sạch cấu hình), `access` (quyền xem/sửa, che số) |
| `modules/crm/server/` | Truy cập D1 và nghiệp vụ: `leads`, `sales` (lịch hẹn, giữ chỗ, đơn), `customers`, `cron`, `store`, `inputs` (zod), `http` |
| `modules/crm/ui/` | Giao diện: `CrmApp` (11 tab), `LeadDetail`, `Screens` |
| `app/api/crm2/*` | `leads`, `tasks`, `appointments`, `sales`, `customers`, `overview`, `config`, `intake` (form công khai), `cron` |
| `drizzle/0019_*.sql` | Bảng `crm2_settings, runtime, staff, leads, activities, tasks, blocked_phones, appointments, products, holds, orders, order_payments, customer_profiles` |

## Chuyển nghĩa từ bất động sản sang dịch vụ golf

| Spec | Module này |
|---|---|
| Căn hộ (`unit`) | Dịch vụ/gói (`crm2_products`: mã, tên, giá niêm yết, cờ "chỉ một khách giữ") |
| Nhà mẫu | Buổi trải nghiệm |
| Giữ chỗ: một căn một giữ chỗ | Một giữ chỗ hiệu lực cho mỗi dịch vụ **có cờ giới hạn** (chỉ mục duy nhất từng phần); dịch vụ không giới hạn giữ chỗ thoải mái |
| Booking `BK2026-0001` | Đơn bán, cùng mã; mỗi dịch vụ giới hạn chỉ một đơn hiệu lực |
| Hạng khách Bạc/Vàng/Kim cương từ 1/3/10 tỷ | **10 triệu / 30 triệu / 100 triệu** (chỉnh được; đây là giá trị mặc định khác spec cho hợp quy mô câu lạc bộ) |
| Vai trò SALES/MANAGER/ADMIN | Vai trò sẵn có: `sale`, `cskh` làm việc lead; `manager`, `owner` là quản lý (ghi tiền, giao, thu hồi, cấu hình); chỉ `owner` hủy đơn quá 30 ngày |
| Quyền module theo từng người | Dùng quyền theo vai trò của ứng dụng (`crm.view`, `crm.work`, `crm.manage`) |

Giữ nguyên mặc định của spec: hạn liên hệ 15 phút, giữ chỗ 48 giờ, gọi lại 2/24/48 giờ (lần 4 trả kho số), suy nghĩ 2 ngày, tư vấn tiếp 24 giờ, hạn mức nhận số 20/ngày, thu hồi sau 48 giờ, hủy đơn trong 30 ngày, nhắc thanh toán trước 3 ngày.

## Vận hành

- **Cron**: `POST /api/crm2/cron` với `Authorization: Bearer <CRON_SECRET>` (khóa tối thiểu 16 ký tự, thiếu thì 503, sai thì 401), gọi mỗi 5 phút. Bước chạy: hết hạn giữ chỗ, thu hồi lead bỏ quên, cảnh báo quá hạn (một lần mỗi lead), nhắc việc, việc theo dõi lead 7 ngày, sinh nhật, nhắc thanh toán (một lần mỗi đợt). Mỗi bước bắt lỗi riêng; kết quả lưu ở `crm2_runtime` và hiện ở tab Tổng quan.
- **Form công khai**: `POST /api/crm2/intake` `{fullName, phone, consent:true, ...}`; giới hạn 10 lần/10 phút/địa chỉ; ô `website` là bẫy bot; người gửi không biết số có trùng hay bị chặn.
- **Che số**: lead chưa có người phụ trách chỉ lộ `039****999`, ẩn email và ghi chú với nhân viên không phải quản lý, thực hiện ở API; nhân viên cũng không tìm được lead kho số bằng số điện thoại.

## Chưa làm (so với spec)

- P4 đối tác CTV, hoa hồng, đợt chi, người giới thiệu và thưởng.
- P5 nguồn khách có khóa API, chi tiêu quảng cáo, số bị chặn (bảng đã có nhưng chưa có màn quản lý), nhập Excel, chiến dịch email/SMS/ZNS.
- P6 dashboard tùy biến, báo cáo nguồn/nhân viên/phản hồi của module mới (CRM cũ có sẵn "Báo cáo tư vấn").
- P7 Chatwoot, tổng đài, Meta, TikTok, Google Ads.
- Chuyển lead từ CRM cũ sang bảng `crm2_*`: đã có tệp nhập một lần (`scripts/crm-legacy-to-crm2.sql`, xem `docs/CRM-MIGRATION.md`); các cổng nhận lead vẫn ghi vào bảng cũ, và việc nhắc, khách hàng, nhân sự chưa chuyển; cột trưởng nhóm/nhóm đã có (`crm2_staff`) nhưng chưa có màn sửa.
- Trưởng nhóm xem lead của nhóm (spec cũng chưa làm): hiện chỉ dùng để duyệt lịch hẹn.
