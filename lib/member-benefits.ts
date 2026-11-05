/** Membership perks shown on /thanh-vien, one per line: "Tiêu đề | Mô tả". Editable in Settings. */
export const DEFAULT_BENEFITS = [
  'Chơi mỗi ngày | Mở cửa cả năm, mỗi ngày có sẵn giờ chơi theo loại thẻ.',
  'Đặt trước 4 tuần | Hội viên được giữ chỗ sớm hơn khách lẻ.',
  'Gửi gậy miễn phí | Gửi bộ gậy tại câu lạc bộ, không tính phí.',
  'Bảo lưu một lần | Tạm dừng thẻ một lần, tối đa 6 tháng.',
  'Đặt thêm giảm 10% | Mọi giờ đặt thêm ngoài quyền lợi của thẻ được giảm 10%.',
];
export const parseBenefit = (line: string) => {
  const [title, ...rest] = line.split('|').map((s) => s.trim());
  return { title, text: rest.join(' | ') };
};
