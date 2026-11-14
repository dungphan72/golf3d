# Tài liệu nghiệp vụ MARKETING: mô hình "AI-driven ERP" (tham chiếu sandboxvn.vn)

> Mục đích: dùng làm đặc tả để prompt AI viết một ứng dụng tương tự.
> Nguồn: quan sát giao diện sandboxvn.vn (bản 538, đơn vị demo "BDS Vạn Gia", ngành bất động sản; hệ thống đa ngành, pipeline mẫu còn có "Khoá học · giáo dục").
> Ghi chú trung thực: phần lớn màn hình đang trống dữ liệu; chức năng bên trong một số tab con (hoa hồng, thiết lập chia, v.v.) chưa mở được, nên các mục đánh dấu **[suy luận]** là đề xuất thiết kế, không phải quan sát trực tiếp.

---

## 1. Tổng quan

Phân hệ Marketing trả lời 3 câu hỏi của chủ doanh nghiệp:
1. **Data (khách tiềm năng, "lead") đến từ đâu, tốn bao nhiêu?** (kênh, chiến dịch, người chạy)
2. **Data đó có chất lượng không, có chốt thành đơn không?** (chuyển đổi, hoàn, khách quay lại)
3. **Mình đang ở đâu so với thị trường và đối thủ?** (giá, thị phần tìm kiếm, kênh bán)

Luồng tổng: `Kênh quảng cáo/Landing/Chat → Thu thập lead tự động → Chống trùng → Gán nguồn/chiến dịch/sản phẩm → Đẩy sang Bán hàng (chia lead) → Kết quả đơn chốt quay ngược về báo cáo Marketing (ROI/ROAS)`.

## 2. Menu (nhóm)

| Nhóm | Trang | Route |
|---|---|---|
| Phân tích | Thị trường | `#mkt-thi-truong` |
| Phân tích | Insight | `#mkt-insight` |
| Kênh | Facebook Ads | `#mkt-facebook` |
| Kênh | Landing/Web | `#mkt-landing` |
| Báo cáo | Danh sách data | `#quan-ly-lead` |
| Báo cáo | Báo cáo Marketing | `#bao-cao-marketing` |

Tính năng dùng chung mọi trang: bộ lọc thời gian (Hôm nay / 7 ngày / 30 ngày / Tháng này), "Bộ lọc", "Xuất Excel", nút "Hướng dẫn" (có số bài), "Tra cứu" toàn cục (F3), "Làm mới", đổi ngôn ngữ, thông báo, chat nội bộ, trợ lý AI "Linh" nổi ở góc.

## 3. Mô-đun chi tiết

### 3.1 Thị trường (`#mkt-thi-truong`)
Tab: **Chỉ số, Tăng trưởng, Phân tích, Hành động, Đối thủ, Nguồn**. Bộ lọc: kỳ (Tháng này), kênh (Tất cả kênh).

Thẻ chỉ số:
- Chỉ số giá của mình (100 = ngang thị trường)
- Số đối thủ đang theo dõi
- Lượt tìm từ khoá chính / tháng
- Thị phần tìm kiếm thương hiệu

Khối:
- **Bản đồ kênh: mình và đối thủ mạnh ở đâu.** Bảng hàng = thương hiệu (Mình + từng đối thủ), cột = Website (lượt ghé/tháng), Fanpage (theo dõi, quảng cáo), Shopee, Lazada, TikTok Shop (đã bán 30 ngày), TikTok video (lượt xem 30 ngày), Google (thị phần tìm). Nhiều ô ghi "sắp có", nguồn dữ liệu dự kiến: Google Trends, scrape website, mua thêm EchoTik / Similarweb / Metric.
- **Chỉ số giá theo mặt hàng**: mặt hàng chủ lực, giá bán TB của mình, giá TB thị trường, rẻ nhất đang bán, chỉ số giá.
- **Thị phần tìm kiếm thương hiệu** (12 tháng) và **xu hướng tìm kiếm** (90 ngày, cả nước).
- Tab **Đối thủ**: khai báo đối thủ (tên, website, fanpage, shop sàn).

### 3.2 Insight (`#mkt-insight`)
Tab: **Tổng hợp, Đơn chốt, Đơn hoàn, Khách quay lại, Chat, Cuộc gọi**. Khoảng thời gian (7 ngày qua). Nút "Phân tích ngay".

