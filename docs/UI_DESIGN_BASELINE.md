# UI Design Baseline (nguồn tham chiếu chính thức)

Cập nhật: 15/11/2026. Mốc phục hồi: tag `ui-approved-2026-11-15` (commit `7e513a6`); POS nối dữ liệu thật ở nhánh `pos-flow-redesign`. Bản sao lưu đầy đủ: `D:\Backup\app-golf3d-2026-11-15`.

## Design system
| Mục | Giá trị |
|---|---|
| Font | Be Vietnam Pro, toàn hệ thống (`app/tokens.css`) |
| Xanh thương hiệu | đậm `#0a5c1e`, nền nhạt `#e8f3ea`; hành động POS `#16a34a` |
| Vàng logo | `#fcb000` |
| Nền / thẻ | trắng, xám nhạt `#f8fafc`, viền `#e2e8f0`, bóng rất nhẹ. **Bo góc 5px thống nhất toàn hệ thống** (từ 16/11/2026, theo yêu cầu chủ hệ thống; chỉ giữ hình tròn, công tắc, thanh tiến độ) |
| Icon | lucide-react, phẳng |
| Điều hướng | Desktop: sidebar trái (`AdminReferenceShell`). Mobile: bottom navigation + header xanh |

## Màn hình đã duyệt, ảnh tham chiếu và file sở hữu
| Màn hình | Ảnh tham chiếu (`hinh-anh/thiet-ke/`) | File chính |
|---|---|---|
| Trang chủ (desktop/mobile), Dark Premium Golf từ 16/11/2026 (thay `home-desk.png`, `home-mobile.png`) | ảnh Dark Premium Golf (chưa lưu file) | `app/page.tsx`, `app/home-dark.css` |
| Đăng nhập / đăng ký, Dark Premium Golf từ 16/11/2026 (thay `dang-nhap.png`) | theo phong cách trang chủ | `app/ui/MemberAuth.tsx`, `app/auth-reference.css`, `app/member-dark.css` |
| App hội viên, Dark Premium Golf từ 16/11/2026 (thay `hoi-vien.png`, `hoi-vien-mobile.png`) | theo phong cách trang chủ | `MemberShell/MemberHome/MemberPortal.tsx`, `app/member-reference.css`, `app/member-dark.css` |
| Trang khách hàng chung: header/footer tối, Bảng giá, Tin tức, Đặt sân (`/book`), 404 (từ 16/11/2026; Bảng giá thay poster nền kem) | theo phong cách trang chủ | `app/ui/SiteChrome.tsx`, `app/site-dark.css`, `app/bang-gia/*`, `app/tin-tuc/*`, `app/book/*` |
| Khung quản trị | `admin.png`, `admin1.png` | `app/ui/AdminReferenceShell.tsx`, `app/admin-reference.css` |
| Tổng quan quản trị | `admin.png`, `admin1.png` | `app/ui/AdminOverview.tsx` |
| POS 4 bước (desktop/mobile) | `Luồng POS Saigon Indoor Golf Club.png`, `POS.png`, `POS-mobile.png` | `app/ui/ModernPosFlow.tsx`, `app/pos-flow.css` |
| Cài đặt hệ thống | `caidat.png` | `app/ui/SystemSettingsHub.tsx`, `app/system-settings.css` |
| Quản trị giải đấu (desktop/mobile) | mẫu "Quản trị giải đấu" (chưa lưu file ảnh) | `app/ui/ContentPanel.tsx`, `app/tournament-admin.css`, `lib/tournament.ts` |
| CRM tổng quan (desktop/mobile) | `CRM.png`, `CRM-mobile.png`, `Bảng điều khiển CRM…-1.png`, `CRM di động…-2.png` | `modules/crm/ui/CrmHome.tsx`, `CrmShell.tsx`, `app/crm-shell.css` |

## Quy tắc giữ nguyên
- Không đổi layout, màu, font, sidebar, navigation của các file ở bảng trên nếu không được yêu cầu.
- `ModernPosFlow` giữ 4 bước (sơ đồ line → bán hàng → thanh toán → hoàn tất). Dữ liệu lấy từ server; nút thanh toán bị khóa khi chưa mở ca, còn đơn món chưa phục vụ hoặc phiên chưa chốt tiền.
- `SessionPanel`, `PosBoard`, `AdminShell` vẫn tồn tại làm công cụ phụ (giảm giá/gói/chia tiền, hàm `playedMs`/`clock`, thanh dưới). Không xóa khi chưa kiểm tra phụ thuộc.

## Chưa đối chiếu hoặc còn lệch ảnh
- `Luồng giải đấu trên ứng dụng di động.png` và `Quy trình giải đấu….png`: chưa đối chiếu từng màn.
- POS: thẻ món chưa có ảnh sản phẩm (hệ thống chưa lưu ảnh); tab Dịch vụ/Phụ kiện/Combo và giá thuê gậy chưa có dữ liệu nên không hiển thị; màn hoàn tất hiển thị mã phiên thay cho mã `HD…`.
- Thanh toán thẻ, chuyển khoản/QR, in hóa đơn, Zalo, thêm món qua bếp, gia hạn: chưa kiểm thử bằng trình duyệt.


## Quy chuẩn toàn hệ thống (từ 16/11/2026)
Khai báo tập trung trong `app/ds-global.css`: (1) logo chỉ dùng file trong `/public`, không vẽ lại; (2) font Be Vietnam Pro; (3) Material Design 3; (4) placeholder `#9aa5a0`; (5) chữ dài tự xuống dòng, không ép một dòng, không cắt `…`; (6) ẩn thanh cuộn nhưng vẫn cuộn được; (7) bo góc `--radius: 5px` (giữ hình tròn cho avatar, chấm trạng thái, thanh tiến độ).
