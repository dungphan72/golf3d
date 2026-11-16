# UI Changelog

Mỗi mục phải có: lý do · ảnh tham chiếu · file thay đổi · screenshot trước/sau · kết quả kiểm thử.

## 2026-11-16 — Kiểm tra và sửa lỗi POS (nhánh `fix/p0-data-integrity`)
- **Lý do:** chủ hệ thống yêu cầu kiểm tra lại lỗi POS và sửa. Chạy thử toàn luồng trên bản build: mở ca, nhận khách, bắt đầu chơi, thêm dịch vụ, kết thúc, thanh toán tiền mặt, in/Zalo, lịch sử giao dịch, và màn tổng quan trên điện thoại.
- **Lỗi đã sửa:** (1) bảng Quản lý ca / Lịch sử giao dịch không đóng bằng phím Esc, nút đóng không có nhãn; (2) thanh trên cùng POS bị xuống dòng chữ ("Quản lý ca", "Lịch sử giao dịch", "Két tiền (F4)", trạng thái ca), nay một dòng và địa chỉ cơ sở tự rút gọn; (3) sau khi thanh toán, line hiện "Đang chơi" trong vài phút dọn line, nay hiện "Đang dọn line" (xám); (4) phiếu đã thanh toán hiện "Đặt trước", thời gian chơi 00:00:00 và "Tiền tạm tính", nay hiện "Đã thanh toán", đúng thời gian chơi và số tiền đã thu; (5) giờ bắt đầu của phiên đã kết thúc ghi "Hẹn 20:54", nay chỉ phiên đặt trước mới ghi "Hẹn"; (6) danh sách chọn line ghi "Bảo trì" cho line chờ thu; (7) "Hoạt động gần đây" ở tổng quan và Nhật ký hoạt động hiển thị JSON thô và mã nội bộ, nay là câu đọc được (vd. "Thu tiền tiền mặt · 262 ₫ · phiếu #99D74D").
- **File:** `app/ui/ModernPosFlow.tsx`, `app/pos-flow.css`, `lib/audit-text.ts` (mới), `app/ui/AdminOverview.tsx`, `app/ui/AuditPanel.tsx`, `tests/audit-text.test.ts`.
- **Screenshot:** chụp trong phiên trước/sau; chưa lưu file trong repo.
- **Kiểm thử:** `tsc` sạch, `pnpm test` đạt (thêm 4 test), luồng POS chạy hết không còn lỗi console/mạng; không phát hiện lỗi 4xx/5xx trong nhật ký máy chủ ngoài vài yêu cầu 502 lúc khởi động lại dịch vụ.
- **Chưa kiểm:** các cách thanh toán thẻ, QR SePay, ví, gói hội viên, chia nhiều hình thức; luồng chuyển dịch vụ; POS trên điện thoại (chỉ mới xem tổng quan). Nếu anh gặp lỗi cụ thể, gửi ảnh/mô tả để tôi xử lý đúng chỗ.

## 2026-11-16 — Màn Đổi mật khẩu nhân viên theo mẫu mới (nhánh `fix/p0-data-integrity`)
- **Lý do:** chủ hệ thống yêu cầu thiết kế lại màn đổi mật khẩu của nhân viên theo mẫu (desktop và điện thoại).
- **Ảnh tham chiếu:** hai ảnh mẫu "Đổi mật khẩu" (desktop có hình minh họa bên phải; điện thoại hình minh họa ở trên) do chủ hệ thống gửi trong phiên; chưa lưu file vào `hinh-anh/thiet-ke/`.
- **File:** `app/ui/PasswordChange.tsx` (mới), `app/password-change.css` (mới), `app/ui/AccountPanel.tsx` (màn bắt buộc đổi mật khẩu tạm ở lần đăng nhập đầu), `app/ui/SystemSettingsHub.tsx` (thẻ "Đổi mật khẩu, bảo mật" trong Cài đặt).
- **Nội dung màn:** 3 ô mật khẩu có nút hiện/ẩn, thanh độ mạnh 4 mức (Yếu → Mạnh), danh sách điều kiện (tối thiểu 10 ký tự, chữ hoa, chữ thường, số), ô xác nhận báo khi không khớp, nút Hủy (khi dùng trong Cài đặt) và Cập nhật mật khẩu.
- **Quy tắc:** máy chủ vẫn chỉ bắt buộc tối thiểu 10 ký tự và các kiểm tra cũ; chữ hoa/thường/số chỉ là gợi ý hiển thị độ mạnh, không đổi quy tắc nghiệp vụ.
- **Sửa kèm:** trong Cài đặt, ba ô mật khẩu cũ chưa nối với chức năng nào (nhập xong không đổi được gì); nay gọi `/api/auth/password` thật.
- **Không làm:** menu con "Thông tin tài khoản / Bảo mật 2 lớp (2FA) / Thông báo" và ảnh đại diện trong mẫu chưa có chức năng tương ứng nên không dựng.
- **Screenshot:** chụp trong phiên ở 1440 và 390 (lần đăng nhập đầu); chưa lưu file trong repo.
- **Kiểm thử:** `tsc` sạch; e2e thủ công trên bản build: đăng nhập bằng mật khẩu tạm hiện đúng màn, xác nhận không khớp khóa nút, đổi thành công rồi đăng nhập được bằng mật khẩu mới. Chưa chụp thẻ trong Cài đặt.

