# QUY CHUẨN THIẾT KẾ GIAO DIỆN CHÍNH THỨC (DESIGN SYSTEM)
## Saigon Indoor Golf Club — sigolf.vn

Cập nhật: 17/11/2026  
Tác giả: Principal UI/UX Designer & Senior Frontend Architect  
Tiêu chuẩn: **Google Workspace / Material Design 3 — Bản sắc Doanh nhân Thể thao Golf**

---

## 1. TRIẾT LÝ THIẾT KẾ

1. **Phẳng, Tối giản, Chuyên nghiệp (Clean & Flat)**: Giao diện phục vụ vận hành tốc độ cao cho thu ngân, lễ tân và quản lý; loại bỏ triệt để các hiệu ứng 3D bóng bẩy, gradient lòe loẹt mang cảm giác "AI-generated".
2. **Nhất quán Tuyệt đối (Single Source of Truth)**: Mọi phân hệ (Dashboard, POS, CRM, Booking, Membership, Service Call, Báo cáo, Cài đặt) đều dùng chung một bộ Tokens, cùng một tỷ lệ bo góc, font chữ và màu sắc.
3. **Thân thiện trên Mọi Thiết bị (Responsive First)**: Mọi nút bấm, trường nhập liệu trên điện thoại di động và máy POS cảm ứng đều có chiều cao chạm tối thiểu **≥ 44px**, không bị giật lag, không che khuất màn hình.

---

## 2. HỆ THỐNG DESIGN TOKENS CHUẨN

Toàn bộ tokens được khai báo và bảo vệ tập trung tại `app/tokens.css` và `app/ds-global.css`:

### 2.1. Màu sắc (Color Palette)

| Loại Token | Tên Biến CSS | Mã Hex / RGB | Mô tả & Mục đích sử dụng |
|---|---|---|---|
| **Primary Brand** | `--clr-primary` | `#0a5c1e` | Xanh lá đậm thương hiệu SIGOLF (Header, Thẻ VIP, Logo) |
| **Primary Interactive**| `--pos-m3-primary`| `#16a34a` / `#15803d`| Xanh lá hành động chính (Nút bấm Primary, Xác nhận, Bắt đầu chơi) |
| **Primary Surface**| `--pos-m3-primary-surface`| `#f0fdf4` / `#e8f3ea`| Nền thẻ đang chọn, badge thành công, hover mục đang chọn |
| **Accent Gold** | `--clr-accent` | `#fcb000` / `#f5af05`| Vàng golf: Hội viên Gold/Diamond, icon điểm thưởng, ngôi sao |
| **Surface White** | `--clr-surface` | `#ffffff` | Nền trắng thẻ nội dung, modal, bảng dữ liệu |
| **Background Root**| `--clr-bg-root` | `#f8fafc` / `#fbfbfa`| Nền tổng thể toàn trang (xám rất nhạt, dịu mắt) |
| **Border Subtle** | `--clr-border-subtle`| `#e2e8f0` | Đường viền thẻ, phân chia dòng bảng, viền card |
| **Text Main** | `--clr-text-main` | `#0f172a` (Slate 900) | Chữ tiêu đề, số tiền chính, nội dung quan trọng |
| **Text Sub / Body**| `--pos-m3-text-sub` | `#334155` (Slate 700) | Chữ thông thường, nhãn trường nhập liệu |
| **Text Muted** | `--clr-text-muted`| `#64748b` (Slate 500) | Chú thích phụ, ngày giờ, đơn vị tính |
| **Placeholder** | `--placeholder` | `#9aa5a0` | Màu xám nhạt cho placeholder trường nhập (phân biệt rõ chữ thật) |

#### Màu sắc trạng thái nghiệp vụ (Status Indicators):
- **Trống / Khả dụng / Thành công**: Chữ `#15803d`, Nền `#dcfce7`, Viền `#bbf7d0`.
- **Đang chơi / Đang xử lý**: Chữ `#1d4ed8`, Nền `#dbeafe`, Viền `#bfdbfe`.
- **Chờ thanh toán / Tạm dừng / Cảnh báo**: Chữ `#b45309`, Nền `#fef3c7`, Viền `#fde68a`.
- **Quá hạn / Hủy / Bảo trì**: Chữ `#b91c1c`, Nền `#fee2e2`, Viền `#fecaca`.

> **Quy tắc cấm kỵ**: Không được sử dụng các dải màu gradient đa sắc phức tạp (như tím-hồng, xanh dương-tím) trên các thành phần nút bấm hoặc thanh tiến độ. Chỉ dùng màu phẳng (Flat Solid) hoặc sắc độ chuyển tiếp nhẹ trong cùng một dải màu thương hiệu.

---

### 2.2. Bo góc Thống nhất (Border Radius)