Dựa trên tóm tắt hội thoại chat và cuộc gọi do **Trợ lý AI "Tóm tắt khách hàng"** tạo ra (bật ở Trợ lý AI > Tuyển dụng AI). Các chỉ số:
- Khách đã tóm tắt; Có ý định mua; Còn băn khoăn; Đã hẹn/chờ gọi lại; Đã mua sau đó.
- Biểu đồ: Khách đang cần gì; Vì sao khách chưa mua; Câu khách hay hỏi; Sản phẩm được hỏi nhiều.

Mỗi biểu đồ có chú thích "N khách · chat x · gọi y".

### 3.3 Facebook Ads (`#mkt-facebook`)
Tab: **Kết nối tài khoản, Lấy số tự động, Theo dõi quảng cáo, Danh sách data, Báo cáo, Đẩy chốt đơn**.

- **Kết nối tài khoản**: thêm "ứng dụng" Facebook (App ID, token), trạng thái quyền ("Đủ quyền"), thao tác: Cập nhật tài khoản, Soát BM (Business Manager), Sửa token, Xoá ứng dụng, Thêm ứng dụng. Có thông báo lỗi dò quyền (ví dụ "API access blocked").
- **Lấy số tự động**: kéo lead từ Lead Ads/Messenger của Facebook về hệ thống **[suy luận]**.
- **Theo dõi quảng cáo**: chi phí theo tài khoản/chiến dịch/nhóm/mẫu quảng cáo, kéo qua API **[suy luận]**.
- **Đẩy chốt đơn**: gửi sự kiện chuyển đổi (đơn chốt) ngược về Facebook (Conversions API) để tối ưu quảng cáo **[suy luận]**.

### 3.4 Landing/Web (`#mkt-landing`)
Mỗi **nguồn** (trang đích) có một **địa chỉ nhận data** (webhook) dạng `https://nhan.sandboxvn.vn/v/<mã ngẫu nhiên>`; có nút "Chép". Cột bảng: STT, Nguồn, Trạng thái, Nguồn ver1, Chiến dịch, Địa chỉ nhận data, Đổi địa chỉ, **Gán sản phẩm**, Đã nhận (số lead).

Nguồn mẫu: Khách giới thiệu, Sự kiện mở bán, Website dự án BĐS 3T, Google Ads - Đất nền Bình Minh, Zalo OA - Green Villas 3T (loại: Ladipage).

Cấu hình: **Thêm nguồn, Độ dài số (kiểm tra SĐT), Chặn trùng, Data trùng, Cài đặt**, Xuất Excel, "Kết nối landing ver1" (tương thích bản cũ; cảnh báo "Cần đổi API nhận data").

### 3.5 Danh sách data (`#quan-ly-lead`)
Tab: **Danh sách contact, Báo cáo lead theo nguồn, Báo cáo lead theo nhân sự, Báo cáo marketing theo sản phẩm, Báo cáo Marketing, Cấu hình marketing nhập data, Danh sách số seeding**.

- Danh sách contact (lead): lọc theo thời gian + "Kiểu ngày", **Nhập thủ công**, **Nhập Excel**, **Phân bổ nguồn marketing** (gán/chỉnh nguồn cho contact đã có), Xuất Excel.
- **Số seeding**: danh sách SĐT nội bộ/ảo để loại khỏi thống kê **[suy luận]**.
- **Cấu hình marketing nhập data**: quy tắc đưa data vào (nguồn mặc định, chống trùng, độ dài số) **[suy luận]**.

### 3.6 Báo cáo Marketing (`#bao-cao-marketing`)
Thanh phụ: **Sơ đồ kênh, Insight, Chân dung khách hàng, Cơ hội, Facebook Ads, Mẫu sẵn…** + kỳ báo cáo + nút Sửa (tuỳ biến báo cáo).
Khối: **Marketing · kỳ này** (tổng quan), **Dòng tiền qua từng kênh**, **Hiệu quả từng kênh**, **Kết quả theo người chạy**.

## 4. Mô hình dữ liệu đề xuất