## 2026-11-16 — Phiếu thanh toán: logo, logo chìm, mẫu miễn phí gửi xe, gửi Zalo bằng ảnh (nhánh `fix/p0-data-integrity`)
- **Lý do:** chủ hệ thống yêu cầu chèn logo đầu hóa đơn, logo chìm giữa hóa đơn, mẫu "Miễn phí gửi xe" cuối hóa đơn (ngày tự điền theo ngày hệ thống) và gửi bill qua Zalo bằng hình ảnh.
- **Ảnh tham chiếu:** logo SaiGon Indoor Golf Club và mẫu "MIỄN PHÍ GỬI XE" do chủ hệ thống gửi trong phiên (chưa lưu file vào `hinh-anh/thiet-ke/`). Logo dùng file thật `public/logo.webp`.
- **File:** `lib/thermal-receipt.ts` (phiếu K80: logo đầu phiếu, logo chìm mờ 7%, khung gửi xe xanh lá với ngày `dd / mm / yyyy` theo giờ Việt Nam; in chờ logo tải xong; `htmlToPngBlob`, `sendBillImageToZalo`), `app/ui/SessionPanel.tsx`, `app/ui/ModernPosFlow.tsx` (nút Gửi Zalo dùng ảnh).
- **Gửi Zalo:** điện thoại: mở bảng chia sẻ, chọn Zalo; máy tính: sao chép ảnh và mở chat Zalo của khách, nhân viên bấm Ctrl+V rồi Gửi; nếu trình duyệt không cho sao chép thì tải ảnh về máy. Chưa gửi tự động qua Zalo OA vì cần khách đã theo dõi OA và liên kết tài khoản.
- **Screenshot:** ảnh phiếu dựng thử trong phiên; chưa lưu file trong repo.
- **Kiểm thử:** `tsc` sạch; dựng ảnh phiếu thật bằng trình duyệt tự động (PNG 3x, đủ logo, logo chìm, khung gửi xe, ngày hôm nay). Chưa thử in thật trên máy in K80 và chưa thử bảng chia sẻ trên điện thoại.

## 2026-11-16 — Nhân viên đăng nhập bằng email hoặc số điện thoại (nhánh `fix/p0-data-integrity`)
- **Lý do:** chủ hệ thống yêu cầu tài khoản nhân viên đăng nhập được bằng email hoặc số điện thoại.
- **File:** `drizzle/0032_staff_phone.sql` (cột `users.phone`, chỉ mục duy nhất khi có số), `db/schema.ts`, `lib/auth/identifier.ts`, `lib/server/auth-service.ts`, `app/api/staff/route.ts`, `app/ui/LoginScreen.tsx` (ô "Email hoặc số điện thoại"), `app/ui/StaffPanel.tsx` (nhập/sửa SĐT), `tests/login-identifier.test.ts`.
- **Hành vi:** SĐT được chuẩn hóa như SĐT khách (`0912 345 678`, `+84912345678` đều về `0912345678`) và không được trùng giữa các nhân viên. Giới hạn đăng nhập sai áp dụng theo tên đăng nhập đã nhập. Thông báo sai chung, không tiết lộ tài khoản tồn tại. Tài khoản cũ chưa có SĐT vẫn đăng nhập bằng email.
- **Screenshot:** không chụp (chỉ đổi nhãn ô nhập).
- **Kiểm thử:** `tsc` sạch, `pnpm test` đạt (thêm 3 test), e2e thủ công trên bản build: tạo nhân viên có SĐT, đăng nhập bằng email, email viết hoa, 3 dạng SĐT đều 200; SĐT lạ và sai mật khẩu 401; SĐT trùng 409; SĐT sai định dạng 400.
- **Cần lưu ý khi deploy:** có migration `0032` (thêm cột `users.phone`); cần sao lưu cơ sở dữ liệu trước theo `docs/DEPLOY-VPS.md`.

## 2026-11-16 — CRM: xóa toàn bộ dữ liệu giả (nhánh `fix/p0-data-integrity`)
- **Lý do:** chủ hệ thống yêu cầu xóa hết dữ liệu giả. Màn CRM chứa 8 khách mẫu, 4 lead, 3 chiến dịch, 3 lịch hẹn mẫu, số đếm viết cứng (1.248, 368, 176, 58, 32, 156 trang, huy hiệu lead 12/17) và nhiều giá trị bịa khi đồng bộ khách thật (email `@gmail.com`, ngày sinh 10/05/1988, 38 tuổi, hạn thẻ, ưu đãi %, hệ số điểm, % tăng trưởng, chi tiêu mặc định 350.000đ).
- **File:** `modules/crm/ui/CrmApp.tsx`, `app/ui/AdminReferenceShell.tsx` (bỏ huy hiệu số 12).
- **Thay đổi:** danh sách khách, lead, chiến dịch, lịch hẹn bắt đầu rỗng và chỉ lấy từ dữ liệu thật (khách/hội viên/đặt sân/lead qua API). Số đếm và phân trang tính từ dữ liệu đã tải. Trường không có dữ liệu thì ẩn (email, ngày sinh, giới tính, địa chỉ, thời hạn thẻ, ưu đãi). Bỏ chọn khoảng thời gian 30/90 ngày vì số liệu 90 ngày/năm chỉ là nhân hệ số giả. Trang Marketing đọc và gửi qua dịch vụ chiến dịch thật (`/api/crm2/campaigns`, Zalo/Email, chỉ khách đã đồng ý nhận tin) thay vì thêm dòng giả. Trang Đặt sân & Lịch hẹn lấy từ đặt sân thật.
- **Không đổi:** cơ sở dữ liệu và dữ liệu đang chạy trên VPS.
- **Screenshot:** chụp trong phiên (khách thật duy nhất, trang Marketing rỗng); chưa lưu file trong repo.
- **Kiểm thử:** `tsc` sạch, `eslint` 0 lỗi, build đạt, không có lỗi JS trang khi duyệt 6 trang CRM.
- **Chưa làm:** hạng thẻ/ưu đãi thật của hội viên chưa nối vào hồ sơ CRM (đang hiện "Chưa có"/ẩn); cơ hội bán hàng và công việc chỉ lưu trong phiên (chưa lưu máy chủ).

