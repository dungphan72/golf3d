# Thực đơn, gọi món tại phiên và bếp/bar — v0.4

## Luồng thử nội bộ
1. Chủ cơ sở vào **Thực đơn & bếp → Thực đơn → Thêm món**. Nhập tên, đơn vị, giá trước thuế/phí, phí phục vụ F&B (%) và VAT (%). Không tự suy đoán thuế/phí; nhập 0 nếu thực tế không thu. Có thể sửa hoặc tạm ngưng bán, không xóa lịch sử.
2. Bắt đầu phiên chơi. Mở chi tiết phòng/line, chọn món, số lượng và ghi chú; kiểm tra tiền món, phí, VAT, tổng đơn rồi gửi.
3. Bếp/bar tiếp nhận đơn: **Chờ tiếp nhận → Đang chuẩn bị → Sẵn sàng phục vụ → Đã phục vụ**.
4. Chỉ khi chuyển **Đã phục vụ**, đơn được cộng vào phần ẩm thực của phiếu, đúng một lần. Đơn chưa phục vụ có thể hủy với lý do ít nhất 5 ký tự; đã phục vụ thì không hủy trực tiếp.
5. Khách có thể kết thúc chơi trong khi món còn chờ. Phiếu chưa được thu tiền cho đến khi tất cả đơn đã phục vụ hoặc hủy.
6. Mở ca, xem lại tổng phiếu và xác nhận số tiền đã nhận. Backend chặn nếu tổng phiếu đổi so với số nhân viên vừa xem. Phiếu và sổ ca ghi đủ tiền golf cộng ẩm thực, không tính lại phí/VAT golf lên tiền món.

## Cách tính
- Mỗi dòng: tiền món = giá trước thuế/phí × số lượng.
- Phí F&B = tiền món × tỷ lệ phí của món; làm tròn đến đồng.
- VAT F&B = (tiền món + phí F&B) × VAT của món; làm tròn đến đồng.
- Tổng phiếu = tổng golf theo snapshot phiên + tổng các đơn F&B đã phục vụ.
- Mỗi đơn chốt tên món, đơn vị, giá, phí và VAT lúc gửi. Sửa thực đơn không sửa đơn cũ.

## Ràng buộc dữ liệu
- Chỉ phiên đang chơi/tạm dừng được tạo đơn; không tạo vào booking chưa bắt đầu hoặc đã kết thúc.
- Đơn đã có có thể tiếp tục phục vụ sau khi kết thúc chơi, trước khi thanh toán. Đã thanh toán thì không thay đổi đơn hay tiền.
- Tạo đơn, chuyển trạng thái và cộng phiếu có tenant checks, version guards, retry keys và audit. SQLite triggers ghi trạng thái, tiền và audit cùng transaction.
- Phiên kết thúc và món được phục vụ đồng thời vẫn giữ đúng tổng. Không tin giá hoặc tổng tiền do trình duyệt gửi.
- Giới hạn thử nội bộ: 500 món/cơ sở, 10 loại món/đơn, 1–99 đơn vị/món, 100 đơn/phiên và 200 đơn đang chờ/cơ sở. Tổng F&B của phiên tối đa 100 tỷ VND.
- Bếp/bar là một hàng đợi chung theo đơn; chưa tách station, in bếp, hoặc trạng thái riêng từng dòng món. Lịch sử màn hình chung tối đa 200 đơn (ưu tiên đơn chờ); chi tiết phiên tải toàn bộ tối đa 100 đơn của phiên.

## Chưa có trong v0.4
Khách tự gọi qua QR/OTP, phân quyền nhân viên chi tiết, sửa/hủy một phần đơn, hoàn món đã phục vụ, combo/size/topping, tồn kho/công thức/nguyên liệu, cảnh báo hết hàng theo kho, hóa đơn điện tử, thông báo push/âm thanh và realtime dưới 15 giây. Chỉ chủ cơ sở trong Site riêng tư thao tác được; không coi giao diện preview khách là xác thực khách thật.
