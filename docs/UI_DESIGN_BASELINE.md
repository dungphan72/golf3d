# UI Design Baseline (nguồn tham chiếu chính thức)

Cập nhật: 15/11/2026. Mốc phục hồi: tag `ui-approved-2026-11-15` (commit `7e513a6`); POS nối dữ liệu thật ở nhánh `pos-flow-redesign`. Bản sao lưu đầy đủ: `D:\Backup\app-golf3d-2026-11-15`.

## Design system
| Mục | Giá trị |
|---|---|
| Font | Be Vietnam Pro, toàn hệ thống (`app/tokens.css`) |
| Xanh thương hiệu | đậm `#0a5c1e`, nền nhạt `#e8f3ea`; hành động POS `#16a34a` |
| Vàng logo | `#fcb000` |
| Nền / thẻ | trắng, xám nhạt `#f8fafc`, viền `#e2e8f0`, bo 12–20px, bóng rất nhẹ |
| Icon | lucide-react, phẳng |
| Điều hướng | Desktop: sidebar trái (`AdminReferenceShell`). Mobile: bottom navigation + header xanh |

## Màn hình đã duyệt, ảnh tham chiếu và file sở hữu
| Màn hình | Ảnh tham chiếu (`hinh-anh/thiet-ke/`) | File chính |
|---|---|---|
| Trang chủ (desktop/mobile) | `home-desk.png`, `home-mobile.png` | `app/page.tsx`, `app/home-reference.css` |
| Đăng nhập / đăng ký | `dang-nhap.png` | `app/ui/MemberAuth.tsx`, `app/auth-reference.css` |
| App hội viên | `hoi-vien.png`, `hoi-vien-mobile.png` | `MemberShell/MemberHome/MemberPortal.tsx`, `app/member-reference.css` |
| Khung quản trị | `admin.png`, `admin1.png` | `app/ui/AdminReferenceShell.tsx`, `app/admin-reference.css` |
| Tổng quan quản trị | `admin.png`, `admin1.png` | `app/ui/AdminOverview.tsx` |
| POS 4 bước (desktop/mobile) | `Luồng POS Saigon Indoor Golf Club.png`, `POS.png`, `POS-mobile.png` | `app/ui/ModernPosFlow.tsx`, `app/pos-flow.css` |
| Cài đặt hệ thống | `caidat.png` | `app/ui/SystemSettingsHub.tsx`, `app/system-settings.css` |
| CRM tổng quan (desktop/mobile) | `CRM.png`, `CRM-mobile.png`, `Bảng điều khiển CRM…-1.png`, `CRM di động…-2.png` | `modules/crm/ui/CrmHome.tsx`, `CrmShell.tsx`, `app/crm-shell.css` |

## Quy tắc giữ nguyên
- Không đổi layout, màu, font, sidebar, navigation của các file ở bảng trên nếu không được yêu cầu.
- `ModernPosFlow` giữ 4 bước (sơ đồ line → bán hàng → thanh toán → hoàn tất). Dữ liệu lấy từ server; nút thanh toán bị khóa khi chưa mở ca, còn đơn món chưa phục vụ hoặc phiên chưa chốt tiền.
- `SessionPanel`, `PosBoard`, `AdminShell` vẫn tồn tại làm công cụ phụ (giảm giá/gói/chia tiền, hàm `playedMs`/`clock`, thanh dưới). Không xóa khi chưa kiểm tra phụ thuộc.

## Chưa đối chiếu hoặc còn lệch ảnh
- `Luồng giải đấu trên ứng dụng di động.png` và `Quy trình giải đấu….png`: chưa đối chiếu từng màn.
- POS: thẻ món chưa có ảnh sản phẩm (hệ thống chưa lưu ảnh); tab Dịch vụ/Phụ kiện/Combo và giá thuê gậy chưa có dữ liệu nên không hiển thị; màn hoàn tất hiển thị mã phiên thay cho mã `HD…`.
- Thanh toán thẻ, chuyển khoản/QR, in hóa đơn, Zalo, thêm món qua bếp, gia hạn: chưa kiểm thử bằng trình duyệt.
