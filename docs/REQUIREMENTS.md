# Golf3D — phạm vi đã thống nhất

Ngày ghi nhận: 02/11/2026. Chủ sản phẩm: Phan Tiến Dũng.

## Sản phẩm và kiến trúc
- Golf3D, tên miền dự kiến golf3d.net. Cơ sở đầu: 250 Lương Đình Của, Phường Bình Trưng, TP.HCM.
- Một dãy 10 line tiêu chuẩn + 2 VIP; thiết bị Foresight Sports GC3. Line tay trái theo website tham khảo là Line 10, cần kiểm tra thực địa trước mở bán.
- Thương mại SaaS sau khi vận hành tốt. Mỗi chủ cơ sở là một tenant, có nhiều chi nhánh; tự cấu hình logo, thương hiệu, màu, giá, phòng, nhân viên và chính sách.
- Một danh tính golfer toàn nền tảng; hồ sơ kinh doanh, lịch sử, ví, điểm, gói và hội viên tách theo tenant. Chủ không đọc được dữ liệu khách ở tenant khác.
- Backend là nguồn sự thật: trạng thái, đồng hồ, giá, tiền, số dư và phân quyền không tin giá trị từ client.
- Web app trước, giao diện mobile như app/PWA; khách và nhân viên có navigation riêng. Desktop tối ưu lịch, quầy và báo cáo.
- Khi Wi-Fi cơ sở hỏng dùng điện thoại 4G. Không cần giao dịch offline hay đồng bộ xung đột offline trong bản đầu.
- Việt–Anh–Hàn. Sang trọng hiện đại, xanh lá–vàng; chưa có logo/ảnh thật. Ảnh minh họa phải ghi rõ.

## Booking
- Khách BẮT BUỘC đăng nhập trước khi đặt (thay thế quyết định đặt nhanh ban đầu). OTP điện thoại quốc tế, email đã xác minh làm kênh thay thế.
- Nhân viên được tạo booking từ điện thoại/Zalo/khách trực tiếp. Ghi nguồn.
- Chọn line/phòng cụ thể. GDR bắt đầu theo bước 15 phút, tối thiểu 60 phút, tăng mỗi 30 phút.
- Khách online tự chọn ngày giờ tương lai theo mốc 15 phút, không giới hạn đặt trước; nhân viên kiểm tra giờ hoạt động, tình trạng phòng và báo giá rồi mới xác nhận. Nhân viên tạo lịch thủ công tối đa 90 ngày trước.
- Chỉ cần bật nhận yêu cầu và có mã đường dẫn để mở trang đặt lịch. Nếu thiếu giờ hoạt động, sức chứa hoặc giá/phí, vẫn nhận yêu cầu chưa báo giá; nhân viên phải bổ sung cấu hình và xác nhận thủ công, không tạo booking đã xác nhận.
- Phê duyệt tự động/thủ công, thời gian giữ booking chờ thanh toán đều cấu hình.
- Mặc định miễn cọc cho tất cả. Có thể bật theo nhóm khách, phòng, booking sự kiện; hỗ trợ tiền cố định/%/thanh toán toàn bộ.
- Giữ khách muộn mặc định 15 phút; cảnh báo, nhân viên quyết định giải phóng, không tự hủy. Admin thay mốc.
- Tự đổi/hủy ít nhất 2 giờ trước; sát giờ nhân viên hỗ trợ. Cấu hình trong admin.
- Đặt nhiều phòng và lịch lặp; kiểm tra từng ngày/phòng và báo xung đột, không âm thầm bỏ qua.
- Dọn line 5 phút, VIP 10 phút, cấu hình; tách thời gian dự phòng 9/18 hố.
- Khóa phòng bảo trì/sự kiện/nội bộ theo quyền; sức chứa từng phòng do admin nhập sau.

