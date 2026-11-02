# Tiến độ Golf3D

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
- Chưa có thay phòng, giảm giá/duyệt tài chính, mixed payment, hoàn tiền, chốt ca và duyệt xử lý phiên thiếu giá.
- Các khung giá tham khảo cần chủ cơ sở kiểm tra trước mở bán. Giá nhóm/VIP chưa rõ phải nhập, không suy đoán. Snapshot booking v0.1 vẫn giữ hành vi giá flat lịch sử.
- Chưa có kho/F&B/QR gọi món, CRM, HLV, gói/hội viên, giải, báo cáo lợi nhuận, backup tự động và import Excel.
- Chưa có kết nối bên ngoài, notification âm thanh/push/escalation hoặc kết nối thiết bị.
- PWA manifest/standalone cơ bản; chưa có service worker/offline, đúng phạm vi cần Internet.
- UI tiếng Việt trước; EN/KO và CMS giai đoạn sau.

## Thứ tự tiếp tục (không bỏ yêu cầu)
1. Tách service/api, hoàn thiện auth golfer + organization memberships/RBAC, bảo vệ tenant và kiểm thử truy cập chéo.
2. Hoàn thiện policy booking/late/cancel/deposit, chuyển phòng, adjustment approvals. Bảng giá/revision/báo giá đã hoàn thành trong v0.2, chưa gồm lịch tự hiệu lực trong tương lai.
3. Payment ledger idempotent, split/mixed tender, shift/cashbook và đối soát. Khóa audit bất biến, idempotency keys cho tất cả mutation.
4. Gọi nhân viên realtime, customer-session binding, F&B/bar/kitchen, kho/mua hàng.
5. Gói/loyalty/HLV/CRM/giải/reporting và connectors thật.
6. Tenant onboarding, billing thuê bao, branded website, 3 ngôn ngữ/CMS, domain, backup/restore, load/security/accessibility QA trước mở công khai.
