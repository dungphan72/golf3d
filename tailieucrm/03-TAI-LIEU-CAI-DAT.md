# Tài liệu nghiệp vụ CÀI ĐẶT: mô hình "AI-driven ERP" (tham chiếu sandboxvn.vn)

> Mục đích: dùng làm đặc tả để prompt AI viết phần Cài đặt, Phân quyền, Bảo mật và Gói tiện ích của một ứng dụng tương tự.
> Nguồn: quan sát giao diện sandboxvn.vn (bản 538, đơn vị demo, tài khoản admin). Chỉ đọc, không đổi cấu hình nào.
> Ghi chú trung thực: tôi thấy tên các tab và bố cục; nhiều màn hình con (chi nhánh, ngân hàng, vận đơn, API truy vấn...) chưa mở nội dung. Mục đánh dấu **[suy luận]** là đề xuất thiết kế, không phải quan sát trực tiếp.

---

## 1. Tổng quan

Cài đặt gồm 3 lớp:
1. **Cài đặt đơn vị (tenant)**: tài khoản, ngành nghề, chi nhánh và kho, cấu hình chức năng, thông báo, kết nối.
2. **Phân quyền và bảo mật**: vai trò, phạm vi dữ liệu, che số, OTP, duyệt thiết bị, nhật ký.
3. **Gói và tiện ích**: bật/tắt từng module theo gói, tính tiền theo số người dùng.

Ngoài ra có menu Nhân sự > **Phân quyền** (`#phan-quyen`) và menu **Tiện ích** (`#cho-ung-dung`) cùng thuộc nhóm này.

## 2. Menu và route

| Trang | Route | Các tab |
|---|---|---|
| Cài đặt 2 | `#cai-dat-2` | Thông báo, Quản lý ví, Cấu hình marketing nhập data |
| Tài khoản | `#cai-dat-chung` | Cài đặt chung, Cài đặt ngành nghề, Chi nhánh & kho, Cài đặt ban đầu |
| Hệ thống | `#cai-dat-he-thong` | Cấu hình chức năng, Quản lý chi nhánh, Tài khoản ngân hàng, Gói sử dụng, Cấu hình bảo mật, Phê duyệt thiết bị, TK tiền mặt / ví điện tử, Lịch sử domain, Cấu hình vận đơn... |
| Bảo mật | `#bao-mat-he-thong` | Tổng quan bảo mật |
| Lịch sử | `#cai-dat-lich-su` | Login Log, Lịch sử hoạt động, Lịch sử bộ lọc chốt đơn, Lịch sử tìm kiếm, Lịch sử xem thông tin |
| Kết nối | `#ket-noi` | Quản lý KEY kết nối, Nhật ký gọi, Cài đặt, Tài liệu kết nối |
| Phân quyền | `#phan-quyen` | Vai trò, ma trận quyền, phạm vi dữ liệu |
| Tiện ích | `#cho-ung-dung` | Gói AI CRM / AI ERP, danh sách module bật tắt |

## 3. Mô-đun chi tiết

