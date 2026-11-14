# Tài liệu nghiệp vụ BÁN HÀNG: mô hình "AI-driven ERP" (tham chiếu sandboxvn.vn)

> Mục đích: dùng làm đặc tả để prompt AI viết một ứng dụng tương tự.
> Nguồn: quan sát giao diện sandboxvn.vn (bản 538, đơn vị demo "BDS Vạn Gia", ngành bất động sản).
> Ghi chú trung thực: nhiều màn hình đang trống dữ liệu, màn "Báo cáo bán hàng" hiển thị "đang được hoàn thiện"; mục đánh dấu **[suy luận]** là đề xuất thiết kế, không quan sát trực tiếp.

---

## 1. Tổng quan

Phân hệ Bán hàng nhận lead từ Marketing, **chia** cho nhân sự, **chăm sóc theo pipeline**, chốt đơn (qua chat, gọi điện, cộng tác viên), rồi chuyển Kho vận/Kế toán.

Luồng: `Lead về → Chia lead (luật) → Chat sale / Telesales xử lý → Pipeline (trạng thái + tác nghiệp) → Đơn hàng / Booking / Cọc → Care đơn & Kho vận → Kế toán`. Kho số thả nổi và CTV là hai đường vào/ra phụ.

## 2. Menu

| Trang | Route | Vai trò |
|---|---|---|
| Chat sale | `#ban-hang-online` | Hộp thư chung đa kênh (Facebook, Zalo cá nhân, Zalo OA) |
| Telesales | `#tele-sales-2` | Gọi/chăm sóc theo danh sách contact |
| Chia lead | `#chia-lead` | Luật và máy chia data |
| Cộng tác viên | `#ctv` | Mạng lưới CTV, hoa hồng, công nợ |
| Sales pipe | `#ban-hang-sales-pipe` | Cấu hình pipeline và tác nghiệp |
| Kho số thả nổi | `#ban-hang-kho-so` | Kho số dùng chung, nhân viên tự nhận |
| Báo cáo bán hàng | `#ban-hang-bao-cao` | (đang hoàn thiện) |

Liên quan: **Hàng hoá** (Sản phẩm `#quan-ly-sp`, Bảng giá `#bang-gia`), **Kho vận** (`#kho-care-don`).

## 3. Mô-đun chi tiết

### 3.1 Chat sale (`#ban-hang-online`)
Tab: **Hội thoại, Báo cáo, Chia chat, Kết nối**.
- Lọc kênh: Tất cả / Facebook / Zalo cá nhân / Zalo OA. Bật thông báo, **bong bóng chat nổi**, lịch sử chia.
- Lọc theo **pipeline/trạng thái**, **Quá SLA** (có bộ đếm, demo: 82), **nhãn** (Khách vip, Khách thường, Nhà đầu tư, Mua để ở, Đã xem nhà mẫu, Đã đặt cọc), và bộ lọc nhanh: Tất cả / Chưa đọc / Đã đọc / Chưa trả lời / Đã trả lời / Có SĐT / Không SĐT / Chưa chia.
- Màn hai khung: danh sách hội thoại bên trái, khung chat và hồ sơ khách bên phải.
- **Chia chat**: tự phân hội thoại mới cho nhân viên (theo luật).
- **Kết nối**: liên kết trang Facebook, Zalo OA, Zalo cá nhân để nhận tin.

### 3.2 Telesales (`#tele-sales-2`)
Tab: **Telesales, Đơn hàng sale, Duyệt lịch hẹn, Danh sách blacklist, Danh sách khách hàng, Báo cáo, Cấu hình**.
- Bộ lọc thời gian (7 ngày qua), chế độ "Chuẩn Sandbox", Lọc nâng cao.
- Hành động: **Thêm contact, Tạo lịch hẹn, Cập nhật nhãn, Phân bổ nguồn marketing**.
- Bộ đếm: Tất cả, Chưa tương tác, Đã tương tác, Mới tương tác, **Quá SLA**.
- Chế độ xem: Dạng danh sách / Dạng tương tác; Theo bản ghi / Theo khách.
- Thanh **pipeline** với số lượng từng trạng thái (xem mục 3.5).
- **Duyệt lịch hẹn**: quản lý duyệt lịch hẹn xem nhà/gặp khách. **Blacklist**: số bị chặn. **Đơn hàng sale**: đơn do sale tạo.

### 3.3 Chia lead (`#chia-lead`)
Có "Chia lead ver2" (đang dùng) và ver1. Tab: **Danh sách, Thiết lập chia**.
- Phân loại data về: **Chưa chia, Đã chia, Khách cũ, Về lại (trùng số), Chăm sóc**.
- Bảng điều khiển "Máy chia": số đã chia / chưa chia / **trượt** / lỗi ghi nhận trong ngày; trạng thái "chưa có luật nào đang bật".
- Luật chia **[suy luận từ ngành]**: xoay vòng, theo tỉ lệ, theo nhóm/team, theo nguồn/sản phẩm, theo ca làm, giới hạn số data/người, khách cũ trả về người cũ, thu hồi khi quá SLA rồi chia lại.

