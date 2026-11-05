# Rà soát lỗi và kế hoạch fix (05/11/2026)

## 1. Đã kiểm tra những gì, kết quả

| Hạng mục | Kết quả |
|---|---|
| Typecheck (`tsc --noEmit`) | 0 lỗi |
| ESLint | 0 lỗi, 44 cảnh báo (xem mục 3, đợt 1) |
| Kiểm thử đơn vị (4 bộ) | đạt |
| Kiểm thử SQL (13 bộ) + splitter migration + import backup | đạt |
| E2E Playwright (20 bài, chạy trên D1 trắng) | đạt |
| Duyệt tự động toàn bộ trang công khai + 17 màn hình quản trị, máy tính và điện thoại: lỗi console, request hỏng, ảnh hỏng, tràn ngang, điều khiển không có tên | Không có lỗi thật. Chỉ có `401` ở `/api/member` và `/api/club` khi chưa đăng nhập (đúng thiết kế nhưng hiện chữ đỏ trong console). Ô "honeypot" chống bot bị báo "không có tên" (cố ý). |
| Giao diện quản trị chỉ nền trắng | Đã làm xong (máy tính + điện thoại). Sửa luôn lỗi chữ tối trên nền xanh đậm ở thẻ "Mỗi cú swing" ở Tổng quan. |
| `pnpm audit --prod` | 11 lỗ hổng phụ thuộc (4 cao, 4 vừa, 3 thấp), ví dụ `fast-uri` qua `@hookform/resolvers` |

Không chạy được: kiểm tra trạng thái CI trên GitHub (máy này không có `gh`), thử đăng nhập quản trị trên site thật.

## 2. Lỗi và rủi ro tìm thấy

### Ưu tiên cao (an toàn, tiền, dữ liệu sai lệch)
1. **Dữ liệu gói mâu thuẫn bảng giá mới.** Gói 10 giờ (+2 tặng) giá 3.000.000đ = 250.000đ/giờ, bằng đúng giá lẻ giờ thường và cao hơn giờ vàng 100.000đ. Gói VIP 5.500.000đ/12 giờ = 458.000đ/giờ trong khi phòng VIP đang dùng chung bảng giá 250.000đ/giờ. Khách mua gói sẽ thiệt. Cần chủ quyết định giá gói (hoặc giá VIP riêng).
2. **Khóa tài khoản hội viên bị lợi dụng.** Ai biết số điện thoại cũng khóa được tài khoản 15 phút bằng 5 lần nhập sai. Cần giới hạn theo IP và không khóa cứng theo số điện thoại.
3. **Đăng ký hội viên dễ bị làm nghẽn.** Trần 30 đăng ký/giờ cho cả cơ sở: một bot chiếm hết khiến khách thật không đăng ký được, và sinh ra khách rác. Cần giới hạn theo IP và bật Turnstile (cần khóa Cloudflare).
4. **Phụ thuộc có lỗ hổng** (mục 1). Cần nâng/override và chạy lại audit.

### Ưu tiên vừa (nghiệp vụ chưa đủ)
5. **Nhóm trên 4 người** (đặt online): chỉ giữ được 1 line khi xác nhận, báo giá không tính; nhân viên phải đặt các line còn lại bằng tay. Cần xếp nhiều line.
6. **Báo cáo doanh thu theo dịch vụ** chưa trừ hoàn tiền (theo ngày đã trừ).
7. **Hoàn tiền phiếu trả bằng gói** chưa hoàn về gói; hoàn tiền phiếu của ca cũ ghi vào ca đang mở (đúng nhưng cần nói rõ trên giao diện).
8. **Trang cá nhân hội viên**: thời điểm "bây giờ" bị đóng băng lúc mở trang, mở lâu sẽ hiện sai trạng thái hết hạn.
9. **`/api/member` trả 401** khi chưa đăng nhập tạo lỗi đỏ trong console mỗi lần mở trang; nên trả 200 với `user: null`.
10. **CI GitHub chưa xác minh** sau nhiều lần đẩy; cần xem tab Actions.

### Ưu tiên thấp
11. Ảnh nền trang chủ hơi mềm (ảnh gốc 1280 px).
12. 44 cảnh báo ESLint: 22 do hai bản `scrollcraft.js` chép sẵn (nên loại khỏi lint), import thừa (`ChefHat`, `PriceRule`...), cảnh báo ref trong `SessionFood.tsx`.
13. Chưa có: OTP/quên mật khẩu tự động, MISA, SePay đối soát tự động đầy đủ, kết nối GC3.

## 3. Kế hoạch fix

**Đợt 1: làm ngay, không cần quyết định thêm (khoảng nửa ngày)**
- Mục 2 và 3: giới hạn đăng ký/đăng nhập theo IP (trigger + dịch vụ), thông báo rõ khi bị giới hạn; test SQL + e2e.
- Mục 4: nâng/override phụ thuộc, chạy lại `pnpm audit`, test toàn bộ.
- Mục 8, 9: sửa trang cá nhân và `/api/member`.
- Mục 12: loại `scrollcraft` khỏi lint, xóa import thừa, sửa cảnh báo hook.
- Mục 10: anh mở tab Actions trên GitHub gửi tôi trạng thái (hoặc cài `gh`), tôi sửa nếu đỏ.

**Đợt 2: cần anh quyết định trước**
- Mục 1: chốt giá các gói giờ và thẻ so với giá lẻ; chốt phòng VIP có bảng giá riêng không.
- Mục 5: chọn cách tính giá và xếp line cho nhóm đông (chia theo line 4 người, hay giá nhóm cố định).

**Đợt 3: hoàn thiện**
- Mục 6, 7: báo cáo trừ hoàn theo dịch vụ, hoàn về gói, ghi chú ca.
- Mục 11: thay ảnh nền độ phân giải cao hơn khi anh có ảnh.
- Mục 13: theo yêu cầu, cần tài khoản bên ngoài.

Mỗi mục xong phải: test tự động mới, chạy lại toàn bộ bộ kiểm thử, triển khai, ghi `docs/PROGRESS.md`.