## 2026-11-16 — CRM Khách hàng: sửa chữ xếp dọc và ảnh đại diện lỗi (nhánh `fix/p0-data-integrity`)
- **Lý do:** ở màn hồ sơ khách hàng, khung "Thông tin cơ bản" bị ép hẹp nên SĐT, email, địa chỉ xếp từng ký tự theo chiều dọc; ảnh đại diện (ảnh stock ngoài) không tải được nên hiện ảnh vỡ.
- **Ảnh tham chiếu:** ảnh chụp lỗi do chủ hệ thống gửi trong phiên.
- **File:** `modules/crm/ui/CrmApp.tsx` (ảnh đại diện thành chữ cái đầu tên), `app/crm-flow.css` (cột thông tin tự xuống hàng khi hẹp, lưới quyền lợi và chỉ số tự co).
- **Screenshot:** chụp trong phiên ở 1920 và 1440; chưa lưu file trong repo.
- **Kiểm thử:** `tsc` sạch, build đạt, kiểm tra bằng mắt trên bản build.
- **Chưa làm:** màn này vẫn dùng dữ liệu mẫu cứng trong `CrmApp.tsx` (1.248 khách, tên, SĐT mẫu), trái quy tắc không dùng dữ liệu giả; cần quyết định riêng để nối dữ liệu thật.

## 2026-11-16 — Luồng khách hàng theo phong cách trang chủ Dark Premium Golf (nhánh `fix/p0-data-integrity`)
- **Lý do:** chủ hệ thống yêu cầu đồng bộ phong cách toàn bộ luồng khách hàng với trang chủ mới; chỉ đổi giao diện, không đổi nghiệp vụ, API, dữ liệu.
- **Ảnh tham chiếu:** trang chủ Dark Premium Golf (chưa lưu file ảnh vào `hinh-anh/thiet-ke/`). Thay hoàn toàn các thiết kế sáng cũ: poster Bảng giá nền kem, đăng nhập/đăng ký nền trắng, app hội viên nền sáng, trang tin tức/đặt sân.
- **File:** `app/ui/SiteChrome.tsx` (header/footer dùng chung với trang chủ, tên/logo/địa chỉ/hotline lấy từ cài đặt), `app/site-dark.css` (mới), `app/member-dark.css` (mới), `app/home-dark.css`, `app/bang-gia/page.tsx`, `app/tin-tuc/page.tsx`, `app/tin-tuc/[id]/page.tsx`, `app/book/[slug]/page.tsx`, `app/not-found.tsx`, `app/tai-khoan/page.tsx`, `app/thanh-vien/page.tsx`.
- **Ghi chú thiết kế:** màn đăng nhập dùng header chung (header riêng của màn này ẩn). App hội viên (có sidebar) giữ thanh trên riêng của app, không thêm header/footer của website.
- **Screenshot:** chụp trong phiên bằng Playwright (desktop 1440, mobile 390 cảm ứng) cho Bảng giá, Hội viên, Tin tức, Chi tiết tin + đăng ký sự kiện, Đặt sân, Đăng nhập, Đăng ký, Tài khoản chờ xác nhận; chưa lưu file trong repo.
- **Kiểm thử:** `tsc` sạch, `eslint` 0 lỗi, `pnpm test` đạt, build đạt. Chưa kiểm tra riêng tablet 820 và 1920 cho các trang này; chưa chụp màn app hội viên khi đã được xác nhận và có gói.

## 2026-11-16 — Sửa thanh điều hướng dưới trên điện thoại (nhánh `fix/p0-data-integrity`)
- **Lý do:** trên điện thoại icon và nhãn ở thanh điều hướng dưới bị tối (gần như đen trên nền navy) và chạm vào không điều hướng.
- **Nguyên nhân:** (1) quy tắc màu dùng biến `--hd-*` chỉ có bên trong trang chủ, trong khi thanh này nằm cạnh trang chủ, nên biến không tồn tại; (2) `next/link` của vinext hủy thao tác bấm rồi điều hướng phía trình duyệt bị lỗi trên thiết bị cảm ứng (ghi nhận lỗi `RSC prefetch setup error` chỉ ở ngữ cảnh cảm ứng), nên không có gì xảy ra.
- **File:** `app/ui/MobileAppNavBar.tsx` (dùng liên kết `<a>` thường; mục "Đặt sân" cuộn tới form đặt nhanh `#dat-cho-nhanh` thay vì form đầy đủ ẩn), `app/home-dark.css` (màu viết trực tiếp), `app/ds-global.css` (`touch-action: manipulation`, bỏ vệt sáng khi chạm, vùng chạm tối thiểu 44px trên thiết bị cảm ứng).
- **Kiểm thử:** `tsc`, `eslint` (0 lỗi), build; trên trình duyệt giả lập điện thoại cảm ứng: chạm Giải đấu → `/tin-tuc`, Tài khoản → `/tai-khoan`, Đặt sân cuộn tới form đặt nhanh, nút hero → `/bang-gia`.
- **Còn tồn tại:** lỗi `RSC prefetch setup error` của vinext vẫn nằm ở các `Link` khác (AdminShell, PosShell là công cụ phụ); chưa thử trên điện thoại thật.

