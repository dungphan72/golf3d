# Tiến độ Golf3D

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
- Chưa có ngày lễ, phiên bản giá 9/18 theo khung giờ đầy đủ, thay phòng, phí cố định, giảm giá/duyệt tài chính, mixed payment, hoàn tiền, chốt ca.
- Bảng gói 9/18 pilot chỉ một giá theo số người/loại phòng; chưa hiện thực khóa giá theo khung giờ đã đặt, không dùng giá seed cho thu thật.
- Chưa có kho/F&B/QR gọi món, CRM, HLV, gói/hội viên, giải, báo cáo lợi nhuận, backup tự động và import Excel.
- Chưa có kết nối bên ngoài, notification âm thanh/push/escalation hoặc kết nối thiết bị.
- PWA manifest/standalone cơ bản; chưa có service worker/offline, đúng phạm vi cần Internet.
- UI tiếng Việt trước; EN/KO và CMS giai đoạn sau.

## Thứ tự tiếp tục (không bỏ yêu cầu)
1. Tách service/api, hoàn thiện auth golfer + organization memberships/RBAC, bảo vệ tenant và kiểm thử truy cập chéo.
2. Versioned price rules theo ngày/giờ/lễ/loại phòng/nhóm người, full policy booking/late/cancel/deposit, chuyển phòng, adjustment approvals.
3. Payment ledger idempotent, split/mixed tender, shift/cashbook và đối soát. Khóa audit bất biến, idempotency keys cho tất cả mutation.
4. Gọi nhân viên realtime, customer-session binding, F&B/bar/kitchen, kho/mua hàng.
5. Gói/loyalty/HLV/CRM/giải/reporting và connectors thật.
6. Tenant onboarding, billing thuê bao, branded website, 3 ngôn ngữ/CMS, domain, backup/restore, load/security/accessibility QA trước mở công khai.
