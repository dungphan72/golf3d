# Nâng cấp CRM theo 3 tài liệu `tailieucrm` (09/11/2026)

Nguồn: `tailieucrm/01-TAI-LIEU-MARKETING.md`, `02-TAI-LIEU-BAN-HANG.md`, `03-TAI-LIEU-CAI-DAT.md` (đặc tả quan sát từ sandboxvn.vn, ngành bất động sản). Ba tài liệu viết cho một ERP đa ngành; ở đây chỉ lấy phần hợp với một câu lạc bộ golf 3D một cơ sở và chưa có trong CRM hiện tại. Đã đối chiếu với module CRM đang chạy (`modules/crm`, bảng `crm2_*`) trước khi làm.

## Đã làm trong đợt này

### 1. Marketing: chiến dịch, chi phí quảng cáo, hiệu quả (tài liệu 01, mục 3.5, 3.6, 5, 6)
CRM > **Marketing** (chỉ quản lý). Trước đây lead không lưu chiến dịch (chỉ nằm trong ghi chú) và không có chi phí, nên không tính được CPL/ROAS.
- **Chiến dịch** (tên, nguồn, người chạy, ngân sách, bật/tắt). Tên không phân biệt hoa thường; không xóa được chiến dịch đã có chi phí (chỉ tắt) để giữ số liệu.
- **Chi phí theo ngày** cho từng chiến dịch (số tiền, hiển thị, lượt bấm). Nhập lại cùng ngày thì ghi đè. Không nhập cho ngày chưa tới.
- Lead từ website, Facebook và quảng cáo giờ **lưu chiến dịch** (lần chạm đầu, khách gửi lại không đổi chiến dịch).
- **Báo cáo theo nguồn, chiến dịch, người chạy** trong 7/30/90 ngày: lead hợp lệ, tỉ lệ trùng, tỉ lệ liên hệ, chốt, chi phí, **CPL, CPA, doanh thu, ROAS**. Xuất CSV.
  - Doanh thu = tiền đã thu của khách có lead trong kỳ: thanh toán đơn CRM + phiếu chơi đã thu theo số điện thoại. Mỗi phiếu chỉ tính một lần (về lead sớm nhất của số đó), nên nhiều lead cùng số không làm doanh thu nhân đôi.
  - Chỉ số chưa tính được (chưa có chi phí hoặc chưa có lead) hiện "—", không hiện 0, để không nhầm "miễn phí" với "chưa biết".
  - Lead thuộc một chiến dịch đã khai báo được tính về nguồn của chiến dịch đó.
- **Số seeding** (số nội bộ/số thử): lead vẫn tạo để nhân viên thấy nhưng bị loại khỏi lead hợp lệ, chốt, doanh thu. Thêm hoặc bỏ số sẽ cập nhật cả lead đã có.
- **Phân bổ lại nguồn/chiến dịch** cho lead đã có (API `reassign`, tối đa 200 lead mỗi lần).

### 2. Nhật ký xem số điện thoại (tài liệu 03, mục 3.4, 3.5, 5.5)
CRM > Cấu hình > **Nhật ký xem số** (chỉ quản lý). Ghi mỗi lần nhân viên không phải quản lý mở hồ sơ lead và thấy đủ số, một lần cho mỗi người và lead trong 10 phút. Lead trong kho số chưa nhận chỉ hiện số đã che nên không ghi. Dùng để truy vết khi lộ dữ liệu khách.

### Kỹ thuật
- Migration `0024` (bảng `crm2_campaigns`, `crm2_ad_spend`, `crm2_seeding`, cột `crm2_leads.campaign`, `seeding`) và `0025` (`crm2_view_log`). Chạy một lần sau 0023, như các migration trước.
- API: `GET/POST /api/crm2/marketing`, `GET /api/crm2/view-log`. Quyền `crm.manage`; chưa đăng nhập 401, vai khác quản lý 403.
- Test: `tests/marketing.test.ts` (5 test thuần), `tests/e2e/zzzzzzz-marketing.spec.ts` (6 bài: quyền, chiến dịch, chi phí, CPL/ROAS, seeding, trùng số, phân bổ lại, CSV, doanh thu từ tiền cọc đơn CRM, nhật ký xem số, giao diện). Phần doanh thu từ phiếu chơi đã thu theo số điện thoại đã kiểm tay một lần trên bản chạy thật nhưng chưa có test tự động (các line bị chiếm hết khi chạy cả bộ).