## 2026-11-16 — Trang chủ Dark Premium Golf (nhánh `fix/p0-data-integrity`)
- **Lý do:** chủ hệ thống yêu cầu thiết kế lại toàn bộ trang chủ theo ảnh tham chiếu Dark Premium Golf (nền navy, nhấn emerald, vàng nhẹ), thay trang chủ sáng đã duyệt ngày 15/11 (`home-desk.png`, `home-mobile.png`). Đây là thay đổi theo yêu cầu trực tiếp; hai ảnh cũ chỉ còn là lịch sử.
- **Ảnh tham chiếu:** ảnh Dark Premium Golf do chủ hệ thống gửi trong phiên (độ phân giải rất thấp, nên cần lưu bản rõ vào `hinh-anh/thiet-ke/`).
- **File:** `app/page.tsx` (viết lại), `app/home-dark.css` (mới). Giữ `app/home-reference.css` vì phần đặt sân nhúng (`BookingPage`) dùng kiểu của nó.
- **Bố cục:** Header (logo, menu, Đăng nhập, Đăng ký) → Hero cao 100dvh trừ header (ảnh thật của câu lạc bộ, tiêu đề, nút Đặt sân ngay, Xem bảng giá) → thanh tiện ích → Dịch vụ nổi bật (4 thẻ) → Đặt sân nhanh → Giải đấu & Sự kiện (3 thẻ) → Gói hội viên (3 gói) → Không gian & tiện ích → Chân trang. Mobile dạng app: header gọn, hàng thẻ vuốt ngang, thanh điều hướng dưới màu tối.
- **Dữ liệu thật, không viết cứng:** số line và phòng VIP lấy từ danh sách phòng; giá "từ X đ/giờ" lấy từ bảng giá; giờ mở cửa, giờ vàng, hotline, địa chỉ, tên và logo lấy từ cài đặt; giải đấu lấy từ bài viết loại sự kiện (trạng thái theo ngày thi đấu); gói hội viên và quyền lợi lấy từ danh mục gói và cài đặt quyền lợi; đặt sân nhanh dùng lại `QuickBook` và form đặt sân có sẵn.
- **Bỏ khỏi trang:** khối "Lịch đặt sân của tôi", hai ảnh banner hội viên có chữ in sẵn (giá và quyền lợi nằm trong ảnh), chuyển ngôn ngữ (chưa có đa ngôn ngữ), nút xem video (chưa có video), bảng xếp hạng (chưa có dữ liệu).
- **Kiểm thử:** `tsc`, `eslint` (0 lỗi), `pnpm test`, build; chụp 1920, 1440, 820 và 390px; kiểm tra tự động 4 kích thước: font Be Vietnam Pro, bo góc 5px, không chữ bị cắt, không tràn ngang, một `h1`, mọi ảnh có chú thích; form đặt sân mở đúng khi chọn khung giờ.
- **Chưa làm:** form đặt sân đầy đủ vẫn là bảng sáng trong trang tối (chưa chuyển giao diện tối); ô "số người" trong đặt nhanh chưa có vì form có sẵn không nhận; `home-reference.css` còn nhiều quy tắc cũ không dùng.

## 2026-11-16 — Chuẩn hóa 7 quy chuẩn UI toàn hệ thống và thiết kế lại Quản trị giải đấu (nhánh `fix/p0-data-integrity`)
- **Lý do:** yêu cầu chuẩn hóa toàn bộ giao diện theo 7 quy chuẩn (logo thật, font Be Vietnam Pro, Material Design 3, placeholder xám nhạt, chữ dài tự xuống dòng, ẩn thanh cuộn, bo góc 5px) và thiết kế lại trang Quản trị giải đấu theo mẫu đã duyệt.
- **Ảnh tham chiếu:** mẫu "Quản trị giải đấu" do chủ hệ thống gửi trong phiên (nên lưu vào `hinh-anh/thiet-ke/`).
- **Design System tập trung:** `app/ds-global.css` (mới, nạp cuối trong `app/layout.tsx`): font Be Vietnam Pro cho mọi phần tử (cả mã, ô nhập), `--radius: 5px` (các biến cũ `--ds-radius`, `--r`, `--pos-m3-radius-*` trỏ về 5px), placeholder `#9aa5a0`, ẩn thanh cuộn nhưng vẫn cuộn bằng chuột, cảm ứng, bàn phím, văn bản dài tự xuống dòng.
- **Sửa hàng loạt CSS:** 990 khai báo bo góc 5px (ô icon bo 8–12px, thẻ nhỏ bo 2–4px và nhãn viên thuốc đã về 5px; giữ hình tròn, avatar, chấm trạng thái, thanh tiến độ); bỏ `text-overflow: ellipsis`, `line-clamp` và `white-space: nowrap` ở các lớp chứa văn bản (60 quy tắc); bỏ `Cormorant`, `Inter`; xóa `public/favicon.svg` (hình vẽ tay, không dùng).
- **Quản trị giải đấu** (`app/ui/ContentPanel.tsx`, `app/tournament-admin.css`, `lib/tournament.ts`): ba mục (Danh sách giải đấu, Đăng ký tham gia, Tin tức); 4 ô số liệu (Tổng số, Đang diễn ra, Sắp diễn ra, Đã kết thúc) lọc được danh sách; tìm kiếm, phân trang; mỗi giải có Sửa, Sao chép (tạo bản nháp mới), Công bố hoặc chuyển về nháp, Xem đăng ký, Xóa (có xác nhận); trình soạn thảo có Thông tin chung, Thể thức, Giải thưởng, Điều kiện, Khác với Hủy, Lưu nháp, Lưu & Công bố; ảnh đại diện tải lên qua API có sẵn. Mobile: danh sách dạng thẻ, trình soạn thảo toàn màn hình, nút lưu luôn thấy.
- **Dữ liệu giữ nguyên:** dùng bảng `posts`, `event_signups` và `/api/content`; không đổi cơ sở dữ liệu hay API. Thể thức, giải thưởng, điều kiện lưu thành đoạn có nhãn trong nội dung bài ("Thể thức: …"); trang công khai vẫn đọc như đoạn văn thường. Trạng thái suy ra từ nháp/công bố và ngày thi đấu giờ Việt Nam.
- **Dữ liệu giả đã gỡ:** bảng xếp hạng mẫu trong `ContentPanel` (tên golfer, mã hội viên, giải thưởng bịa) chỉ nằm trên trình duyệt và hiện như thật; đã xóa cùng chức năng "Nhập điểm VĐV" vì chưa có nơi lưu.
- **Sửa lỗi:** lớp `.green` cũ trong `globals.css` (hình trang trí, `position: absolute`) làm thẻ KPI biến mất; nhãn trục doanh thu ở Tổng quan hiện "1M, 1M, 0M" vì làm tròn.
- **Kiểm thử:** `tsc`, `eslint` (0 lỗi), `pnpm test` (239), build; kiểm tra tự động trên trình duyệt thật 17 màn hình Desktop và Mobile (Website, Admin, POS, CRM, Hội viên, Giải đấu, Báo cáo, Cài đặt): 0 vi phạm font, bo góc, thanh cuộn, tràn ngang, chữ bị cắt; placeholder đều `rgb(154,165,160)`; trình duyệt: tạo, lưu nháp, công bố, sao chép, sửa, xóa giải.
- **Chưa làm:** các thẻ "Đăng ký & Duyệt", "Lịch thi đấu", "Live Scoring", "Kết quả & Bảng xếp hạng", "Cài đặt giải đấu" trong mẫu cần dữ liệu mới (số lượng tối đa, lệ phí, hạn đăng ký, điểm số), chưa có trong cơ sở dữ liệu; mobile chưa kiểm tra các mục Huấn luyện, Sản phẩm, Cài đặt qua menu "Khác" bằng kiểm tra tự động.