### 3.4 Cộng tác viên (`#ctv`)
Tab: **Danh sách cộng tác viên, Thiết lập hoa hồng, Đơn hàng, Báo cáo, Công nợ, Cộng đồng, Thiết lập**.
- Trạng thái CTV: Chờ duyệt / Đang bán / Tạm dừng; thao tác Duyệt, Xoá, Thêm, Nhập Excel, Xuất Excel.
- Hoa hồng theo sản phẩm/bậc/cấp (đa cấp tuỳ chọn) **[suy luận]**; đơn của CTV, công nợ phải trả, cộng đồng (nội dung, đào tạo cho CTV).

### 3.5 Sales pipe (`#ban-hang-sales-pipe`)
Mỗi đơn vị có **nhiều pipeline** (đang dùng 1, có "Sao lưu", "Thêm pipeline", "Sắp xếp pipeline bằng AI").

Cấu trúc:
- **Trạng thái (stage)** xếp thành chuỗi, mỗi stage có: số data, **nhãn**, **mẫu tin nhắn**, và các **tác nghiệp** gắn kèm.
- **Tác nghiệp có sẵn (kéo-thả vào stage)**, 3 nhóm:
  - *Liên hệ khách*: Gọi điện, Nhắn tin, Xin số khách, Hẹn gặp
  - *Chốt bán*: Báo giá, Hợp đồng, Khảo sát
  - *Tiền và hàng*: Nhận cọc, Giao đợt, Nghiệm thu, Nhắc nợ
- **Ngoài pipeline** (trạng thái rời): Khách mới, Đang tư vấn, Tiềm năng, Đã xem nhà mẫu, Đã booking, Không tiềm năng, Chưa xếp trạng thái.
- Pipeline mẫu giáo dục: S1 Lead mới (Gọi lần 1, Gọi lần 2) → S2 Liên hệ (Nhắn Zalo) → S3 Tư vấn (Tư vấn lộ trình) → S4 Học thử (Mời học thử, Sau học thử) → S5 Đăng ký (Chốt học phí) → S6 Chăm sóc học viên (Hỏi thăm, Mời khoá tiếp).
- Pipeline mẫu bất động sản (nên có sẵn): Khách mới → Đang tư vấn → Tiềm năng → Đã xem nhà mẫu → Đã booking (đặt cọc) → Ký HĐ.

### 3.6 Kho số thả nổi (`#ban-hang-kho-so`)
Tab: **Cấu hình kho số theo team**, Cấu hình kho số. Số khách chưa ai nhận hoặc bị thu hồi vào kho dùng chung; nhân viên tự nhận theo quy tắc. Tính năng bật theo đơn vị (hiện demo: "Đơn vị không cấu hình sử dụng").

### 3.7 Sản phẩm và Bảng giá (cơ sở cho bán hàng)
- **Sản phẩm** (`#quan-ly-sp`): tab Sản phẩm, Combo, Dịch vụ, Thẻ, Danh mục, Nhãn, Cấu hình. Dạng bảng/thẻ, lọc, quét mã, in barcode, nhập/xuất Excel, **nhóm hàng theo dự án** (demo: The Sunrise Riverside 16, Green Villas 3T 12, Đất nền Bình Minh 13; tổng 41). Trường: mã, tên, tên xuất hoá đơn, line, nhóm C1/C2, brand, NCC, đơn vị (Căn), giá trước VAT, VAT, giá sau VAT, kích thước, chi nhánh được bán, cho sửa giá khi thanh toán, người cập nhật.
- Ví dụ hàng: `BM-E02 Lô góc E-02 · 175m² · 2 mặt tiền · 3,7 tỷ`; `GV-BT0108 Biệt thự đơn lập 220m² · 17,2 tỷ`; `SR-B2503 Căn hộ 3PN góc 110m² Tháp B tầng 25 · 6,1 tỷ`. Mã tiền tố theo dự án (BM, GV, SR).
- **Bảng giá** (`#bang-gia`): giá cơ sở + thêm cột bảng giá khác; **đặt giá hàng loạt** (cao/thấp hơn giá cơ sở theo %); sửa theo nhóm; "cho phép bán theo bảng giá"; xuất bảng giá.

### 3.8 Care đơn và Kho vận (`#kho-care-don`)
Sau chốt đơn: **Cấu hình care đơn, Chia số care đơn thủ công, Bật tắt nhận dữ liệu, Tổng hợp chia số care đơn, Báo cáo care đơn, Báo cáo tác nghiệp care đơn**. Chia đơn theo nhóm / theo user / theo sản phẩm; nhóm user care đơn; lịch sử log.

## 4. Mô hình dữ liệu đề xuất