## Phiên chơi và tiền
- Thời gian lấy từ máy chủ khi nhân viên bấm bắt đầu/kết thúc.
- GDR tính thời gian thực tế, không làm tròn lên 15/30 phút. Tách từng đoạn giá và khoảng tạm dừng. Chính sách giây lẻ cần hiển thị rõ; pilot dùng thời lượng thực đến giây, không làm tròn block.
- Ví dụ T2 10:30–11:30: 30 phút × 100k/h + 30 phút × 250k/h = 175k, trước phí/thuế.
- Gói 9/18 hố giá trọn lượt theo số người 1–4 và loại phòng. Mặc định chơi đến khi hoàn thành không phụ thu; có cấu hình giới hạn/ngoại lệ công khai.
- Giữ phòng 9/18 theo bảng thời lượng từng số người + dự phòng admin; không có một luật thời lượng chung tự gán.
- Giá trọn lượt khóa theo giờ đã đặt, giữ giá nếu đến muộn trong thời gian giữ chỗ; đổi lịch/gói báo lại giá trước xác nhận.
- Hết giờ đặt: tiếp tục tính hay tự kết thúc là cấu hình admin; cảnh báo trước/quá giờ. Không tự kết thúc 9/18 khi chưa hoàn thành theo chính sách mặc định.
- Máy lỗi: tạm dừng không tính tiền GDR, ghi lý do. Chuyển phòng giữ lịch sử; khác giá cần khách đồng ý.
- Mặc định gộp golf, F&B, thuê gậy, học vào hóa đơn. Có tùy chọn tách/chia thanh toán.
- Giá chưa VAT/phí dịch vụ. Admin cấu hình VAT, phí cố định/% và phạm vi áp dụng; báo tổng dự kiến cùng công thức trước xác nhận.
- Các giao dịch phải snapshot giá/thuế/phí/chính sách để thay cấu hình không làm đổi phiên cũ.
- Tiền mặt, QR chuyển khoản, thẻ tại quầy; bật/tắt và cho kết hợp theo cấu hình. Xác nhận ngân hàng tự động cần nhà cung cấp thật.
- Chủ/quản lý duyệt giảm giá, sửa tiền, hủy/hoàn; thu ngân gửi đề nghị; nhật ký trước/sau, người, thời gian, lý do.
- Công nợ chỉ khách được cấp quyền, có hạn mức và hạn trả, nhắc hạn/quá hạn.
- Phiếu 80mm, A4/PDF, xem trên điện thoại. Phân biệt phiếu nội bộ và hóa đơn điện tử.
- Hóa đơn điện tử có thiết lập kết nối; chưa kết nối không giả báo đã phát hành.

## Giá tham khảo từ website cũ (chưa gồm VAT/phí)
Nguồn đã đọc: https://indoorgolf-seven.vercel.app/ . Dữ liệu không thay thế xác nhận chủ.
- T2–T6 08–11: GDR 100.000/h; 9 hố 300.000; 18 hố 400.000.
- T2–T6 11–23, cuối tuần/ngày lễ 08–23: GDR 250.000/h; 9 hố 500.000; 18 hố 650.000.
- Nhóm 4: 9 hố 900.000; 18 hố 1.000.000. Chưa rõ áp dụng khung giờ, không tự suy diễn.
- VIP, nhóm 2–3, thời lượng chuẩn, ngày lễ và giờ ngoài bảng cần cấu hình.
- Platinum tham khảo 25 triệu/6 tháng: 10 lượt 18 hố + 10 GDR, giảm 20% F&B.
- Diamond tham khảo 45 triệu/12 tháng: 20 lượt 18 hố + 20 GDR, giảm 30% F&B.
- Không tự xuất bản lời quảng cáo thiết bị GDR trên trang cũ; thiết bị đã xác nhận là GC3, khả năng tích hợp chưa xác minh.