## 2026-11-16 — Làm tròn tối thiểu 100.000 khi thanh toán giờ chơi; xác nhận khi chuyển tập luyện ↔ chơi hố (nhánh `fix/p0-data-integrity`)
- **Lý do:** (1) khách tập theo giờ mà tiền chơi chưa đến 100.000 ₫ thì nhân viên cần được hỏi có làm tròn lên 100.000 ₫ không; (2) chuyển giữa tập luyện và chơi hố cần xác nhận, và trường hợp này không làm tròn.
- **Quy tắc:** chỉ áp dụng cho phiên tập theo giờ đã kết thúc, chưa thu tiền, chưa từng chuyển hình thức, tiền chơi (đã gồm phí dịch vụ và VAT) trên 0 và dưới 100.000 ₫. Làm tròn nâng tiền chơi lên đúng 100.000 ₫; tiền đồ ăn thức uống không đổi. Phiên đã chuyển giữa tập luyện và chơi hố không bao giờ được đề nghị làm tròn; máy chủ từ chối (409).
- **File:** `lib/club.ts` (`MIN_HOURLY_CHARGE`, `minChargeOffer`, `sessionQuote` thêm dòng "Làm tròn tối thiểu" để hóa đơn và phiếu in cộng khớp), `lib/server/club-service.ts` (hành động `round-min`, ghi nhật ký), `app/api/club/route.ts` (quyền `finance.operate`), `app/ui/ModernPosFlow.tsx` (hộp hỏi ở màn thanh toán; xác nhận trước khi chuyển, nêu tiền tập được giữ, giá lượt và việc không làm tròn), `app/ui/SessionPanel.tsx` (cùng xác nhận chuyển), `app/pos-flow.css`, `app/admin.css` (hộp xác nhận chung vừa nội dung, trước đây kéo dài hết chiều cao màn hình), `tests/session-quote.test.ts`.
- **Hành vi:** "Giữ nguyên" thu đúng số tiền thật; "Làm tròn" ghi vào phiếu (`price.minCharge`), phiếu in và Zalo có dòng làm tròn.
- **Kiểm thử:** `tsc`, `eslint`, `pnpm test`; trình duyệt: giữ nguyên (98 ₫), làm tròn (100.000 ₫, thu tiền mặt 100.000 ₫ qua sổ ca), chuyển sang 9 hố có hộp xác nhận rồi kết thúc 340.711 ₫ và máy chủ từ chối làm tròn.
- **Chưa làm:** mức tối thiểu 100.000 là hằng số trong mã, chưa chỉnh được trong Cài đặt; màn thanh toán cũ trong `SessionPanel` chưa có hộp hỏi làm tròn.

## 2026-11-16 — Trang bảng giá thiết kế như poster, tự cập nhật theo cài đặt (nhánh `fix/p0-data-integrity`)
- **Lý do:** chủ hệ thống yêu cầu trang `/bang-gia` có bố cục như poster "Bảng giá" và tự đổi nội dung khi đổi giá trong Cài đặt.
- **Ảnh tham chiếu:** poster "BẢNG GIÁ" do chủ hệ thống gửi trong phiên (chưa có file trong `hinh-anh/thiet-ke/`; nên lưu vào thư mục này).
- **File:** `app/bang-gia/page.tsx` (viết lại), `app/bang-gia/poster.css` (mới), `lib/price-poster.ts` (mới: dựng thẻ giá và thẻ gói từ khung giá và danh mục gói), `lib/server/pricing-service.ts` (trả thêm `poster`), `tests/price-poster.test.ts` (mới), `package.json`.
- **Nội dung tự động:** thẻ "Thứ hai – Thứ sáu" (khung giờ vàng và khung thường), thẻ "Thứ 7 – CN – Lễ" (tách "Thứ 7 – CN" và "Ngày lễ" nếu giá lễ khác), bảng Tập luyện/9 hố/18 hố cho Tiêu chuẩn và VIP; thẻ "Thẻ giờ" từ ưu đãi nạp ví (`WALLET_TIERS`, cùng hằng số dùng khi cộng tiền thưởng); thẻ cho từng nhóm gói trả trước đang bán (thẻ tháng, v.v.); khuyến mãi; ghi chú VAT/phí dịch vụ; địa chỉ, hotline. Khung giá tắt thì ẩn, khung giờ mới thì thêm khối mới.
- **Khác poster:** bo góc 5px theo quy ước mới; không có dòng "Chỉ áp dụng tập luyện" ở thẻ giờ vì ví hiện trả được cả phiếu có đồ ăn thức uống; khung thường bắt đầu 11:00 (poster ghi 11:10, xem `docs/PRICING.md`).
- **Kiểm thử:** `tsc`, `eslint` (0 lỗi), `pnpm test`; chụp desktop và mobile; trình duyệt: đổi giá giờ vàng thành 123.000 và bật phí dịch vụ 5%, trang hiện đúng ngay.