| Thực thể | Trường chính |
|---|---|
| User/Nhân sự | vai trò (sale, tele, quản lý, CTV), team, ca, giới hạn data |
| Contact/Khách | SĐT, tên, nhãn[], nguồn, người phụ trách, trạng thái, hạn SLA, cờ khách cũ/blacklist |
| Pipeline / Stage | tên, thứ tự, nhãn, mẫu tin, quy tắc SLA, tác nghiệp gắn kèm |
| Tác nghiệp (Activity) | loại (gọi, nhắn, hẹn, báo giá, hợp đồng, cọc...), kết quả, ghi chú, file ghi âm, thời điểm |
| Hội thoại/Tin nhắn | kênh, contact, người xử lý, đã đọc, đã trả lời |
| Luật chia | điều kiện (nguồn, sản phẩm, thời gian), đích (team/user), tỉ lệ, giới hạn, ưu tiên |
| Lịch hẹn | contact, người hẹn, địa điểm, trạng thái duyệt |
| Đơn hàng/Booking | khách, sản phẩm, giá, cọc, trạng thái, người bán, CTV, nguồn |
| CTV, Hoa hồng, Công nợ | cấp, tỉ lệ theo sản phẩm, kỳ đối soát, đã chi |
| Sản phẩm, Nhóm hàng, Bảng giá | như mục 3.7 |

## 5. Quy tắc nghiệp vụ

1. **Lead mới phải được chia trong N phút**; không chia được thì vào "Chưa chia" và cảnh báo.
2. **SLA**: mỗi stage có hạn phản hồi/liên hệ; "Quá SLA" nổi bật, tự **thu hồi và chia lại** hoặc đẩy vào kho số thả nổi.
3. **Trùng số**: trả về người phụ trách cũ hoặc gắn "Khách cũ", không chia mới.
4. Chuyển stage kích hoạt **tác nghiệp mặc định** và **mẫu tin nhắn** của stage đó.
5. Kéo-thả tác nghiệp từ thư viện vào stage để cấu hình pipeline; hỗ trợ nhân bản pipeline, sao lưu, và AI gợi ý sắp xếp.
6. Gọi điện/chat đều ghi thành tác nghiệp; hội thoại được AI tóm tắt (cấp dữ liệu cho Insight của Marketing).
7. Booking/cọc tạo đơn; đơn tính hoa hồng cho sale và CTV theo bảng thiết lập; công nợ đối soát theo kỳ.
8. Giá bán lấy theo **bảng giá** của chi nhánh/kênh; cờ "sửa giá khi thanh toán" quyết định sale có được đổi giá.
9. Blacklist chặn gọi/nhắn/chia.
10. Phân quyền: sale chỉ thấy khách của mình; trưởng team thấy team; quản lý thấy tất cả.

## 6. KPI và báo cáo
Số lead được chia, thời gian phản hồi đầu, tỉ lệ quá SLA, tỉ lệ liên hệ được, tỉ lệ chuyển đổi theo stage (phễu), số lịch hẹn và tỉ lệ đến, số booking/cọc, doanh thu theo sale/team/nguồn/dự án, hoa hồng và công nợ CTV, hiệu suất cuộc gọi.

## 7. Tích hợp
Facebook Messenger, Zalo OA, Zalo cá nhân (hội thoại); tổng đài/softphone để gọi và ghi âm; webhook từ Marketing; xuất/nhập Excel; thông báo đẩy và bong bóng chat nổi; trợ lý AI "Linh" (tóm tắt, gợi ý trả lời, sắp xếp pipeline).

## 8. Yêu cầu phi chức năng
Đa đơn vị, realtime (WebSocket) cho chat và chia lead, phân quyền chi tiết, nhật ký thao tác, PWA/di động, mã hoá thông tin liên hệ, chịu tải khi lead về dồn, tuân thủ luật dữ liệu cá nhân.

---

## PROMPT MẪU (dán cho AI)

```
Hãy xây dựng phân hệ BÁN HÀNG của ứng dụng web "AI-driven ERP" (tiếng Việt, đa đơn vị, ngành dịch vụ Golf 3D).
Công nghệ: [Next.js + TypeScript + PostgreSQL + Prisma + WebSocket].
Menu: Chat sale, Telesales, Chia lead, Cộng tác viên, Sales pipe, Kho số thả nổi, Báo cáo bán hàng;
liên quan: Sản phẩm, Bảng giá, Care đơn.
Làm theo đặc tả trong tài liệu 02-TAI-LIEU-BAN-HANG.md (mục 3 đến 7).
Giai đoạn 1: Sản phẩm + Bảng giá; Sales pipe (stage, tác nghiệp kéo-thả, nhãn, mẫu tin);
Telesales (danh sách contact, tác nghiệp, lịch hẹn, SLA); Chia lead (luật xoay vòng/tỉ lệ/theo nguồn,
thu hồi khi quá SLA, xử lý trùng số).
Giai đoạn 2: Chat sale đa kênh (Facebook, Zalo OA), CTV + hoa hồng + công nợ, Kho số thả nổi, Care đơn,
Báo cáo bán hàng (phễu, doanh thu theo sale/nguồn/dự án).
Cho tôi: sơ đồ DB, API, phân quyền, cấu trúc thư mục, rồi code từng bước, có seed dữ liệu demo.
```
