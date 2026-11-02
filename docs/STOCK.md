# Kho thành phẩm F&B — v0.5

Chủ cơ sở thêm món, chọn Kho F&B, bật theo dõi từ tồn 0 rồi nhập số lượng thực tế kèm lý do. Món chưa bật vẫn gọi bán như v0.4. Theo dõi theo đơn vị bán nguyên (chai, phần, chiếc), chưa có nguyên liệu/định lượng, giá vốn, nhà cung cấp hoặc phiếu chi tự động.

- Tồn thực tế = tổng sổ nhập/xuất bất biến. Đang giữ = số lượng trong các đơn new/preparing/ready có snapshot stockTracked. Khả dụng = tồn thực tế trừ đang giữ.
- Gửi đơn giữ hàng trong cùng statement INSERT. Hai đơn cạnh tranh hàng cuối chỉ một đơn thành công. Hủy giải phóng hàng; phục vụ ghi xuất kho và cộng hóa đơn trong cùng giao dịch SQLite. Lỗi bất kỳ trigger/audit rollback cả trạng thái đơn, tiền và kho.
- Nhập hàng, tăng/giảm điều chỉnh đều cần số nguyên dương và lý do ít nhất 5 ký tự. Giảm không được chạm phần đang giữ. Mã yêu cầu chống ghi trùng; cùng mã khác nội dung bị từ chối.
- Không bật kho khi còn đơn chờ của món chưa theo dõi. Bật làm tăng phiên bản menu để giỏ cũ phải xác nhận lại. Không hồi tố trừ đơn đã phục vụ.
- Đã bật giữ sổ suốt đời mã món và khóa đơn vị; cần đơn vị khác tạo mã món mới. Không có thao tác tắt/xóa kho. Ngưỡng cảnh báo chỉnh được, lưu audit; thay đổi ngưỡng dùng giá trị lưu cuối.
- Lịch sử hiển thị 100 phiếu gần nhất, lưu đầy đủ trong DB. Giữ hàng được suy ra từ đơn, không tạo phiếu xuất vật lý. Tên/đơn vị phiếu xuất chốt lúc phục vụ; giá bán giữ snapshot lúc đặt.

## Kỹ thuật và giới hạn

`stock_status` là view tính từ ledger + đơn đang chờ. Không có counter tồn dễ lệch, nhưng truy vấn tổng hợp cần đánh giá lại khi mở rộng dữ liệu lớn. Giới hạn hiện tại: 500 món, 200 đơn chờ/cơ sở; chưa có phân trang lịch sử hay kiểm kê nhiều món.

API `/api/stock` chỉ nhận owner ChatGPT identity và scope tenant do server cấp, không nhận tenant từ client. Chưa có nhân viên phân quyền hoặc khách OTP/QR. Dùng 4G vẫn cần Internet, không có offline queue.

Migration mới duy nhất: `drizzle/0003_minor_lady_deathstrike.sql`. Không sửa 0000–0002 đã áp dụng. Kiểm tra cả splitter Wrangler thật và SQLite trước khi apply.