## 2026-11-16 — Màn thanh toán: khung chuyển khoản gọn, ví nội bộ báo ngay (nhánh `fix/p0-data-integrity`)
- **Lý do:** khung QR chuyển khoản bị bóp thành dải hẹp (lớp `info-strip` bố trí hàng ngang), QR nhỏ, chữ rớt từng chữ; chọn "Ví nội bộ" không báo gì khi không tìm thấy ví hoặc không đủ số dư, chỉ có một nút xám nhỏ.
- **File:** `app/ui/session/TransferPanel.tsx` (một cột: QR lớn, mỗi thông tin một dòng, số tiền và nội dung có nút sao chép), `app/ui/session/PackageRedeem.tsx` (chế độ `wallet` và `package`), `app/ui/ModernPosFlow.tsx`, `app/pos-flow.css`, `lib/server/member-service.ts` (trả thêm `member` gồm tên và số dư kể cả khi ví 0).
- **Hành vi ví nội bộ:** hiện hội viên, số dư, số cần thanh toán; không đủ thì báo ngay "Số dư ví không đủ: thiếu X" kèm hướng dẫn; đủ thì báo số dư còn lại và hiện nút "Thanh toán bằng ví · số tiền". Không tìm thấy ví, phiếu chưa chốt, hoặc tổng trên màn hình khác số tiền phiếu thì báo lý do và không cho trả (ví chỉ trả đúng số tiền phiếu đã chốt). Thẻ giờ hội viên cũng báo rõ khi khách không có gói khả dụng.
- **Kiểm thử:** `tsc`, `eslint`; trình duyệt: khung chuyển khoản, ví 100.000 cho phiếu 680.400 (báo thiếu 580.400), ví 1.300.000 (đủ, hiện nút thanh toán). Chưa thử bấm thanh toán bằng ví trên trình duyệt và chưa kiểm tra bản mobile.

## 2026-11-16 — Chọn nhiều khung giá để xóa (nhánh `fix/p0-data-integrity`)
- **Lý do:** chủ hệ thống cần xóa nhiều khung giá cùng lúc thay vì từng dòng.
- **File:** `app/ui/PriceEditor.tsx` (cột ô chọn ở mỗi dòng, ô "chọn tất cả" theo khu vực và theo dịch vụ, thanh "Chọn tất cả N khung đang hiển thị · Đã chọn N · Xóa đã chọn · Bỏ chọn" với bước xác nhận), `app/system-settings.css`.
- **Hành vi:** "Chọn tất cả" chỉ chọn các khung đang hiển thị theo bộ lọc; xóa hàng loạt chỉ thay đổi bảng trong cửa sổ, chưa ghi cho tới khi bấm Lưu thay đổi.
- **Kiểm thử:** `tsc`, `eslint`; trình duyệt: chọn một nhóm 18 hố (4 khung), xóa đã chọn, Lưu, máy chủ còn 20/24 khung.

## 2026-11-16 — Gói trả trước đồng bộ danh mục chính thức (nhánh `fix/p0-data-integrity`)
- **Lý do:** danh mục gói đang bán (14 gói: gói giờ 10/20 giờ, thẻ 1–2 giờ/ngày theo 1/6/12 tháng) khác danh mục chính thức 11/2026 (3 thẻ tháng 5/14/25 triệu; thẻ giờ đã bỏ, thay bằng ưu đãi nạp ví); nút "Khôi phục gói mẫu" chỉ thêm mà không gỡ gói cũ; thao tác "Xóa" gói gỡ trigger bảo vệ `package_types_no_delete` rồi xóa cứng, kể cả gói đã có khách mua.
- **File:** `lib/server/member-service.ts` (`types-official`: gói ngoài danh mục chính thức chuyển sang ngừng bán, gói chính thức được tạo hoặc khôi phục đúng giá trị; `type-delete`: gói đã có khách mua thì ngừng bán, gói chưa ai mua thì xóa thật trong một giao dịch và giữ nguyên trigger), `lib/member.ts`, `app/api/members/route.ts`, `app/ui/PackageEditor.tsx` (nút "Dùng danh mục chính thức 11/2026" có bước xác nhận, chữ xác nhận xóa), `app/ui/SystemSettingsHub.tsx`, `app/ui/MembersPanel.tsx`, `app/ui/AdminReferenceShell.tsx` (đổi tên "Gói trả trước & Thẻ"), `app/bang-gia/page.tsx` (thêm dòng ưu đãi nạp ví lấy từ `WALLET_TIERS`, cùng hằng số dùng khi cộng tiền thưởng).
- **Kiểm thử:** `tsc`, `eslint` (0 lỗi); máy chủ kiểm thử: áp dụng danh mục chính thức (thêm 3, ngừng bán 1), tạo rồi xóa một gói chưa bán; ba lệnh gỡ trigger/xóa/tạo lại kiểm riêng trên SQLite (trigger còn, xóa trực tiếp vẫn bị chặn). DB kiểm thử không có trigger nên chưa kiểm được ở đó.
- **Chưa làm:** chưa áp dụng vào dữ liệu thật; ưu đãi nạp ví vẫn là hằng số trong mã (chưa sửa được trong Cài đặt).

## 2026-11-16 — Bảng giá trang chủ đồng bộ với Cài đặt (nhánh `fix/p0-data-integrity`)
- **Lý do:** bảng giá trang chủ chỉ lấy 3 khung đầu (khung giá thêm sau không hiện), không có giá 9/18 hố và ghi sai đơn vị ("100.000 ₫ đ/giờ"); bảng mặc định bỏ qua giá VIP riêng.
- **Ảnh tham chiếu:** `hinh-anh/thiet-ke/home-desk.png` (giữ nguyên bố cục bảng 3 cột Thời gian · Line tiêu chuẩn · Phòng VIP).
- **File:** `app/page.tsx` (hiện mọi khung giá; mỗi ô có giá theo giờ và một dòng nhỏ giá 9/18 hố đ/người; sửa đơn vị), `app/ui/PriceUi.tsx` và `app/bang-gia/page.tsx` (cột "9 hố / người", "18 hố / người" và ghi chú), `lib/server/pricing-service.ts` (mặc định giữ giá VIP riêng).
- **Kiểm thử:** `tsc`, `eslint` (0 lỗi); chụp trang chủ trên bản build. Trang chủ trên điện thoại chưa chụp (khu bảng giá ẩn ở bố cục mobile của thiết kế).

