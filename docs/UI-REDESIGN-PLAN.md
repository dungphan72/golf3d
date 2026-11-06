# Kế hoạch nâng cấp giao diện trang quản lý

Mục tiêu: đẹp, thân thiện, dễ dùng; bỏ mọi thứ lặp đi lặp lại. Người dùng chính là lễ tân và quản lý đứng quầy, thường dùng điện thoại/máy tính bảng, cần làm việc nhanh trong ca.

## 1. Hiện trạng (đã rà soát mã nguồn)

**Những chỗ đang lặp hoặc thừa**

| # | Vấn đề | Nơi |
|---|---|---|
| 1 | Sơ đồ line xuất hiện hai lần: ở Tổng quan và ở Sơ đồ phòng, cùng chú giải | `ClubApp.tsx` (overview, rooms) |
| 2 | Mỗi trang đều có khối tiêu đề 3 tầng: dòng nhỏ "SAIGON GOLF / WORKSPACE", câu khẩu hiệu ("Một ngày chơi tốt lành.", "Món ngon, phục vụ đúng lúc."), câu phụ "Quản lý liền mạch, phục vụ trọn vẹn." Không mang thông tin | `ClubApp.tsx` page-heading, `titles` |
| 3 | Thẻ trang trí "YOUR NEXT GREAT SHOT" (hình vẽ quỹ đạo) và thẻ "Sẵn sàng đón khách?" luôn hiện dù cơ sở đã cấu hình xong | overview `right-column` |
| 4 | Nút "Tạo lịch đặt" nổi trên mọi trang, trong khi mỗi thẻ line đã có nút Đặt lịch | page-heading |
| 5 | Menu trái phẳng 20 mục, không nhóm; "Lịch đặt", "Hóa đơn", "Đặt online", "Yêu cầu hỗ trợ", "Chăm sóc KH" chồng chéo vai trò; "Kho F&B" dùng cùng biểu tượng với "Sơ đồ phòng" | `navigation` |
| 6 | Trang "Lộ trình hệ thống" (dành cho người làm phần mềm) nằm trong menu nhân viên | `Roadmap` |
| 7 | Lẫn tiếng Anh: PRIVATE ROOM, LEFT-HANDED, "OPERATIONS", "WORKSPACE", art-caption | widgets, ClubApp |
| 8 | "/ 12" cố định cứng trong thẻ thống kê | overview |
| 9 | Ba lớp CSS chồng nhau: `globals.css` (3.100 dòng, nền xanh/kem cũ), `kiotviet.css` (1.000 dòng ghi đè nền trắng), `mobile.css` (ghi đè nữa). Cùng một thẻ định nghĩa 2–3 chỗ, khó sửa, dễ lệch | `app/*.css` |
| 10 | Nhiều panel lớn tự định nghĩa bảng, ô lọc, nút, hộp thoại riêng (Crm 1.000 dòng, Lead 900, Member 700, Finance 650, Session 650) → cùng một việc nhưng hình dạng khác nhau | `app/ui/*Panel.tsx` |
| 11 | Chữ rất nhỏ trong thẻ line (6–9 px), khó đọc ở quầy | `.room-type`, `.room-bottom` |

## 2. Nguyên tắc thiết kế

1. **Một việc, một chỗ.** Mỗi thông tin chỉ hiện một nơi; muốn xem thêm thì bấm vào.
2. **Việc thường làm nằm ngay màn hình đầu:** bắt đầu chơi, đặt lịch, thu tiền, gọi món. Không quá hai lần bấm.
3. **Chỉ tiếng Việt, không khẩu hiệu.** Tiêu đề trang là tên trang, nếu cần thì kèm một dòng chỉ dẫn có ích.
4. **Nền trắng** (đã quyết định trước đó), màu chỉ dùng để báo trạng thái: xanh = trống/ổn, đỏ = đang chơi/cần xử lý, vàng = sắp tới/cảnh báo, xám = chờ.
5. **Chữ tối thiểu 14 px**, nút tối thiểu 40 px cao (44 px trên điện thoại) để bấm bằng ngón tay.
6. **Một bộ thành phần dùng chung** cho bảng, thẻ, ô lọc, nút, hộp thoại, trạng thái rỗng, thông báo.

## 3. Cấu trúc mới

**Menu trái gom thành 5 nhóm (thay cho 20 mục phẳng):**