## Đã có sẵn trong CRM, không làm lại
| Mục trong tài liệu | Hiện trạng |
|---|---|
| Webhook nhận lead từng nguồn, chống trùng, chuẩn hóa SĐT (01 mục 3.4, 5) | Có: Kênh & tích hợp, trùng số gộp vào lead cũ |
| SLA, thu hồi, chia lead xoay vòng/tỉ lệ, kho số thả nổi (02 mục 3.3, 3.6, 5) | Có: SLA 5 phút, giờ làm việc, kho số, chia lead |
| Pipeline trạng thái, tác nghiệp, mẫu tin (02 mục 3.5) | Có: giai đoạn, tác vụ gọi/hẹn/báo giá |
| Lịch hẹn, Blacklist, Đơn hàng/cọc/giữ chỗ, sản phẩm (02 mục 3.2, 3.7) | Có |
| Che số điện thoại lead chưa nhận; phạm vi dữ liệu "của mình" (03 mục 3.4, 3.7) | Có |
| Nhật ký hoạt động (03 mục 3.5) | Có (màn Nhật ký). **Nhật ký đăng nhập (IP, thiết bị) chưa có**, xem mục "Chưa làm" |
| Phân quyền theo vai | Có (6 vai cố định) |

## Chưa làm, và lý do
Các mục dưới đây hoặc cần tích hợp ngoài chưa có, hoặc không hợp với một cơ sở golf, hoặc là thay đổi lớn cần quyết định riêng. Tôi không suy diễn chúng thành tính năng.
- **Facebook Ads: kéo chi phí tự động, đẩy sự kiện chốt đơn (Conversions API)**: cần App ID/token Facebook thật. Hiện nhập chi phí tay.
- **Thị trường/đối thủ, Insight AI (tóm tắt chat/cuộc gọi), "Phân quyền bằng lời", trợ lý AI**: cần nguồn dữ liệu và dịch vụ AI ngoài.
- **Chat sale đa kênh (Zalo OA, Messenger) có hộp thư hai khung**: đã có nhận tin Zalo/Facebook vào lead; hộp thư đầy đủ là một dự án riêng.
- **Cộng tác viên, hoa hồng, công nợ**: mô hình bán qua CTV chưa có trong chính sách kinh doanh của câu lạc bộ; cần chủ quyết định trước.
- **Nhật ký đăng nhập (IP, thiết bị)**: chưa ghi; nên làm cùng với duyệt thiết bị.
- **Cây quyền 3 cấp, vai tùy chỉnh, nhiều vai/người, duyệt thiết bị, OTP/Captcha cho nhân viên, khóa API, mẫu thông báo có biến, gói tiện ích bật/tắt, nhiều chi nhánh**: thay đổi lớn về phân quyền và hạ tầng, ảnh hưởng toàn hệ thống; nên làm riêng với thiết kế được duyệt. Hệ thống hiện có 6 vai cố định và một cơ sở.
- **Nhập Excel theo cột nguồn/chiến dịch**: nhập CSV lead có sẵn nhưng chưa nhận cột chiến dịch.

## Hướng dẫn dùng nhanh
1. CRM > Marketing > thêm chiến dịch, **đặt tên đúng bằng mã chiến dịch** gửi kèm lead (tham số `campaign` của webhook website/quảng cáo, hoặc tên chiến dịch của Facebook).
2. Mỗi ngày nhập chi phí từng chiến dịch.
3. Thêm số điện thoại nội bộ vào seeding để không làm lệch chỉ số.
4. Xem CPL, CPA, ROAS theo nguồn/chiến dịch/người chạy; tải CSV khi cần.