## 2026-11-16 — Giá 9/18 hố tính theo người (nhánh `fix/p0-data-integrity`)
- **Lý do:** dòng "1 người" của 9/18 hố là đơn giá một người, nhưng hệ thống ghi "/nhóm" và đòi một dòng giá cho từng số người (thiếu thì báo "Chưa có giá").
- **Quy tắc:** nhóm N người trả N × đơn giá dòng "1 người"; nếu có dòng riêng cho đúng N người (2–4) thì dòng đó là giá trọn nhóm và được ưu tiên. Không có dòng 1 người thì vẫn báo chưa có giá, không đoán.
- **File:** `lib/pricing.ts` (`selectRule`), `lib/official-pricing.ts` (bảng chính thức còn 24 khung, mỗi khung 9/18 hố một dòng "1 người"), `app/ui/PriceEditor.tsx` (nhãn "/người" hoặc "/nhóm N người", giải thích cạnh ô Số người, nút "Thêm" cùng hàng), `app/ui/SystemSettingsHub.tsx`, `tests/booking-plan.test.ts`, `tests/official-pricing.test.ts`.
- **Kiểm thử:** `tsc`, `eslint` (0 lỗi), `pnpm test`; trình duyệt: bảng chính thức 24 khung hiện "/người"; đặt 9 hố 2/3/4 người ra 600.000 / 900.000 / 1.200.000.

## 2026-11-16 — Gỡ dữ liệu điền sẵn do AI đặt, chặn giao dịch ngân hàng giả, xóa form cài đặt cũ (nhánh `fix/p0-data-integrity`)
- **Lý do:** quy tắc dữ liệu của dự án (không dữ liệu giả). Các thẻ Cài đặt điền sẵn tài khoản ngân hàng, mã số thuế, tên công ty, mã marketing, VAT/phí, tỷ lệ hoa hồng… rồi lưu thành dữ liệu thật khi bấm Lưu; màn chuyển khoản dùng số tài khoản dự phòng tự đặt để tạo mã QR; nút "Giả lập báo có SePay" tạo giao dịch ngân hàng giả và máy chủ cho mọi nhân viên dùng.
- **File:** `app/ui/SystemSettingsHub.tsx` (ô trống khi chưa cấu hình, hạng hội viên và quyền lợi lấy từ mặc định của hệ thống, ô số để trống không bị lưu thành 0), `app/ui/session/TransferPanel.tsx` (không QR khi chưa cấu hình tài khoản nhận tiền, hiện hướng dẫn; bỏ nút giả lập), `app/ui/SepaySettings.tsx` (bỏ nút gửi giao dịch test), `app/ui/ModernPosFlow.tsx`, `lib/server/bank-service.ts` (`simulate-tx` chỉ chạy trên máy kiểm thử, ngoài đó trả 403), `app/ui/Forms.tsx` và `app/ui/ClubApp.tsx` (xóa `SettingsForm` cũ không còn dùng, gồm các ô giá cũ).
- **Kiểm thử:** `tsc`, `eslint` (0 lỗi), `pnpm test`; e2e luồng tiền mức API đạt.
- **Chưa làm:** các trường giá cũ (`rate`, `happy`, `hole9`…) còn trong kiểu cấu hình và mã nhưng không còn nơi nào sửa; e2e giao diện cũ cần viết lại.

## 2026-11-16 — Bảng giá: thêm khung giá trong từng nhóm, lưu không báo thành công giả (nhánh `fix/p0-data-integrity`)
- **Lý do:** nút "Thêm khung giá mới" tưởng như không chạy (dòng mới nằm ngoài tầm nhìn, chỉ có dải lỗi ở trên); bấm Lưu khi dữ liệu sai vẫn báo "Đã lưu cấu hình thành công!" rồi đóng cửa sổ và mất thay đổi.
- **File:** `app/ui/PriceEditor.tsx` (nút "Thêm khung giá" ở từng khu vực và "Thêm" ở từng dịch vụ, dòng mới tự mở rộng nhóm và cuộn vào giữa màn hình), `app/ui/SystemSettingsHub.tsx` (`handleSaveConfig` không báo thành công và không đóng khi máy chủ từ chối; thẻ Bảng giá kiểm tra hợp lệ trước khi lưu, hiện lỗi ngay trong cửa sổ và ở lại sau khi lưu thành công).
- **Hành vi:** Lưu bảng giá thành công thì giữ nguyên cửa sổ và hiện "Đã lưu bảng giá"; các thẻ khác vẫn đóng sau khi lưu thành công.
- **Kiểm thử:** `tsc`, `eslint` (0 lỗi), `pnpm test`; trình duyệt: thêm khung trong nhóm 18 hố, lưu khi chưa hợp lệ (cửa sổ giữ nguyên, báo lỗi), điền khung 23:00–23:30 và lưu (73 khung, cửa sổ ở lại).