### 3.1 Tài khoản và đơn vị (`#cai-dat-chung`)
- Hiển thị: tên đăng nhập (admin), mã đơn vị (tenant), ngôn ngữ (VI, có phiên bản #538), nút Đăng xuất.
- **Cài đặt ngành nghề**: chọn ngành (bất động sản, giáo dục, bán lẻ...) để nạp sẵn pipeline, nhãn, thuật ngữ **[suy luận]**.
- **Chi nhánh & kho**: danh sách chi nhánh, kho; sản phẩm có trường "chi nhánh được bán".
- **Cài đặt ban đầu**: trình hướng dẫn khởi tạo (ngành, chi nhánh, nhân sự, sản phẩm mẫu) **[suy luận]**.

### 3.2 Hệ thống (`#cai-dat-he-thong`)
Hai hàng tab:
- Hàng 1: Cấu hình chức năng, Quản lý chi nhánh, Quản lý tài khoản ngân hàng, **Nâng cấp gói**, Thông tin và gói sử dụng, Cấu hình bảo mật, Lịch sử nạp tiền SMS, Quản lý đối tác trả góp, Phê duyệt thiết bị, Quản lý TK tiền mặt, Quản lý TK ví điện tử, Lịch sử domain, Cấu hình vận đơn.
- Hàng 2: **Cài đặt chung**, App khách hàng, Cài đặt thiết bị, **Cài đặt API truy vấn data**, Cài đặt xem báo cáo, **Cài đặt kết nối partner**.

Cài đặt chung (áp dụng cả đơn vị, có nút Lưu):
- Cho phép áp dụng **nhiều quyền** cho một tài khoản.
- **Phân quyền xuất Excel**: chọn user được xuất.
- **Mẫu số điện thoại hợp lệ**: Regular Expression (do nhà cung cấp viết giúp). Dùng cho chuẩn hoá và chặn số sai ở Marketing.
- Chuyển bộ lọc **"Ngành hàng" thay "Nhóm sản phẩm"**.

### 3.3 Thông báo (`#cai-dat-2`)
- **Mẫu thông báo** (demo 49 mẫu): mã (ví dụ `TIN_NHAN_CHAT_MESSAGE`, `TIN_NHAN_CHAT_COMMENT`, `TIN_NHAN_NOI_BO`, `NHAC_LICH_HEN`), trạng thái sử dụng, tên, nội dung có **biến** dạng `[TEN_KHACH_HANG]`, `[TEN_TRANG]`, `[NOI_DUNG]`, `[SO_DIEN_THOAI]`, `[NGUOI_TAO]`, nhóm, **gửi cho vai trò**, **gửi sau (giây)**, thời điểm cập nhật.
- Cấu hình gửi thông báo web; gửi thông báo cho cả đơn vị; Thêm mẫu.
- **Quản lý ví**: số dư dùng cho AI, SMS **[suy luận]**; **Cấu hình marketing nhập data** (liên kết sang Marketing).

### 3.4 Bảo mật (`#bao-mat-he-thong`)
Thẻ tính năng, mỗi thẻ có trạng thái Bật/Chưa bật:
- **Che số điện thoại khách**: chọn quyền/vai bị che số; mặc định "mọi người thấy đủ số".
- **Đăng nhập bằng OTP / Captcha**: đếm "0/14 người bật OTP, 0/14 bật Captcha".
- **Sale tìm đơn của nhau**: mặc định tắt (sale chỉ thấy đơn của mình), bật ở Telesales > Cấu hình > Cấu hình đơn hàng; có "Xem lịch sử tìm đơn".
- **Phê duyệt thiết bị đăng nhập**: thiết bị lạ phải được duyệt mới vào được.
- **Nhật ký đăng nhập**: ai, lúc nào, từ máy nào.

### 3.5 Lịch sử (`#cai-dat-lich-su`)
- **Login Log**: đơn vị, tên đăng nhập, IP, thiết bị (Device ID + User-Agent), ngày giờ; tổng lượt; phân trang 10 đến 1000 dòng/trang; lọc theo ngày.
- Các nhật ký khác: hoạt động, bộ lọc chốt đơn, tìm kiếm, **xem thông tin** (ai xem thông tin khách nào, phục vụ truy vết lộ data).

### 3.6 Kết nối / API (`#ket-noi`)
- **Quản lý KEY kết nối**: Tạo kết nối; bảng: tên kết nối, mã kết nối, trạng thái, ngày cấp, lần gọi cuối.
- **Nhật ký gọi** API; **Tài liệu kết nối**.
- Liên quan: Cài đặt API truy vấn data, Cài đặt kết nối partner (ở Hệ thống).

### 3.7 Phân quyền (`#phan-quyen`)
- **Cây quyền 3 cấp: menu → chức năng → tab**; tick cấp cha thì cả nhánh con được hưởng.
- Gán vai cho nhân sự ở tab Sơ đồ tổ chức; hiện "16 vai trò · 14 nhân sự".
- **Bộ vai mẫu** (16 vai): Nhân viên và Trưởng phòng của Sales, Marketing, Kho, Kế toán, Nhân sự, Mua hàng, Chăm sóc khách hàng; cùng Admin và CEO.
- Mỗi vai có **Phạm vi data** (ví dụ "Chỉ của mình") và cờ nghiệp vụ ("Là Sale", "Là Marketing") để hệ thống biết vai đó tham gia chia lead hay báo cáo marketing; số nhân sự đang giữ vai.
- Thao tác: Thêm vai, Lưu thay đổi, Xoá vai, Huỷ. Có **"Phân quyền bằng lời"**: mô tả bằng ngôn ngữ tự nhiên, AI tự tick quyền.

### 3.8 Tiện ích và gói (`#cho-ung-dung`)
- Hai gói: **AI CRM** (tiện ích chăm sóc khách và bán hàng) và **AI ERP** (toàn bộ, gồm kho, sản xuất, kế toán).
- Đơn vị demo: gói AI ERP, **150.000 đ/người/tháng**, gói 12 tháng, 1 đến 5 người; trả dài hạn giảm tới 20% (thấp nhất 100.000 đ); **14/30 người dùng**, hết hạn 22/10/2027; nút **Gia hạn**, **Thêm người dùng**.
- Danh mục **157 tiện ích** (đang dùng 103, chưa dùng 54), lọc theo nhóm: Trang chủ, Hàng hoá, Marketing, Bán hàng, Kho vận, Kế toán, Khách hàng, Nhân sự, KPI · SLA, Chat nội bộ, Quy trình, Sản xuất, Báo cáo, Tiện ích, Cài đặt; và theo bộ: Mặc định, Sales, Kho, HRM, Quản lý sản xuất, Công việc.
- Mỗi tiện ích có: tên, nhóm, trạng thái (Luôn bật, Đang dùng, Đã tắt), giá (Miễn phí hoặc có phí). Ví dụ: Quản lý sản phẩm (Đang dùng), Bảng giá, Nhà cung cấp, Mua hàng, Đặt cọc, Báo cáo hàng hoá (Đã tắt), Facebook, Landing/Web, Google (Đang dùng).
- Có tab **Lịch sử** (bật tắt, thanh toán).
- Hiệu ứng: bật/tắt tiện ích quyết định menu và route nào hiện ra cho đơn vị.

## 4. Mô hình dữ liệu đề xuất

| Thực thể | Trường chính |
|---|---|
| Tenant | mã, tên, ngành, gói, số user tối đa, hạn dùng, ngôn ngữ |
| User | username, mật khẩu băm, tenant, vai[], chi nhánh, bật OTP/Captcha, trạng thái |
| Role | tên, phạm vi data (own/team/branch/all), cờ nghiệp vụ (is_sale, is_marketing), cây quyền |
| Permission | nút cây 3 cấp (menu, chức năng, tab), hành động (xem/tạo/sửa/xoá/xuất) |
| Branch / Warehouse | tên, địa chỉ, kho, cho phép bán |
| BankAccount / CashAccount / EWallet | loại, số, chủ TK, số dư |
| NotificationTemplate | mã, tên, nội dung (biến), nhóm, vai nhận, độ trễ, bật/tắt |
| Device | user, device_id, user-agent, trạng thái duyệt |
| LoginLog / ActivityLog / ViewLog / SearchLog | user, IP, thiết bị, hành động, đối tượng, thời điểm |
| ApiKey | tên, mã, trạng thái, ngày cấp, lần gọi cuối, phạm vi |
| ApiCallLog | key, endpoint, mã trả về, thời điểm |
| Plan / Subscription | gói, giá/người, chu kỳ, giảm giá, hạn |
| Feature (tiện ích) | mã, nhóm, bộ, giá, trạng thái bật theo tenant, route/menu gắn kèm |
| Setting | key, giá trị, phạm vi (tenant/chi nhánh/user) |

## 5. Quy tắc nghiệp vụ

1. **Mọi dữ liệu thuộc tenant**; mọi truy vấn lọc theo `tenant_id`.
2. Quyền = vai × cây quyền × **phạm vi data**; một user có thể có nhiều vai nếu bật "áp dụng nhiều quyền".
3. Tick nút cha tự động cấp cả nhánh con; bỏ nút cha thì thu hồi cả nhánh.
4. Phạm vi mặc định của Sale là "chỉ của mình"; muốn xem đơn của nhau phải bật riêng và ghi lại lịch sử tìm đơn.
5. **Che số điện thoại** theo vai; thao tác xem số đầy đủ ghi vào "Lịch sử xem thông tin".
6. Xuất Excel chỉ cho user được cấp quyền riêng.
7. Đăng nhập thiết bị lạ cần quản trị duyệt; OTP/Captcha bật theo từng người.
8. Mọi lần đăng nhập, tìm kiếm, xem, thao tác quan trọng đều được ghi nhật ký, không sửa xoá được.
9. Tiện ích tắt thì ẩn menu và chặn API tương ứng; số user vượt hạn mức gói thì không cho thêm người.
10. Thông báo sinh từ mẫu: thay biến, gửi cho các vai đã chọn, trễ N giây.
11. SĐT hợp lệ kiểm theo regex của đơn vị; áp dụng cho Landing, nhập tay, nhập Excel.

## 6. Báo cáo và giám sát
Số user theo gói và hạn mức, lượt đăng nhập, thiết bị chờ duyệt, nhật ký xem số khách, lượt gọi API theo khóa, lỗi webhook, thông báo đã gửi.

## 7. Tích hợp
API key + tài liệu, webhook nhận và gửi, ngân hàng và ví điện tử (đối soát), đối tác trả góp, đơn vị vận chuyển (vận đơn), SMS (ví nạp tiền), domain riêng và app khách hàng.

## 8. Yêu cầu phi chức năng
Đa tenant cách ly dữ liệu, mã hoá khóa và token, băm mật khẩu, rate-limit API, nhật ký bất biến, sao lưu, đa ngôn ngữ, responsive/PWA, tuân thủ luật dữ liệu cá nhân (che số và truy vết xem).

---

## PROMPT MẪU (dán cho AI)

```
Hãy xây dựng phân hệ CÀI ĐẶT, PHÂN QUYỀN và GÓI TIỆN ÍCH cho ứng dụng web "AI-driven ERP"
(tiếng Việt, đa tenant). Công nghệ: [Next.js + TypeScript + PostgreSQL + Prisma].
Làm theo đặc tả trong tài liệu 03-TAI-LIEU-CAI-DAT.md (mục 3 đến 7).
Giai đoạn 1: đăng nhập, tenant, user, vai trò; cây quyền 3 cấp (menu → chức năng → tab) có
phạm vi data (của mình / team / chi nhánh / tất cả); gói và bật tắt tiện ích điều khiển menu;
Login Log và Activity Log.
Giai đoạn 2: Bảo mật (che SĐT theo vai, OTP/Captcha, duyệt thiết bị, nhật ký xem thông tin);
Mẫu thông báo có biến; Quản lý KEY API + nhật ký gọi; Chi nhánh & kho; tài khoản ngân hàng, tiền mặt, ví.
Giai đoạn 3: "Phân quyền bằng lời" (AI tự tick quyền), cài đặt chung (regex SĐT, quyền xuất Excel).
Cho tôi: sơ đồ DB, middleware kiểm quyền, API, cấu trúc thư mục, rồi code từng bước, có seed
16 vai mẫu (Sales, Marketing, Kho, Kế toán, Nhân sự, Mua hàng, CSKH: nhân viên và trưởng phòng; Admin; CEO).
```
