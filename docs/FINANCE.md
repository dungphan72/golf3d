# Ca làm việc và sổ tiền v0.3

1. Vào **Ca & sổ tiền**, kiểm đếm tiền mặt đầu ca và mở ca. Bản thử cho phép một ca đang mở trên mỗi tenant, chưa tách quầy/chi nhánh/nhân viên.
2. Kết thúc phiên chơi, xem phiếu và xác nhận phương thức đã nhận tiền. Backend lấy số tiền từ phiếu; trình duyệt không gửi tổng tiền quyết định. Chưa mở ca thì không xác nhận thu.
3. Ghi nộp quỹ hoặc chi/rút tiền mặt với lý do. Không dùng mục này để thay thế thanh toán phiếu. Tiền nộp và vốn đầu ca không cộng vào thực thu dịch vụ.
4. Khi bàn giao, đối chiếu tiền mặt, chứng từ chuyển khoản và thẻ. Nhập đủ số thực tế của cả ba, kể cả 0. Nếu chênh phải ghi lý do ít nhất 5 ký tự.
5. Nếu có giao dịch mới trong lúc kiểm đếm, cập nhật số đối soát và xem lại trước khi đóng. Backend vẫn kiểm tra version lần cuối.
6. Ca đã đóng và sổ tiền không được sửa/xóa/mở lại. Bản hiện tại chưa có duyệt điều chỉnh/hoàn tiền; nếu ghi sai trong thử nghiệm, giữ nguyên dấu vết, không chỉnh database để che sai lệch.

Công thức:
- Tiền mặt dự kiến = đầu ca + thu dịch vụ tiền mặt + nộp thêm − chi/rút.
- Thu dịch vụ = tiền mặt + chuyển khoản + thẻ từ phiếu đã ghi nhận vào sổ.
- Chênh lệch từng phương thức = số thực tế đối soát − số dự kiến.
- Dashboard thực thu tính theo thời điểm nhận tiền của sổ, theo ngày Việt Nam; không theo giờ kết thúc phiên.

Lịch sử hiển thị 30 ca gần nhất và 100 dòng mới nhất của ca đang xem; các tổng tính trên toàn bộ sổ của ca, không bị cắt theo 100 dòng. Chưa có lọc/xuất sổ đầy đủ.

Phiếu v0.1/v0.2 đã thanh toán vẫn giữ nguyên, không tự chuyển thành thu trong ca mới. Phiếu chưa thanh toán có thể thu qua sổ mới khi mở ca. Không backfill hoặc xóa dữ liệu cũ.

Mỗi thao tác mở ca/thu/chi có mã chống lặp. Nếu mạng chập chờn, kiểm tra sổ và dùng lại thao tác đang chờ; đừng tạo một phiếu thu/chi mới chỉ vì chưa thấy phản hồi.

Đây là sổ vận hành thử nội bộ, chưa phải phần mềm kế toán, chưa tự xác nhận ngân hàng, chưa có split payment, trả góp/nợ, hoàn tiền, doanh thu trả trước, hay phân quyền duyệt tài chính hoàn chỉnh.
