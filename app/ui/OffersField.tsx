'use client';
import { useState } from 'react';

/** One promotion per line. The raw text is kept locally so Enter and trailing spaces behave while typing. */
export function OffersField({
  offers,
  onChange,
}: {
  offers: string[];
  onChange: (offers: string[]) => void;
}) {
  const [text, setText] = useState(offers.join('\n'));
  return (
    <label className="offers-field">
      Ưu đãi theo ngày (hiện trên trang bảng giá)
      <textarea
        rows={5}
        value={text}
        placeholder="Mỗi dòng một ưu đãi: Tiêu đề | Giá hoặc mức giảm | Điều kiện"
        onChange={(e) => {
          setText(e.target.value);
          onChange(
            e.target.value
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean)
              .slice(0, 20),
          );
        }}
      />
      <small>
        Dùng cho ưu đãi mà bảng giá theo khung giờ không diễn tả được (ví dụ riêng một ngày trong
        tuần, theo độ tuổi). Ví dụ: Ngày của phụ nữ | Phòng thường 210.000đ/giờ | Thứ Ba hằng tuần.
      </small>
    </label>
  );
}