| Thực thể | Trường chính |
|---|---|
| Tenant (đơn vị) | tên, ngành, cấu hình pipeline |
| Nguồn data (Source) | loại (LP/FB/Zalo/Google/Tay), tên, webhook_url, chiến dịch, sản phẩm gán, bật chặn trùng, độ dài số |
| Chiến dịch | tên, kênh, người chạy, ngân sách, thời gian |
| Chi phí QC (AdSpend) | ngày, tài khoản, chiến dịch, chi phí, hiển thị, click |
| Contact/Lead | tên, SĐT (chuẩn hoá), email, nguồn, chiến dịch, sản phẩm quan tâm, thời điểm về, cờ trùng/seeding/khách cũ, trạng thái pipeline, người phụ trách |
| Tóm tắt hội thoại (AI) | contact, kênh (chat/gọi), ý định, rào cản, câu hỏi, sản phẩm hỏi, hẹn |
| Đối thủ | tên, website, fanpage, link sàn, chỉ số theo ngày |
| Chỉ số thị trường | đối thủ, kênh, chỉ số, ngày |
| Báo cáo (Mẫu) | bố cục khối biểu đồ, bộ lọc, mẫu sẵn |

## 5. Quy tắc nghiệp vụ

1. Chuẩn hoá SĐT (định dạng +84/0), kiểm tra **độ dài số**, loại số sai.
2. **Chặn trùng**: cùng SĐT trong cửa sổ thời gian → không tạo mới, đánh dấu "Về lại (trùng số)" và đẩy sang nhóm khách cũ/chăm sóc.
3. Lead **bắt buộc có nguồn**; có thể gán lại qua "Phân bổ nguồn marketing".
4. Mỗi nguồn gán được **sản phẩm** để báo cáo marketing theo sản phẩm.
5. Lead "seeding" bị loại khỏi KPI.
6. Doanh thu/đơn chốt từ module Bán hàng được **truy ngược về nguồn** để tính ROI/ROAS/CPL/CPA theo kênh, chiến dịch, người chạy.
7. Chỉ số giá = giá bán TB của mình / giá TB thị trường × 100.
8. Tính năng phụ thuộc trợ lý AI (Insight) chỉ có số liệu khi bật trợ lý tương ứng.
9. Phân quyền: marketing chỉ thấy nguồn/chiến dịch của mình; quản lý thấy toàn bộ **[suy luận]**.

## 6. KPI và báo cáo cần có
CPL, tỉ lệ lead hợp lệ, tỉ lệ trùng, tỉ lệ liên hệ được, tỉ lệ chốt, CPA/CAC, doanh thu theo kênh, ROAS, lợi nhuận gộp theo kênh, hiệu quả theo người chạy, chân dung khách hàng, cơ hội (kênh/sản phẩm đáng tăng ngân sách).

## 7. Tích hợp
- Facebook Marketing API / Lead Ads / Conversions API; Google Ads (qua landing/webhook); Zalo OA; Ladipage và website qua webhook POST.
- Nguồn thị trường: Google Trends, Similarweb, EchoTik, scrape website đối thủ.
- Xuất Excel, nhập Excel.

## 8. Yêu cầu phi chức năng
Đa đơn vị (multi-tenant), đa ngôn ngữ (VI/EN), responsive và cài như PWA ("Tải app về máy"), phân quyền theo vai trò, nhật ký thay đổi (lịch sử), webhook idempotent và chịu tải đột biến, bảo mật token Facebook (mã hoá), tuân thủ luật dữ liệu cá nhân.

---

## PROMPT MẪU (dán cho AI)

```
Hãy xây dựng phân hệ MARKETING của một ứng dụng web "AI-driven ERP" (tiếng Việt, đa đơn vị).
Công nghệ: [Next.js + TypeScript + PostgreSQL + Prisma, đăng nhập đa tenant, PWA].
Menu: Phân tích (Thị trường, Insight), Kênh (Facebook Ads, Landing/Web),
Báo cáo (Danh sách data, Báo cáo Marketing).
Làm theo đặc tả trong tài liệu 01-TAI-LIEU-MARKETING.md (mục 3 đến 7).
Ưu tiên giai đoạn 1: (1) Landing/Web: tạo nguồn + webhook nhận lead, chuẩn hoá SĐT, chặn trùng,
gán sản phẩm; (2) Danh sách data: lọc, nhập Excel/thủ công, xuất Excel, phân bổ lại nguồn;
(3) Báo cáo Marketing: dòng tiền, hiệu quả, kết quả theo người chạy;
giai đoạn 2: Facebook Ads (kết nối, kéo lead, chi phí, đẩy chốt đơn), Insight AI, Thị trường.
Mỗi màn hình có bộ lọc thời gian, bảng có phân trang, trạng thái trống có hướng dẫn.
Cho tôi: sơ đồ DB, API, cấu trúc thư mục, rồi code từng bước, có seed dữ liệu demo.
```
