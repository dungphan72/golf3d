# UI Changelog

Mỗi mục phải có: lý do · ảnh tham chiếu · file thay đổi · screenshot trước/sau · kết quả kiểm thử.

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
