# CRM lead: từ tin nhắn đầu tiên đến thanh toán

Màn hình **Chăm sóc KH** nay nằm trong mục **CRM** của menu, ở tab cuối **Chăm sóc KH (cũ)** (mục "Chăm sóc KH" riêng đã bỏ khỏi menu; liên kết `?view=crm` và cảnh báo lead quá hạn trên trang chủ mở thẳng tab này). Bên trong có các tab nhỏ: Lead mới, Việc cần làm, Hồ sơ khách, Báo cáo tư vấn (quản lý), Thiết lập (Nhân sự nhận lead, Kênh & tích hợp, Quy trình tự động). Tab này giữ lại vì lead từ Zalo, Facebook và form quảng cáo vẫn ghi vào bảng cũ cho tới khi chuyển dữ liệu sang module CRM mới (`docs/CRM-MODULE.md`).

## Luồng chạy

1. **Nhận lead.** Mỗi liên hệ từ Facebook, Zalo OA, form website, form quảng cáo và form đặt lịch của chính website này thành một lead. Lưu nguồn, chiến dịch, nội dung, giờ nhận. Gộp hồ sơ khách theo số điện thoại đã chuẩn hóa (+84, dấu cách, gạch nối). Khách liên hệ lại khi lead còn chờ gọi: gộp vào lead đó, người phụ trách được báo lại. Cùng một webhook gửi lại hai lần chỉ xử lý một lần (khóa theo mã sự kiện của kênh).
2. **Phân nhân viên.** Chia luân phiên cho nhân viên vừa được bật "Nhận lead" vừa đang "Trực" (tab Nhân sự nhận lead; công tắc trực tự tắt sau 12 giờ). Khách cũ ưu tiên người từng phụ trách nếu đang trực. Gửi ngay email và Zalo cho nhân viên: tên khách, số điện thoại, nhu cầu, nguồn, link hồ sơ. Hạn gọi là 5 phút kể từ lúc CRM nhận lead.
3. **Quá 5 phút chưa ghi nhận cuộc gọi** (kể cả cuộc gọi không nghe máy): báo quản lý (email và Zalo) và chuyển cho nhân viên trực tiếp theo, hạn mới 5 phút. Hết người trực, hoặc mọi người đang trực đã từng giữ lead: lead vào hàng chờ và báo quản lý; có người vào ca thì hàng chờ tự được giao. Lead không có số điện thoại (ví dụ nhắn Zalo): giao người phụ trách trả lời qua kênh gốc, ghi nhận bằng "Đã trả lời".
4. **Tư vấn và đặt lịch.** Trong thẻ lead: chọn dịch vụ, giờ, số khách, phòng VIP, bấm kiểm tra: phòng trống, báo giá (chia nhóm trên 4 người theo line), giờ gần đó còn trống. "Gửi link đặt lịch" tạo link `/book/<mã>?service=..&start=..&guests=..&name=..&phone=..` đã điền sẵn và gửi qua email/Zalo của khách (khách chưa có kênh nào: sao chép link gửi tay). Khách gửi form → thêm một liên hệ vào cùng lead. Lễ tân xác nhận yêu cầu đặt lịch: thông tin lịch gửi ngay cho khách, nhắc trước 24 giờ và 2 giờ, lead chuyển "Đã đặt lịch". Đổi lịch (đổi giờ/phòng: đặt mới rồi hủy cũ, nhắc cũ dừng), hủy lịch (báo khách, dừng nhắc), khách không đến sau giờ hẹn 10 phút (giải phóng line, báo khách, tạo việc liên hệ lại).
5. **Check-in và tính tiền.** Lễ tân bắt đầu và kết thúc phiên như cũ. Mới: gia hạn luyện tập 15–240 phút có kiểm tra line còn trống và giờ đóng cửa; thu gộp nhiều phiếu của một nhóm bằng một lần xác nhận (`pay-group`); giá theo thời lượng hoặc 9/18 hố theo người, khuyến mãi và trừ gói như cũ. Thu tiền xong: gửi biên nhận (mỗi phiếu một lần, thu lại không gửi trùng).
6. **Sau chơi.** Một ngày sau khi thu tiền: tin cảm ơn và hỏi trải nghiệm; gợi ý đặt lại (kèm link) chỉ gửi cho khách đã tích "đồng ý nhận tin ưu đãi" (tích ở form đặt lịch hoặc trong hồ sơ). Tin đặt lịch, biên nhận, cảm ơn là tin dịch vụ, không cần đồng ý. Ghi nhận phản hồi trong hồ sơ: từ 3 sao trở xuống tạo việc "Xử lý phản ánh" và báo quản lý ngay. Các quy trình nhắc cũ (khách lâu không quay lại, gói sắp hết, sinh nhật, đủ điểm) vẫn tự sinh việc.

Hồ sơ khách hiện: người phụ trách, hạn gọi hoặc giờ đã liên hệ, toàn bộ lịch sử xử lý (tiếp nhận, giao, quá hạn, cuộc gọi, link, đặt lịch) và lịch sử chăm sóc.

## Cấu hình kênh (tab Kênh & tích hợp cho biết kênh nào sẵn sàng)

Bí mật đặt bằng Worker secrets, không lưu trong cơ sở dữ liệu:

```bash
pnpm exec wrangler secret put RESEND_API_KEY --config dist/server/wrangler.deploy.json
```