## F&B, kho, thiết bị
- Khách có tài khoản gắn phiên chơi có thể gọi món hoặc nhân viên nhập hộ. QR mở phiên phù hợp, không cho chỉ biết room id là ghi tiền vào hóa đơn khác.
- Gọi hỗ trợ thay chuông: nhân viên/thiết bị/khác → thông báo có âm thanh → tiếp nhận → hoàn thành; khách thấy trạng thái; nhắc/escalate quá hạn cấu hình.
- Đơn món: gửi quầy/bar/bếp, chờ nhận → đang làm → sẵn sàng → đã phục vụ; hủy có lý do/quyền, không tính trùng.
- Size/topping/ghi chú, món theo chi nhánh, đánh dấu hết hàng. Kho trừ nhất quán theo điểm ghi nhận đã chọn, hoàn kho đúng khi hủy.
- Nhà cung cấp, đặt mua, nhận hàng, trả nhập, công nợ; đơn vị quy đổi thùng/lon/chai/ml; công thức nguyên liệu; kiểm kê, hao hụt, cảnh báo tồn thấp; chuyển kho giữa chi nhánh có xuất/nhận.
- Gậy cho thuê: số lượng, tình trạng, mượn/trả, không coi như hàng tiêu hao.

## HLV, hội viên, CRM, giải
- HLV và line phải cùng trống; gói học, điểm danh, tiến bộ, giá/thời lượng/thù lao cấu hình.
- Ví trả trước, giờ GDR trừ phút, lượt 9/18, thẻ hội viên. Admin bật/tắt, giá/hạn/ngày giờ áp dụng.
- Mặc định gói dùng riêng; gia đình/doanh nghiệp có danh sách người được dùng chung, ghi người và số dư đã trừ.
- Điểm theo tiền/lượt, hạng, voucher sinh nhật, giới thiệu; điều kiện, hạn, cộng dồn cấu hình.
- CRM: giao phụ trách, nhu cầu, ghi chú, hẹn liên hệ, theo dõi sau chơi, mời quay lại; khiếu nại, người xử lý, deadline.
- Thiết lập Zalo OA/email/SMS để đăng ký sau. Chưa có kết nối thì tạo việc, không báo tin đã gửi.
- Giải: trang giới thiệu, đăng ký cá nhân/đội, phí, xếp phòng/giờ, nhập điểm, leaderboard. Điểm máy tự lấy làm sau.

## Quản trị và thương mại
- Vai trò tùy biến, chọn từng quyền; một người nhiều vai trò, phạm vi tenant/chi nhánh.
- Mở ca, tiền đầu ca, thu/chi, đối soát phương thức, chênh lệch, bàn giao/đóng ca.
- Báo cáo doanh thu, thực thu, chi phí, lợi nhuận vận hành, công suất/giờ cao điểm, khách mới/quay lại, hủy, nợ, nhân viên, HLV, món/lợi nhuận sản phẩm/tồn chậm.
- Tách tiền đã thu, giá trị sử dụng và nghĩa vụ số dư trả trước; không coi nạp ví là doanh thu dịch vụ đã thực hiện.
- Nhập Excel khách/sản phẩm/số dư đầu, xem trước lỗi/chống trùng; xuất theo quyền; backup hằng ngày và thử restore, lịch sử tải/khôi phục.
- CMS ba ngôn ngữ: nháp, preview, xuất bản; chưa dịch fallback Việt. Nội dung dịch AI phải được duyệt.
- SaaS onboarding tự phục vụ, trang/đường dẫn riêng; tên miền riêng tùy gói cần quyết định thương mại. Giới hạn gói thuê bao phải thực thi server.
- Tên nền tảng và giá thuê bao chưa chốt. Chưa có ngày khai trương/budget được phê duyệt; các con số 3–6 tuần/1–3 triệu mỗi tháng chỉ là đề xuất trước đó.

## Không nằm trong bản đầu
Native app, giao dịch offline, tích hợp GC3 tự động, thanh toán/Zalo/OTP giả, hóa đơn điện tử giả. Không mở công khai bản pilot hoặc đổi audience nếu chưa có yêu cầu.