## 2026-11-16 — Bảng giá chính thức duy nhất, thêm/sửa/xóa khung giá (nhánh `fix/p0-data-integrity`)
- **Lý do:** bảng giá đang chạy thật là bảng cũ, thiếu giá 9 hố cho 2–4 người và lệch bảng chính thức 11/2026; Cài đặt hệ thống mới không còn nơi sửa bảng khung giá chi tiết (chỉ 4 ô giá theo giờ). Chủ hệ thống yêu cầu dùng bảng chính thức cho toàn hệ thống, bỏ các bảng giá không liên quan, cho phép thêm, sửa, xóa.
- **Ảnh tham chiếu:** `docs/PRICING.md` (bảng giá chính thức 11/2026); giao diện theo `caidat.png`.
- **File:** `app/ui/SystemSettingsHub.tsx` (thẻ "Bảng giá" dùng `PriceEditor`, nút "Nạp bảng giá chính thức 11/2026" có bước xác nhận; bỏ form 4 ô giá và đồng bộ phía client), `app/system-settings.css`, `lib/pricing.ts` (`upgradeConfig` luôn dùng bảng chính thức khi chưa lưu bảng riêng), `app/ui/ClubApp.tsx`, `tests/booking-plan.test.ts`, `tests/official-pricing.test.ts`.
- **Sửa lỗi kèm theo:** nút Lưu trong Cài đặt hệ thống trước đây không gửi `pricingRevision` nên máy chủ trả 409 cho mọi lần lưu; nay gửi kèm.
- **Cách áp dụng trên hệ thống thật:** Cài đặt hệ thống › Giá, gói & hội viên › Bảng giá › Nạp bảng giá chính thức 11/2026 › Thay thế › Lưu thay đổi. Chưa nạp tự động vào dữ liệu thật.
- **Screenshot:** chụp trong phiên (thẻ Bảng giá); chưa lưu thành file trong repo.
- **Kiểm thử:** `tsc`, `eslint` (0 lỗi), `pnpm test`; kiểm tra bằng trình duyệt: nạp bảng chính thức, xóa một khung, lưu, đọc lại từ server (72 → 71).
- **Chưa làm:** các trường giá cũ (`rate`, `happy`, `hole9`…) còn trong cấu hình và mã nhưng không còn nơi nào chỉnh sửa; `SettingsForm` trong `Forms.tsx` là mã không dùng.

## 2026-11-16 — Sơ đồ line, form đặt lịch, bo góc 5px toàn hệ thống (nhánh `fix/p0-data-integrity`)
- **Lý do:** (1) form "Tạo lịch đặt" không chặn điều kiện, layout lộn xộn; (2) đặt 9 hố báo "Chưa có giá line tiêu chuẩn" vì bảng giá không có giá 9 hố cho 2 và 3 người; (3) thẻ line nhồi nhiều thông tin trên một dòng, chữ thừa. Chủ hệ thống yêu cầu bo góc 5px thống nhất (thay quy ước 12–20px trước đây).
- **Ảnh tham chiếu:** ảnh chụp lỗi do chủ hệ thống gửi trong phiên; chưa có ảnh thiết kế riêng cho hai màn này.
- **File:** `app/ui/ModernPosFlow.tsx` (thẻ line dùng chung `renderDeskRoom`, nhãn "Line trống"/"Phòng trống", bỏ "Nhấn để nhận khách / Mở phiên", đơn giá lấy từ khung giá đang áp dụng thay vì trường `rate` cũ), `app/pos-flow.css`, `app/ui/Forms.tsx` (BookingForm), `app/admin.css`, `app/ui/SystemSettingsHub.tsx`, toàn bộ `app/**/*.css` và `borderRadius` nội tuyến (575 khai báo CSS, 77 viên thuốc, 40 nội tuyến → 5px; giữ hình tròn, công tắc, thanh tiến độ).
- **Hành vi form đặt lịch:** số người chưa có giá bị khóa (không đoán giá); danh sách điều kiện còn thiếu (tên, số điện thoại hợp lệ, giờ trong khoảng cho phép, có báo giá); nút xác nhận chỉ mở khi đủ điều kiện. Không còn đặt với tên mặc định "Khách đặt lịch".
- **Dữ liệu:** chưa nạp giá nào vào cấu hình thật. Cần chủ hệ thống bổ sung giá 9/18 hố cho 2–3 người trong Cài đặt › Giá (hoặc xác nhận dùng bảng giá chính thức 11/2026).
- **Screenshot:** chụp trong phiên bằng Playwright (sơ đồ line, form đặt lịch 9 hố); chưa lưu thành file trong repo.
- **Kiểm thử:** `tsc`, `eslint` (0 lỗi), `pnpm test` 222/222, build đạt. Kiểm tra bằng mắt trên bản build với dữ liệu thử có thiếu giá 9 hố 2–3 người. E2E cũ chưa cập nhật theo sidebar mới.
- **Chưa làm:** thẻ line trên mobile (`pos-m3-room-ready` "Sẵn sàng đón khách") và bố cục mobile chưa đổi.

## 2026-11-15 — POS 4 bước nối dữ liệu thật (nhánh `pos-flow-redesign`)
- **Lý do:** bản `ModernPosFlow` trước đó dùng khách, món, hóa đơn giả; thanh toán gọi sai API; có 6 lỗi typecheck.
- **Ảnh tham chiếu:** `Luồng POS Saigon Indoor Golf Club.png`.
- **File:** `app/ui/ModernPosFlow.tsx`, `app/ui/ClubApp.tsx` (thêm `onOpenSession`), `app/pos-flow.css`. Commit `68d4ae9`, `01b554b`, `a8723d6`.
- **Screenshot:** chụp trong phiên làm việc (sơ đồ line, bán hàng L01 mobile/desktop, thanh toán, hoàn tất); chưa lưu thành file. Không có ảnh "trước" vì bản cũ lỗi typecheck.
- **Kiểm thử:** `tsc`, `eslint`, `pnpm test` đạt. Thủ công trên trình duyệt: vào chơi L03 → chốt giờ → thanh toán tiền mặt 752 ₫ → hoàn tất đạt. Chưa kiểm thử: thẻ, chuyển khoản, in, Zalo, thêm món, gia hạn.

## 2026-11-15 — Khôi phục và bảo vệ UI đã duyệt
- **Lý do:** giao diện mới chỉ nằm trong working tree chưa commit, có nguy cơ mất hoặc bị ghi đè.
- **Ảnh tham chiếu:** toàn bộ `hinh-anh/thiet-ke/`.
- **File:** 64 file (admin, POS, cài đặt, hội viên, đăng nhập, trang chủ, CRM home, ảnh thiết kế). Commit `7e513a6`, tag `ui-approved-2026-11-15`.
- **Screenshot:** có sẵn ở `.admin-check/` (admin desktop/tablet/mobile).
- **Kiểm thử:** không đổi code; sao lưu `D:\Backup\app-golf3d-2026-11-15`.