```css
:root {
  --radius: 5px;
  --ds-radius: 5px;
  --pos-m3-radius-sm: 5px;
  --pos-m3-radius-md: 5px;
  --pos-m3-radius-lg: 5px;
}
```
- **Quy định bắt buộc**: Tất cả **card, button, input, select, table container, dialog, modal và drawer** đều có bo góc đúng **5px**.
- **Ngoại lệ duy nhất được giữ tròn**:
  - Avatar đại diện hình tròn (`border-radius: 50%`).
  - Chấm tròn trạng thái Online/Line status (`border-radius: 50%`).
  - Nút tròn icon phụ / Close button tròn (`border-radius: 50%`).
  - Thanh tiến độ hoặc công tắc gạt toggle switch (`border-radius: 999px`).

---

### 2.3. Kiểu chữ & Phân cấp thị giác (Typography)

- **Font chữ độc quyền**: **Be Vietnam Pro** áp dụng 100% trên toàn bộ các phần tử (`html, body, *, input, select, button, textarea`).
- **Thang phân cấp cỡ chữ**:
  - `Title Page (H1)`: 22px – 24px, Font-weight: 800, Letter-spacing: -0.02em.
  - `Section Header (H2)`: 18px – 20px, Font-weight: 700.
  - `Card Header (H3/H4)`: 15px – 16px, Font-weight: 600.
  - `Body Text`: 13.5px – 14px, Font-weight: 400/500, Line-height: 1.5.
  - `Small / Label`: 12px – 12.5px, Font-weight: 600, Text-transform: None (hạn chế uppercase tràn lan).
  - `Number / Currency`: Cùng font chữ, bật tính năng `tabular-nums` để số tiền căn thẳng hàng trên các cột hóa đơn.

---

### 2.4. Khoảng cách & Lưới (Spacing & Layout Grid)

- Sử dụng hệ số nhân **4px / 8px**:
  - `4px`: Khoảng cách giữa icon và chữ.
  - `8px`: Khoảng cách giữa các chip, nút hành động liền kề, hoặc khoảng cách giữa các ô lưới song song (grid 2 cột).
  - `12px – 14px`: Đệm viền trong của input, button chuẩn, padding card nhỏ.
  - `16px – 20px`: Khoảng cách giữa các khối nội dung, padding của Modal/Drawer.
  - `24px`: Khoảng cách phân cách giữa các Section chính.

---

## 3. THƯ VIỆN COMPONENT DÙNG CHUNG CHUẨN MẪU

Mọi phân hệ đều sử dụng chung bộ class CSS chuẩn đã định nghĩa tại `app/admin-reference.css`:

```
┌────────────────────────────────────────────────────────┐
│ .mod-workspace (Khung bao ngoài tối đa 1520px)        │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ .mod-page-header (Tiêu đề, icon box & nút thao tác)│ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌──────────────┐ ┌──────────────┐ ┌────────────────┐   │
│ │ .mod-kpi-card│ │ .mod-kpi-card│ │ .mod-kpi-card  │   │
│ └──────────────┘ └──────────────┘ └────────────────┘   │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ .mod-pill-nav (Thanh Tab con chuyển đổi chế độ)    │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ .mod-card / .mod-table-box (Bảng dữ liệu & nội dung│ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

1. **Khung làm việc (`.mod-workspace`)**:
   - `display: flex; flex-direction: column; gap: 16px; max-width: 1520px; margin: 0 auto; width: 100%;`
2. **Tiêu đề trang (`.mod-page-header`)**:
   - Gồm `.mod-page-icon` (hộp 44x44px bo góc 5px màu xanh/vàng/xanh dương/tím nhạt), tiêu đề H2 và tóm tắt một dòng mô tả. Cụm nút hành động bên phải.
3. **Thẻ chỉ số (`.mod-kpi-card`)**:
   - Nền trắng, viền `#e2e8f0`, bo góc 5px, chứa icon 40x40px, nhãn 12.5px màu xám, số liệu lớn 20px in đậm.
4. **Nút bấm chuẩn (`.mod-btn-primary`, `.mod-btn-outline`)**:
   - Chiều cao: 38px (chuẩn) hoặc 32px (size `.sm`).
   - Bo góc: 5px.
   - Trạng thái hover/active rõ ràng, có trạng thái `disabled` mờ 50% và con trỏ `not-allowed`.
5. **Modal & Dialog chuẩn**:
   - Overlay nền mờ `background: rgba(0, 0, 0, 0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 16px;`
   - Content box: `background: #ffffff; border-radius: 5px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); box-sizing: border-box;`
   - Tiêu đề modal bên trái, nút đóng icon `X` bên phải.
   - Footer căn phải với 2 nút: [Đóng/Hủy] (Outline/Secondary) và [Hành động] (Primary Green).
