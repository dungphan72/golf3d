'use client';
import { useState } from 'react';
import { DialogHeading, ModalDialog } from './kit';
import { rooms } from '../../lib/club';

/** A customer who walks in: the session starts and the meter runs at once, with no prior booking. */
export function WalkInDialog({
  room,
  busy,
  onClose,
  onStart,
}: {
  room: string;
  busy: boolean;
  onClose: () => void;
  onStart: (v: Record<string, unknown>) => Promise<void>;
}) {
  const [service, setService] = useState<'gdr' | '9' | '18'>('gdr');
  const [people, setPeople] = useState(1);
  const [minutes, setMinutes] = useState(60);
  const name = rooms.find((r) => r.id === room)?.name ?? room;
  return (
    <ModalDialog label="Vào chơi ngay" onClose={onClose}>
      <DialogHeading onClose={onClose} eyebrow="KHÁCH VÃNG LAI">
        Vào chơi ngay · {name}
      </DialogHeading>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          onStart({
            room,
            service,
            people,
            minutes: service === 'gdr' ? minutes : 0,
            customer: String(f.get('customer') ?? ''),
            phone: String(f.get('phone') ?? ''),
          });
        }}
      >
        <p className="muted">
          Không cần đặt chỗ trước: phiên bắt đầu và tính tiền ngay khi bấm nút. Tên và số điện thoại
          không bắt buộc; có số điện thoại thì khách được gửi biên nhận và tích điểm.
        </p>
        <div className="form-grid">
          <label>
            Hình thức
            <select value={service} onChange={(e) => setService(e.target.value as typeof service)}>
              <option value="gdr">Luyện tập (tính theo giờ)</option>
              <option value="9">Game 9 hố</option>
              <option value="18">Game 18 hố</option>
            </select>
          </label>
          <label>
            Số người
            <select value={people} onChange={(e) => setPeople(Number(e.target.value))}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} người
                </option>
              ))}
            </select>
          </label>
          {service === 'gdr' && (
            <label>
              Giữ line tối thiểu
              <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
                {[60, 90, 120, 150, 180].map((n) => (
                  <option key={n} value={n}>
                    {n} phút
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Họ và tên (không bắt buộc)
            <input name="customer" placeholder="Khách vãng lai" maxLength={100} />
          </label>
          <label>
            Số điện thoại (không bắt buộc)
            <input name="phone" type="tel" placeholder="Số điện thoại" maxLength={20} />
          </label>
        </div>
        <button className="primary" disabled={busy}>
          Bắt đầu chơi và tính tiền ngay
        </button>
      </form>
    </ModalDialog>
  );
}
