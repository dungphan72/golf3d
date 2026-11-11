# CRM Golf so với CRM TAG-website (đối chiếu 11/11/2026)

Nguồn đối chiếu: `D:/Claude/TAG-website/CRM-SPEC-CHO-CLAUDE-CODE.md` (22 màn hình, 8 pha). Module `modules/crm` đã được viết lại từ chính đặc tả này (xem `docs/CRM-MODULE.md`), nên phần lõi đã giống. Bảng dưới là kết quả rà soát thực tế trong mã.

| Nhóm TAG | Golf hiện có | Trạng thái |
|---|---|---|
| Bàn làm việc, Kho số, Danh sách lead, Pipeline, Việc của tôi | Tab Bàn làm việc, Lead & Phễu (danh sách, chia lead, pipeline, kho số) | Có |
| Lịch hẹn (duyệt, đến/không đến), Giữ chỗ, Booking (lịch thanh toán, công nợ, hủy 30 ngày) | Lịch hẹn, Đơn bán & Giữ chỗ | Có (booking = đơn bán dịch vụ/gói) |
| Khách hàng (mã KH, hạng, chăm sóc sau bán, sinh nhật) | Khách hàng, Chăm sóc khách (kịch bản tự động, hạng VIP) | Có |
| Tiếp nhận (chặn rác, chống trùng, SLA, thu hồi, giờ làm việc, cron) | Có đủ, SLA 5 phút | Có |
| Nguồn khách, webhook Website/Facebook/Zalo/Ads | Kênh & tích hợp, định tuyến theo nguồn | Có |
| Marketing: chiến dịch, chi phí, CPL/ROAS, seeding | Tab Marketing | Có |
| Báo cáo nguồn, nhân viên, phản hồi đầu tiên, lý do thất bại | Tab Báo cáo (phễu, nguồn, nhân viên, chăm sóc, lý do) | Có |
| Nhật ký xem số, nhật ký hoạt động | Cấu hình > Nhật ký xem số, màn Nhật ký | Có |
| **Quản lý số bị chặn** | Bảng đã có, **chưa có màn hình** | **Đã làm hôm nay** (Cấu hình > Số bị chặn, API `/api/crm2/blocked`, có test) |
| Dashboard tùy biến theo người (thẻ bật/tắt, sắp xếp, khoảng ngày) | Tổng quan cố định | Chưa |
| Chiến dịch tin nhắn hàng loạt (phân khúc lưu, lịch gửi, lặp, theo dõi từng người) | Chỉ có tin chăm sóc tự động theo kịch bản | Chưa |
| Nhập Excel có xem trước và hoàn tác theo lô, cột chiến dịch | Nhập CSV lead có sẵn, chưa có xem trước/hoàn tác/cột chiến dịch | Một phần |
| Giới thiệu (người giới thiệu + thưởng) | Không có | Chưa |
| Đối tác CTV, hoa hồng, đợt chi | Không có | Chưa, cần chủ quyết định mô hình |
| Hội thoại (Chatwoot), Cuộc gọi (tổng đài), Meta/TikTok/Google Ads kéo chi phí | Nhận tin Zalo/Facebook thành lead; chi phí nhập tay | Chưa, cần tài khoản/dịch vụ ngoài |
| Trưởng nhóm xem lead của nhóm; màn sửa nhóm/trưởng nhóm | Cột đã có (`crm2_staff`), chưa có màn và chưa xét trong `canSeeLead` | Chưa (bản gốc TAG cũng chưa làm) |
| Chế độ xem lưu, cột tùy chỉnh ở danh sách lead | Không có | Chưa |

## Đề xuất thứ tự làm tiếp
1. **Dashboard tùy biến** (bảng `crm2_dashboard_layouts`, 1 migration nhỏ): rẻ, dùng ngay, không cần quyết định kinh doanh.
2. **Nhập Excel/CSV có xem trước + hoàn tác theo lô + cột chiến dịch**: dùng lại bộ chống trùng/chặn số sẵn có.
3. **Chiến dịch tin nhắn hàng loạt** trên hàng đợi `crm_outbox` đã có (email/Zalo OA), có phân khúc lưu và theo dõi từng người nhận.
4. **Giới thiệu + thưởng** (hội viên giới thiệu bạn, thưởng giờ chơi/điểm): cần chủ chốt chính sách thưởng.
5. **Trưởng nhóm** xem lead nhóm: sửa `canSeeLead` và câu SQL `listLeads` cùng lúc, kèm test phân quyền; đây là thay đổi quyền nên cần duyệt riêng.
6. CTV/hoa hồng, hội thoại, tổng đài, Ads API: chỉ làm khi có quyết định kinh doanh hoặc tài khoản thật.
