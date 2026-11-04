# Lộ trình Golf3D (chốt theo trả lời của chủ dự án)

## Quyết định đã chốt
- Mục tiêu song song: chạy thật tại 250 Lương Định Của + nền SaaS đa cơ sở (tenant).
- Đã có dữ liệu thật → ưu tiên **không mất dữ liệu**: mọi thay đổi schema qua migration thêm, có backup trước.
- Ưu tiên tính năng: hội viên, HLV, khách đặt online (nhân viên xác nhận).
- Hạ tầng: chuyển khỏi Sites sang **Vercel + Supabase (Postgres)**; tên miền mua sau.
- Đăng nhập: email/số điện thoại + **mật khẩu** trước; OTP để sau.
- Vai trò: thu ngân, quản lý, HLV, CSKH, sale (+ chủ cơ sở).
- Giá: thu theo đầu người khi chơi hố; tập luyện tính theo giờ.
- Thanh toán: SePay (tài khoản cài trong admin); hóa đơn điện tử MISA.
- Kết nối máy GC3 lấy dữ liệu swing.
- Kỹ thuật: dọn code trước, thêm Playwright E2E + GitHub Actions CI. Một dev. Thiết kế lại giao diện khi có logo/ảnh.

## Giai đoạn
**0. Nền an toàn (làm trước)**
- Cài lại dependency, chạy baseline typecheck/lint/test (hiện `node_modules` chưa cài trên máy này).
- Export/backup dữ liệu thật hiện tại (D1) trước mọi thay đổi.
- Dọn code: format lại toàn bộ (file hiện nén dày, vd. `lib/booking.ts`), tách `ClubApp.tsx` và `app/api/*/route.ts` thành service + UI nhỏ; xóa phần starter thừa (`examples/`, nhiều `components/ui` không dùng). Không đổi hành vi; test hiện có phải giữ xanh.
- GitHub Actions: typecheck + lint + test; sau đó Playwright E2E.

**1. Chuyển hạ tầng**: lớp truy cập DB trừu tượng, schema Postgres tương đương, script chuyển dữ liệu D1 → Supabase, staging riêng.

**2. Xác thực + RBAC**: tài khoản mật khẩu, membership theo tổ chức, quyền theo 5 vai trò, test truy cập chéo tenant.

**3. Tính năng**: khách đặt online → nhân viên xác nhận; hội viên/gói; HLV (lịch, buổi tập tính giờ); giá theo đầu người.

**4. Thanh toán/hóa đơn**: SePay đối soát tự động, MISA e-invoice.

**5. GC3**: tích hợp dữ liệu swing (cần tài liệu/API từ nhà cung cấp GC3).

**6. Thiết kế lại UI** khi có logo + ảnh; SaaS onboarding/billing.

## Cần anh cung cấp sau
- Bảng giá chốt (VIP, nhóm, 9/18 hố, VAT/phí) trước khi thu tiền thật.
- Thông tin GC3 (model, cách xuất dữ liệu/API), tài khoản SePay/MISA khi tới giai đoạn 4.
- Số giờ/tuần anh dành cho dự án (câu 13 chưa trả lời).