- **Vận hành**: Sơ đồ phòng (kiêm trang chủ) · Lịch đặt (gồm Đặt online và Yêu cầu hỗ trợ làm hai tab) 
- **Bán hàng**: Hóa đơn & thu tiền · Thực đơn & bếp · Kho
- **Khách hàng**: Chăm sóc KH (CRM + Lead) · Hội viên & gói · Huấn luyện
- **Tài chính**: Ca & sổ tiền · Báo cáo
- **Quản trị** (chỉ quản lý/chủ): Cài đặt cơ sở (giá, khuyến mãi, gói, thanh toán) · Nhân viên · Nhật ký · Tài khoản

Bỏ trang Lộ trình hệ thống khỏi menu (chuyển thành tài liệu trong `docs/`). Trên điện thoại: thanh dưới có 4 mục chính (Phòng, Lịch, Thu tiền, Thêm) và mục "Thêm" mở các nhóm còn lại.

**Trang đầu (thay Tổng quan + Sơ đồ phòng bằng một trang):**

- Hàng chỉ số gọn, bấm được: Đang chơi n/12, Chờ thanh toán, Lịch sắp tới, Doanh thu hôm nay.
- Lưới line (bản duy nhất), thẻ to, chữ lớn, hiện: tên line, trạng thái bằng màu, tên khách và đồng hồ đang chạy / số phút còn lại, hai nút Bắt đầu và Đặt lịch.
- Bên phải (máy tính) hoặc bên dưới (điện thoại): danh sách "Việc cần làm ngay" gom từ mọi nơi: phiên chờ thanh toán, khách đặt sắp đến, yêu cầu hỗ trợ, đơn đặt online chưa xác nhận, lead quá hạn gọi.
- Bỏ: thẻ trang trí, thẻ "Sẵn sàng đón khách" (chỉ hiện dải nhắc khi cơ sở chưa cấu hình xong), nút "Tạo lịch đặt" nổi (đặt thành nút "+ Đặt lịch" cố định ở thanh trên, có sẵn ở mọi trang).

**Khung chung mỗi trang:** tiêu đề = tên trang; bên phải: ô tìm kiếm toàn cục (khách, số điện thoại, mã phiếu), nút hành động chính của trang. Không dòng khẩu hiệu, không ngày dài lặp (ngày/giờ chuyển lên thanh trên một lần).

## 4. Hệ thống giao diện (thay ba lớp CSS)

- Một tệp biến thiết kế (`tokens`): màu, cỡ chữ (14/16/20/28), khoảng cách (4/8/12/16/24), bo góc, bóng.
- Một tệp thành phần cho khu quản lý, thay `kiotviet.css` + phần staff của `globals.css` + `mobile.css`. Mỗi thành phần định nghĩa đúng một lần, responsive ngay trong đó.
- Tách `landing.css` (trang khách) và CSS quản lý hoàn toàn, để sửa bên này không vỡ bên kia.
- Thành phần dùng chung trong `app/ui/kit/`: `PageHeader`, `DataTable` (tìm, sắp xếp, trạng thái rỗng, tải), `StatTile`, `StatusChip`, `Field`/`FormGrid`, `Dialog`/`Drawer`, `Tabs`, `EmptyState`, `Toast`, `ConfirmDialog`. Các panel hiện có chuyển sang dùng dần.
- Biểu tượng: mỗi mục menu một biểu tượng riêng.

## 5. Các giai đoạn thực hiện

Mỗi giai đoạn: làm xong → chạy toàn bộ test (e2e, SQL, đơn vị) → triển khai → anh xem. Không đổi dữ liệu hay logic nghiệp vụ.

| GĐ | Nội dung | Kết quả anh thấy |
|---|---|---|
| 1 | Hệ thống giao diện: tokens + bộ thành phần dùng chung, gỡ khối tiêu đề 3 tầng, bỏ khẩu hiệu/tiếng Anh, chữ và nút to hơn | Mọi trang gọn, đồng đều, dễ đọc |
| 2 | Khung ứng dụng: menu 5 nhóm, thanh trên (tìm kiếm toàn cục, + Đặt lịch, ngày giờ, tài khoản), thanh dưới trên điện thoại, bỏ trang Lộ trình | Điều hướng nhanh hơn, ít mục |
| 3 | Trang đầu hợp nhất (chỉ số + lưới line + Việc cần làm ngay), bỏ Tổng quan/Sơ đồ phòng trùng và các thẻ trang trí | Mở app là làm việc được ngay |
| 4 | Chi tiết phiên chơi và thu tiền: bố cục một cột theo thứ tự việc (khách → giờ → món → giảm giá → thu), nút chính nổi bật | Thu tiền ít bước hơn |
| 5 | Lịch đặt (gộp Đặt online, Yêu cầu hỗ trợ thành tab), Hóa đơn, Thực đơn/Kho: chuyển sang `DataTable` và bộ lọc chung | Bảng đồng nhất, tìm nhanh |
| 6 | Khách hàng: CRM, Lead, Hội viên, Huấn luyện: gom thẻ lặp, tab rõ ràng, hồ sơ khách một màn hình | Xem khách nhanh, ít cuộn |
| 7 | Tài chính và Quản trị: Ca & sổ tiền, Báo cáo, Cài đặt (tách thành tab Giá · Khuyến mãi · Gói · Thanh toán · Cơ sở), Nhân viên | Cài đặt dễ tìm |
| 8 | Hoàn thiện: kiểm tra điện thoại/máy tính bảng/máy tính, tương phản và cỡ chữ, bàn phím, xóa CSS cũ không còn dùng, cập nhật tài liệu hướng dẫn | Gọn, nhẹ, nhất quán |