| Kênh | Cần | Việc phải làm |
|---|---|---|
| Form đặt lịch trên website này | không | chạy sẵn |
| Form website 3dgolf.vn | mã webhook "Website" (tạo trong tab Kênh) | Form gửi `POST /api/leads/website` JSON `{name, phone, need, guests, message, campaign, consent}` kèm header `x-lead-token` (có CORS) |
| Form quảng cáo (Google, TikTok, Zapier, Make) | mã webhook "Quảng cáo" | `POST /api/leads/ads`, `source` là tên nền tảng (dùng làm chiến dịch) |
| Facebook Lead Ads | `FB_VERIFY_TOKEN`, `FB_APP_SECRET`, `FB_PAGE_TOKEN` | Trong Meta for Developers đăng ký webhook `/api/leads/facebook` (object Page, field `leadgen`); page token để lấy chi tiết biểu mẫu |
| Zalo OA nhận tin | `ZALO_APP_ID`, `ZALO_APP_SECRET` | Webhook `/api/leads/zalo` trong Zalo for Developers; lead Zalo thường không có số điện thoại |
| Gửi email | `RESEND_API_KEY`, `MAIL_FROM` (tên miền đã xác minh trên Resend) | |
| Gửi Zalo OA | `ZALO_OA_TOKEN` | Chỉ nhắn được người đã nhắn OA; điền Zalo ID của nhân viên/khách ở hồ sơ |
| Quét định kỳ | `CRON_SECRET` | Gọi `POST /api/cron/crm` với `Authorization: Bearer <CRON_SECRET>` mỗi phút từ bộ lập lịch (Cloudflare Cron, cron-job.org, UptimeRobot) |

Chưa cấu hình kênh gửi thì tin nằm trong hàng chờ ("pending", tab Kênh & tích hợp), tự gửi khi cấu hình xong; thông báo cho nhân viên quá 24 giờ thì hết hạn. Không có bộ lập lịch, việc quá hạn 5 phút chỉ được xử lý khi có người mở màn hình CRM hoặc có lead mới.

## Chống trùng

Lead trùng (khóa kênh), lead đang chờ của cùng số điện thoại (chỉ mục duy nhất), bước phân lead và quá hạn (so sánh-rồi-đổi trên bộ đếm leo thang), tin nhắn (khóa duy nhất mỗi sự kiện và kênh, nhận tin bằng cách nhận quyền gửi trước khi gọi nhà cung cấp), booking và thanh toán (khóa yêu cầu sẵn có) đều chạy lại không tạo bản ghi thứ hai.

## Kiểm thử

`tests/lead_sql_test.py`, `tests/leads.test.ts`, `tests/e2e/zzz-leads.spec.ts` (từ lead đến thanh toán; ca quá hạn 5 phút; ca hết người trực; chữ ký Facebook và Zalo; gia hạn bị chặn; thu gộp thu lại; biên nhận một lần). Máy chủ kiểm thử bật `E2E_MOCK_CHANNELS` nên tin "gửi" thành công không cần nhà cung cấp; trên site thật kênh gửi chỉ chạy khi có khóa thật.

## Tư vấn dịch vụ: giai đoạn, bước kế tiếp, báo cáo (migration 0018)

Dựa trên `MO-TA-CHUC-NANG-CRM.docx`, chuyển phần bán hàng bất động sản sang tư vấn dịch vụ của câu lạc bộ.

- **Giai đoạn** của mỗi lead: Mới, Đã liên hệ, Có nhu cầu, Hẹn trải nghiệm, Đã trải nghiệm, Giữ chỗ/đặt cọc, Chốt dịch vụ, Không thành. Chuyển tay bằng nút "Chuyển giai đoạn": Chốt bắt buộc giá trị dịch vụ, Không thành bắt buộc chọn lý do, Hẹn trải nghiệm bắt buộc giờ ở tương lai. Lead đã đóng (chốt hoặc không thành) không đổi giai đoạn nữa.
- **Kết quả cuộc gọi tự đặt bước kế tiếp**: không nghe máy/máy bận hẹn gọi lại sau 2 giờ, 1 ngày, 2 ngày (đếm số lần gọi hụt); cần suy nghĩ thêm hẹn 2 ngày; có nhu cầu cần tư vấn tiếp hẹn 1 ngày; hẹn trải nghiệm/dời lịch bắt buộc giờ; đã trải nghiệm bám sát sau 1 ngày; sai số và không có nhu cầu tự đóng lead là không thành.
- **Hồ sơ lead**: dịch vụ quan tâm, ngân sách, nhãn (VIP, Doanh nghiệp, Người mới chơi, Cần HLV, Nhạy cảm về giá), ghi chú.
- **Giao diện**: ba cách xem trong tab Lead mới: Danh sách (lọc theo giai đoạn), Bàn làm việc (việc gấp nhất lên đầu), Pipeline (cột theo giai đoạn).
- **Báo cáo tư vấn** (quản lý): phễu theo giai đoạn, hiệu quả theo nguồn, theo nhân viên kèm thời gian phản hồi trung bình, lý do không thành; lọc 7/30/90 ngày (`GET /api/crm/leads?report=30`).
- **Chưa làm** (so với tài liệu): kho số tự nhận, hạn mức nhận số, SLA và giờ làm việc chỉnh được (đang cố định 5 phút), đối tác/hoa hồng, booking và lịch thanh toán nhiều đợt, chiến dịch gửi hàng loạt, tổng đài, Chatwoot.