Ước lượng: GĐ 1–3 là phần thay đổi lớn nhất và nên làm trước; các GĐ sau độc lập, có thể dừng hoặc đổi thứ tự bất cứ lúc nào.

## 6. Rủi ro và cách kiểm soát

- **Test e2e bám vào chữ/nút hiện tại** (tên nút, tên menu): cập nhật test cùng lúc với từng giai đoạn; giữ nguyên nhãn các nút nghiệp vụ quan trọng.
- **Nhân viên quen giao diện cũ**: giữ nguyên tên các thao tác chính (Bắt đầu, Đặt lịch, Kết thúc chơi, Thu tiền); gửi ghi chú thay đổi sau mỗi giai đoạn.
- **Quyền hạn**: menu mới vẫn ẩn mục theo quyền như hiện nay.
- **Không đổi API hay cơ sở dữ liệu** trong toàn bộ kế hoạch, nên có thể hoàn nguyên bằng cách triển khai lại bản trước.

## 7. Cần anh quyết định

1. Nhóm menu ở mục 3 có hợp lý không (có muốn chuyển mục nào sang nhóm khác)?
2. Trang đầu hợp nhất (bỏ Tổng quan riêng) có đồng ý không?
3. Bắt đầu từ giai đoạn 1 rồi làm lần lượt, hay chỉ làm GĐ 1–3 trước để anh xem?

## Tiến độ

Giai đoạn 1–8 đã hoàn thành và triển khai (chi tiết từng giai đoạn trong `docs/PROGRESS.md`). Giai đoạn 8: dọn khoảng 200 quy tắc CSS không còn phần tử nào dùng (`globals.css`, `kiotviet.css`, `mobile.css` giảm từ 82 KB xuống 63 KB), màn Huấn luyện dùng bảng chung, chỉnh lưới line và ô số trên điện thoại, kiểm tra ảnh chụp ở máy tính và điện thoại.

---

# Đợt 2 — Hợp nhất CSS và thành phần (bắt đầu 2026-11-06)

Thiết bị chính ở quầy: **máy tính và điện thoại** (máy tính bảng là thứ yếu). Quyết định: làm **GĐ A–B trước**, xem kết quả rồi mới tiếp. Module CRM giữ lại là **crmx (module mới)**; mục "Chăm sóc KH" cũ sẽ gộp vào ở GĐ C.

| GĐ | Việc | Trạng thái |
|---|---|---|
| A | Rà soát: ảnh chụp mọi màn ở điện thoại/máy tính, đo CSS còn dùng, lập danh sách lỗi | Xong (số liệu bên dưới) |
| B | Gộp CSS: `tokens` + một tệp thành phần admin, thay `kiotviet.css`, `mobile.css`, phần staff của `globals.css`, `admin.css`; tách khỏi `landing.css` | B1 (gộp cơ học) xong: `tokens.css` + `globals.css` + `admin.css` (đã nhập kiotviet/mobile theo đúng thứ tự cascade). B2 xong: gộp 3 selector trùng chứng minh được an toàn; 36 cặp còn lại là ghi đè theo cỡ màn hình có `@media` xen giữa nên giữ; `!important` còn lại đều có lý do (in, giảm chuyển động). Kiểm bằng so computed style 89 trạng thái xem + e2e 56/56 |
| C | Gộp hai mục CRM (giữ crmx) | Xong: menu chỉ còn mục CRM; màn Chăm sóc KH cũ thành tab "Chăm sóc KH (cũ)" trong CRM (vẫn nhận lead Zalo/Facebook/quảng cáo cho tới khi chuyển dữ liệu sang `crm2_*`). Link `?view=crm` và cảnh báo lead trên trang chủ mở thẳng tab đó. Còn lại: hai thanh tab lồng nhau có nhãn trùng ("Khách hàng", "Việc..."), xử lý ở GĐ D |
| D | Chuyển panel lớn sang `kit.tsx` | Một phần: tab lồng nhau dùng `PageTabs sub`, tab cũ đổi tên "Hồ sơ khách"; 4 bảng báo cáo lead và bảng gói hội viên dùng `DataTable`. Chưa làm: tách `LeadPanel`/`CrmPanel` (>1.000 dòng) thành thành phần nhỏ; `FinancePanel`, `SessionPanel`; bảng có ô nhập trong `LeadPanel` giữ nguyên |
| E | Tối ưu thao tác tại quầy: máy tính (phím tắt, bảng dày) và điện thoại (vùng bấm 44 px, thanh hành động cố định) | Một phần: máy tính có phím `/` (tìm kiếm) và `N` (đặt lịch); cảm ứng: nút trên thẻ line (Bắt đầu, Đặt lịch, Mở, Thu tiền), header, ô tìm và ô ngày tối thiểu 44 px, có test e2e bảo vệ. Chưa làm: thanh hành động cố định ở chi tiết phiên/thu tiền trên điện thoại; đo vùng bấm ở các màn có dữ liệu thật (hóa đơn, hộp thoại phiên) |
| F | Truy cập, test e2e, dọn mã chết, tài liệu | Một phần: kiểm bằng axe-core (có sẵn trong pnpm store, không thêm dependency) trên mọi màn nhân viên ở máy tính và điện thoại; sửa tương phản chữ (nút Bắt đầu, chọn line, ô trống, thông báo, chip sắp tới), 5 tiêu đề nhảy cấp (giữ nguyên hình, khai báo cấp 2), cột thao tác của bảng có nhãn ẩn, thêm liên kết "Bỏ qua đến nội dung" + test e2e. Axe chạy lại sau sửa: 0 lỗi ở 27 trạng thái (máy tính + điện thoại, mọi màn nhân viên, hộp thoại đặt lịch; riêng màn Tài khoản trên máy tính chưa mở được bằng script); đã đổi cả bộ màu nhãn trạng thái `.badge` sang tông đậm hơn. Đã kiểm với dữ liệu thật (ca đang mở, phiên đang chơi, phiên chờ thanh toán): sửa chữ "0 đơn" thiếu tương phản và nâng các nút phụ trong hộp thoại phiên lên 44 px; sau sửa axe 0 lỗi, 0 điều khiển dưới 44 px trên điện thoại. Thử ghim khung thu tiền ở đáy hộp thoại phiên nhưng bỏ vì che bảng tạm tính. Xóa 39 quy tắc CSS của menu/thanh cũ (`.nav-item`, `.pilot`, `.top-actions`). Chưa làm (trước đây ghi: kiểm tương phản ở trạng thái có dữ liệu thật (phiên đang chơi, hóa đơn; máy chủ thử chưa cấu hình giờ mở cửa nên không tạo được phiên), chuyển `FinancePanel`/`SessionPanel` sang thành phần chung; `LeadPanel` đã tách thành 7 tệp trong `app/ui/lead/` và `CrmPanel` thành 6 tệp trong `app/ui/crm/`, di chuyển thuần túy, kiểm bằng so từng dòng + e2e) |

## GĐ A — kết quả rà soát (2026-11-06)

- `layout.tsx` nạp toàn cục 4 tệp: `globals.css` (40 KB) → `kiotviet.css` (18 KB) → `mobile.css` (2 KB) → `admin.css` (45 KB), tổng 105 KB cho khu quản lý; `landing.css` (25 KB) nạp riêng theo trang.
- Mọi class đều còn được dùng (đợt 1 đã dọn mã chết). Vấn đề là **chồng lấn**: 40/79 class của `kiotviet.css`, 34/155 của `admin.css`, 19/19 của `mobile.css` cũng có trong `globals.css`; `admin.css` chồng thêm 37 class với `kiotviet.css`. Một thẻ/nút được định nghĩa ở 2–3 nơi, thứ tự nạp quyết định kết quả.
- `!important`: 6 (admin), 5 (globals), 3 (landing).
- Ảnh chụp gốc (máy tính 1440 px, điện thoại 390 px) đã chụp cho trang chủ và 9 màn máy tính. Còn thiếu nhóm Quản trị (nằm trong menu thả xuống) và các màn điện thoại ngoài trang chủ (menu "Thêm").
- Trang chủ máy tính và điện thoại nhìn ổn; chưa thấy lỗi bố cục ở hai màn đã xem.
